const assert = require("assert");
const http = require("http");
const mongoose = require("mongoose");
process.env.NODE_ENV = "test";
const env = require("../config/env");
const app = require("../app");
const User = require("../modules/users/user.model");

let server;
let baseUrl;
let adminToken = "";
let doctorToken = "";
let patientToken = "";

function request(method, path, body = null, token = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runAdminDashboardVerification() {
  console.log("==================================================");
  console.log("TriGyna Admin Dashboard — Full API & RBAC Test Suite");
  console.log("==================================================");

  const mongoUri = env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna_test";
  assert(
    mongoUri.includes("trigyna_test"),
    "SAFETY CHECK FAILED: Tests MUST run against trigyna_test database"
  );

  await mongoose.connect(mongoUri);
  console.log(`[Database] MongoDB connected successfully to: ${mongoose.connection.host}/${mongoose.connection.name}`);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestServer] Ephemeral server running at ${baseUrl}`);

  try {
    // 1. Authenticate Admin
    const loginRes = await request("POST", "/api/v1/auth/login", {
      identifier: "admin@trigyna.test",
      password: "TriGyna@123",
    });
    assert.strictEqual(loginRes.status, 200, "Admin login must succeed");
    adminToken = loginRes.body.data.tokens?.accessToken || loginRes.body.data.token;
    console.log("  ✓ [PASS] Admin authenticated with JWT access token");

    // Authenticate Doctor for RBAC checks
    const docLogin = await request("POST", "/api/v1/auth/login", {
      identifier: "doctor@trigyna.test",
      password: "TriGyna@123",
    });
    if (docLogin.status === 200) {
      doctorToken = docLogin.body.data.tokens?.accessToken || docLogin.body.data.token;
    }

    // Authenticate Patient for RBAC checks
    const patLogin = await request("POST", "/api/v1/auth/login", {
      identifier: "patient@trigyna.test",
      password: "TriGyna@123",
    });
    if (patLogin.status === 200) {
      patientToken = patLogin.body.data.tokens?.accessToken || patLogin.body.data.token;
    }

    // 2. Test GET /api/v1/admin/dashboard/overview
    console.log("\n--- Suite 1: Admin Overview Real Database KPIs ---");
    const overviewRes = await request("GET", "/api/v1/admin/dashboard/overview", null, adminToken);
    assert.strictEqual(overviewRes.status, 200, "Overview must return 200 OK");
    assert.strictEqual(overviewRes.body.success, true, "Overview success must be true");

    const kpis = overviewRes.body.data.kpis;
    assert(typeof kpis.totalActivePatients === "number", "totalActivePatients must be a number");
    assert(typeof kpis.todayAppointments === "number", "todayAppointments must be a number");
    assert(typeof kpis.activeDoctors === "number", "activeDoctors must be a number");
    assert(typeof kpis.totalRevenue === "number", "totalRevenue must be a number");
    assert(typeof kpis.outstandingDues === "number", "outstandingDues must be a number");
    assert(typeof kpis.conversionRate === "number", "conversionRate must be a number");
    console.log(`  ✓ [PASS] GET /admin/dashboard/overview: Active Patients=${kpis.totalActivePatients}, Appts=${kpis.todayAppointments}, Revenue=₹${kpis.totalRevenue}`);

    const crm = overviewRes.body.data.crmPipeline;
    assert(crm !== undefined, "crmPipeline must be present");
    assert(typeof crm.new === "number", "crm.new count must be number");
    assert(typeof crm.contacted === "number", "crm.contacted count must be number");
    assert(typeof crm.qualified === "number", "crm.qualified count must be number");
    assert(typeof crm.converted === "number", "crm.converted count must be number");
    assert(typeof crm.lost === "number", "crm.lost count must be number");
    console.log(`  ✓ [PASS] 5 Canonical CRM Pipeline Counts verified: [new:${crm.new}, contacted:${crm.contacted}, qualified:${crm.qualified}, converted:${crm.converted}, lost:${crm.lost}]`);

    assert(Array.isArray(overviewRes.body.data.todaySchedule), "todaySchedule must be an array");
    console.log(`  ✓ [PASS] Today's schedule returned (${overviewRes.body.data.todaySchedule.length} appointments)`);

    // 3. Test GET /api/v1/admin/dashboard/trends
    console.log("\n--- Suite 2: Admin 7-Day & 30-Day Trends ---");
    const trendsRes = await request("GET", "/api/v1/admin/dashboard/trends?days=7", null, adminToken);
    assert.strictEqual(trendsRes.status, 200, "Trends must return 200 OK");
    assert(Array.isArray(trendsRes.body.data.trends), "trends must be an array");
    assert.strictEqual(trendsRes.body.data.trends.length, 7, "7-day trends must contain 7 days");
    trendsRes.body.data.trends.forEach((t) => {
      assert(t.date, "Trend item must have date");
      assert(typeof t.appointments === "number", "Trend item must have appointments count");
      assert(typeof t.collections === "number", "Trend item must have collections amount");
    });
    console.log("  ✓ [PASS] GET /admin/dashboard/trends returned 7 daily intervals with appointments and collections");

    // 4. Test GET /api/v1/admin/dashboard/recent-activity
    console.log("\n--- Suite 3: Admin Recent Audit Activity ---");
    const activityRes = await request("GET", "/api/v1/admin/dashboard/recent-activity", null, adminToken);
    assert.strictEqual(activityRes.status, 200, "Recent activity must return 200 OK");
    assert(Array.isArray(activityRes.body.data.activities), "activities must be an array");
    activityRes.body.data.activities.forEach((act) => {
      if (act.details) {
        assert.strictEqual(act.details.password, undefined, "Sensitive password must not be present in audit details");
        assert.strictEqual(act.details.passwordHash, undefined, "Sensitive passwordHash must not be present in audit details");
      }
    });
    console.log(`  ✓ [PASS] GET /admin/dashboard/recent-activity returned ${activityRes.body.data.activities.length} sanitized audit events`);

    // 5. Test GET /api/v1/admin/dashboard/action-center
    console.log("\n--- Suite 4: Action Center Real Operations ---");
    const actionRes = await request("GET", "/api/v1/admin/dashboard/action-center", null, adminToken);
    assert.strictEqual(actionRes.status, 200, "Action center must return 200 OK");
    assert(Array.isArray(actionRes.body.data.items), "Action items must be an array");
    assert(actionRes.body.data.counts !== undefined, "Action counts must be present");
    console.log(`  ✓ [PASS] GET /admin/dashboard/action-center: totalPendingActions=${actionRes.body.data.totalPendingActions}, unassignedLeads=${actionRes.body.data.counts.unassignedLeads}`);

    // 6. Test GET /api/v1/admin/reports/:domain
    console.log("\n--- Suite 5: Domain Reports ---");
    for (const domain of ["appointments", "patients", "crm", "collections", "hrms"]) {
      const repRes = await request("GET", `/api/v1/admin/reports/${domain}`, null, adminToken);
      assert.strictEqual(repRes.status, 200, `Report for ${domain} must return 200 OK`);
      assert.strictEqual(repRes.body.data.domain, domain, `Report domain must be ${domain}`);
      assert(repRes.body.data.metrics !== undefined, `Report metrics must be present for ${domain}`);
      console.log(`  ✓ [PASS] GET /admin/reports/${domain} returned verified metrics`);
    }

    // 7. Test GET /api/v1/admin/system/health
    console.log("\n--- Suite 6: System Infrastructure Health ---");
    const healthRes = await request("GET", "/api/v1/admin/system/health", null, adminToken);
    assert.strictEqual(healthRes.status, 200, "System health must return 200 OK");
    assert.strictEqual(healthRes.body.data.status, "HEALTHY", "System status must be HEALTHY");
    assert.strictEqual(healthRes.body.data.database.status, "CONNECTED", "Database status must be CONNECTED");
    console.log("  ✓ [PASS] GET /admin/system/health verified database and gateway configurations");

    // 8. Test RBAC Enforcement on /api/v1/admin/*
    console.log("\n--- Suite 7: Role-Based Access Control (RBAC) Hardening ---");
    const unauthRes = await request("GET", "/api/v1/admin/dashboard/overview");
    assert.strictEqual(unauthRes.status, 401, "Unauthenticated access to /admin must be rejected with 401");
    console.log("  ✓ [PASS] Unauthenticated access rejected with 401 Unauthorized");

    if (doctorToken) {
      const docForbidden = await request("GET", "/api/v1/admin/dashboard/overview", null, doctorToken);
      assert.strictEqual(docForbidden.status, 403, "Doctor access to /admin must be rejected with 403");
      console.log("  ✓ [PASS] Doctor access to admin console rejected with 403 Forbidden");
    }

    if (patientToken) {
      const patForbidden = await request("GET", "/api/v1/admin/dashboard/overview", null, patientToken);
      assert.strictEqual(patForbidden.status, 403, "Patient access to /admin must be rejected with 403");
      console.log("  ✓ [PASS] Patient access to admin console rejected with 403 Forbidden");
    }

    // 9. Test Aliased Domain Routes under /api/v1/admin/*
    console.log("\n--- Suite 8: Aliased Admin Domain Endpoints ---");
    const [adminPatients, adminDoctors, adminAppts, adminCrm, adminHrms, adminInvoices] = await Promise.all([
      request("GET", "/api/v1/admin/patients?limit=5", null, adminToken),
      request("GET", "/api/v1/admin/doctors", null, adminToken),
      request("GET", "/api/v1/admin/appointments?limit=5", null, adminToken),
      request("GET", "/api/v1/admin/crm/leads?limit=5", null, adminToken),
      request("GET", "/api/v1/admin/hrms/employees?limit=5", null, adminToken),
      request("GET", "/api/v1/admin/billing/invoices?limit=5", null, adminToken),
    ]);

    assert.strictEqual(adminPatients.status, 200, "/admin/patients must return 200");
    assert.strictEqual(adminDoctors.status, 200, "/admin/doctors must return 200");
    assert.strictEqual(adminAppts.status, 200, "/admin/appointments must return 200");
    assert.strictEqual(adminCrm.status, 200, "/admin/crm/leads must return 200");
    assert.strictEqual(adminHrms.status, 200, "/admin/hrms/employees must return 200");
    assert.strictEqual(adminInvoices.status, 200, "/admin/billing/invoices must return 200");
    console.log("  ✓ [PASS] Aliased endpoints (/admin/patients, /doctors, /appointments, /crm, /hrms, /billing) verified 200 OK");

    console.log("\n==================================================");
    console.log("ALL ADMIN DASHBOARD VERIFICATION TESTS PASSED (100%)");
    console.log("==================================================");
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    console.log("[Database] MongoDB connection closed cleanly.");
  }
}

runAdminDashboardVerification().catch((err) => {
  console.error("\nTEST SUITE FAILED with error:", err);
  process.exit(1);
});
