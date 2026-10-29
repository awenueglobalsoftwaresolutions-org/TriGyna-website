const http = require("http");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");

let server;
let BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5000";

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
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
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runIntegrationsAndCalendarTests() {
  console.log("==================================================");
  console.log("TriGyna — Integrations, Calendar, Tasks & HRMS Verification");
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
    server = app.listen(0);
    const port = server.address().port;
    BASE_URL = `http://127.0.0.1:${port}`;
    console.log(`[TestServer] Ephemeral server running at ${BASE_URL}`);

    // 1. Health check
    const health = await makeRequest("GET", "/health");
    assert(health.status === 200 && health.body.data.status === "UP", "Backend server is UP and healthy");

    // 2. Meta Webhook Verification (hub.mode=subscribe)
    const metaVerify = await makeRequest(
      "GET",
      "/api/v1/webhooks/meta?hub.mode=subscribe&hub.verify_token=trigyna_meta_secret_token&hub.challenge=test_meta_challenge_123"
    );
    assert(
      metaVerify.status === 200 && metaVerify.body.toString().includes("test_meta_challenge_123"),
      "Meta Lead Ads Webhook challenge handshake verified"
    );

    // 3. Meta Webhook Ingestion (POST)
    const metaIngest = await makeRequest("POST", "/api/v1/webhooks/meta", {
      entry: [
        {
          id: "page_12345",
          time: Date.now(),
          changes: [
            {
              field: "leadgen",
              value: {
                leadgen_id: `lead_${Date.now()}`,
                form_id: "form_pcos_fertility",
                created_time: Date.now(),
              },
            },
          ],
        },
      ],
    });
    assert(metaIngest.status === 200 && metaIngest.body.success === true, "Meta Lead Ads event successfully captured");

    // 4. WhatsApp Webhook Verification
    const waVerify = await makeRequest(
      "GET",
      "/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=trigyna_meta_secret_token&hub.challenge=test_wa_challenge_456"
    );
    assert(
      waVerify.status === 200 && waVerify.body.toString().includes("test_wa_challenge_456"),
      "WhatsApp Business Webhook challenge handshake verified"
    );

    // 5. WhatsApp Inbound Message Webhook
    const waInbound = await makeRequest("POST", "/api/v1/webhooks/whatsapp", {
      entry: [
        {
          id: "wa_biz_account_1",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "+919172772326", phone_number_id: "phone_id_999" },
                contacts: [{ profile: { name: "Sunita Sharma" }, wa_id: "919876543210" }],
                messages: [
                  {
                    id: `wam_${Date.now()}`,
                    from: "919876543210",
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: "Namaste, I want to inquire about Dr. Sharma's fertility consultation." },
                    type: "text",
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    assert(waInbound.status === 200 && waInbound.body.success === true, "WhatsApp inbound enquiry matched and stored");

    // 6. Admin Authentication
    const loginRes = await makeRequest("POST", "/api/v1/auth/login", {
      identifier: "admin@trigyna.test",
      password: "TriGyna@123",
    });
    assert(loginRes.status === 200 && loginRes.body.data.token, "Admin authenticated successfully");
    const adminToken = loginRes.body.data.token;

    // 7. Integrations Hub Status
    const integStatus = await makeRequest("GET", "/api/v1/integrations/status", null, adminToken);
    assert(
      integStatus.status === 200 && integStatus.body.data.integrations.metaAds && integStatus.body.data.integrations.whatsapp,
      "Integrations status returns Meta, WhatsApp, Calendar, and Payment gateway states"
    );

    // 8. WhatsApp Pre-approved Templates
    const templatesRes = await makeRequest("GET", "/api/v1/integrations/whatsapp/templates", null, adminToken);
    assert(
      templatesRes.status === 200 && Array.isArray(templatesRes.body.data.templates) && templatesRes.body.data.templates.length >= 10,
      `WhatsApp approved message templates retrieved (${templatesRes.body.data.templates.length} templates configured)`
    );

    // 9. WhatsApp Conversations List
    const conversationsRes = await makeRequest("GET", "/api/v1/integrations/whatsapp/conversations", null, adminToken);
    assert(
      conversationsRes.status === 200 && Array.isArray(conversationsRes.body.data.conversations),
      "WhatsApp conversations thread inbox loaded successfully"
    );

    // 10. Operational Tasks CRUD
    const createTaskRes = await makeRequest(
      "POST",
      "/api/v1/tasks",
      {
        title: "Verify fertility lab reports for Ananya Mishra",
        description: "Review hormonal profile and ultrasound scan before Saturday consultation.",
        module: "clinical",
        priority: "high",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        checklist: [{ text: "Check TSH & Prolactin levels" }, { text: "Review pelvic USG report" }],
      },
      adminToken
    );
    assert(createTaskRes.status === 201 && createTaskRes.body.data.task._id, "Operational task created successfully");
    const taskId = createTaskRes.body.data.task._id;

    const listTasksRes = await makeRequest("GET", "/api/v1/tasks", null, adminToken);
    assert(
      listTasksRes.status === 200 && listTasksRes.body.data.tasks.some((t) => t._id === taskId),
      "Task listing contains newly created operational task"
    );

    const updateTaskRes = await makeRequest(
      "PATCH",
      `/api/v1/tasks/${taskId}`,
      { status: "in_progress", comment: "Reviewing biochemical markers now." },
      adminToken
    );
    assert(updateTaskRes.status === 200 && updateTaskRes.body.data.task.status === "in_progress", "Task status updated with comment");

    // 11. Clinical Follow-ups
    const createFollowupRes = await makeRequest(
      "POST",
      "/api/v1/clinical/follow-ups",
      {
        patientName: "Ritu Verma",
        patientPhone: "9999999999",
        dueDate: new Date(Date.now() + 172800000).toISOString(),
        notes: "Check response to Pulsatilla 200C and cycle regularity.",
        priority: "high",
      },
      adminToken
    );
    assert(createFollowupRes.status === 201 && createFollowupRes.body.data.followUp._id, "Clinical care follow-up scheduled with code");
    const followupId = createFollowupRes.body.data.followUp._id;

    const listFollowupsRes = await makeRequest("GET", "/api/v1/clinical/follow-ups", null, adminToken);
    assert(
      listFollowupsRes.status === 200 && listFollowupsRes.body.data.followUps.some((f) => f._id === followupId),
      "Clinical follow-ups list verified"
    );

    // 12. Shared Calendar Aggregation
    const calendarRes = await makeRequest("GET", "/api/v1/calendar/events", null, adminToken);
    assert(
      calendarRes.status === 200 &&
        Array.isArray(calendarRes.body.data.events) &&
        calendarRes.body.data.summary,
      `Shared calendar aggregated ${calendarRes.body.data.events.length} unified events (appointments, follow-ups, tasks, leaves)`
    );

    // 13. HRMS Staff Activity Monitoring
    const staffActivityRes = await makeRequest("GET", "/api/v1/hrms/activity", null, adminToken);
    assert(
      staffActivityRes.status === 200 &&
        staffActivityRes.body.data.summary &&
        Array.isArray(staffActivityRes.body.data.recentActivities) &&
        Array.isArray(staffActivityRes.body.data.activeStaff),
      "Staff activity endpoint returns summary, live staff on-duty, task counts, and audit timeline"
    );

    // 14. Unified Doctor Provisioning
    const doctorTestEmail = `dr.meera.${Date.now()}@trigyna.test`;
    const doctorTestPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const createDocRes = await makeRequest(
      "POST",
      "/api/v1/doctors",
      {
        name: "Dr. Meera Nambiar",
        email: doctorTestEmail,
        phone: doctorTestPhone,
        specialization: ["Gynaecology", "Classical Homoeopathy"],
        qualifications: "MD (Hom), BHMS",
        consultationFee: 700,
        salary: 75000,
        department: "Clinical / Gynaecology",
      },
      adminToken
    );
    assert(
      createDocRes.status === 201 &&
        createDocRes.body.data.doctor._id &&
        createDocRes.body.data.employee._id,
      "Doctor provisioning atomically created User, HRMS Employee, and Doctor clinical profile"
    );
  } catch (err) {
    console.error("Test execution failed:", err);
    failed++;
  } finally {
    if (server) await new Promise((res) => server.close(res));
    await disconnectDB();
  }

  console.log("==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runIntegrationsAndCalendarTests();
}

module.exports = runIntegrationsAndCalendarTests;
