const crypto = require("crypto");
const EmailLog = require("./email-log.model");
const EmailPreference = require("./email-preference.model");
const User = require("../users/user.model");
const emailService = require("./email.service");
const emailTemplateService = require("./email.template.service");
const { sendSuccess, sendError } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

/**
 * SHA-256 token hashing helper for single-use verification & password reset tokens
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * POST /api/v1/email/send
 * Authenticated & authorized backend services / admin only
 * Rejects arbitrary email spam or unapproved templates
 */
async function sendEmailEndpoint(req, res, next) {
  try {
    const { to, templateId, templateData = {}, subject, html, text, idempotencyKey } = req.body;

    if (!to) {
      return next(new ValidationError("Recipient email 'to' is required"));
    }

    // Role check: Only admin, owner, or internal staff can call the direct send API
    const userRole = req.user?.role;
    const isPrivileged = ["owner", "super_admin", "admin", "crm", "sales", "reception"].includes(userRole);
    if (!isPrivileged) {
      return next(new ForbiddenError("Unauthorized: Only privileged clinic roles can invoke direct transactional email dispatch."));
    }

    // Require an approved template or admin role for custom html
    if (!templateId && !["owner", "super_admin", "admin"].includes(userRole)) {
      return next(new ValidationError("Non-admin roles must specify an approved system templateId."));
    }

    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      text,
      templateId,
      templateData,
      recipientId: req.body.patientId || null,
      idempotencyKey,
      forceImmediate: req.body.forceImmediate || false,
      useSmtp: req.body.useSmtp || false,
      metadata: {
        dispatchedBy: req.user?._id,
        dispatchedByRole: req.user?.role,
      },
    });

    return sendSuccess(res, result, "Email dispatch initiated");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/email/verification/send
 * Triggers an email verification link to current authenticated user
 */
async function sendEmailVerification(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select("+emailVerificationTokenHash +emailVerificationExpires");
    if (!user) {
      return next(new NotFoundError("User not found"));
    }

    if (user.isEmailVerified) {
      return sendSuccess(res, { alreadyVerified: true }, "Email address is already verified.");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    await emailService.sendEmail({
      to: user.email,
      templateId: "email_verification",
      templateData: {
        name: user.name,
        email: user.email,
        token: rawToken,
      },
      recipientId: user._id,
      notificationType: "auth",
      forceImmediate: true,
    });

    await recordAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "EMAIL_VERIFICATION_DISPATCHED",
      targetEntity: "User",
      targetId: user._id.toString(),
      ipAddress: req.ip,
    });

    return sendSuccess(res, { dispatched: true }, "Verification email dispatched successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/email/verification/confirm
 * Validates verification token and confirms email in database
 */
async function confirmEmailVerification(req, res, next) {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return next(new ValidationError("Verification token is required"));
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationTokenHash +emailVerificationExpires");

    if (!user) {
      return next(new ValidationError("Invalid or expired email verification token."));
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await recordAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "EMAIL_VERIFICATION_CONFIRMED",
      targetEntity: "User",
      targetId: user._id.toString(),
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        verified: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isEmailVerified: true,
        },
      },
      "Email address verified successfully!"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/email/status/:emailId
 * Retrieve status of a specific email
 */
async function getEmailStatus(req, res, next) {
  try {
    const { emailId } = req.params;
    const log = await emailService.getEmailStatus(emailId);

    if (!log) {
      return next(new NotFoundError("Email record not found"));
    }

    // Non-admin can only inspect their own emails
    const isAdmin = ["owner", "super_admin", "admin"].includes(req.user?.role);
    const isOwner = (log.recipientId && log.recipientId.toString() === req.user?._id?.toString()) ||
                    (log.recipient.toLowerCase() === req.user?.email?.toLowerCase());

    if (!isAdmin && !isOwner) {
      return next(new ForbiddenError("Unauthorized access to another user's email status"));
    }

    return sendSuccess(res, { email: log }, "Email status retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/email/history
 * Returns user's own transactional email history
 */
async function getEmailHistory(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userEmail = req.user.email?.toLowerCase();
    const userId = req.user._id;

    const filter = {
      $or: [{ recipient: userEmail }, { recipientId: userId }],
    };

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const logs = await EmailLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.max(1, parseInt(limit, 10)))
      .select("recipient notificationType templateName subject status sentAt deliveredAt createdAt failureReason");

    const total = await EmailLog.countDocuments(filter);

    return sendSuccess(
      res,
      {
        logs,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
      "Email history retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/email/preferences
 * Returns user's notification preferences
 */
async function getPreferences(req, res, next) {
  try {
    const pref = await emailService.getPreferences(req.user._id, req.user.email);
    return sendSuccess(res, { preferences: pref }, "Email preferences retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/email/preferences
 * Updates user's notification preferences
 */
async function updatePreferences(req, res, next) {
  try {
    const updated = await emailService.updatePreferences(req.user._id, req.body);
    return sendSuccess(res, { preferences: updated }, "Email preferences updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/email/:emailId/retry
 * Retries an eligible failed email (Admin only)
 */
async function retryEmail(req, res, next) {
  try {
    const { emailId } = req.params;
    const result = await emailService.retryEmail(emailId);

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "ADMIN_EMAIL_RETRY",
      targetEntity: "EmailLog",
      targetId: emailId,
      details: { status: result.status },
      ipAddress: req.ip,
    });

    return sendSuccess(res, result, "Email retry initiated");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/admin/email/analytics
 * Real MongoDB aggregations of email delivery metrics (Admin only)
 */
async function getAdminAnalytics(req, res, next) {
  try {
    const stats = await EmailLog.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = {
      queued: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      delivery_delayed: 0,
      bounced: 0,
      complained: 0,
      failed: 0,
    };

    let total = 0;
    for (const item of stats) {
      if (statsMap[item._id] !== undefined) {
        statsMap[item._id] = item.count;
      }
      total += item.count;
    }

    const deliveredCount = statsMap.delivered;
    const failedCount = statsMap.failed + statsMap.bounced + statsMap.complained;

    const deliveryRate = total > 0 ? Number(((deliveredCount / total) * 100).toFixed(1)) : 100;
    const failureRate = total > 0 ? Number(((failedCount / total) * 100).toFixed(1)) : 0;

    // Type distribution
    const typeStats = await EmailLog.aggregate([
      {
        $group: {
          _id: "$notificationType",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Provider health check
    const health = await emailService.getHealthStatus();

    return sendSuccess(
      res,
      {
        total,
        sent: statsMap.sent,
        delivered: deliveredCount,
        failed: statsMap.failed,
        bounced: statsMap.bounced,
        complained: statsMap.complained,
        deliveryDelayed: statsMap.delivery_delayed,
        deliveryRate,
        failureRate,
        types: typeStats,
        providerHealth: health,
      },
      "Email analytics calculated from database"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/admin/email/logs
 * Filterable, paginated audit logs of all platform emails (Admin only)
 */
async function getAdminLogs(req, res, next) {
  try {
    const { status, notificationType, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (notificationType) filter.notificationType = notificationType;
    if (search) {
      filter.recipient = { $regex: search.trim().toLowerCase(), $options: "i" };
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));

    const logs = await EmailLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.max(1, parseInt(limit, 10)))
      .populate("recipientId", "name email phone role");

    const total = await EmailLog.countDocuments(filter);

    return sendSuccess(
      res,
      {
        logs,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
      "Admin email logs retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/admin/email/health
 * Comprehensive operational health check (Admin only)
 */
async function getAdminHealth(req, res, next) {
  try {
    const health = await emailService.getHealthStatus();
    return sendSuccess(res, { health }, "Email service health retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/forgot-password
 * Public rate-limited password reset initiator
 */
async function forgotPassword(req, res, next) {
  try {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== "string") {
      return next(new ValidationError("Registered email or phone number is required"));
    }

    const rawIdentifier = identifier.trim();
    const cleanEmail = rawIdentifier.toLowerCase();
    const cleanDigits = rawIdentifier.replace(/\D/g, "");

    const queryOr = [
      { email: cleanEmail },
      { phone: rawIdentifier },
    ];

    if (cleanDigits.length >= 10) {
      const last10 = cleanDigits.slice(-10);
      queryOr.push({ phone: cleanDigits });
      queryOr.push({ phone: `+91${last10}` });
      queryOr.push({ phone: `+91 ${last10}` });
      queryOr.push({ phone: last10 });
      queryOr.push({ phone: new RegExp(`${last10}$`) });
    }

    const user = await User.findOne({
      $or: queryOr,
    }).select("+passwordResetTokenHash +passwordResetExpires");

    // Prevent user enumeration: always return 200 OK with success message even if not found
    if (!user || !user.email) {
      return sendSuccess(res, { sent: true }, "If an account matches that email or phone, a password reset link has been dispatched.");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    await emailService.sendEmail({
      to: user.email,
      templateId: "password_reset",
      templateData: {
        name: user.name,
        email: user.email,
        token: rawToken,
      },
      recipientId: user._id,
      notificationType: "auth",
      forceImmediate: true,
    });

    await recordAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "AUTH_PASSWORD_RESET_REQUESTED",
      targetEntity: "User",
      targetId: user._id.toString(),
      ipAddress: req.ip,
    });

    return sendSuccess(res, { sent: true }, "If an account matches that email, a password reset link has been dispatched.");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/reset-password
 * Consumes single-use reset token and updates passwordHash
 */
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || typeof token !== "string") {
      return next(new ValidationError("Password reset token is required"));
    }
    if (!newPassword || newPassword.length < 8) {
      return next(new ValidationError("New password must be at least 8 characters long"));
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return next(new ValidationError("Passwords do not match"));
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires +passwordHash");

    if (!user) {
      return next(new ValidationError("Invalid or expired password reset link. Please request a new one."));
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.mustChangePassword = false;
    user.authVersion = (user.authVersion || 1) + 1; // Invalidate all prior sessions
    await user.save();

    // Security alert email to patient/user
    if (user.email) {
      emailService.sendEmail({
        to: user.email,
        templateId: "password_changed",
        templateData: {
          name: user.name,
          email: user.email,
        },
        recipientId: user._id,
        notificationType: "auth",
        forceImmediate: true,
      }).catch((e) => console.warn("[Email Service] Password changed email warning:", e.message));
    }

    await recordAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "AUTH_PASSWORD_RESET_COMPLETED",
      targetEntity: "User",
      targetId: user._id.toString(),
      ipAddress: req.ip,
    });

    return sendSuccess(res, { success: true }, "Password has been reset successfully. You can now log in.");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/email/admin/automations
 * List all configurable automation triggers
 */
async function getAdminAutomations(req, res, next) {
  try {
    const EmailAutomationSettings = require("./email-automation-settings.model");
    await EmailAutomationSettings.ensureDefaults();
    const automations = await EmailAutomationSettings.find().sort({ category: 1, eventType: 1 });
    return sendSuccess(res, { automations, count: automations.length }, "Email automations retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/v1/email/admin/automations/:eventType
 * Update an automation rule (enable/disable, delay, rules)
 */
async function updateAdminAutomation(req, res, next) {
  try {
    const { eventType } = req.params;
    const { enabled, delayMinutes, templateId, recipientRules } = req.body;
    const EmailAutomationSettings = require("./email-automation-settings.model");

    const query = eventType.match(/^[0-9a-fA-F]{24}$/) ? { _id: eventType } : { eventType };
    const update = {
      updatedBy: req.user?._id,
      updatedAt: new Date(),
    };

    if (enabled !== undefined) update.enabled = Boolean(enabled);
    if (delayMinutes !== undefined) update.delayMinutes = Number(delayMinutes);
    if (templateId) update.templateId = templateId;
    if (recipientRules !== undefined) update.recipientRules = recipientRules;

    const setting = await EmailAutomationSettings.findOneAndUpdate(
      query,
      { $set: update },
      { new: true, upsert: false }
    );

    if (!setting) {
      return next(new NotFoundError(`Automation trigger '${eventType}' not found.`));
    }

    await recordAudit({
      actorId: req.user?._id,
      actorRole: req.user?.role,
      action: "ADMIN_AUTOMATION_SETTING_UPDATED",
      targetEntity: "EmailAutomationSettings",
      targetId: setting._id.toString(),
      details: { eventType: setting.eventType, enabled: setting.enabled },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { automation: setting }, "Automation configuration updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/email/admin/templates
 * Catalogue of all registered HTML templates with sample properties
 */
async function getAdminTemplates(req, res, next) {
  try {
    const templates = emailTemplateService.listTemplates();
    return sendSuccess(res, { templates, count: templates.length }, "Email template catalogue retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/email/admin/test
 * Send live test email to verify Resend delivery
 */
async function sendAdminTestEmail(req, res, next) {
  try {
    const { to, templateId = "patient_welcome_registration", templateData = {} } = req.body;
    if (!to) {
      return next(new ValidationError("Recipient email 'to' is required for test email"));
    }

    const testData = {
      name: "TriGyna Quality Assurance",
      patientName: "TriGyna Quality Assurance",
      email: to,
      doctorName: "Dr. Ananya Sharma",
      date: new Date().toLocaleDateString("en-IN"),
      time: "10:30 AM",
      appointmentCode: "TG-TEST-" + Date.now().toString().slice(-4),
      amount: 1499,
      invoiceNumber: "INV-TEST-" + Date.now().toString().slice(-4),
      ...templateData,
    };

    const result = await emailService.sendEmail({
      to,
      templateId,
      templateData: testData,
      forceImmediate: true,
      metadata: {
        isTest: true,
        testedBy: req.user?._id,
      },
    });

    await recordAudit({
      actorId: req.user?._id,
      actorRole: req.user?.role,
      action: "ADMIN_TEST_EMAIL_DISPATCHED",
      targetEntity: "EmailLog",
      targetId: result.emailLogId?.toString(),
      details: { to, templateId, providerEmailId: result.providerEmailId },
      ipAddress: req.ip,
    });

    return sendSuccess(res, result, "Test email dispatched successfully via Resend");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/email/admin/resend-invoice/:invoiceId
 * Generate official PDF invoice and resend to patient
 */
async function resendInvoiceEmail(req, res, next) {
  try {
    const { invoiceId } = req.params;
    const Invoice = require("../billing/invoice.model");
    const Patient = require("../patients/patient.model");
    const { generateInvoicePdfBuffer } = require("../billing/invoice-pdf.service");

    const invoice = await Invoice.findOne({
      $or: [
        ...(invoiceId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: invoiceId }] : []),
        { invoiceNumber: invoiceId },
      ],
    });

    if (!invoice) {
      return next(new NotFoundError("Invoice record not found"));
    }

    let patient = null;
    if (invoice.patientId) {
      patient = await Patient.findById(invoice.patientId);
    }

    const targetEmail = req.body.to || patient?.email || invoice.customerEmail;
    if (!targetEmail) {
      return next(new ValidationError("No valid email address found for this invoice. Please specify 'to' in body."));
    }

    let pdfBuffer = null;
    try {
      pdfBuffer = await generateInvoicePdfBuffer(invoice);
    } catch (pdfErr) {
      console.warn("[Resend Invoice] PDF generation warning:", pdfErr.message);
    }

    const result = await emailService.sendInvoiceEmail({
      to: targetEmail,
      invoice,
      patient,
      pdfBuffer,
      forceImmediate: true,
    });

    await recordAudit({
      actorId: req.user?._id,
      actorRole: req.user?.role,
      action: "ADMIN_INVOICE_RESENT",
      targetEntity: "Invoice",
      targetId: invoice._id.toString(),
      details: { to: targetEmail, invoiceNumber: invoice.invoiceNumber },
      ipAddress: req.ip,
    });

    return sendSuccess(res, result, `Invoice ${invoice.invoiceNumber} resent successfully to ${targetEmail}`);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/email/admin/webhook-events
 * Inspect Svix webhook delivery events (Admin only)
 */
async function getAdminWebhookEvents(req, res, next) {
  try {
    const { page = 1, limit = 50, eventType } = req.query;
    const EmailWebhookEvent = require("./email-webhook-event.model");

    const filter = {};
    if (eventType) filter.eventType = eventType;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const events = await EmailWebhookEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.max(1, parseInt(limit, 10)));

    const total = await EmailWebhookEvent.countDocuments(filter);

    return sendSuccess(
      res,
      {
        events,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
      "Resend webhook events retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  sendEmailEndpoint,
  sendEmailVerification,
  confirmEmailVerification,
  getEmailStatus,
  getEmailHistory,
  getPreferences,
  updatePreferences,
  retryEmail,
  getAdminAnalytics,
  getAdminLogs,
  getAdminHealth,
  getAdminAutomations,
  updateAdminAutomation,
  getAdminTemplates,
  sendAdminTestEmail,
  resendInvoiceEmail,
  getAdminWebhookEvents,
  forgotPassword,
  resetPassword,
  hashToken,
};
