const { Resend } = require("resend");
const nodemailer = require("nodemailer");
const emailConfig = require("../../config/email.config");

class EmailProvider {
  constructor() {
    this.config = emailConfig;
    this.resendClient = null;
    this.smtpTransporter = null;
    this.initClients();
  }

  initClients() {
    if (this.config.apiKey) {
      try {
        this.resendClient = new Resend(this.config.apiKey);
      } catch (err) {
        console.warn("[Email Provider] Resend client initialization notice:", err.message);
      }
    }

    if (this.config.smtpHost && this.config.smtpUser && this.config.smtpPassword) {
      try {
        this.smtpTransporter = nodemailer.createTransport({
          host: this.config.smtpHost,
          port: this.config.smtpPort,
          secure: this.config.smtpPort === 465, // true for 465, false for other ports
          auth: {
            user: this.config.smtpUser,
            pass: this.config.smtpPassword,
          },
          tls: {
            rejectUnauthorized: true,
          },
        });
      } catch (err) {
        console.warn("[Email Provider] SMTP transporter initialization notice:", err.message);
      }
    }
  }

  /**
   * Format RFC 5322 From header: "Name" <email@domain.com>
   */
  getFormattedFrom(customFrom, customName) {
    const name = customName || this.config.fromName;
    const email = customFrom || this.config.fromEmail;
    return `"${name.replace(/"/g, "")}" <${email}>`;
  }

  /**
   * Primary dispatch method: uses Resend API by default, or SMTP when specified
   */
  async send({
    to,
    subject,
    html,
    text,
    from,
    fromName,
    replyTo,
    headers = {},
    tags = [],
    useSmtp = false,
  }) {
    if (!this.config.emailEnabled) {
      return {
        success: true,
        provider: "disabled",
        providerEmailId: `disabled_${Date.now()}`,
        status: "queued",
        message: "Email dispatch is globally disabled via EMAIL_ENABLED=false",
      };
    }

    const recipientList = Array.isArray(to) ? to : [to];
    const formattedFrom = this.getFormattedFrom(from, fromName);

    // If explicit SMTP requested and configured, send via SMTP
    if (useSmtp && this.smtpTransporter) {
      return this.sendViaSmtp({
        from: formattedFrom,
        to: recipientList,
        subject,
        html,
        text,
        replyTo,
        headers,
      });
    }

    // Default: Official Resend Node.js SDK
    if (this.resendClient) {
      try {
        // Resend API send call
        const payload = {
          from: formattedFrom,
          to: recipientList,
          subject,
          html,
          text: text || undefined,
        };

        if (replyTo) payload.reply_to = replyTo;
        if (headers && Object.keys(headers).length > 0) payload.headers = headers;
        if (tags && tags.length > 0) payload.tags = tags;

        const { data, error } = await this.resendClient.emails.send(payload);

        if (error) {
          // If Resend returns an API error (e.g. domain verification or sandbox restriction)
          console.warn("[Email Provider] Resend API error response:", error.message || error);

          // If SMTP transporter is available, fall back safely to SMTP
          if (this.smtpTransporter && !useSmtp) {
            console.log("[Email Provider] Attempting graceful SMTP fallback via Resend SMTP server...");
            return await this.sendViaSmtp({
              from: formattedFrom,
              to: recipientList,
              subject,
              html,
              text,
              replyTo,
              headers,
            });
          }

          return {
            success: false,
            provider: "resend",
            providerEmailId: null,
            status: "failed",
            error: error.message || "Failed to dispatch email via Resend API",
            code: error.name || "RESEND_API_ERROR",
          };
        }

        return {
          success: true,
          provider: "resend",
          providerEmailId: data.id,
          status: "sent",
        };
      } catch (err) {
        console.warn("[Email Provider] Resend dispatch exception:", err.message);

        // Fallback to SMTP if available
        if (this.smtpTransporter && !useSmtp) {
          console.log("[Email Provider] Attempting SMTP fallback after Resend client exception...");
          return await this.sendViaSmtp({
            from: formattedFrom,
            to: recipientList,
            subject,
            html,
            text,
            replyTo,
            headers,
          });
        }

        return {
          success: false,
          provider: "resend",
          providerEmailId: null,
          status: "failed",
          error: err.message || "Unexpected error dispatching email via Resend",
        };
      }
    }

    // Fallback: SMTP if Resend API key is not present but SMTP credentials are
    if (this.smtpTransporter) {
      return this.sendViaSmtp({
        from: formattedFrom,
        to: recipientList,
        subject,
        html,
        text,
        replyTo,
        headers,
      });
    }

    // In local dev/test without credentials, simulate safely
    if (process.env.NODE_ENV !== "production") {
      const mockId = `mock_re_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return {
        success: true,
        provider: "simulated",
        providerEmailId: mockId,
        status: "sent",
        message: "Email simulated in development/test environment",
      };
    }

    return {
      success: false,
      provider: "none",
      providerEmailId: null,
      status: "failed",
      error: "No email dispatch provider (Resend API or SMTP) configured in production",
    };
  }

  /**
   * Dispatch via Resend SMTPS
   */
  async sendViaSmtp({ from, to, subject, html, text, replyTo, headers }) {
    if (!this.smtpTransporter) {
      return {
        success: false,
        provider: "smtp",
        providerEmailId: null,
        status: "failed",
        error: "SMTP transporter is not configured or initialized",
      };
    }

    try {
      const mailOptions = {
        from,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html,
        text: text || undefined,
        replyTo,
        headers,
      };

      const info = await this.smtpTransporter.sendMail(mailOptions);
      const messageId = info.messageId ? info.messageId.replace(/[<>]/g, "") : `smtp_${Date.now()}`;

      return {
        success: true,
        provider: "smtp",
        providerEmailId: messageId,
        status: "sent",
      };
    } catch (err) {
      console.warn("[Email Provider] SMTP delivery failed:", err.message);
      return {
        success: false,
        provider: "smtp",
        providerEmailId: null,
        status: "failed",
        error: err.message || "SMTP dispatch failed",
      };
    }
  }

  /**
   * Health verification without sending an email
   */
  async checkHealth() {
    const health = {
      provider: "resend",
      resendApi: {
        configured: Boolean(this.config.apiKey),
        status: "unknown",
      },
      smtp: {
        configured: Boolean(this.smtpTransporter),
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        status: "unknown",
      },
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      enabled: this.config.emailEnabled,
    };

    if (this.resendClient && this.config.apiKey) {
      try {
        // Attempt lightweight API check: list api keys or domains
        const domainCheck = await this.resendClient.domains.list();
        if (domainCheck.error) {
          health.resendApi.status = "error";
          health.resendApi.message = domainCheck.error.message;
        } else {
          health.resendApi.status = "connected";
          health.resendApi.domainsCount = domainCheck.data?.data?.length || 0;
        }
      } catch (err) {
        health.resendApi.status = "error";
        health.resendApi.message = err.message;
      }
    } else {
      health.resendApi.status = "not_configured";
    }

    if (this.smtpTransporter) {
      try {
        await this.smtpTransporter.verify();
        health.smtp.status = "connected";
      } catch (err) {
        health.smtp.status = "error";
        health.smtp.message = err.message;
      }
    } else {
      health.smtp.status = "not_configured";
    }

    return health;
  }
}

module.exports = new EmailProvider();
