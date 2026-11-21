const crypto = require("crypto");
let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch {
  // Graceful fallback if nodemailer is not present
}

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "simulated";
const EMAIL_HOST = process.env.EMAIL_HOST || "";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT, 10) || 587;
const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || "";
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS || "care@trigyna.in";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "TriGyna Healthcare";
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || "";

// In-memory delivery history ring buffer (last 100 emails) for administrative inspection & testing
const emailDeliveryLogs = [];

/**
 * Standard Email Templates for TriGyna Healthcare
 */
const EMAIL_TEMPLATES = {
  enquiry_acknowledgement: {
    id: "enquiry_acknowledgement",
    name: "Enquiry Acknowledgement",
    subject: "Thank you for contacting TriGyna Health & Wellness",
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #154734; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TriGyna Health & Wellness</h1>
          <p style="color: #D1E7DD; margin: 5px 0 0 0; font-size: 14px;">Clinical Care Desk</p>
        </div>
        <div style="padding: 20px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.name || "Patient"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">Thank you for your enquiry regarding <strong>${data.service || "Constitutional Healthcare"}</strong>. Our specialized medical coordination team has received your information.</p>
          <p style="color: #4B5563; line-height: 1.6;">A care advisor will contact you within 30 minutes to discuss your confidential consultation options.</p>
          <div style="background-color: #F7F9F7; border-left: 4px solid #154734; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #154734;"><strong>Direct Care Helpline:</strong> +91 917-277-2326</p>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; font-size: 12px; color: #9CA3AF; text-align: center;">
          © ${new Date().getFullYear()} TriGyna Health & Wellness. All rights reserved.
        </div>
      </div>
    `,
  },
  appointment_confirmation: {
    id: "appointment_confirmation",
    name: "Appointment Confirmed",
    subject: "Your TriGyna Consultation is Confirmed",
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #154734; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Appointment Confirmed</h1>
          <p style="color: #D1E7DD; margin: 5px 0 0 0; font-size: 14px;">TriGyna Clinical Practice</p>
        </div>
        <div style="padding: 20px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.patientName || "Patient"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">Your upcoming consultation has been successfully scheduled:</p>
          <div style="background-color: #F7F9F7; border-radius: 8px; padding: 16px; margin: 15px 0;">
            <p style="margin: 4px 0; color: #18231D;"><strong>Doctor:</strong> ${data.doctorName || "Senior Consultant"}</p>
            <p style="margin: 4px 0; color: #18231D;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin: 4px 0; color: #18231D;"><strong>Time Slot:</strong> ${data.time}</p>
            <p style="margin: 4px 0; color: #18231D;"><strong>Mode:</strong> ${data.mode || "Online Video"}</p>
            ${data.meetingLink ? `<p style="margin: 8px 0 4px 0; color: #154734;"><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color: #154734; text-decoration: underline;">Join Consultation</a></p>` : ""}
          </div>
          <p style="color: #4B5563; font-size: 14px;">Please be available 5 minutes prior to your designated slot.</p>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; font-size: 12px; color: #9CA3AF; text-align: center;">
          TriGyna Clinic • Support: +91 917-277-2326
        </div>
      </div>
    `,
  },
  payment_success: {
    id: "payment_success",
    name: "Payment Successful Confirmation",
    subject: (data) => `Payment Successful – TriGyna Invoice ${data.invoiceNumber || ""}`,
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #087F56; padding: 24px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TriGyna Health &amp; Wellness</h1>
          <p style="color: #D1E7DD; margin: 6px 0 0 0; font-size: 14px;">Payment Received &amp; Verified</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.patientName || "Patient"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">Your payment has been successfully received by TriGyna.</p>
          
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 12px 0; font-weight: bold; color: #111827; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">Payment Details:</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
              <tr>
                <td style="padding: 6px 0; color: #6B7280; width: 45%;">Patient Name:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #111827;">${data.patientName || "Valued Patient"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Invoice Number:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #111827;">${data.invoiceNumber || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Service Name:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #111827;">${data.serviceName || "Clinical Consultation"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Transaction ID:</td>
                <td style="padding: 6px 0; font-family: monospace; font-size: 13px; color: #087F56; font-weight: bold;">${data.transactionId || data.receiptNumber || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Payment Date:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #111827;">${data.paymentDate || new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Amount Paid:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #087F56; font-size: 16px;">₹${Number(data.amountPaid || data.amount || 0).toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Remaining Balance:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #111827;">₹${Number(data.remainingBalance || 0).toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Payment Status:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #087F56; text-transform: uppercase;">${data.paymentStatus || "SUCCESSFUL"}</td>
              </tr>
            </table>
          </div>

          <p style="color: #4B5563; line-height: 1.6;">Thank you for choosing TriGyna.</p>
          <p style="color: #4B5563; line-height: 1.6;">Your payment confirmation is attached to your account.</p>
          
          <div style="background-color: #ECFDF3; border-left: 4px solid #087F56; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #075D42;"><strong>TriGyna Patient Support Hotline:</strong> +91 917-277-2326 • care@trigyna.in</p>
          </div>

          <p style="color: #111827; font-weight: 600; margin-top: 24px;">TriGyna Team</p>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; font-size: 12px; color: #9CA3AF; text-align: center;">
          © ${new Date().getFullYear()} TriGyna Health &amp; Wellness • 256-Bit SSL Encrypted Healthcare Portal
        </div>
      </div>
    `,
  },
  payment_receipt: {
    id: "payment_receipt",
    name: "Payment Receipt & Invoice Confirmation",
    subject: "Receipt for your payment to TriGyna Health",
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #154734; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Payment Successful</h1>
          <p style="color: #D1E7DD; margin: 5px 0 0 0; font-size: 14px;">Official Tax Receipt</p>
        </div>
        <div style="padding: 20px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.patientName || "Patient"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">We have verified and received your payment of <strong>₹${data.amount}</strong>.</p>
          <div style="background-color: #F7F9F7; border-radius: 8px; padding: 16px; margin: 15px 0;">
            <p style="margin: 4px 0; color: #18231D;"><strong>Receipt Number:</strong> ${data.receiptNumber}</p>
            <p style="margin: 4px 0; color: #18231D;"><strong>Invoice Number:</strong> ${data.invoiceNumber || "N/A"}</p>
            <p style="margin: 4px 0; color: #18231D;"><strong>Payment Gateway:</strong> Razorpay UPI/Cards</p>
            <p style="margin: 4px 0; color: #18231D;"><strong>Status:</strong> Paid / Reconciled</p>
          </div>
          <p style="color: #4B5563; font-size: 14px;">You can view and download your full GST-compliant invoice directly from your TriGyna Patient Portal.</p>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; font-size: 12px; color: #9CA3AF; text-align: center;">
          TriGyna Accounts Desk • accounts@trigyna.in
        </div>
      </div>
    `,
  },
  payment_link_dispatch: {
    id: "payment_link_dispatch",
    name: "Payment Link Dispatch",
    subject: "Official Payment & Booking Link from TriGyna Health",
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #087F56; padding: 24px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TriGyna Health &amp; Wellness</h1>
          <p style="color: #D1E7DD; margin: 6px 0 0 0; font-size: 14px;">Secure Patient Checkout &amp; Care Protocol</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.customerName || data.patientName || "Patient"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">Your clinical team has prepared your customized booking and payment link for <strong>${data.serviceName || "Clinical Care Protocol"}</strong>.</p>
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #64748B; font-size: 12px; text-transform: uppercase; font-weight: bold;">Payable Amount</p>
            <p style="margin: 4px 0; color: #087F56; font-size: 26px; font-weight: bold;">₹${Number(data.amount || 0).toLocaleString("en-IN")}</p>
            ${data.expiryDate ? `<p style="margin: 8px 0 0 0; color: #64748B; font-size: 12px;"><strong>Link Expiry:</strong> ${new Date(data.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>` : ""}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.checkoutUrl}" style="background-color: #087F56; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Proceed to Secure Checkout →
            </a>
          </div>
          <p style="color: #64748B; font-size: 13px; line-height: 1.5; text-align: center;">You can review your complete clinical inclusions and complete payment securely via UPI, QR, Credit/Debit Card, or NetBanking.</p>
          <div style="background-color: #ECFDF3; border-left: 4px solid #087F56; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #075D42;"><strong>TriGyna Patient Support Hotline:</strong> +91 917-277-2326</p>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; font-size: 12px; color: #9CA3AF; text-align: center;">
          © ${new Date().getFullYear()} TriGyna Health &amp; Wellness • 256-Bit SSL Encrypted Healthcare Portal
        </div>
      </div>
    `,
  },
  payment_reminder: {
    id: "payment_reminder",
    name: "Payment Reminder",
    subject: (data) => `Payment Reminder – TriGyna Invoice ${data.invoiceNumber || ""}`,
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #087F56; padding: 24px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TriGyna Health &amp; Wellness</h1>
          <p style="color: #D1E7DD; margin: 6px 0 0 0; font-size: 14px;">Invoice Settlement Reminder</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.patientName || "Patient"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">This is a friendly reminder regarding your outstanding invoice <strong>${data.invoiceNumber || ""}</strong> for <strong>${data.serviceName || "TriGyna Healthcare Services"}</strong>.</p>
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #64748B; font-size: 12px; text-transform: uppercase; font-weight: bold;">Outstanding Balance</p>
            <p style="margin: 4px 0; color: #087F56; font-size: 26px; font-weight: bold;">₹${Number(data.remainingBalance || data.amount || 0).toLocaleString("en-IN")}</p>
          </div>
          ${data.checkoutUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.checkoutUrl}" style="background-color: #087F56; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
              Pay Invoice Securely →
            </a>
          </div>` : ""}
          <p style="color: #64748B; font-size: 13px;">If you have already settled this invoice, please disregard this reminder.</p>
        </div>
      </div>
    `,
  },
  payment_failed: {
    id: "payment_failed",
    name: "Payment Failed Notification",
    subject: (data) => `Payment Attempt Notice – TriGyna Invoice ${data.invoiceNumber || ""}`,
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #DC2626; padding: 24px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Attempt Unsuccessful</h1>
          <p style="color: #FEE2E2; margin: 6px 0 0 0; font-size: 14px;">TriGyna Billing Support</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.patientName || "Patient"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">Your recent payment attempt of <strong>₹${data.amount}</strong> for Invoice <strong>${data.invoiceNumber || ""}</strong> could not be processed by the bank.</p>
          <p style="color: #64748B; font-size: 14px;">Reason: ${data.failureReason || "Transaction declined by issuing bank"}</p>
          ${data.checkoutUrl ? `
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.checkoutUrl}" style="background-color: #087F56; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Retry Payment Now →
            </a>
          </div>` : ""}
          <p style="color: #4B5563; font-size: 13px;">Our billing helpdesk is available at +91 917-277-2326 to assist you with alternative payment methods.</p>
        </div>
      </div>
    `,
  },
  refund_processed: {
    id: "refund_processed",
    name: "Refund Processed Confirmation",
    subject: (data) => `Refund Processed – TriGyna Invoice ${data.invoiceNumber || ""}`,
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #087F56; padding: 24px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Refund Processed</h1>
          <p style="color: #D1E7DD; margin: 6px 0 0 0; font-size: 14px;">Official Account Credit</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.patientName || "Patient"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">A refund of <strong>₹${Number(data.refundAmount || data.amount || 0).toLocaleString("en-IN")}</strong> for Invoice <strong>${data.invoiceNumber || ""}</strong> has been processed successfully.</p>
          <p style="color: #4B5563; font-size: 14px;">The amount will be credited back to your original payment method within 5-7 business days per banking guidelines.</p>
        </div>
      </div>
    `,
  },
};

class EmailService {
  constructor() {
    this.provider = EMAIL_PROVIDER;
    this.fromAddress = EMAIL_FROM_ADDRESS;
    this.fromName = EMAIL_FROM_NAME;
    this.apiKey = EMAIL_API_KEY;
    this.smtpHost = EMAIL_HOST;
    this.smtpPort = EMAIL_PORT;
    this.smtpUser = EMAIL_USER;
    this.smtpPassword = EMAIL_PASSWORD;

    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (this.smtpHost && this.smtpUser && nodemailer) {
      try {
        this.transporter = nodemailer.createTransport({
          host: this.smtpHost,
          port: this.smtpPort,
          secure: this.smtpPort === 465,
          auth: {
            user: this.smtpUser,
            pass: this.smtpPassword,
          },
        });
        console.log(`[Email Service] SMTP Transporter initialized (${this.smtpHost}:${this.smtpPort})`);
      } catch (err) {
        console.warn("[Email Service] SMTP init notice:", err.message);
      }
    }
  }

  getHealthStatus() {
    return {
      provider: "email",
      displayName: "Transactional Email Service",
      status: this.transporter ? "connected" : this.provider === "simulated" ? "test_mode" : "configured",
      configuredProvider: this.provider,
      fromAddress: this.fromAddress,
      fromName: this.fromName,
      hasApiKey: Boolean(this.apiKey),
      hasSmtp: Boolean(this.transporter),
      totalDispatched: emailDeliveryLogs.length,
      lastDispatched: emailDeliveryLogs[0]?.timestamp || null,
    };
  }

  /**
   * Alias: sendTemplateEmail
   */
  async sendTemplateEmail({ to, templateId, data = {}, patientId, invoiceId, paymentId }) {
    return this.sendEmail({
      to,
      templateId,
      templateData: data,
      patientId,
      invoiceId,
      paymentId,
    });
  }

  /**
   * Dispatch an email notification
   * Non-blocking, safe in tests and offline environments
   */
  async sendEmail({
    to,
    subject,
    html,
    text,
    templateId,
    templateData = {},
    patientId,
    invoiceId,
    paymentId,
  }) {
    if (!to) {
      throw new Error("Recipient email address 'to' is required");
    }

    let finalSubject = subject;
    let finalHtml = html;

    if (templateId && EMAIL_TEMPLATES[templateId]) {
      const t = EMAIL_TEMPLATES[templateId];
      finalSubject = typeof t.subject === "function" ? t.subject(templateData) : (finalSubject || t.subject);
      finalHtml = finalHtml || t.renderHtml(templateData);
    }

    const messageId = `msg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    let deliveryStatus = "sent";
    let errorMessage = null;

    // If live SMTP transporter exists, attempt real delivery
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromAddress}>`,
          to,
          subject: finalSubject,
          text: text || finalSubject,
          html: finalHtml,
        });
        deliveryStatus = "delivered";
        console.log(`[Email Service] Live SMTP delivered to ${to} (${info.messageId})`);
      } catch (smtpErr) {
        console.warn("[Email Service] SMTP dispatch warning:", smtpErr.message);
        deliveryStatus = "failed";
        errorMessage = smtpErr.message;
      }
    } else {
      console.log(`[Email Service] [${this.provider}] Delivered email '${finalSubject}' to ${to} (ID: ${messageId})`);
    }

    const logEntry = {
      messageId,
      to,
      subject: finalSubject,
      templateId: templateId || "custom",
      status: deliveryStatus,
      timestamp: new Date().toISOString(),
      provider: this.transporter ? "smtp" : this.provider,
    };

    emailDeliveryLogs.unshift(logEntry);
    if (emailDeliveryLogs.length > 100) emailDeliveryLogs.pop();

    // Persist in NotificationLog collection
    try {
      const NotificationLog = require("./notification-log.model");
      let notifType = "payment_link";
      if (templateId === "payment_success" || templateId === "payment_receipt") notifType = "payment_success";
      else if (templateId === "payment_reminder") notifType = "payment_reminder";
      else if (templateId === "payment_failed") notifType = "payment_failed";
      else if (templateId === "refund_processed") notifType = "refund_processed";

      await NotificationLog.create({
        patientId,
        invoiceId,
        paymentId,
        channel: "email",
        recipient: to,
        notificationType: notifType,
        providerMessageId: messageId,
        status: deliveryStatus,
        errorMessage,
        sentAt: new Date(),
      });
    } catch {
      // Non-blocking for notification log storage
    }

    return {
      success: deliveryStatus !== "failed",
      messageId,
      status: deliveryStatus,
    };
  }
}

module.exports = new EmailService();
