process.env.NODE_ENV = "test";
const assert = require("assert");
const crypto = require("crypto");
const emailConfig = require("../config/email.config");
const emailService = require("../modules/email/email.service");
const emailTemplateService = require("../modules/email/email.template.service");
const emailTrackingService = require("../modules/email/email.tracking.service");
const emailQueueService = require("../modules/email/email.queue.service");
const { verifySvixSignature } = require("../modules/email/email.webhook.controller");
const { Webhook } = require("svix");

async function runUnitTests() {
  console.log("==========================================================");
  console.log("TriGyna Resend Email Notification System — Unit Test Suite");
  console.log("==========================================================\n");

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

  // 1. Resend Configuration & Secret Masking
  await test("1.1 Email config loads correctly with environment variables", () => {
    assert(emailConfig.smtpHost === "smtp.resend.com", "Default SMTP host should be smtp.resend.com");
    assert(emailConfig.smtpPort === 465, "Default SMTP port should be 465");
    assert(emailConfig.fromEmail, "fromEmail must be defined");
    assert(emailConfig.fromName, "fromName must be defined");
  });

  await test("1.2 getPublicConfig() never exposes secrets or API keys", () => {
    const pub = emailConfig.getPublicConfig();
    assert.strictEqual(typeof pub.hasApiKey, "boolean");
    assert.strictEqual(typeof pub.hasWebhookSecret, "boolean");
    assert.strictEqual(typeof pub.hasSmtpPassword, "boolean");
    assert.strictEqual(pub.apiKey, undefined, "Raw apiKey must not exist in public config");
    assert.strictEqual(pub.webhookSecret, undefined, "Raw webhookSecret must not exist in public config");
    assert.strictEqual(pub.smtpPassword, undefined, "Raw smtpPassword must not exist in public config");
  });

  // 2. Email Recipient Validation & Header Injection
  await test("2.1 Valid recipient emails are cleaned and accepted", () => {
    const clean = emailService.validateRecipient("  Test.User+Filter@Trigyna.IN  ");
    assert.strictEqual(clean, "test.user+filter@trigyna.in");
  });

  await test("2.2 Malformed recipient email throws clear error", () => {
    assert.throws(() => emailService.validateRecipient("invalid-email-no-at"), /Invalid email address format/);
    assert.throws(() => emailService.validateRecipient(""), /Recipient email address is required/);
    assert.throws(() => emailService.validateRecipient(null), /Recipient email address is required/);
  });

  await test("2.3 Header injection via CRLF is rejected", () => {
    assert.throws(() => emailService.validateRecipient("victim@trigyna.in\r\nBcc: attacker@evil.com"), /Invalid email address format|Potential header injection/);
  });

  // 3. Email Template Catalogue & Safe HTML Escaping
  await test("3.1 All core templates are registered in template catalogue", () => {
    const templates = emailTemplateService.listTemplates();
    assert(templates.length >= 20, `Expected at least 20 templates, found ${templates.length}`);
    const templateIds = new Set(templates.map((t) => t.id));

    // Check critical templates across all workflows
    assert(templateIds.has("email_verification"), "Must have email_verification");
    assert(templateIds.has("password_reset"), "Must have password_reset");
    assert(templateIds.has("password_changed"), "Must have password_changed");
    assert(templateIds.has("appointment_confirmation"), "Must have appointment_confirmation");
    assert(templateIds.has("appointment_reminder"), "Must have appointment_reminder");
    assert(templateIds.has("payment_success"), "Must have payment_success");
    assert(templateIds.has("payment_receipt"), "Must have payment_receipt");
    assert(templateIds.has("medical_report_ready"), "Must have medical_report_ready");
    assert(templateIds.has("doctor_new_appointment"), "Must have doctor_new_appointment");
    assert(templateIds.has("sales_new_lead_assigned"), "Must have sales_new_lead_assigned");
    assert(templateIds.has("admin_new_user_registered"), "Must have admin_new_user_registered");
  });

  await test("3.2 Template renders responsive HTML with TriGyna branding and XSS sanitization", () => {
    const rendered = emailTemplateService.renderTemplate("appointment_confirmation", {
      patientName: "<script>alert('xss')</script>Pooja",
      doctorName: "Dr. Anjali Sharma",
      date: "25 Nov 2026",
      time: "10:30 AM",
      mode: "Online Video",
      email: "pooja@example.com",
    });

    assert(rendered.subject.includes("25 Nov 2026"), "Subject should include appointment date");
    assert(!rendered.html.includes("<script>alert('xss')</script>"), "HTML should escape script tag");
    assert(rendered.html.includes("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;Pooja"), "Name should be safely escaped");
    assert(rendered.html.includes("TriGyna"), "HTML should contain TriGyna branding");
    assert(rendered.html.includes("+91 917-277-2326"), "HTML should contain helpline number");
    assert(rendered.html.includes("Privacy Policy"), "HTML should include Privacy Policy link");
  });

  // 4. Status Hierarchy & Monotonic Progression
  await test("4.1 Can transition from queued to sending to sent to delivered", () => {
    assert.strictEqual(emailTrackingService.canTransition("queued", "sending"), true);
    assert.strictEqual(emailTrackingService.canTransition("sending", "sent"), true);
    assert.strictEqual(emailTrackingService.canTransition("sent", "delivered"), true);
  });

  await test("4.2 Cannot downgrade terminal 'delivered' state to 'sent' or 'queued'", () => {
    assert.strictEqual(emailTrackingService.canTransition("delivered", "sent"), false);
    assert.strictEqual(emailTrackingService.canTransition("delivered", "queued"), false);
    assert.strictEqual(emailTrackingService.canTransition("bounced", "sent"), false);
  });

  // 5. Exponential Backoff Calculation
  await test("5.1 Exponential backoff increases monotonically with capped maximum", () => {
    const b0 = emailQueueService.getBackoffMs(0); // ~1s
    const b1 = emailQueueService.getBackoffMs(1); // ~4s
    const b2 = emailQueueService.getBackoffMs(2); // ~16s
    const b10 = emailQueueService.getBackoffMs(10); // capped at 300,000ms

    assert(b0 === 1000, `Expected 1000ms, got ${b0}`);
    assert(b1 === 4000, `Expected 4000ms, got ${b1}`);
    assert(b2 === 16000, `Expected 16000ms, got ${b2}`);
    assert(b10 === 300000, `Expected max cap 300000ms, got ${b10}`);
  });

  // 6. Svix Signature Verification
  await test("6.1 Svix webhook signature verification accepts genuine signatures", () => {
    const testSecret = "whsec_testSecretKeyForResendWebhookVerification12345678=";
    const testPayload = JSON.stringify({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: {
        email_id: "re_test_email_123456",
        to: ["patient@trigyna.in"],
      },
    });

    const wh = new Webhook(testSecret);
    const msgId = "msg_test_id_999";
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = wh.sign(msgId, new Date(timestamp * 1000), testPayload);

    const headers = {
      "svix-id": msgId,
      "svix-timestamp": String(timestamp),
      "svix-signature": signature,
    };

    const verified = verifySvixSignature(testPayload, headers, testSecret);
    assert.strictEqual(verified.type, "email.delivered");
    assert.strictEqual(verified.data.email_id, "re_test_email_123456");
  });

  await test("6.2 Svix webhook signature verification rejects tampered body", () => {
    const testSecret = "whsec_testSecretKeyForResendWebhookVerification12345678=";
    const testPayload = JSON.stringify({ type: "email.delivered" });

    const wh = new Webhook(testSecret);
    const msgId = "msg_test_id_888";
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = wh.sign(msgId, new Date(timestamp * 1000), testPayload);

    const headers = {
      "svix-id": msgId,
      "svix-timestamp": String(timestamp),
      "svix-signature": signature,
    };

    // Tamper the payload body
    const tamperedPayload = JSON.stringify({ type: "email.bounced" });
    assert.throws(
      () => verifySvixSignature(tamperedPayload, headers, testSecret),
      /signature/i
    );
  });

  console.log(`\n==========================================================`);
  console.log(`Unit Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`==========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runUnitTests().catch((err) => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
  });
}

module.exports = runUnitTests;
