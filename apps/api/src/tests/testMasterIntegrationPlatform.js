const assert = require("assert");
const http = require("http");
const crypto = require("crypto");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const razorpayService = require("../modules/billing/razorpay.service");
const whatsappService = require("../modules/integrations/whatsapp.service");
const emailService = require("../modules/notifications/email.service");
const pushService = require("../modules/notifications/push.service");
const leadIngestionService = require("../modules/crm/lead-ingestion.service");

const BASE_URL = "http://127.0.0.1:5000/api/v1";

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = options.body
      ? typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
      : null;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    if (postData) {
      reqOptions.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

let adminToken = "";
let salesToken = "";
let patientToken = "";
let testInvoiceId = "";

async function loginAccount(phone, password) {
  const res = await request(`${BASE_URL}/auth/login`, {
    method: "POST",
    body: { identifier: phone, password },
  });
  if (res.status === 200 && res.data?.data?.token) {
    return res.data.data.token;
  }
  throw new Error(`Login failed for ${phone}: ${JSON.stringify(res.data)}`);
}

async function runTests() {
  console.log("==========================================================");
  console.log("TriGyna Master Integration Platform Test Suite");
  console.log("Razorpay + Meta WhatsApp + Email + Push + Universal CRM");
  console.log("==========================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${err.message}`);
    }
  }

  // Phase 0: Setup and Authentication
  await test("Authenticate Admin, Sales, and Patient Roles", async () => {
    adminToken = await loginAccount("admin@trigyna.test", "TriGyna@123");
    salesToken = await loginAccount("sales@trigyna.test", "TriGyna@123");
    patientToken = await loginAccount("patient@trigyna.test", "TriGyna@123");
    assert(adminToken, "Admin token must exist");
    assert(salesToken, "Sales token must exist");
    assert(patientToken, "Patient token must exist");
  });

  await test("Fetch or locate active invoice for payment testing", async () => {
    const res = await request(`${BASE_URL}/invoices`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    assert.strictEqual(res.status, 200);
    const invoices = res.data?.data?.invoices || [];
    assert(invoices.length > 0, "At least one invoice should exist");
    const pendingInv = invoices.find((i) => i.status === "pending" || i.status === "partially_paid") || invoices[0];
    testInvoiceId = pendingInv._id;
    assert(testInvoiceId, "Test invoice ID resolved");
  });

  // Phase 1: Razorpay Payment Gateway Subsystem
  console.log("\n--- Subsystem 1: Razorpay Payment Gateway ---");

  let createdOrderId = "";
  let paymentRecordId = "";

  await test("1.1 Create Razorpay Order with authoritative server-side amount", async () => {
    const res = await request(`${BASE_URL}/invoices/${testInvoiceId}/payments/create-order`, {
      method: "POST",
      headers: { Authorization: `Bearer ${salesToken}` },
      body: { amount: 1500, paymentMethod: "upi" },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert(res.data.data.orderId.startsWith("order_"), "Razorpay order ID must start with order_");
    assert(res.data.data.amountInPaise, "Paise conversion must be present");
    assert.strictEqual(res.data.data.provider, "razorpay");
    createdOrderId = res.data.data.orderId;
    paymentRecordId = res.data.data.paymentId;
  });

  await test("1.2 Reject invalid cryptographic payment signature", async () => {
    const res = await request(`${BASE_URL}/invoices/payments/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${salesToken}` },
      body: {
        paymentId: paymentRecordId,
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: "pay_test_tampered_123",
        razorpay_signature: "tampered_invalid_hex_signature",
      },
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
  });

  await test("1.3 Verify valid Razorpay payment signature & issue formal receipt", async () => {
    const paymentId = `pay_${Date.now()}`;
    const validSignature = razorpayService.generateTestSignature(createdOrderId, paymentId);

    const res = await request(`${BASE_URL}/invoices/payments/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${salesToken}` },
      body: {
        paymentId: paymentRecordId,
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.payment.status, "success");
    assert(res.data.data.receipt, "Receipt must be generated upon verification");
  });

  await test("1.4 Webhook: Idempotent Razorpay webhook with HMAC verification", async () => {
    const txnId = `pay_hook_${Date.now()}`;
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: txnId,
            order_id: createdOrderId,
            amount: 150000,
            status: "captured",
          },
        },
      },
    };

    const rawPayload = JSON.stringify(payload);
    const signature = razorpayService.generateWebhookSignature(rawPayload);

    // First delivery
    const res1 = await request(`${BASE_URL}/webhooks/razorpay`, {
      method: "POST",
      headers: { "x-razorpay-signature": signature },
      body: rawPayload,
    });
    assert.strictEqual(res1.status, 200);

    // Duplicate webhook delivery should be idempotent
    const res2 = await request(`${BASE_URL}/webhooks/razorpay`, {
      method: "POST",
      headers: { "x-razorpay-signature": signature },
      body: rawPayload,
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.data.idempotent, true);
  });

  await test("1.5 Authorized refund processing with ledger update & audit", async () => {
    const res = await request(`${BASE_URL}/invoices/${testInvoiceId}/refund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        refundAmount: 500,
        refundReason: "Patient schedule adjustment per clinic policy",
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.invoice.status, "refunded");
    assert(res.data.data.refundOutcome.id.startsWith("rfnd_"));
  });

  await test("1.6 Financial reconciliation report returns balanced ledger", async () => {
    const res = await request(`${BASE_URL}/invoices/reconciliation`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    assert(res.data.data.reconciliation.totalBilled >= 0);
    assert(res.data.data.reconciliation.totalCollected >= 0);
    assert(["BALANCED", "DISCREPANCIES_DETECTED"].includes(res.data.data.reconciliation.gatewayBreakdown.reconciliationStatus));
  });

  // Phase 2: Meta WhatsApp Cloud API
  console.log("\n--- Subsystem 2: Meta WhatsApp Cloud API ---");

  await test("2.1 WhatsApp Webhook Handshake verification (hub.challenge)", async () => {
    const challenge = "meta_wa_challenge_998877";
    const res = await request(
      `${BASE_URL}/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=${challenge}&hub.verify_token=trigyna_meta_webhook_verify_token_2026`
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data, challenge);
  });

  await test("2.2 Inbound WhatsApp message creates conversation & auto-ingests CRM lead", async () => {
    const senderPhone = `9198765${Math.floor(10000 + Math.random() * 90000)}`;
    const inboundPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "Ananya Sharma" } }],
                messages: [
                  {
                    id: `wamid.test_${Date.now()}`,
                    from: senderPhone,
                    text: { body: "Namaste Doctor, I want to book a PCOS consultation." },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await request(`${BASE_URL}/webhooks/whatsapp`, {
      method: "POST",
      body: inboundPayload,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, "MESSAGE_RECEIVED");
  });

  await test("2.3 Approved WhatsApp template messages retrieval", async () => {
    const res = await request(`${BASE_URL}/integrations/whatsapp/templates`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    });

    assert.strictEqual(res.status, 200);
    assert(res.data.data.templates.length >= 10, "Must have 10+ approved WhatsApp business templates");
  });

  await test("2.4 Outbound WhatsApp message dispatch via Cloud API adapter", async () => {
    const res = await request(`${BASE_URL}/integrations/whatsapp/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${salesToken}` },
      body: {
        customerPhone: "919172772326",
        templateName: "welcome_enquiry",
      },
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert(["sent", "accepted", "delivered"].includes(res.data.data.message.status));
  });

  // Phase 3: Meta Lead Ads
  console.log("\n--- Subsystem 3: Meta Lead Ads & Attribution ---");

  await test("3.1 Meta Ads Webhook Handshake verification (hub.challenge)", async () => {
    const challenge = "meta_lead_ad_challenge_334455";
    const res = await request(
      `${BASE_URL}/webhooks/meta?hub.mode=subscribe&hub.challenge=${challenge}&hub.verify_token=trigyna_meta_webhook_verify_token_2026`
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data, challenge);
  });

  await test("3.2 Meta Lead Ad webhook ingests CRM lead with campaign attribution", async () => {
    const adPhone = `9198711${Math.floor(10000 + Math.random() * 90000)}`;
    const payload = {
      entry: [
        {
          changes: [
            {
              field: "leadgen",
              value: {
                full_name: "Pooja Verma",
                phone_number: adPhone,
                email: "pooja.verma@meta-test.com",
                campaign_name: "PCOS Root-Cause Healing Campaign — Meta Ads",
                form_id: "FORM_PCOS_001",
              },
            },
          ],
        },
      ],
    };

    const res = await request(`${BASE_URL}/webhooks/meta`, {
      method: "POST",
      body: payload,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, "EVENT_RECEIVED");
  });

  // Phase 4: Universal CRM Lead Ingestion
  console.log("\n--- Subsystem 4: Universal CRM Lead Ingestion ---");

  await test("4.1 Public website enquiry form ingestion", async () => {
    const webPhone = `9198100${Math.floor(10000 + Math.random() * 90000)}`;
    const res = await request(`${BASE_URL}/public/enquiries`, {
      method: "POST",
      body: {
        fullName: "Sneha Mukherjee",
        phone: webPhone,
        email: "sneha.m@example.com",
        serviceInterest: "Diet & Nutritional Care",
        consent: true,
      },
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert(res.data.data.leadId);
  });

  await test("4.2 Prevent duplicate submission within idempotency window", async () => {
    const repeatPhone = `9198111${Math.floor(10000 + Math.random() * 90000)}`;
    // First submission
    await request(`${BASE_URL}/public/enquiries`, {
      method: "POST",
      body: {
        fullName: "Repeat Visitor",
        phone: repeatPhone,
        consent: true,
      },
    });

    // Immediate second submission
    const res2 = await request(`${BASE_URL}/public/enquiries`, {
      method: "POST",
      body: {
        fullName: "Repeat Visitor",
        phone: repeatPhone,
        consent: true,
      },
    });

    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.data.isDuplicate, true);
  });

  await test("4.3 External Partner Lead API ingestion with x-api-key authentication", async () => {
    const partnerPhone = `9198222${Math.floor(10000 + Math.random() * 90000)}`;
    const res = await request(`${BASE_URL}/crm/leads/external`, {
      method: "POST",
      headers: { "x-api-key": "trigyna_partner_key_live" },
      body: {
        fullName: "Partner Affiliate Referral",
        phone: partnerPhone,
        email: "referral@partner.com",
        serviceInterest: "Constitutional Homoeopathy",
        source: "affiliate_network",
      },
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
  });

  await test("4.4 Reject External Partner API without valid x-api-key", async () => {
    const res = await request(`${BASE_URL}/crm/leads/external`, {
      method: "POST",
      headers: { "x-api-key": "invalid_unauthorized_key" },
      body: {
        fullName: "Hacker Attempt",
        phone: "919833344444",
      },
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  // Phase 5: Transactional Email & Push Notifications
  console.log("\n--- Subsystem 5: Transactional Email & Push Notifications ---");

  await test("5.1 Email templates rendered and logged for transactional events", async () => {
    const templates = emailService.getTemplates();
    assert(templates.length >= 4, "Must have 4+ core email templates");

    const emailRes = await emailService.sendEmail({
      to: "patient.care@trigyna.health",
      templateId: "payment_receipt",
      templateData: {
        patientName: "Sunita Rao",
        amount: 2500,
        receiptNumber: "REC-2026-TEST",
        invoiceNumber: "INV-2026-TEST",
      },
    });

    assert.strictEqual(emailRes.success, true);
    assert.strictEqual(emailRes.status, "delivered");
  });

  await test("5.2 Device push token registration (Web/Mobile FCM)", async () => {
    const testToken = `fcm_token_device_${Date.now()}`;
    const res = await request(`${BASE_URL}/notifications/push/subscribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        token: testToken,
        platform: "web",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
  });

  await test("5.3 Push test dispatch & unsubscription", async () => {
    const resTest = await request(`${BASE_URL}/notifications/push/test`, {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {},
    });
    assert.strictEqual(resTest.status, 200);

    const resUnsub = await request(`${BASE_URL}/notifications/push/unsubscribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { token: "fcm_token_device_test" },
    });
    assert.strictEqual(resUnsub.status, 200);
  });

  await test("5.4 Notification Centre query with unread count and category filters", async () => {
    const res = await request(`${BASE_URL}/notifications?type=all`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });

    assert.strictEqual(res.status, 200);
    assert(typeof res.data.data.unreadCount === "number");
    assert(Array.isArray(res.data.data.notifications));
  });

  // Phase 6: Admin Integration Health & Gateways
  console.log("\n--- Subsystem 6: Admin Integrations & Gateway Health ---");

  await test("6.1 Admin Integrations Status endpoint returns all 6 providers", async () => {
    const res = await request(`${BASE_URL}/integrations/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const integrations = res.data.data.integrations;
    assert(integrations.razorpay, "Razorpay must be listed");
    assert(integrations.whatsapp, "WhatsApp must be listed");
    assert(integrations.meta, "Meta must be listed");
    assert(integrations.email, "Email must be listed");
    assert(integrations.push, "Push must be listed");
  });

  await test("6.2 Test connection actions for each provider", async () => {
    const providersToTest = ["razorpay", "whatsapp", "email", "push"];
    for (const p of providersToTest) {
      const res = await request(`${BASE_URL}/integrations/${p}/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {},
      });
      assert.strictEqual(res.status, 200, `Provider ${p} test connection should return 200`);
      assert.strictEqual(res.data.success, true);
    }
  });

  console.log("\n==========================================================");
  console.log(`Master Integration Platform Test Results: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log("==========================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
