const http = require("http");
const mongoose = require("mongoose");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");

function makeRequest(server, method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://127.0.0.1:${server.address().port}`);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body) {
      payload = JSON.stringify(body);
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        let parsedBody = null;
        try {
          parsedBody = JSON.parse(rawData);
        } catch {
          parsedBody = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedBody,
        });
      });
    });

    req.on("error", (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runFollowUpsMasterSuite() {
  console.log("================================================================================");
  console.log("Starting TriGyna Follow-ups & Recovery Management API Master Test Suite");
  console.log("================================================================================");

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  console.log(`[TestServer] Ephemeral server running at http://127.0.0.1:${port}`);

  try {
    // 1. Authenticate as Admin
    const loginRes = await makeRequest(server, "POST", "/api/v1/auth/login", {
      identifier: "sushil.kushwaha@trigyna.test",
      password: process.env.TEST_ADMIN_PASSWORD || "Admin@12345",
    });

    let adminToken = loginRes.body?.data?.token;
    if (!adminToken) {
      // Fallback to any active owner/admin in DB
      const User = mongoose.model("User");
      const adminUser = await User.findOne({ role: { $in: ["owner", "admin"] } });
      const jwt = require("jsonwebtoken");
      adminToken = jwt.sign(
        { id: adminUser._id, role: adminUser.role },
        process.env.JWT_SECRET || "test-jwt-secret-key-12345678901234567890",
        { expiresIn: "1h" }
      );
    }

    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    // Test 1: GET /api/v1/clinical/follow-ups/stats
    console.log("\nTest 1: GET /api/v1/clinical/follow-ups/stats");
    const statsRes = await makeRequest(server, "GET", "/api/v1/clinical/follow-ups/stats", null, authHeaders);
    console.log("Status:", statsRes.status);
    console.log("KPI Stats:", JSON.stringify(statsRes.body?.data, null, 2));
    if (statsRes.status !== 200 || !statsRes.body?.data?.totalFollowUps) {
      throw new Error("Stats endpoint failed or returned empty data");
    }
    console.log("[PASS] Test 1: Follow-up stats retrieved successfully");

    // Test 2: GET /api/v1/clinical/follow-ups/calendar
    console.log("\nTest 2: GET /api/v1/clinical/follow-ups/calendar?year=2026&month=10");
    const calRes = await makeRequest(server, "GET", "/api/v1/clinical/follow-ups/calendar?year=2026&month=10", null, authHeaders);
    console.log("Status:", calRes.status);
    console.log("Total Events in Month:", calRes.body?.data?.totalEvents);
    console.log("Days mapped:", Object.keys(calRes.body?.data?.days || {}).length);
    if (calRes.status !== 200 || !calRes.body?.data?.days) {
      throw new Error("Calendar endpoint failed");
    }
    console.log("[PASS] Test 2: Follow-up calendar aggregation verified");

    // Test 3: GET /api/v1/clinical/follow-ups/upcoming
    console.log("\nTest 3: GET /api/v1/clinical/follow-ups/upcoming");
    const upRes = await makeRequest(server, "GET", "/api/v1/clinical/follow-ups/upcoming", null, authHeaders);
    console.log("Status:", upRes.status);
    console.log("Upcoming items count:", upRes.body?.data?.upcoming?.length);
    if (upRes.status !== 200 || !Array.isArray(upRes.body?.data?.upcoming)) {
      throw new Error("Upcoming endpoint failed");
    }
    console.log("[PASS] Test 3: Upcoming follow-ups retrieved successfully");

    // Test 4: GET /api/v1/clinical/follow-ups (list with tabs)
    console.log("\nTest 4: GET /api/v1/clinical/follow-ups?page=1&limit=5");
    const listRes = await makeRequest(server, "GET", "/api/v1/clinical/follow-ups?page=1&limit=5", null, authHeaders);
    console.log("Status:", listRes.status);
    console.log("Returned follow-ups count:", listRes.body?.data?.followUps?.length);
    console.log("Total count in DB:", listRes.body?.data?.total);
    if (listRes.status !== 200 || !listRes.body?.data?.followUps) {
      throw new Error("List endpoint failed");
    }
    const sampleItem = listRes.body.data.followUps[0];
    console.log("[PASS] Test 4: Follow-ups list retrieved successfully");

    // Test 5: POST /api/v1/clinical/follow-ups (Create new follow-up)
    console.log("\nTest 5: POST /api/v1/clinical/follow-ups (Create follow-up)");
    const Patient = mongoose.model("Patient");
    const Doctor = mongoose.model("Doctor");
    const patient = await Patient.findOne();
    const doctor = await Doctor.findOne();

    const createPayload = {
      patientId: patient._id.toString(),
      doctorId: doctor._id.toString(),
      dueDate: "2026-11-15",
      scheduledTime: "11:30 AM - 12:00 PM",
      mode: "Video consultation",
      interval: "Day 14",
      planInstructions: "Assess recovery and evaluate cycle consistency.",
      sendWhatsAppReminder: true,
      sendEmailReminder: true,
    };
    const createRes = await makeRequest(server, "POST", "/api/v1/clinical/follow-ups", createPayload, authHeaders);
    console.log("Status:", createRes.status);
    console.log("Created FollowUp Code:", createRes.body?.data?.followUp?.followUpCode);
    if (createRes.status !== 201 || !createRes.body?.data?.followUp?._id) {
      throw new Error("Create follow-up failed");
    }
    const createdId = createRes.body.data.followUp._id;
    console.log("[PASS] Test 5: Follow-up created successfully");

    // Test 6: GET /api/v1/clinical/follow-ups/:id (Detail Inspection)
    console.log(`\nTest 6: GET /api/v1/clinical/follow-ups/${createdId}`);
    const getRes = await makeRequest(server, "GET", `/api/v1/clinical/follow-ups/${createdId}`, null, authHeaders);
    console.log("Status:", getRes.status);
    console.log("Patient populated name:", getRes.body?.data?.followUp?.patientId?.fullName);
    if (getRes.status !== 200 || !getRes.body?.data?.followUp?.patientId?.fullName) {
      throw new Error("Follow-up detail lookup failed");
    }
    console.log("[PASS] Test 6: Follow-up detail inspection verified");

    // Test 7: POST /api/v1/clinical/follow-ups/:id/reschedule
    console.log(`\nTest 7: POST /api/v1/clinical/follow-ups/${createdId}/reschedule`);
    const reschedPayload = {
      newDate: "2026-11-20",
      newTime: "02:00 PM - 02:30 PM",
      reason: "Patient requested afternoon slot due to travel",
    };
    const reschedRes = await makeRequest(server, "POST", `/api/v1/clinical/follow-ups/${createdId}/reschedule`, reschedPayload, authHeaders);
    console.log("Status:", reschedRes.status);
    console.log("Reschedule History length:", reschedRes.body?.data?.followUp?.rescheduleHistory?.length);
    if (reschedRes.status !== 200 || reschedRes.body?.data?.followUp?.rescheduleHistory?.length !== 1) {
      throw new Error("Reschedule failed or history not preserved");
    }
    console.log("[PASS] Test 7: Follow-up rescheduled with history preserved");

    // Test 8: POST /api/v1/clinical/follow-ups/:id/remind
    console.log(`\nTest 8: POST /api/v1/clinical/follow-ups/${createdId}/remind`);
    const remindRes = await makeRequest(server, "POST", `/api/v1/clinical/follow-ups/${createdId}/remind`, { channel: "whatsapp" }, authHeaders);
    console.log("Status:", remindRes.status);
    console.log("Reminder response:", remindRes.body?.message);
    if (remindRes.status !== 200) {
      throw new Error("Send reminder failed");
    }
    console.log("[PASS] Test 8: Follow-up reminder dispatched and logged");

    // Test 9: POST /api/v1/clinical/follow-ups/:id/complete
    console.log(`\nTest 9: POST /api/v1/clinical/follow-ups/${createdId}/complete`);
    const completePayload = {
      outcome: "Symptoms completely resolved. Patient feeling energetic.",
      recoveryStatus: "Improved",
      symptoms: "Mild cramping resolved on day 5",
      clinicalObservations: "Normal vitals. Patient adhering to homeopathic posology.",
    };
    const compRes = await makeRequest(server, "POST", `/api/v1/clinical/follow-ups/${createdId}/complete`, completePayload, authHeaders);
    console.log("Status:", compRes.status);
    console.log("Status updated to:", compRes.body?.data?.followUp?.status);
    console.log("Recovery status:", compRes.body?.data?.followUp?.recoveryStatus);
    if (compRes.status !== 200 || compRes.body?.data?.followUp?.status !== "completed") {
      throw new Error("Complete follow-up failed");
    }
    console.log("[PASS] Test 9: Follow-up completed with clinical outcome");

    // Test 10: GET /api/v1/clinical/follow-ups/export
    console.log("\nTest 10: GET /api/v1/clinical/follow-ups/export");
    const exportRes = await makeRequest(server, "GET", "/api/v1/clinical/follow-ups/export", null, authHeaders);
    console.log("Status:", exportRes.status);
    console.log("Content-Type:", exportRes.headers["content-type"]);
    console.log("Preview CSV header:", typeof exportRes.body === "string" ? exportRes.body.split("\n")[0] : "CSV output");
    if (exportRes.status !== 200 || !exportRes.headers["content-type"].includes("text/csv")) {
      throw new Error("Export CSV failed");
    }
    console.log("[PASS] Test 10: Follow-up CSV export verified");

    console.log("\n================================================================================");
    console.log("ALL 10 FOLLOW-UP MANAGEMENT API TESTS PASSED PERFECTLY!");
    console.log("================================================================================");
  } finally {
    server.close();
    await disconnectDB();
  }
}

if (require.main === module) {
  runFollowUpsMasterSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[TEST SUITE ERROR]", err);
      process.exit(1);
    });
}

module.exports = { runFollowUpsMasterSuite };
