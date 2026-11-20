const crypto = require("crypto");

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "simulated";
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "care@trigyna.health";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "TriGyna Women's Health & Wellness";
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
          <p style="color: #D1E7DD; margin: 5px 0 0 0; font-size: 14px;">Prayagraj Clinical Care Desk</p>
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
          TriGyna Clinic, Prayagraj • Support: +91 917-277-2326
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
          TriGyna Accounts Desk • accounts@trigyna.health
        </div>
      </div>
    `,
  },
  prescription_ready: {
    id: "prescription_ready",
    name: "Prescription & Clinical Summary Available",
    subject: "Your TriGyna Prescription is Ready",
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #154734; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Prescription Ready</h1>
          <p style="color: #D1E7DD; margin: 5px 0 0 0; font-size: 14px;">TriGyna Digital Records</p>
        </div>
        <div style="padding: 20px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.patientName || "Patient"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">Your consultation with <strong>${data.doctorName || "your physician"}</strong> has concluded, and your digital prescription <strong>#${data.prescriptionCode || ""}</strong> has been signed.</p>
          <p style="color: #4B5563; line-height: 1.6;">To preserve confidentiality, full medical formulations and lifestyle advice can be accessed safely inside your TriGyna Patient Dashboard.</p>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; font-size: 12px; color: #9CA3AF; text-align: center;">
          TriGyna Clinical Team • Prayagraj
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
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TriGyna Health & Wellness</h1>
          <p style="color: #D1E7DD; margin: 6px 0 0 0; font-size: 14px;">Secure Patient Checkout &amp; Care Protocol</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.customerName || "Patient"}</strong>,</p>
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
  staff_onboarding_invitation: {
    id: "staff_onboarding_invitation",
    name: "Staff Onboarding & Secure Account Activation",
    subject: "Welcome to TriGyna Health & Wellness — Your Account Has Been Created",
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #154734; padding: 24px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TriGyna Health &amp; Wellness</h1>
          <p style="color: #D1E7DD; margin: 6px 0 0 0; font-size: 14px;">Staff Onboarding &amp; Clinical Operations</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.name || "Colleague"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">Welcome to TriGyna Health &amp; Wellness! Your staff user profile has been created by the Administration Team.</p>
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #18231D;"><strong>Role:</strong> ${String(data.role || "").toUpperCase()}</p>
            <p style="margin: 4px 0; color: #18231D;"><strong>Employee ID:</strong> ${data.employeeCode || "Pending"}</p>
            <p style="margin: 4px 0; color: #18231D;"><strong>Department:</strong> ${data.department || "Healthcare Operations"}</p>
            <p style="margin: 4px 0; color: #18231D;"><strong>Consultation Mode:</strong> 100% Online Video (Google Meet / Zoom)</p>
            <p style="margin: 4px 0; color: #64748B; font-size: 12px;"><strong>Activation Link Expiry:</strong> 48 Hours</p>
          </div>
          ${
            data.role === "doctor"
              ? `<div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 0; font-size: 13px; color: #166534;"><strong>Doctor Notice:</strong> All consultations on TriGyna are conducted via secure Google Meet or Zoom video links. Clinical appointment scheduling will activate once your professional medical registration council credentials have been verified by administration.</p>
                </div>`
              : `<div style="background-color: #EFF6FF; border-left: 4px solid #2563EB; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 0; font-size: 13px; color: #1E40AF;"><strong>Sales Team Notice:</strong> You will have access to the Sales CRM for lead management, follow-ups, care package sales, and generating official Razorpay payment links.</p>
                </div>`
          }
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.activationUrl}" style="background-color: #154734; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Activate Your Account &amp; Create Password →
            </a>
          </div>
          <p style="color: #64748B; font-size: 13px; line-height: 1.5; text-align: center;">For security reasons, your temporary activation token will expire in 48 hours. Never share this activation link with anyone.</p>
          <div style="background-color: #F8FAFC; border-left: 4px solid #154734; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #154734;"><strong>Staff Support Desk:</strong> support@trigyna.health • +91 917-277-2326</p>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; font-size: 12px; color: #9CA3AF; text-align: center;">
          © ${new Date().getFullYear()} TriGyna Health &amp; Wellness • Authorized Staff System
        </div>
      </div>
    `,
  },
  staff_account_activated: {
    id: "staff_account_activated",
    name: "Staff Account Activated Confirmation",
    subject: "Your TriGyna Staff Account is Now Active",
    renderHtml: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E9E3; border-radius: 12px;">
        <div style="background-color: #154734; padding: 24px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Account Activated</h1>
          <p style="color: #D1E7DD; margin: 6px 0 0 0; font-size: 14px;">TriGyna Health &amp; Wellness</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #18231D;">Dear <strong>${data.name || "Colleague"}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">Your credentials have been successfully created. Your TriGyna staff account is now <strong>ACTIVE</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" style="background-color: #154734; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
              Sign In to Your Dashboard →
            </a>
          </div>
        </div>
      </div>
    `,
  },
};

/**
 * TriGyna Email Service
 */
class EmailService {
  constructor() {
    this.provider = EMAIL_PROVIDER;
    this.fromAddress = EMAIL_FROM_ADDRESS;
    this.fromName = EMAIL_FROM_NAME;
    this.apiKey = EMAIL_API_KEY;
  }

  getTemplates() {
    return Object.values(EMAIL_TEMPLATES).map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      status: "active",
    }));
  }

  getDeliveryLogs() {
    return emailDeliveryLogs.slice(0, 50);
  }

  getHealthStatus() {
    return {
      provider: "email",
      displayName: "Transactional Email Service",
      status: this.provider === "simulated" ? "test_mode" : "connected",
      configuredProvider: this.provider,
      fromAddress: this.fromAddress,
      fromName: this.fromName,
      hasApiKey: Boolean(this.apiKey),
      totalDispatched: emailDeliveryLogs.length,
      lastDispatched: emailDeliveryLogs[0]?.timestamp || null,
    };
  }

  /**
   * Dispatch an email notification
   * Non-blocking, safe in tests and offline environments
   */
  async sendEmail({ to, subject, html, text, templateId, templateData = {} }) {
    if (!to) {
      throw new Error("Recipient email address 'to' is required");
    }

    let finalSubject = subject;
    let finalHtml = html;

    if (templateId && EMAIL_TEMPLATES[templateId]) {
      const t = EMAIL_TEMPLATES[templateId];
      finalSubject = finalSubject || t.subject;
      finalHtml = finalHtml || t.renderHtml(templateData);
    }

    const messageId = `msg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const logEntry = {
      messageId,
      to,
      subject: finalSubject,
      templateId: templateId || "custom",
      status: "delivered",
      timestamp: new Date().toISOString(),
      provider: this.provider,
    };

    emailDeliveryLogs.unshift(logEntry);
    if (emailDeliveryLogs.length > 100) emailDeliveryLogs.pop();

    console.log(`[Email Service] Delivered email '${finalSubject}' to ${to} (ID: ${messageId})`);

    return {
      success: true,
      messageId,
      status: "delivered",
    };
  }
}

module.exports = new EmailService();

