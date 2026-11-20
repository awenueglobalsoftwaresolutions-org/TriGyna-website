process.env.NODE_ENV = "test";
const http = require("http");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");
const whatsappService = require("../modules/integrations/whatsapp.service");
const WhatsAppConversation = require("../modules/integrations/whatsapp.model");
const WhatsAppOutboundMessage = require("../modules/integrations/outbound-message.model");
const WhatsAppWebhookEvent = require("../modules/integrations/webhook-event.model");
const ContactConsent = require("../modules/integrations/contact-consent.model");
const AutomationRule = require("../modules/integrations/automation-rule.model");
const AutomationExecution = require("../modules/integrations/automation-execution.model");
const Campaign = require("../modules/integrations/campaign.model");
const CampaignRecipient = require("../modules/integrations/campaign-recipient.model");
const Lead = require("../modules/crm/lead.model");
const User = require("../modules/users/user.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const bootstrapOwner = require("../scripts/bootstrapOwner");

let server;
let BASE_URL;

function makeRequest(method, path, body = null, token = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...customHeaders,
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on("error", reject);

    if (body) {
      if (typeof body === "string") {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function runMasterSuite() {
  console.log("==================================================");
  console.log("TriGyna — WhatsApp Automation Master Verification Suite");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    await connectDB();
    await bootstrapOwner();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    BASE_URL = `http://127.0.0.1:${port}`;
    console.log(`[TestServer] Ephemeral server running at ${BASE_URL}`);

    // Authenticate Admin / Owner
    const loginRes = await makeRequest("POST", "/api/v1/auth/login", {
      identifier: process.env.OWNER_EMAIL || "trigyna.health@gmail.com",
      password: process.env.OWNER_PASSWORD || "TriGyna@2326",
    });
    const adminToken = loginRes.body?.data?.token;
    assert(adminToken, "Admin logged in with bearer token");

    // Suite 1: Webhook Handshake & Cryptographic Signature Verification
    console.log("\n--- Suite 1: Webhook Handshake & Cryptographic Signature Verification ---");
    const handshakeRes = await makeRequest(
      "GET",
      "/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=trigyna_meta_secret_token&hub.challenge=wa_test_challenge_99"
    );
    assert(handshakeRes.status === 200 && handshakeRes.body === "wa_test_challenge_99", "GET webhook handshake challenge verified");

    const badHandshakeRes = await makeRequest(
      "GET",
      "/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=wa_test_challenge_99"
    );
    assert(badHandshakeRes.status === 403, "GET webhook handshake with invalid token rejected (403)");

    const testPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_1001",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "+919172772326", phone_number_id: "phone_100" },
                messages: [
                  {
                    from: "919876543299",
                    id: `wamid.HBgM_TEST_${Date.now()}_1`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    text: { body: "Hello TriGyna, I need consultation for PCOS treatment." },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const validSig = whatsappService.generateTestWebhookSignature(testPayload);
    const validSigRes = await makeRequest("POST", "/api/v1/webhooks/whatsapp", testPayload, null, {
      "x-hub-signature-256": validSig,
    });
    assert(validSigRes.status === 200, "POST webhook with valid HMAC-SHA256 signature accepted (200)");

    // Suite 2: Inbound Webhook Lead Ingestion, Deduplication & Idempotency
    console.log("\n--- Suite 2: Inbound Lead Ingestion & Deduplication ---");
    const testPhone = "919876543299";
    const conv = await WhatsAppConversation.findOne({ customerPhone: testPhone });
    assert(conv !== null, "Inbound message created WhatsAppConversation record");
    assert(conv && conv.messages.length >= 1, "Inbound message stored in conversation thread");

    const lead = await Lead.findOne({ phone: testPhone.slice(2) });
    assert(lead !== null, "New prospect automatically ingested into canonical CRM Lead");
    assert(lead && lead.source === "whatsapp", "Lead source accurately attributed to 'whatsapp'");

    // Replay identical webhook payload to test deduplication
    const initialMsgCount = conv.messages.length;
    await makeRequest("POST", "/api/v1/webhooks/whatsapp", testPayload, null, {
      "x-hub-signature-256": validSig,
    });
    const recheckedConv = await WhatsAppConversation.findOne({ customerPhone: testPhone });
    assert(recheckedConv.messages.length === initialMsgCount, "Duplicate webhook replay ignored: No duplicate message created");

    // Suite 3: Delivery Status Reconciliation Webhook
    console.log("\n--- Suite 3: Delivery Status Webhook Reconciliation ---");
    // Create an outbound message first
    const outboundSendRes = await makeRequest(
      "POST",
      "/api/v1/integrations/whatsapp/messages",
      {
        customerPhone: testPhone,
        text: "Thank you for contacting TriGyna. Our clinical consultant will call you shortly.",
      },
      adminToken
    );
    assert(outboundSendRes.status === 201, "Outbound message dispatched (201)");
    const outboundMsgId = outboundSendRes.body?.data?.message?.messageId;
    assert(outboundMsgId && outboundMsgId.startsWith("wamid."), "Real/realistic provider messageId assigned");

    // Status webhook payload: 'delivered'
    const statusPayload = {
      entry: [
        {
          id: "WABA_1001",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  {
                    id: outboundMsgId,
                    status: "delivered",
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    recipient_id: testPhone,
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const statusSig = whatsappService.generateTestWebhookSignature(statusPayload);
    await makeRequest("POST", "/api/v1/webhooks/whatsapp", statusPayload, null, {
      "x-hub-signature-256": statusSig,
    });

    const updatedOutbox = await WhatsAppOutboundMessage.findOne({ messageId: outboundMsgId });
    assert(updatedOutbox && updatedOutbox.status === "delivered", "Outbound message status reconciled to 'delivered'");

    // Status webhook payload: 'read'
    const readPayload = {
      entry: [
        {
          id: "WABA_1001",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  {
                    id: outboundMsgId,
                    status: "read",
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    recipient_id: testPhone,
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const readSig = whatsappService.generateTestWebhookSignature(readPayload);
    await makeRequest("POST", "/api/v1/webhooks/whatsapp", readPayload, null, {
      "x-hub-signature-256": readSig,
    });

    const readOutbox = await WhatsAppOutboundMessage.findOne({ messageId: outboundMsgId });
    assert(readOutbox && readOutbox.status === "read", "Outbound message status reconciled to 'read'");

    // Suite 4: Contact Consent & Opt-Out Enforcement
    console.log("\n--- Suite 4: Contact Consent & Opt-Out Enforcement ---");
    // Send opt-out keyword
    const optOutPayload = {
      entry: [
        {
          id: "WABA_1001",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "+919172772326", phone_number_id: "phone_100" },
                messages: [
                  {
                    from: testPhone,
                    id: `wamid.OPT_OUT_${Date.now()}`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    text: { body: "STOP" },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    await makeRequest("POST", "/api/v1/webhooks/whatsapp", optOutPayload, null, {
      "x-hub-signature-256": whatsappService.generateTestWebhookSignature(optOutPayload),
    });

    const consentRecord = await ContactConsent.findOne({ phone: testPhone });
    assert(consentRecord && consentRecord.optInMarketing === false, "Inbound keyword 'STOP' successfully suppressed contact consent");

    // Attempt to send template to opted-out user
    const blockedSendRes = await makeRequest(
      "POST",
      "/api/v1/integrations/whatsapp/send",
      {
        customerPhone: testPhone,
        templateName: "welcome_enquiry",
        variables: ["Patient", "PCOS Care"],
      },
      adminToken
    );
    assert(blockedSendRes.status === 400, "Dispatch to opted-out recipient rejected with 400 Consent Error");

    // Re-opt-in
    await ContactConsent.recordOptIn(testPhone, "Re-opt-in for testing");
    const reOptInConsent = await ContactConsent.findOne({ phone: testPhone });
    assert(reOptInConsent && reOptInConsent.optInMarketing === true, "Explicit re-opt-in restores contact messaging eligibility");

    // Suite 5: Automation Rules Engine
    console.log("\n--- Suite 5: Automation Rules Engine ---");
    const ruleRes = await makeRequest(
      "POST",
      "/api/v1/automations/rules",
      {
        name: "Auto Activity Logger for WhatsApp Inbound",
        triggerEvent: "whatsapp.message.received",
        conditions: [{ field: "phone", operator: "exists", value: true }],
        actions: [{ type: "create_crm_activity", params: { action: "WhatsApp Inbound Verified" } }],
      },
      adminToken
    );
    assert(ruleRes.status === 201, "Automation rule created successfully");
    const ruleId = ruleRes.body?.data?.rule?._id;

    // Test rule execution
    const testExecRes = await makeRequest("POST", `/api/v1/automations/rules/${ruleId}/test`, {}, adminToken);
    assert(testExecRes.status === 200, "Automation rule test run completed successfully");

    // Suite 6: AI Role-Based Agents & Human Escalation
    console.log("\n--- Suite 6: AI Role-Based Agents & Human Escalation ---");
    const intentRes = await makeRequest(
      "POST",
      "/api/v1/ai/whatsapp/classify-intent",
      { message: "Can I book an appointment for homeopathic skin consultation?" },
      adminToken
    );
    assert(intentRes.status === 200 && intentRes.body.data?.classification?.intent === "appointment_booking", "AI Agent correctly classified 'appointment_booking' intent");

    const replyRes = await makeRequest(
      "POST",
      "/api/v1/ai/whatsapp/suggest-reply",
      { conversationId: conv._id.toString() },
      adminToken
    );
    assert(replyRes.status === 200 && replyRes.body.data?.suggestion?.suggestedReply, "AI Agent generated contextual suggested reply");

    // Escalation trigger test
    const emergencyIntent = await makeRequest(
      "POST",
      "/api/v1/ai/whatsapp/classify-intent",
      { message: "Severe chest pain and difficulty breathing emergency!" },
      adminToken
    );
    assert(emergencyIntent.body.data?.classification?.intent === "emergency", "Clinical emergency trigger immediately classified as 'emergency'");

    const escalateRes = await makeRequest(
      "POST",
      "/api/v1/ai/whatsapp/escalate",
      { conversationId: conv._id.toString(), reason: "Patient reported acute symptom distress" },
      adminToken
    );
    assert(escalateRes.status === 200, "Human escalation route succeeded");
    const escalatedConv = await WhatsAppConversation.findById(conv._id);
    assert(escalatedConv.isEscalated === true, "Conversation thread flagged isEscalated: true");

    // Suite 7: Campaigns & Controlled Mass Messaging
    console.log("\n--- Suite 7: Campaigns & Controlled Mass Messaging ---");
    const campaignRes = await makeRequest(
      "POST",
      "/api/v1/whatsapp/campaigns",
      {
        name: "Spring PCOS Awareness Broadcast",
        templateName: "welcome_enquiry",
        templateVariables: ["Patient", "PCOS Programme"],
        audienceFilters: { hasConsentOnly: true, excludeOptedOut: true },
      },
      adminToken
    );
    assert(campaignRes.status === 201, "Campaign draft created with audience resolution");
    const campaignId = campaignRes.body?.data?.campaign?._id;

    const approveRes = await makeRequest("POST", `/api/v1/whatsapp/campaigns/${campaignId}/approve`, {}, adminToken);
    assert(approveRes.status === 200 && approveRes.body.data?.campaign?.status === "approved", "Campaign transitioned to 'approved'");

    const dispatchRes = await makeRequest("POST", `/api/v1/whatsapp/campaigns/${campaignId}/dispatch-batch`, {}, adminToken);
    assert(dispatchRes.status === 200, "Campaign batch dispatch executed successfully");

    const pauseRes = await makeRequest("POST", `/api/v1/whatsapp/campaigns/${campaignId}/pause`, {}, adminToken);
    assert(pauseRes.body?.data?.campaign?.status === "paused", "Campaign safely paused");

    const resumeRes = await makeRequest("POST", `/api/v1/whatsapp/campaigns/${campaignId}/resume`, {}, adminToken);
    assert(resumeRes.body?.data?.campaign?.status === "running", "Campaign resumed to running state");

    // Suite 8: Operational Telemetry & Analytics
    console.log("\n--- Suite 8: Operational Telemetry & Analytics ---");
    const statsRes = await makeRequest("GET", "/api/v1/integrations/whatsapp/stats", null, adminToken);
    assert(statsRes.status === 200 && statsRes.body.data?.totalConversations > 0, "WhatsApp stats accurately reflect database records");

    const logsRes = await makeRequest("GET", "/api/v1/integrations/whatsapp/logs?limit=10", null, adminToken);
    assert(logsRes.status === 200 && Array.isArray(logsRes.body.data?.logs), "Persistent outbound message logs retrieved from MongoDB");

    // Suite 9: Security & RBAC Enforcements
    console.log("\n--- Suite 9: Security & RBAC Enforcements ---");
    const unauthRes = await makeRequest("GET", "/api/v1/integrations/whatsapp/conversations");
    assert(unauthRes.status === 401, "Unauthenticated access to WhatsApp inbox blocked with 401 Unauthorized");

    console.log("\n==================================================");
    console.log(`MASTER SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed with unhandled exception:", err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await disconnectDB();
  }
}

runMasterSuite();
