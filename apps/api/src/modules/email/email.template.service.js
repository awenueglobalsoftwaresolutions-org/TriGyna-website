const emailConfig = require("../../config/email.config");

/**
 * Escapes untrusted text to prevent HTML injection / XSS
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Common TriGyna Healthcare Email Shell / Layout
 */
function renderBaseLayout({ title, subtitle, content, recipientEmail, showPreferencesLink = true }) {
  const currentYear = new Date().getFullYear();
  const frontendUrl = emailConfig.frontendUrl || "https://www.trigyna.in";
  const preferencesUrl = `${frontendUrl}/patient/notifications`;
  const privacyUrl = `${frontendUrl}/privacy-policy`;
  const termsUrl = `${frontendUrl}/terms-and-conditions`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title || "TriGyna Healthcare")}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F4F7F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18231D; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .email-container { max-width: 600px; margin: 24px auto; background-color: #ffffff; border: 1px solid #E2E9E3; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(21, 71, 52, 0.05); }
    .header { background: linear-gradient(135deg, #154734 0%, #0d3224 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .brand-title { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .brand-subtitle { margin: 6px 0 0 0; font-size: 13px; color: #D1E7DD; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }
    .body-content { padding: 32px 28px; line-height: 1.6; font-size: 15px; color: #2C3E35; }
    .btn { display: inline-block; background-color: #154734; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; text-align: center; }
    .btn-secondary { background-color: #087F56; }
    .info-card { background-color: #F8FAF9; border: 1px solid #E6ECE8; border-radius: 10px; padding: 18px; margin: 20px 0; }
    .security-notice { background-color: #FEF3C7; border-left: 4px solid #D97706; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #92400E; margin: 20px 0; }
    .footer { background-color: #FAFCFA; border-top: 1px solid #EAEFEA; padding: 24px 20px; text-align: center; font-size: 12px; color: #68756D; line-height: 1.5; }
    .footer a { color: #154734; text-decoration: underline; }
    .footer-links { margin-bottom: 12px; }
    .helpline-strip { background-color: #EBF3EE; color: #154734; font-size: 13px; padding: 12px; text-align: center; border-radius: 8px; margin-top: 24px; font-weight: 500; }
  </style>
</head>
<body>
  <div style="background-color: #F4F7F5; padding: 20px 10px;">
    <div class="email-container">
      <div class="header">
        <h1 class="brand-title">TriGyna</h1>
        <p class="brand-subtitle">${escapeHtml(subtitle || "Women's Health & Constitutional Wellness")}</p>
      </div>
      <div class="body-content">
        ${content}
        <div class="helpline-strip">
          Direct Patient Support Helpline: <strong>+91 917-277-2326</strong> &bull; care@trigyna.in
        </div>
      </div>
      <div class="footer">
        <div class="footer-links">
          <a href="${privacyUrl}">Privacy Policy</a> &bull;
          <a href="${termsUrl}">Terms of Care</a>
          ${showPreferencesLink ? ` &bull; <a href="${preferencesUrl}">Notification Preferences</a>` : ""}
        </div>
        <p style="margin: 4px 0;">&copy; ${currentYear} TriGyna Health &amp; Wellness. All rights reserved.</p>
        <p style="margin: 4px 0; font-size: 11px; color: #8F9E94;">
          This is a confidential transactional notification intended exclusively for ${escapeHtml(recipientEmail || "the designated recipient")}.
          To safeguard patient privacy, clinical records and sensitive details are accessible solely via the authenticated patient portal.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Standard Email Template Catalogue
 */
const TEMPLATES = {
  // -------------------------------------------------------------
  // AUTHENTICATION TEMPLATES
  // -------------------------------------------------------------
  email_verification: {
    id: "email_verification",
    category: "auth",
    name: "Email Address Verification",
    subject: "Verify your email address for TriGyna Healthcare",
    render: (data) => {
      const verifyUrl = data.verificationUrl || `${emailConfig.frontendUrl}/verify-email?token=${encodeURIComponent(data.token || "")}`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Welcome to TriGyna Healthcare</h2>
        <p>Dear <strong>${escapeHtml(data.name || "Patient")}</strong>,</p>
        <p>Thank you for establishing your healthcare account with TriGyna. To secure your account and activate authenticated features, please verify your email address:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${verifyUrl}" class="btn">Verify Email Address &rarr;</a>
        </div>
        <p style="font-size: 13px; color: #64748B;">This secure verification link will expire in <strong>24 hours</strong> and can only be used once.</p>
        <p style="font-size: 12px; color: #94A3B8; word-break: break-all;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${verifyUrl}" style="color: #154734;">${verifyUrl}</a></p>
        <div class="security-notice">
          <strong>Security note:</strong> If you did not create an account with TriGyna Healthcare, please ignore this email or notify our security team at security@trigyna.in.
        </div>
      `;
      return renderBaseLayout({
        title: "Verify your email address - TriGyna",
        subtitle: "Account Security & Verification",
        content,
        recipientEmail: data.email,
        showPreferencesLink: false,
      });
    },
  },

  password_reset: {
    id: "password_reset",
    category: "auth",
    name: "Password Reset Request",
    subject: "Reset your TriGyna account password",
    render: (data) => {
      const resetUrl = data.resetUrl || `${emailConfig.frontendUrl}/reset-password?token=${encodeURIComponent(data.token || "")}`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Password Reset Request</h2>
        <p>Dear <strong>${escapeHtml(data.name || "Valued User")}</strong>,</p>
        <p>We received a request to reset the password for your TriGyna Healthcare account.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" class="btn">Reset Password &rarr;</a>
        </div>
        <div class="info-card">
          <p style="margin: 0; font-size: 13px; color: #4B5563;"><strong>Security Details:</strong></p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B;">
            &bull; Link Validity: <strong>15 minutes</strong><br/>
            &bull; Single-use security token<br/>
            &bull; Requested at: ${new Date().toUTCString()}
          </p>
        </div>
        <div class="security-notice">
          <strong>Notice:</strong> If you did not request this password reset, please ignore this email. Your existing password remains secure and unchanged.
        </div>
      `;
      return renderBaseLayout({
        title: "Reset your password - TriGyna",
        subtitle: "Account Security Desk",
        content,
        recipientEmail: data.email,
        showPreferencesLink: false,
      });
    },
  },

  password_changed: {
    id: "password_changed",
    category: "auth",
    name: "Password Changed Confirmation",
    subject: "Your TriGyna account password was changed",
    render: (data) => {
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Password Updated Successfully</h2>
        <p>Dear <strong>${escapeHtml(data.name || "Valued User")}</strong>,</p>
        <p>This is confirmation that the password for your TriGyna account (<strong>${escapeHtml(data.email || "")}</strong>) was changed on <strong>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</strong>.</p>
        <div class="security-notice">
          <strong>Important Security Notice:</strong> If you did not authorize this change, please immediately reset your password and contact our clinical security desk at <strong>+91 917-277-2326</strong>.
        </div>
        <p>All active sessions have been securely synchronized.</p>
      `;
      return renderBaseLayout({
        title: "Password Changed - TriGyna",
        subtitle: "Security & Account Integrity",
        content,
        recipientEmail: data.email,
        showPreferencesLink: false,
      });
    },
  },

  security_alert_login: {
    id: "security_alert_login",
    category: "auth",
    name: "Login Security Alert",
    subject: "New login to your TriGyna account",
    render: (data) => {
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Security Alert: Successful Login</h2>
        <p>Dear <strong>${escapeHtml(data.name || "Valued User")}</strong>,</p>
        <p>Your TriGyna account was just accessed from a new session.</p>
        <div class="info-card">
          <table style="width: 100%; font-size: 13px;">
            <tr><td style="color: #64748B; width: 40%; padding: 4px 0;">Time:</td><td style="font-weight: 600;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td></tr>
            <tr><td style="color: #64748B; padding: 4px 0;">IP Address:</td><td style="font-family: monospace;">${escapeHtml(data.ipAddress || "Recognized network")}</td></tr>
            <tr><td style="color: #64748B; padding: 4px 0;">Device/Browser:</td><td>${escapeHtml(data.userAgent || "Web browser")}</td></tr>
          </table>
        </div>
        <p style="font-size: 13px; color: #4B5563;">If this was you, you can safely disregard this message. If you do not recognize this activity, please change your password immediately.</p>
      `;
      return renderBaseLayout({
        title: "Login Alert - TriGyna",
        subtitle: "Account Security Monitor",
        content,
        recipientEmail: data.email,
        showPreferencesLink: false,
      });
    },
  },

  security_alert_new_device: {
    id: "security_alert_new_device",
    category: "auth",
    name: "Unrecognized Device Alert",
    subject: "Security Alert: Sign-in from an unrecognized device",
    render: (data) => {
      const content = `
        <h2 style="color: #92400E; margin-top: 0;">Sign-in from an Unrecognized Device</h2>
        <p>Dear <strong>${escapeHtml(data.name || "Valued User")}</strong>,</p>
        <p>We detected a sign-in to your TriGyna account from a device or location not previously associated with your profile.</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Device:</strong> ${escapeHtml(data.device || "Unknown Device")}</p>
          <p style="margin: 4px 0;"><strong>Approximate Location:</strong> ${escapeHtml(data.location || "India")}</p>
          <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
        </div>
        <div class="security-notice">
          If you did not initiate this login, someone else may have gained access to your credentials. Change your password immediately to terminate unauthorized access.
        </div>
      `;
      return renderBaseLayout({
        title: "Unrecognized Device Sign-in - TriGyna",
        subtitle: "Account Protection System",
        content,
        recipientEmail: data.email,
        showPreferencesLink: false,
      });
    },
  },

  // -------------------------------------------------------------
  // PATIENT WORKFLOW TEMPLATES
  // -------------------------------------------------------------
  patient_welcome_registration: {
    id: "patient_welcome_registration",
    category: "patients",
    name: "Patient Welcome Registration",
    subject: "Welcome to TriGyna Health & Wellness",
    render: (data) => {
      const loginUrl = `${emailConfig.frontendUrl}/login`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Welcome to TriGyna, ${escapeHtml(data.name || "Valued Patient")}!</h2>
        <p>We are delighted to welcome you to TriGyna Health & Wellness. Your patient portal account has been established with secure clinical records access.</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Patient Portal Features:</strong></p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #4B5563;">
            <li>Book &amp; reschedule confidential consultations</li>
            <li>Access clinical summaries &amp; signed digital prescriptions</li>
            <li>Review tax invoices, receipts &amp; health packages</li>
            <li>Direct coordination with our senior homoeopathic clinical team</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}" class="btn">Access Patient Portal &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Welcome to TriGyna",
        subtitle: "Holistic Care & Wellness",
        content,
        recipientEmail: data.email,
      });
    },
  },

  enquiry_acknowledgement: {
    id: "enquiry_acknowledgement",
    category: "patients",
    name: "Enquiry Acknowledgement",
    subject: "Thank you for contacting TriGyna Health & Wellness",
    render: (data) => {
      const content = `
        <h2 style="color: #154734; margin-top: 0;">We Have Received Your Enquiry</h2>
        <p>Dear <strong>${escapeHtml(data.name || "Patient")}</strong>,</p>
        <p>Thank you for reaching out to TriGyna regarding <strong>${escapeHtml(data.service || "Constitutional Healthcare")}</strong>. Our clinical coordination desk has received your details.</p>
        <p>A specialized care advisor will contact you within <strong>30 minutes</strong> to discuss your private consultation options.</p>
        <div class="info-card">
          <p style="margin: 0; font-size: 14px; color: #154734;"><strong>Direct Clinical Helpline:</strong> +91 917-277-2326</p>
        </div>
      `;
      return renderBaseLayout({
        title: "Enquiry Acknowledgement - TriGyna",
        subtitle: "Clinical Care Desk",
        content,
        recipientEmail: data.email,
      });
    },
  },

  appointment_confirmation: {
    id: "appointment_confirmation",
    category: "appointments",
    name: "Appointment Confirmed",
    subject: (data) => `Appointment Confirmed: TriGyna Consultation on ${data.date || ""}`,
    render: (data) => {
      const portalUrl = `${emailConfig.frontendUrl}/patient/appointments`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Your Consultation is Confirmed</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>Your upcoming clinical consultation has been successfully scheduled:</p>
        <div class="info-card">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #64748B; padding: 6px 0; width: 35%;">Consultant:</td><td style="font-weight: 600;">${escapeHtml(data.doctorName || "Senior Consultant")}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Date:</td><td style="font-weight: 600;">${escapeHtml(data.date || "")}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Time Slot:</td><td style="font-weight: 600;">${escapeHtml(data.time || "")}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Consultation Mode:</td><td style="font-weight: 600;">${escapeHtml(data.mode || "Online Video")}</td></tr>
            ${data.meetingLink ? `<tr><td style="color: #64748B; padding: 6px 0;">Meeting Link:</td><td><a href="${data.meetingLink}" style="color: #154734; font-weight: bold;">Join Video Consultation</a></td></tr>` : ""}
          </table>
        </div>
        <p style="font-size: 14px; color: #4B5563;">Please ensure you are ready 5 minutes prior to your designated slot. You can view preparation notes in your portal.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${portalUrl}" class="btn">View Appointment Details &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Appointment Confirmed - TriGyna",
        subtitle: "Clinical Practice Desk",
        content,
        recipientEmail: data.email,
      });
    },
  },

  appointment_rescheduled: {
    id: "appointment_rescheduled",
    category: "appointments",
    name: "Appointment Rescheduled",
    subject: (data) => `Appointment Updated: TriGyna Consultation on ${data.newDate || ""}`,
    render: (data) => {
      const portalUrl = `${emailConfig.frontendUrl}/patient/appointments`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Your Appointment Has Been Rescheduled</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>Your appointment has been updated to the following new schedule:</p>
        <div class="info-card">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #64748B; padding: 6px 0; width: 35%;">New Date:</td><td style="font-weight: 600; color: #154734;">${escapeHtml(data.newDate || "")}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">New Time Slot:</td><td style="font-weight: 600; color: #154734;">${escapeHtml(data.newTime || "")}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Consultant:</td><td>${escapeHtml(data.doctorName || "Senior Specialist")}</td></tr>
          </table>
        </div>
        <p style="font-size: 14px; color: #4B5563;">If this revised time does not suit your schedule, please visit your portal or call us to adjust.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${portalUrl}" class="btn">Manage Appointment &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Appointment Rescheduled - TriGyna",
        subtitle: "Schedule Coordination",
        content,
        recipientEmail: data.email,
      });
    },
  },

  appointment_cancelled: {
    id: "appointment_cancelled",
    category: "appointments",
    name: "Appointment Cancelled",
    subject: "Appointment Cancellation Confirmation - TriGyna",
    render: (data) => {
      const bookUrl = `${emailConfig.frontendUrl}/book-appointment`;
      const content = `
        <h2 style="color: #991B1B; margin-top: 0;">Appointment Cancelled</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>As requested, your consultation scheduled for <strong>${escapeHtml(data.date || "")}</strong> with <strong>${escapeHtml(data.doctorName || "TriGyna Consultant")}</strong> has been cancelled.</p>
        <p style="font-size: 14px; color: #4B5563;">If you had made an advance consultation deposit, any eligible refund will be processed per our policy. You are welcome to book a new appointment whenever convenient:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${bookUrl}" class="btn btn-secondary">Schedule New Consultation &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Appointment Cancelled - TriGyna",
        subtitle: "Clinical Scheduling Desk",
        content,
        recipientEmail: data.email,
      });
    },
  },

  appointment_reminder: {
    id: "appointment_reminder",
    category: "appointments",
    name: "Appointment 24h Reminder",
    subject: (data) => `Reminder: TriGyna Consultation Tomorrow at ${data.time || ""}`,
    render: (data) => {
      const portalUrl = `${emailConfig.frontendUrl}/patient/appointments`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Upcoming Appointment Reminder</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>This is a gentle reminder regarding your consultation scheduled for tomorrow:</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Date:</strong> ${escapeHtml(data.date || "Tomorrow")}</p>
          <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${escapeHtml(data.time || "")}</p>
          <p style="margin: 4px 0;"><strong>Doctor:</strong> ${escapeHtml(data.doctorName || "Senior Specialist")}</p>
          <p style="margin: 4px 0;"><strong>Mode:</strong> ${escapeHtml(data.mode || "Online Video")}</p>
        </div>
        <p style="font-size: 14px; color: #4B5563;">Please have any previous lab investigations, prescriptions, or symptom timelines ready for review during your consultation.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${portalUrl}" class="btn">Open Portal &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Appointment Reminder - TriGyna",
        subtitle: "Patient Care Desk",
        content,
        recipientEmail: data.email,
      });
    },
  },

  payment_success: {
    id: "payment_success",
    category: "payments",
    name: "Payment Received Confirmation",
    subject: (data) => `Payment Received: ₹${Number(data.amountPaid || data.amount || 0).toLocaleString("en-IN")} – TriGyna Invoice ${data.invoiceNumber || ""}`,
    render: (data) => {
      const portalUrl = `${emailConfig.frontendUrl}/patient/payments`;
      const content = `
        <h2 style="color: #087F56; margin-top: 0;">Payment Successfully Verified</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>We have successfully received and verified your payment.</p>
        <div class="info-card">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #64748B; padding: 6px 0; width: 40%;">Invoice Number:</td><td style="font-weight: 600;">${escapeHtml(data.invoiceNumber || "N/A")}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Service / Plan:</td><td style="font-weight: 600;">${escapeHtml(data.serviceName || "Clinical Care Protocol")}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Transaction ID:</td><td style="font-family: monospace; font-weight: bold; color: #087F56;">${escapeHtml(data.transactionId || data.receiptNumber || "N/A")}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Amount Paid:</td><td style="font-size: 18px; font-weight: bold; color: #087F56;">₹${Number(data.amountPaid || data.amount || 0).toLocaleString("en-IN")}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Remaining Balance:</td><td>₹${Number(data.remainingBalance || 0).toLocaleString("en-IN")}</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${portalUrl}" class="btn">View Official Receipt &amp; Invoice &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Payment Received - TriGyna",
        subtitle: "Billing & Accounts Desk",
        content,
        recipientEmail: data.email,
      });
    },
  },

  payment_receipt: {
    id: "payment_receipt",
    category: "payments",
    name: "Payment Receipt Confirmation",
    subject: (data) => `Payment Receipt ${data.receiptNumber || ""} – TriGyna Health`,
    render: (data) => {
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Payment Receipt &amp; Tax Invoice</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>We acknowledge receipt of your payment of <strong>₹${Number(data.amount || 0).toLocaleString("en-IN")}</strong>.</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Receipt Number:</strong> ${escapeHtml(data.receiptNumber || "")}</p>
          <p style="margin: 4px 0;"><strong>Invoice Reference:</strong> ${escapeHtml(data.invoiceNumber || "N/A")}</p>
          <p style="margin: 4px 0;"><strong>Payment Status:</strong> Settled &amp; Reconciled</p>
        </div>
        <p style="font-size: 13px; color: #4B5563;">You can view and download your full GST tax invoice directly from the TriGyna Patient Portal.</p>
      `;
      return renderBaseLayout({
        title: "Receipt - TriGyna",
        subtitle: "Official Tax Documentation",
        content,
        recipientEmail: data.email,
      });
    },
  },

  invoice_notification: {
    id: "invoice_notification",
    category: "payments",
    name: "Invoice Notification",
    subject: (data) => `Invoice Issued: ${data.invoiceNumber || ""} – TriGyna Health`,
    render: (data) => {
      const payUrl = data.checkoutUrl || `${emailConfig.frontendUrl}/patient/payments`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">New Invoice Issued</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>A new invoice <strong>${escapeHtml(data.invoiceNumber || "")}</strong> has been generated for <strong>${escapeHtml(data.serviceName || "TriGyna Healthcare Services")}</strong>.</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Invoice Amount:</strong> ₹${Number(data.amount || 0).toLocaleString("en-IN")}</p>
          ${data.dueDate ? `<p style="margin: 4px 0;"><strong>Due Date:</strong> ${escapeHtml(data.dueDate)}</p>` : ""}
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${payUrl}" class="btn">View &amp; Pay Invoice &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Invoice Notification - TriGyna",
        subtitle: "Billing & Accounts",
        content,
        recipientEmail: data.email,
      });
    },
  },

  payment_link_dispatch: {
    id: "payment_link_dispatch",
    category: "payments",
    name: "Payment Link Dispatch",
    subject: (data) => `Secure Payment Link for ${data.serviceName || "TriGyna Care Protocol"}`,
    render: (data) => {
      const content = `
        <h2 style="color: #087F56; margin-top: 0;">Your Customized Care &amp; Payment Link</h2>
        <p>Dear <strong>${escapeHtml(data.customerName || data.patientName || "Patient")}</strong>,</p>
        <p>Your clinical team has prepared your treatment package and checkout link for <strong>${escapeHtml(data.serviceName || "Clinical Care Protocol")}</strong>:</p>
        <div class="info-card" style="text-align: center;">
          <p style="font-size: 13px; text-transform: uppercase; color: #64748B; margin: 0 0 6px 0; font-weight: 600;">Total Payable</p>
          <p style="font-size: 28px; font-weight: 800; color: #087F56; margin: 0;">₹${Number(data.amount || 0).toLocaleString("en-IN")}</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${data.checkoutUrl}" class="btn btn-secondary">Proceed to Secure Checkout &rarr;</a>
        </div>
        <p style="font-size: 13px; color: #64748B; text-align: center;">Supports UPI, NetBanking, Credit/Debit Cards via Razorpay 256-bit encrypted gateway.</p>
      `;
      return renderBaseLayout({
        title: "Payment Link - TriGyna",
        subtitle: "Secure Checkout Portal",
        content,
        recipientEmail: data.email,
      });
    },
  },

  payment_reminder: {
    id: "payment_reminder",
    category: "payments",
    name: "Payment Reminder",
    subject: (data) => `Payment Reminder: Invoice ${data.invoiceNumber || ""} – TriGyna Health`,
    render: (data) => {
      const payUrl = data.checkoutUrl || `${emailConfig.frontendUrl}/patient/payments`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Settlement Reminder</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>This is a gentle reminder regarding your outstanding balance for Invoice <strong>${escapeHtml(data.invoiceNumber || "")}</strong>.</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Outstanding Balance:</strong> ₹${Number(data.remainingBalance || data.amount || 0).toLocaleString("en-IN")}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${payUrl}" class="btn">Settle Invoice Online &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Payment Reminder - TriGyna",
        subtitle: "Accounts Desk",
        content,
        recipientEmail: data.email,
      });
    },
  },

  payment_failed: {
    id: "payment_failed",
    category: "payments",
    name: "Payment Failed Notification",
    subject: (data) => `Payment Attempt Notice – TriGyna Invoice ${data.invoiceNumber || ""}`,
    render: (data) => {
      const retryUrl = data.checkoutUrl || `${emailConfig.frontendUrl}/patient/payments`;
      const content = `
        <h2 style="color: #DC2626; margin-top: 0;">Payment Attempt Unsuccessful</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>Your recent payment attempt of <strong>₹${Number(data.amount || 0).toLocaleString("en-IN")}</strong> for Invoice <strong>${escapeHtml(data.invoiceNumber || "")}</strong> could not be processed by the bank.</p>
        <p style="font-size: 13px; color: #64748B;">Reason reported: ${escapeHtml(data.failureReason || "Transaction declined by banking network")}</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${retryUrl}" class="btn">Retry Payment Securely &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Payment Failed - TriGyna",
        subtitle: "Billing Support Desk",
        content,
        recipientEmail: data.email,
      });
    },
  },

  refund_processed: {
    id: "refund_processed",
    category: "payments",
    name: "Refund Processed Confirmation",
    subject: (data) => `Refund Processed: ₹${Number(data.refundAmount || data.amount || 0).toLocaleString("en-IN")} – TriGyna`,
    render: (data) => {
      const content = `
        <h2 style="color: #087F56; margin-top: 0;">Refund Processed</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>A refund of <strong>₹${Number(data.refundAmount || data.amount || 0).toLocaleString("en-IN")}</strong> has been authorized for Invoice <strong>${escapeHtml(data.invoiceNumber || "")}</strong>.</p>
        <p style="font-size: 14px; color: #4B5563;">The amount will reflect in your original payment method within 5-7 business days per standard banking processing timelines.</p>
      `;
      return renderBaseLayout({
        title: "Refund Processed - TriGyna",
        subtitle: "Official Account Credit",
        content,
        recipientEmail: data.email,
      });
    },
  },

  medical_report_ready: {
    id: "medical_report_ready",
    category: "patients",
    name: "Clinical Summary & Prescription Ready",
    subject: "Your TriGyna Clinical Summary & Digital Prescription are Ready",
    render: (data) => {
      const portalUrl = `${emailConfig.frontendUrl}/patient/prescriptions`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Clinical Summary Available</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>Your physician <strong>${escapeHtml(data.doctorName || "your consultant")}</strong> has finalized your consultation record.</p>
        <p>To uphold healthcare confidentiality (HIPAA / DISHA principles), your signed digital prescription and constitutional protocol are accessible directly inside your password-protected patient portal.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${portalUrl}" class="btn">View Signed Prescription &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Clinical Record Ready - TriGyna",
        subtitle: "Confidential Patient Portal",
        content,
        recipientEmail: data.email,
      });
    },
  },

  prescription_ready: {
    id: "prescription_ready",
    category: "patients",
    name: "Prescription Finalized",
    subject: "Digital Prescription Finalized - TriGyna",
    render: (data) => {
      const portalUrl = `${emailConfig.frontendUrl}/patient/prescriptions`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Digital Prescription Ready</h2>
        <p>Dear <strong>${escapeHtml(data.patientName || "Patient")}</strong>,</p>
        <p>Your prescription <strong>${escapeHtml(data.prescriptionCode ? `#${data.prescriptionCode}` : "")}</strong> has been finalized by ${escapeHtml(data.doctorName || "your doctor")}.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${portalUrl}" class="btn">Download Prescription &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Prescription Ready - TriGyna",
        subtitle: "Clinical Care Records",
        content,
        recipientEmail: data.email,
      });
    },
  },

  // -------------------------------------------------------------
  // DOCTOR WORKFLOW TEMPLATES
  // -------------------------------------------------------------
  doctor_new_appointment: {
    id: "doctor_new_appointment",
    category: "doctors",
    name: "Doctor New Appointment Alert",
    subject: (data) => `New Consultation Booked: ${data.patientName || "Patient"} on ${data.date || ""}`,
    render: (data) => {
      const doctorPortalUrl = `${emailConfig.frontendUrl}/doctor/dashboard`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">New Appointment Scheduled</h2>
        <p>Dr. <strong>${escapeHtml(data.doctorName || "Specialist")}</strong>,</p>
        <p>A new consultation has been booked on your clinical schedule:</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Patient:</strong> ${escapeHtml(data.patientName || "Confidential Patient")}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${escapeHtml(data.date || "")}</p>
          <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${escapeHtml(data.time || "")}</p>
          <p style="margin: 4px 0;"><strong>Consultation Mode:</strong> ${escapeHtml(data.mode || "Online Video")}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${doctorPortalUrl}" class="btn">Open Doctor Workspace &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "New Appointment - Doctor Portal",
        subtitle: "Clinical Scheduling",
        content,
        recipientEmail: data.email,
      });
    },
  },

  doctor_appointment_cancelled: {
    id: "doctor_appointment_cancelled",
    category: "doctors",
    name: "Doctor Appointment Cancellation Alert",
    subject: (data) => `Appointment Cancelled: ${data.patientName || "Patient"} on ${data.date || ""}`,
    render: (data) => {
      const content = `
        <h2 style="color: #991B1B; margin-top: 0;">Appointment Cancelled</h2>
        <p>Dr. <strong>${escapeHtml(data.doctorName || "Specialist")}</strong>,</p>
        <p>The appointment with ${escapeHtml(data.patientName || "Patient")} previously scheduled for <strong>${escapeHtml(data.date || "")}</strong> at <strong>${escapeHtml(data.time || "")}</strong> has been cancelled.</p>
        <p style="font-size: 14px; color: #4B5563;">Your roster has been automatically freed for new patient bookings.</p>
      `;
      return renderBaseLayout({
        title: "Schedule Update - TriGyna",
        subtitle: "Roster Management",
        content,
        recipientEmail: data.email,
      });
    },
  },

  doctor_schedule_update: {
    id: "doctor_schedule_update",
    category: "doctors",
    name: "Doctor Schedule Adjustment",
    subject: "Clinical Roster & Schedule Update - TriGyna",
    render: (data) => {
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Roster Schedule Update</h2>
        <p>Dr. <strong>${escapeHtml(data.doctorName || "Specialist")}</strong>,</p>
        <p>Your availability window or clinic roster has been modified by the administration team.</p>
        <div class="info-card">
          <p style="margin: 0; font-size: 14px;">${escapeHtml(data.notes || "Please check your clinical workspace to review your updated consultation hours.")}</p>
        </div>
      `;
      return renderBaseLayout({
        title: "Roster Update - TriGyna",
        subtitle: "Staff Operations",
        content,
        recipientEmail: data.email,
      });
    },
  },

  doctor_patient_assigned: {
    id: "doctor_patient_assigned",
    category: "doctors",
    name: "Doctor Patient Assigned",
    subject: (data) => `Patient Assigned for Follow-up: ${data.patientName || "Patient"}`,
    render: (data) => {
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Patient Case Assigned</h2>
        <p>Dr. <strong>${escapeHtml(data.doctorName || "Specialist")}</strong>,</p>
        <p>Patient <strong>${escapeHtml(data.patientName || "Patient")}</strong> has been assigned to your clinical care queue for constitutional assessment and follow-up.</p>
      `;
      return renderBaseLayout({
        title: "Patient Assignment - TriGyna",
        subtitle: "Clinical Operations",
        content,
        recipientEmail: data.email,
      });
    },
  },

  // -------------------------------------------------------------
  // SALES WORKFLOW TEMPLATES
  // -------------------------------------------------------------
  sales_new_lead_assigned: {
    id: "sales_new_lead_assigned",
    category: "sales",
    name: "Sales Lead Assigned",
    subject: (data) => `New Lead Assigned: ${data.leadName || "Prospective Patient"} (${data.serviceInterest || "General"})`,
    render: (data) => {
      const crmUrl = `${emailConfig.frontendUrl}/sales/dashboard`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">New Lead Assigned to You</h2>
        <p>Hello <strong>${escapeHtml(data.advisorName || "Care Advisor")}</strong>,</p>
        <p>A new prospective patient enquiry has been assigned to your sales queue:</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Lead Name:</strong> ${escapeHtml(data.leadName || "Visitor")}</p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> ${escapeHtml(data.leadPhone || "N/A")}</p>
          <p style="margin: 4px 0;"><strong>Service of Interest:</strong> ${escapeHtml(data.serviceInterest || "Women's Health Protocol")}</p>
          <p style="margin: 4px 0;"><strong>Source:</strong> ${escapeHtml(data.source || "Website Enquiry")}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${crmUrl}" class="btn">Open CRM &amp; Call Lead &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Lead Allocation - TriGyna CRM",
        subtitle: "Growth & Patient Coordination",
        content,
        recipientEmail: data.email,
      });
    },
  },

  sales_lead_status_updated: {
    id: "sales_lead_status_updated",
    category: "sales",
    name: "Lead Status Changed Alert",
    subject: (data) => `Lead Status Update: ${data.leadName || "Lead"} -> ${data.newStatus || ""}`,
    render: (data) => {
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Lead Stage Progression</h2>
        <p>Lead <strong>${escapeHtml(data.leadName || "Lead")}</strong> has transitioned to status <strong>${escapeHtml(data.newStatus || "")}</strong>.</p>
      `;
      return renderBaseLayout({
        title: "Lead Progression - TriGyna",
        subtitle: "CRM Pipeline Monitor",
        content,
        recipientEmail: data.email,
      });
    },
  },

  sales_followup_reminder: {
    id: "sales_followup_reminder",
    category: "sales",
    name: "Sales Follow-up Due",
    subject: (data) => `Follow-up Due: ${data.leadName || "Lead"} at ${data.dueTime || "Today"}`,
    render: (data) => {
      const content = `
        <h2 style="color: #154734; margin-top: 0;">Follow-up Task Due</h2>
        <p>You have a scheduled follow-up with <strong>${escapeHtml(data.leadName || "Prospective Patient")}</strong> (+${escapeHtml(data.leadPhone || "")}).</p>
        <p style="font-size: 14px;">Notes: ${escapeHtml(data.notes || "Routine follow-up call")}</p>
      `;
      return renderBaseLayout({
        title: "Follow-up Reminder - TriGyna",
        subtitle: "Sales CRM Hub",
        content,
        recipientEmail: data.email,
      });
    },
  },

  // -------------------------------------------------------------
  // ADMIN WORKFLOW TEMPLATES
  // -------------------------------------------------------------
  admin_new_user_registered: {
    id: "admin_new_user_registered",
    category: "admin",
    name: "Admin New User Alert",
    subject: (data) => `New User Registration: ${data.name || "User"} (${data.role || "patient"})`,
    render: (data) => {
      const adminUrl = `${emailConfig.frontendUrl}/admin/dashboard`;
      const content = `
        <h2 style="color: #154734; margin-top: 0;">New Account Created</h2>
        <p>A new user account has been registered on the TriGyna platform:</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Name:</strong> ${escapeHtml(data.name || "")}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(data.email || "N/A")}</p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> ${escapeHtml(data.phone || "N/A")}</p>
          <p style="margin: 4px 0;"><strong>Role:</strong> ${escapeHtml(data.role || "patient")}</p>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${adminUrl}" class="btn">Open Admin Console &rarr;</a>
        </div>
      `;
      return renderBaseLayout({
        title: "Account Provisioning - TriGyna",
        subtitle: "Admin System Overseer",
        content,
        recipientEmail: data.email,
      });
    },
  },

  admin_payment_failure_alert: {
    id: "admin_payment_failure_alert",
    category: "admin",
    name: "Admin Payment Gateway Alert",
    subject: (data) => `CRITICAL: Payment Failed for Invoice ${data.invoiceNumber || ""}`,
    render: (data) => {
      const content = `
        <h2 style="color: #DC2626; margin-top: 0;">Payment Processing Alert</h2>
        <p>A payment attempt has failed or was rejected by the gateway:</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Invoice:</strong> ${escapeHtml(data.invoiceNumber || "N/A")}</p>
          <p style="margin: 4px 0;"><strong>Amount:</strong> ₹${Number(data.amount || 0).toLocaleString("en-IN")}</p>
          <p style="margin: 4px 0;"><strong>Error:</strong> ${escapeHtml(data.errorMessage || "Unknown gateway error")}</p>
        </div>
      `;
      return renderBaseLayout({
        title: "Billing Alert - TriGyna",
        subtitle: "Financial Integrity Overseer",
        content,
        recipientEmail: data.email,
      });
    },
  },

  admin_system_email_failure_alert: {
    id: "admin_system_email_failure_alert",
    category: "admin",
    name: "System Email Incident Alert",
    subject: "Alert: Repeated Email Delivery Failures Detected",
    render: (data) => {
      const content = `
        <h2 style="color: #DC2626; margin-top: 0;">Email System Incident Notice</h2>
        <p>The TriGyna Email Notification Engine detected critical delivery failures or provider rejection:</p>
        <div class="info-card">
          <p style="margin: 4px 0;"><strong>Incident:</strong> ${escapeHtml(data.incident || "High bounce/failure spike")}</p>
          <p style="margin: 4px 0;"><strong>Recipient:</strong> ${escapeHtml(data.recipient || "N/A")}</p>
          <p style="margin: 4px 0;"><strong>Reason:</strong> ${escapeHtml(data.reason || "N/A")}</p>
        </div>
      `;
      return renderBaseLayout({
        title: "Operational Incident - TriGyna",
        subtitle: "DevSecOps Infrastructure Monitor",
        content,
        recipientEmail: data.email,
      });
    },
  },
};

/**
 * Service to manage and render templates
 */
class EmailTemplateService {
  getTemplate(templateId) {
    return TEMPLATES[templateId] || null;
  }

  listTemplates() {
    return Object.values(TEMPLATES).map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      subject: typeof t.subject === "function" ? "[Dynamic Subject]" : t.subject,
    }));
  }

  renderTemplate(templateId, data = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Email template '${templateId}' does not exist.`);
    }

    const subject = typeof template.subject === "function" ? template.subject(data) : template.subject;
    const html = template.render(data);

    return {
      subject,
      html,
    };
  }
}

module.exports = new EmailTemplateService();
