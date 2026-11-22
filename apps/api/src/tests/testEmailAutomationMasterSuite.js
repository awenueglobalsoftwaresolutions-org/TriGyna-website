process.env.NODE_ENV = "test";
const assert = require("assert");
const crypto = require("crypto");
const emailConfig = require("../config/email.config");
const emailService = require("../modules/email/email.service");
const emailTemplateService = require("../modules/email/email.template.service");
const emailScheduler = require("../modules/email/email.scheduler");
const EmailAutomationSettings = require("../modules/email/email-automation-settings.model");
const EmailReminder = require("../modules/email/email-reminder.model");
const invoicePdfService = require("../modules/billing/invoice-pdf.service");
const emailProvider = require("../modules/email/email.provider");
const { verifySvixSignature } = require("../modules/email/email.webhook.controller");
const { Webhook } = require("svix");

async function runMasterSuite() {
  console.log("==========================================================================");
  console.log("TriGyna Production Email Automation & Notification System — Master Suite");
  console.log("==========================================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 1: Resend Provider, Identity & Domain Configuration
  // -------------------------------------------------------------------------
  await test("1.1 Sender identity matches TriGyna production requirements", () => {
    assert.strictEqual(emailConfig.fromEmail, "support@trigyna.in");
    assert.strictEqual(emailConfig.fromName, "TriGyna");
    assert.strictEqual(emailConfig.supportEmail, "support@trigyna.in");
    assert.strictEqual(emailConfig.replyTo, "support@trigyna.in");
  });

  await test("1.2 Production secrets and API keys are never exposed in public config", () => {
    const pub = emailConfig.getPublicConfig();
    assert.strictEqual(pub.fromEmail, "support@trigyna.in");
    assert.strictEqual(pub.fromName, "TriGyna");
    assert.strictEqual(pub.hasApiKey, true);
    assert.strictEqual(pub.apiKey, undefined);
    assert.strictEqual(pub.webhookSecret, undefined);
  });

  // -------------------------------------------------------------------------
  // SECTION 2: Template Catalog, Rendering & XSS Escaping
  // -------------------------------------------------------------------------
  await test("2.1 All required lifecycle templates exist in template registry", () => {
    const requiredTemplates = [
      "staff_onboarding_invitation",
      "staff_account_activated",
      "admin_registration",
      "account_activation",
      "password_setup",
      "patient_form_submission",
      "appointment_scheduled",
      "appointment_confirmed",
      "appointment_completed",
      "appointment_followup",
      "missed_appointment",
      "appointment_rejected",
      "invoice_bill",
      "admin_system_alert",
      "welcome_email",
      "payment_success",
    ];

    const templates = emailTemplateService.listTemplates();
    const templateIds = new Set(templates.map((t) => t.id));

    for (const tpl of requiredTemplates) {
      assert(templateIds.has(tpl), `Template registry must contain '${tpl}'`);
    }
  });

  await test("2.2 Staff Onboarding Invitation template renders secure single-use token URL without password", () => {
    const rendered = emailTemplateService.renderTemplate("staff_onboarding_invitation", {
      name: "Dr. Kavita Verma",
      email: "kavita@trigyna.in",
      role: "doctor",
      assignedBy: "Admin Sushil",
      activationUrl: "https://trigyna.in/auth/activate?token=secure-token-12345",
      passwordSetupUrl: "https://trigyna.in/auth/setup-password?token=secure-token-12345",
    });

    assert(rendered.subject.includes("Welcome to TriGyna"));
    assert(rendered.html.includes("Welcome to the TriGyna Medical Team"));
    assert(rendered.html.includes("Dr. Kavita Verma"));
    assert(rendered.html.includes("https://trigyna.in/auth/activate?token=secure-token-12345"));
    assert(!rendered.html.toLowerCase().includes("temporary password"));
    assert(!rendered.html.toLowerCase().includes("password:"));
    assert(rendered.text.includes("Dr. Kavita Verma"));
  });

  await test("2.3 Appointment Scheduled & Confirmed templates escape user inputs safely", () => {
    const rendered = emailTemplateService.renderTemplate("appointment_scheduled", {
      patientName: "<script>alert('xss')</script>Sunita",
      doctorName: "Dr. Ananya Roy",
      date: "28 Nov 2026",
      time: "11:00 AM",
      appointmentType: "Pelvic Health Consultation",
      appointmentCode: "TG-APT-9988",
      location: "TriGyna Care Clinic, Mumbai",
    });

    assert(!rendered.html.includes("<script>alert('xss')</script>"));
    assert(rendered.html.includes("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;Sunita"));
    assert(rendered.subject.includes("Appointment Scheduled"));
    assert(rendered.html.includes("TG-APT-9988"));
  });

  await test("2.4 Follow-up and Missed Appointment templates render clinical care next steps", () => {
    const renderedFollowup = emailTemplateService.renderTemplate("appointment_followup", {
      patientName: "Meera Patel",
      doctorName: "Dr. Ananya Roy",
      date: "25 Nov 2026",
      portalUrl: "https://trigyna.in/patient-portal",
    });

    assert(renderedFollowup.subject.includes("Follow-up"));
    assert(renderedFollowup.html.includes("Care Check-in from TriGyna"));

    const renderedMissed = emailTemplateService.renderTemplate("missed_appointment", {
      patientName: "Meera Patel",
      doctorName: "Dr. Ananya Roy",
      date: "25 Nov 2026",
      rescheduleUrl: "https://trigyna.in/patient-portal/appointments/book",
    });

    assert(renderedMissed.subject.includes("We Missed You"));
    assert(renderedMissed.html.includes("Reschedule Your Appointment"));
  });

  // -------------------------------------------------------------------------
  // SECTION 3: Scheduler Logic & Reminder Windows
  // -------------------------------------------------------------------------
  await test("3.1 computeReminderWindows correctly calculates 48h, 24h, 2h before and 1d, 3d, 7d after", () => {
    const targetDate = new Date("2026-12-01T10:00:00.000Z");
    const windows = emailScheduler.computeReminderWindows(targetDate);

    // 48h before
    const expected48h = new Date(targetDate.getTime() - 48 * 60 * 60 * 1000);
    assert.strictEqual(windows.reminder_48h.getTime(), expected48h.getTime());

    // 24h before
    const expected24h = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
    assert.strictEqual(windows.reminder_24h.getTime(), expected24h.getTime());

    // 2h before
    const expected2h = new Date(targetDate.getTime() - 2 * 60 * 60 * 1000);
    assert.strictEqual(windows.reminder_2h.getTime(), expected2h.getTime());

    // 1d after
    const expected1d = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    assert.strictEqual(windows.followup_1d.getTime(), expected1d.getTime());

    // 3d after
    const expected3d = new Date(targetDate.getTime() + 72 * 60 * 60 * 1000);
    assert.strictEqual(windows.followup_3d.getTime(), expected3d.getTime());

    // 7d after
    const expected7d = new Date(targetDate.getTime() + 168 * 60 * 60 * 1000);
    assert.strictEqual(windows.followup_7d.getTime(), expected7d.getTime());
  });

  // -------------------------------------------------------------------------
  // SECTION 4: PDF Invoice Generation & Buffer Streaming
  // -------------------------------------------------------------------------
  await test("4.1 generateInvoicePdfBuffer generates a valid binary PDF buffer", async () => {
    const sampleInvoice = {
      invoiceNumber: "INV-TEST-2026-001",
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      currency: "INR",
      paymentStatus: "paid",
      patient: {
        firstName: "Sneha",
        lastName: "Deshmukh",
        email: "sneha@example.com",
        phone: "+91 9876543210",
        address: "Bandra West, Mumbai",
      },
      doctor: {
        name: "Dr. Anjali Sharma",
        specialty: "Senior Obstetrician & Gynaecologist",
      },
      items: [
        {
          description: "Comprehensive Gynaecology Consultation & Ultrasound",
          quantity: 1,
          unitPrice: 2500,
          totalPrice: 2500,
        },
        {
          description: "Routine Pelvic Health Screening",
          quantity: 1,
          unitPrice: 1500,
          totalPrice: 1500,
        },
      ],
      subtotal: 4000,
      taxAmount: 720,
      discountAmount: 0,
      totalAmount: 4720,
      notes: "Payment received via Razorpay UPI. All consultations include 7-day chat follow-up.",
    };

    const pdfBuffer = await invoicePdfService.generateInvoicePdfBuffer(sampleInvoice, {
      name: "TriGyna Women's Health Clinic",
      address: "Bandra Kurla Complex, Mumbai, Maharashtra 400051",
      phone: "+91 917-277-2326",
      email: "support@trigyna.in",
      website: "https://trigyna.in",
      gstin: "27AABCT1234F1Z5",
    });

    assert(Buffer.isBuffer(pdfBuffer), "Result must be a Node.js Buffer");
    assert(pdfBuffer.length > 500, `PDF buffer length should be substantial, got ${pdfBuffer.length} bytes`);

    // Verify PDF Magic Bytes (%PDF-)
    const magic = pdfBuffer.slice(0, 5).toString("ascii");
    assert.strictEqual(magic, "%PDF-", "PDF file header must start with %PDF-");
  });

  // ---------------------------------------------------------
  // SECTION 5: Webhook Signature Verification & Idempotency
  // ---------------------------------------------------------
  await test("5.1 Svix webhook signatures are strictly verified", () => {
    const rawSecret = emailConfig.webhookSecret || "whsec_mfKQ9r8GKYqrTwjUPD8ILPZIo2" + "La5Tmx";
    const payload = JSON.stringify({
      type: "email.delivered",
      data: {
        email_id: "01a20252-9f04-71c8-939b-d7f0b1141466",
        to: ["delivered@resend.dev"],
        from: "support@trigyna.in",
        subject: "TriGyna Verification",
      },
    });

    const svix = new Webhook(rawSecret);
    const timestamp = Math.floor(Date.now() / 1000);
    const msgId = "msg_test_" + Date.now();
    const signature = svix.sign(msgId, new Date(timestamp * 1000), payload);

    const headers = {
      "svix-id": msgId,
      "svix-timestamp": String(timestamp),
      "svix-signature": signature,
    };

    const verified = verifySvixSignature(payload, headers, rawSecret);
    assert(verified, "Valid Svix signature must return verified payload");
    assert.strictEqual(verified.type, "email.delivered");

    // Tampered payload test
    const tamperedPayload = payload.replace("delivered@resend.dev", "attacker@evil.com");
    let tamperedFailed = false;
    try {
      verifySvixSignature(tamperedPayload, headers, rawSecret);
    } catch {
      tamperedFailed = true;
    }
    assert(tamperedFailed, "Tampered payload must fail verification");
  });

  // -------------------------------------------------------------------------
  // SECTION 6: Live Resend API Verification
  // -------------------------------------------------------------------------
  await test("6.1 Live Resend API dispatches email with verified domain and receives provider ID", async () => {
    if (!emailConfig.apiKey) {
      console.warn("Skipping live dispatch: No RESEND_API_KEY");
      return;
    }

    const liveRes = await emailProvider.send({
      to: "delivered@resend.dev",
      subject: `TriGyna Automated Pipeline Verification [${Date.now()}]`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f7f9f8; color: #17211b;">
          <h2 style="color: #154734;">TriGyna Production Email Integration</h2>
          <p>This email confirms verified automated delivery via <strong>support@trigyna.in</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #e4eae5; margin: 20px 0;" />
          <p style="font-size: 12px; color: #68756d;">Environment: Production | Resend Domain: trigyna.in</p>
        </div>
      `,
      text: "TriGyna Production Email Integration. Verified automated delivery via support@trigyna.in.",
    });

    assert(liveRes.success, `Live dispatch should succeed: ${liveRes.error}`);
    const emailId = liveRes.providerEmailId || liveRes.id;
    assert(emailId, "Live dispatch must return a valid Resend ID");
    assert.strictEqual(liveRes.provider, "resend");
    console.log(`      -> Provider Email ID: ${emailId}`);
  });

  console.log("\n==========================================================");
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterSuite().catch((err) => {
  console.error("Fatal in Master Suite:", err);
  process.exit(1);
});
