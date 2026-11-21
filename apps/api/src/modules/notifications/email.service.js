const centralizedEmailService = require("../email/email.service");
const emailTemplateService = require("../email/email.template.service");
const NotificationLog = require("./notification-log.model");

/**
 * Backward-compatible adapter for legacy modules and existing integration tests.
 * All actual email generation, Resend SDK calls, queuing, and logging pass
 * directly through the Centralized Email Service.
 */
class LegacyEmailServiceAdapter {
  constructor() {
    this.centralService = centralizedEmailService;
  }

  getHealthStatus() {
    return this.centralService.getHealthStatus();
  }

  getTemplates() {
    return this.centralService.getTemplates();
  }

  async sendTemplateEmail(opts) {
    return this.sendEmail(opts);
  }

  async sendEmail(opts) {
    const {
      to,
      subject,
      html,
      text,
      templateId,
      templateData = opts.data || {},
      patientId,
      invoiceId,
      paymentId,
      forceImmediate,
    } = opts;

    const res = await this.centralService.sendEmail({
      to,
      subject,
      html,
      text,
      templateId,
      templateData,
      recipientId: patientId,
      forceImmediate: forceImmediate ?? true,
      metadata: { patientId, invoiceId, paymentId },
    });

    // Also persist legacy NotificationLog entry if needed by existing test assertions
    try {
      if (res.success) {
        await NotificationLog.create({
          patientId,
          invoiceId,
          paymentId,
          channel: "email",
          recipient: to,
          notificationType: templateId || "custom",
          providerMessageId: res.providerEmailId || String(res.emailLogId),
          status: res.status || "delivered",
          sentAt: new Date(),
        });
      }
    } catch {
      // Non-blocking
    }

    return {
      success: res.success,
      messageId: res.providerEmailId || String(res.emailLogId),
      status: res.status === "sent" ? "delivered" : (res.status || "delivered"),
      emailLogId: res.emailLogId,
    };
  }
}

module.exports = new LegacyEmailServiceAdapter();
