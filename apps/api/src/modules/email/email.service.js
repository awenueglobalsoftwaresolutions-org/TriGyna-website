const EmailLog = require("./email-log.model");
const EmailPreference = require("./email-preference.model");
const emailProvider = require("./email.provider");
const emailTemplateService = require("./email.template.service");
const emailQueueService = require("./email.queue.service");
const emailConfig = require("../../config/email.config");

// Critical notifications that bypass marketing opt-outs
const CRITICAL_NOTIFICATION_TYPES = new Set([
  "auth",
  "email_verification",
  "password_reset",
  "password_changed",
  "security_alert",
  "appointment_confirmation",
  "appointment_rescheduled",
  "appointment_cancelled",
  "payment_success",
  "payment_receipt",
  "refund_processed",
  "admin_alert",
]);

class EmailService {
  constructor() {
    this.provider = emailProvider;
    this.templateService = emailTemplateService;
    this.queueService = emailQueueService;
    this.config = emailConfig;

    // Start background queue processing if not in test environment
    if (process.env.NODE_ENV !== "test") {
      this.queueService.start();
    }
  }

  /**
   * Validate recipient email address
   */
  validateRecipient(email) {
    if (!email || typeof email !== "string") {
      throw new Error("Recipient email address is required");
    }
    const clean = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      throw new Error(`Invalid email address format: '${email}'`);
    }
    // Prevent email header injection
    if (/[\r\n]/.test(clean)) {
      throw new Error("Potential header injection detected in recipient address");
    }
    return clean;
  }

  /**
   * Check whether recipient has unsubscribed or previously hard-bounced
   */
  async isRecipientSuppressed(email, notificationType) {
    // Critical security & verification notifications cannot be suppressed
    if (CRITICAL_NOTIFICATION_TYPES.has(notificationType)) {
      return false;
    }

    // Check if recipient has a recorded permanent hard bounce or complaint
    const hardBounce = await EmailLog.findOne({
      recipient: email,
      status: { $in: ["bounced", "complained"] },
    });
    if (hardBounce) {
      console.warn(`[Email Service] Suppression rule: Recipient '${email}' previously hard-bounced or filed a complaint. Skipping non-critical email.`);
      return true;
    }

    // Check preferences
    const pref = await EmailPreference.findOne({ email });
    if (pref) {
      if (pref.unsubscribeAll) return true;
      if (notificationType === "marketing" && !pref.marketing) return true;
      if (notificationType === "newsletter" && !pref.newsletter) return true;
    }

    return false;
  }

  /**
   * Core centralized email dispatcher
   */
  async sendEmail({
    to,
    subject,
    html,
    text,
    templateId,
    templateData = {},
    recipientId = null,
    idempotencyKey = null,
    notificationType = "general",
    forceImmediate = false,
    useSmtp = false,
    metadata = {},
  }) {
    const recipient = this.validateRecipient(to);

    // Idempotency check: if an idempotency key was supplied, check for existing log
    if (idempotencyKey) {
      const existing = await EmailLog.findOne({ idempotencyKey });
      if (existing) {
        console.log(`[Email Service] Idempotent dispatch returned existing record for key '${idempotencyKey}'`);
        return {
          success: existing.status !== "failed",
          emailLogId: existing._id,
          status: existing.status,
          providerEmailId: existing.providerEmailId,
          isDuplicate: true,
        };
      }
    }

    // Determine notification category from template if not explicitly passed
    let finalNotificationType = notificationType;
    let finalSubject = subject;
    let finalHtml = html;

    if (templateId) {
      const t = this.templateService.getTemplate(templateId);
      if (t) {
        finalNotificationType = t.category || finalNotificationType;
        const rendered = this.templateService.renderTemplate(templateId, {
          ...templateData,
          email: recipient,
        });
        finalSubject = finalSubject || rendered.subject;
        finalHtml = finalHtml || rendered.html;
      }
    }

    if (!finalSubject) {
      throw new Error("Email subject is required");
    }

    // Check suppression for non-critical emails
    const isSuppressed = await this.isRecipientSuppressed(recipient, finalNotificationType);
    if (isSuppressed) {
      return {
        success: false,
        status: "suppressed",
        message: `Recipient '${recipient}' has opted out or is suppressed for category '${finalNotificationType}'`,
      };
    }

    // Create durable EmailLog record in MongoDB
    const emailLog = await EmailLog.create({
      recipient,
      recipientId,
      notificationType: finalNotificationType,
      templateName: templateId || "custom",
      subject: finalSubject,
      idempotencyKey: idempotencyKey || undefined,
      status: "queued",
      metadata: {
        ...metadata,
        ...templateData,
      },
    });

    // Immediate dispatch (for interactive flows or tests)
    if (forceImmediate || process.env.NODE_ENV === "test") {
      try {
        emailLog.status = "sending";
        emailLog.lastAttemptAt = new Date();
        await emailLog.save();

        const result = await this.provider.send({
          to: recipient,
          subject: finalSubject,
          html: finalHtml || `<p>${finalSubject}</p>`,
          text,
          useSmtp,
          tags: [{ name: "notification_type", value: finalNotificationType }],
        });

        if (result.success) {
          emailLog.status = "sent";
          emailLog.provider = result.provider;
          emailLog.providerEmailId = result.providerEmailId;
          emailLog.sentAt = new Date();
          emailLog.failureReason = null;
          await emailLog.save();

          return {
            success: true,
            emailLogId: emailLog._id,
            providerEmailId: result.providerEmailId,
            status: "sent",
            provider: result.provider,
          };
        } else {
          emailLog.status = "failed";
          emailLog.retryCount = 1;
          emailLog.failedAt = new Date();
          emailLog.failureReason = result.error;
          await emailLog.save();

          return {
            success: false,
            emailLogId: emailLog._id,
            status: "failed",
            error: result.error,
          };
        }
      } catch (err) {
        emailLog.status = "failed";
        emailLog.failedAt = new Date();
        emailLog.failureReason = err.message;
        await emailLog.save();

        return {
          success: false,
          emailLogId: emailLog._id,
          status: "failed",
          error: err.message,
        };
      }
    }

    // Asynchronous queue processing
    return {
      success: true,
      emailLogId: emailLog._id,
      status: "queued",
      message: "Email safely queued for background delivery",
    };
  }

  /**
   * Helper alias for template-based email dispatch
   */
  async sendTemplateEmail({ to, templateId, data = {}, patientId, invoiceId, paymentId, idempotencyKey, forceImmediate }) {
    return this.sendEmail({
      to,
      templateId,
      templateData: data,
      recipientId: patientId,
      idempotencyKey,
      forceImmediate: forceImmediate ?? (process.env.NODE_ENV === "test"),
      metadata: { patientId, invoiceId, paymentId },
    });
  }

  /**
   * Retry an eligible failed email (Admin action)
   */
  async retryEmail(emailLogId) {
    const emailLog = await EmailLog.findById(emailLogId);
    if (!emailLog) {
      throw new Error("Email log record not found");
    }

    if (emailLog.status === "delivered") {
      throw new Error("Cannot retry an email that was already confirmed delivered");
    }

    if (emailLog.status === "bounced" || emailLog.status === "complained") {
      throw new Error(`Cannot automatically retry email with terminal provider status: '${emailLog.status}'`);
    }

    // Reset status to queued for immediate retry
    emailLog.status = "queued";
    emailLog.nextRetryAt = new Date();
    emailLog.failureReason = null;
    await emailLog.save();

    // Trigger immediate queue dispatch
    const updated = await this.queueService.dispatchJob(emailLog);

    return {
      success: updated.status !== "failed",
      status: updated.status,
      emailLog: updated,
    };
  }

  /**
   * Retrieve email status by ID
   */
  async getEmailStatus(emailLogId) {
    return EmailLog.findById(emailLogId).select("-metadata.password -metadata.token");
  }

  /**
   * List all templates (for backward compatibility and admin exploration)
   */
  getTemplates() {
    return this.templateService.listTemplates();
  }

  /**
   * Comprehensive health status
   */
  async getHealthStatus() {
    const providerHealth = await this.provider.checkHealth();
    const recentStats = await EmailLog.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = {};
    for (const s of recentStats) {
      statsMap[s._id] = s.count;
    }

    return {
      provider: "resend",
      displayName: "Resend Email Notification Platform",
      status: providerHealth.resendApi.status === "connected" || providerHealth.smtp.status === "connected" ? "connected" : "configured",
      configuredProvider: this.config.provider,
      fromAddress: this.config.fromEmail,
      fromName: this.config.fromName,
      queueRunning: this.queueService.isRunning,
      details: providerHealth,
      metrics: {
        totalQueued: statsMap.queued || 0,
        totalSent: statsMap.sent || 0,
        totalDelivered: statsMap.delivered || 0,
        totalFailed: statsMap.failed || 0,
        totalBounced: statsMap.bounced || 0,
      },
    };
  }

  /**
   * Fetch preferences for user
   */
  async getPreferences(userId, email) {
    let pref = await EmailPreference.findOne({ userId });
    if (!pref && email) {
      pref = await EmailPreference.create({
        userId,
        email,
      });
    }
    return pref;
  }

  /**
   * Update preferences for user
   */
  async updatePreferences(userId, updateData) {
    const sanitized = { ...updateData };
    // Transactional cannot be disabled
    delete sanitized.transactional;
    delete sanitized.userId;

    const pref = await EmailPreference.findOneAndUpdate(
      { userId },
      { $set: sanitized },
      { new: true, upsert: true }
    );
    return pref;
  }
}

module.exports = new EmailService();
