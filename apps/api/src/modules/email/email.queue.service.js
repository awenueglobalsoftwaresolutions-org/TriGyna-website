const EmailLog = require("./email-log.model");
const emailProvider = require("./email.provider");

class EmailQueueService {
  constructor() {
    this.isRunning = false;
    this.timer = null;
    this.pollIntervalMs = 5000;
    this.batchSize = 10;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextPoll();
    console.log("[Email Queue Worker] Started background email processing worker.");
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log("[Email Queue Worker] Stopped background email processing worker.");
  }

  scheduleNextPoll() {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      try {
        await this.processBatch();
      } catch (err) {
        console.error("[Email Queue Worker] Error during batch run:", err.message);
      } finally {
        this.scheduleNextPoll();
      }
    }, this.pollIntervalMs);
  }

  /**
   * Exponential backoff calculation
   * attempt 0: ~1s
   * attempt 1: ~4s
   * attempt 2: ~16s
   * max capped at 5 minutes (300,000ms)
   */
  getBackoffMs(retryCount) {
    const base = 1000;
    const factor = 4;
    return Math.min(300000, base * Math.pow(factor, retryCount));
  }

  async processBatch() {
    const now = new Date();
    // Claim up to batchSize emails atomically
    for (let i = 0; i < this.batchSize; i++) {
      if (!this.isRunning) break;

      const email = await EmailLog.findOneAndUpdate(
        {
          status: "queued",
          $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
        },
        {
          $set: {
            status: "sending",
            lastAttemptAt: now,
          },
        },
        { new: true }
      );

      if (!email) {
        // No more ready jobs in queue
        break;
      }

      await this.dispatchJob(email);
    }
  }

  async dispatchJob(email) {
    try {
      const { templateName, metadata, subject, recipient } = email;

      // Render template HTML if available
      const emailTemplateService = require("./email.template.service");
      let html = null;
      let finalSubject = subject;

      if (templateName && templateName !== "custom") {
        try {
          const rendered = emailTemplateService.renderTemplate(templateName, {
            ...metadata,
            email: recipient,
            subject,
          });
          html = rendered.html;
          finalSubject = rendered.subject || subject;
        } catch (tErr) {
          console.warn(`[Email Queue Worker] Template render error for '${templateName}':`, tErr.message);
        }
      }

      const sendResult = await emailProvider.send({
        to: recipient,
        subject: finalSubject,
        html: html || `<p>${subject}</p>`,
        tags: [{ name: "notification_type", value: email.notificationType || "general" }],
      });

      if (sendResult.success) {
        email.status = "sent";
        email.provider = sendResult.provider;
        email.providerEmailId = sendResult.providerEmailId;
        email.sentAt = new Date();
        email.failureReason = null;
        email.nextRetryAt = null;
        await email.save();
        return email;
      } else {
        return await this.handleFailure(email, sendResult.error || "Email provider dispatch returned failure");
      }
    } catch (err) {
      return await this.handleFailure(email, err.message);
    }
  }

  async handleFailure(email, errorMessage) {
    const newRetryCount = (email.retryCount || 0) + 1;
    const maxRetries = email.maxRetries || 3;

    email.retryCount = newRetryCount;
    email.failureReason = errorMessage;

    if (newRetryCount < maxRetries) {
      const delayMs = this.getBackoffMs(newRetryCount);
      email.status = "queued";
      email.nextRetryAt = new Date(Date.now() + delayMs);
      console.warn(`[Email Queue Worker] Email to ${email.recipient} failed (attempt ${newRetryCount}/${maxRetries}). Retrying in ${delayMs / 1000}s. Reason: ${errorMessage}`);
    } else {
      email.status = "failed";
      email.failedAt = new Date();
      email.nextRetryAt = null;
      console.error(`[Email Queue Worker] Email to ${email.recipient} permanently failed after ${newRetryCount} attempts. Error: ${errorMessage}`);
    }

    await email.save();
    return email;
  }
}

module.exports = new EmailQueueService();
