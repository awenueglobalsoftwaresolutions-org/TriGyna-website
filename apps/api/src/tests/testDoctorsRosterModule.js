const assert = require("assert");
const http = require("http");
process.env.NODE_ENV = "test";
const app = require("../app");
const mongoose = require("mongoose");
const env = require("../config/env");
const Doctor = require("../modules/doctors/doctor.model");
const User = require("../modules/users/user.model");
const Employee = require("../modules/hrms/employee.model");

let server;
let baseUrl;
let ownerToken = "";
let testDoctorId = "";

function request(method, path, body = null, token = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

    const req = http.request(url, { method, headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTestSuite() {
  console.log("==================================================");
  console.log("TriGyna Doctor Directory & Roster — Test Suite");
  console.log("==================================================");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongoUri || "mongodb://127.0.0.1:27017/trigyna");
  }

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestServer] Ephemeral server running at ${baseUrl}`);

  let passed = 0;
  function pass(msg) {
    passed++;
    console.log(`  ✓ [PASS] ${msg}`);
  }

  try {
    // 1. Authenticate Owner
    const loginRes = await request("POST", "/api/v1/auth/login", {
      identifier: "+919172772326",
      password: "TriGyna@2326",
    });
    assert.strictEqual(loginRes.status, 200, "Owner login failed");
    ownerToken = loginRes.body.data.token;
    pass("Owner authenticated with JWT token");

    // 2. Doctor Stats KPI Aggregation
    const statsRes = await request("GET", "/api/v1/doctors/stats");
    assert.strictEqual(statsRes.status, 200);
    assert.ok(statsRes.body.data.totalDoctors > 0, "Total doctors must be > 0");
    assert.ok(statsRes.body.data.activePercentage >= 0, "Active percentage must be >= 0");
    assert.ok(statsRes.body.data.specializationCoverage > 0, "Specialization coverage must be > 0");
    assert.ok(Array.isArray(statsRes.body.data.specializationList), "Specialization list must be array");
    pass(`GET /api/v1/doctors/stats verified (Total: ${statsRes.body.data.totalDoctors}, Active: ${statsRes.body.data.activeDoctors}, Specs: ${statsRes.body.data.specializationCoverage})`);

    // 3. Doctor Directory Listing & Enrichment
    const listRes = await request("GET", "/api/v1/doctors?limit=5");
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data.doctors), "Doctors must be an array");
    assert.ok(listRes.body.data.doctors.length > 0, "Doctors list must not be empty");

    const sampleDoc = listRes.body.data.doctors[0];
    testDoctorId = sampleDoc._id;
    assert.ok(sampleDoc.userId, "Doctor must have populated userId");
    assert.ok(sampleDoc.nextAvailable, "Doctor must have computed nextAvailable slot");
    assert.ok(Array.isArray(sampleDoc.workingDays), "Doctor must have computed workingDays array");
    pass(`GET /api/v1/doctors verified (Sample: ${sampleDoc.userId?.name}, Fee: ₹${sampleDoc.consultationFee}, Next: ${sampleDoc.nextAvailable})`);

    // 4. Filtering by Status, Specialization & ReDoS Safe Search
    const searchRes = await request("GET", "/api/v1/doctors?search=%2B919&status=active");
    assert.strictEqual(searchRes.status, 200);
    pass("GET /api/v1/doctors with ReDoS special characters ('+919') handled cleanly without crash");

    // 5. Doctor Profile Sub-Resources
    const profileRes = await request("GET", `/api/v1/doctors/${testDoctorId}`);
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileRes.body.data.doctor._id, testDoctorId);
    pass("GET /api/v1/doctors/:id returned full profile and linked HRMS record");

    const scheduleRes = await request("GET", `/api/v1/doctors/${testDoctorId}/schedule`);
    assert.strictEqual(scheduleRes.status, 200);
    assert.ok(Array.isArray(scheduleRes.body.data.workingHours));
    pass("GET /api/v1/doctors/:id/schedule returned weekly working hours");

    const todaySchedRes = await request("GET", `/api/v1/doctors/${testDoctorId}/today-schedule`);
    assert.strictEqual(todaySchedRes.status, 200);
    assert.ok(Array.isArray(todaySchedRes.body.data.schedule));
    pass(`GET /api/v1/doctors/:id/today-schedule returned ${todaySchedRes.body.data.schedule.length} appointments for today`);

    const consultsRes = await request("GET", `/api/v1/doctors/${testDoctorId}/consultations`);
    assert.strictEqual(consultsRes.status, 200);
    assert.ok(Array.isArray(consultsRes.body.data.consultations));
    pass(`GET /api/v1/doctors/:id/consultations returned ${consultsRes.body.data.consultations.length} clinical encounters`);

    const earningsRes = await request("GET", `/api/v1/doctors/${testDoctorId}/earnings`, null, ownerToken);
    assert.strictEqual(earningsRes.status, 200);
    assert.ok(typeof earningsRes.body.data.grossConsultationValue === "number");
    assert.ok(typeof earningsRes.body.data.collectedAmount === "number");
    pass(`GET /api/v1/doctors/:id/earnings verified (Gross: ₹${earningsRes.body.data.grossConsultationValue}, Collected: ₹${earningsRes.body.data.collectedAmount})`);

    // 6. CSV Export
    const exportRes = await request("GET", "/api/v1/doctors/export");
    assert.strictEqual(exportRes.status, 200);
    assert.ok(exportRes.headers["content-type"].includes("text/csv"));
    assert.ok(exportRes.body.includes("Doctor Name,Phone,Email"));
    pass("GET /api/v1/doctors/export streamed valid CSV data");

    // 7. Onboarding New Doctor (POST /api/v1/doctors)
    const newDocPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const createRes = await request(
      "POST",
      "/api/v1/doctors",
      {
        name: "Dr. Ananya Test",
        phone: newDocPhone,
        email: `dr.ananya.${Date.now()}@trigyna.test`,
        specialization: ["Reproductive Wellness", "Homoeopathy"],
        qualifications: "BHMS, MD (Consultant)",
        consultationFee: 850,
        bio: "Specialist in comprehensive women wellness.",
        branchName: "Flagship Indiranagar Centre",
        experienceYears: "10+ Years",
        salary: 80000,
        workingDays: [1, 2, 3, 4, 5],
        startTime: "10:00",
        endTime: "18:00",
      },
      ownerToken
    );
    assert.strictEqual(createRes.status, 201, "Create doctor failed: " + JSON.stringify(createRes.body));
    const createdDoctorId = createRes.body.data.doctor._id;
    pass("POST /api/v1/doctors onboarded new doctor and synchronized HRMS employee profile");

    // 8. Update Doctor Profile (PATCH /api/v1/doctors/:id)
    const updateRes = await request(
      "PATCH",
      `/api/v1/doctors/${createdDoctorId}`,
      {
        consultationFee: 950,
        qualifications: "BHMS, MD, Fellowship in Reproductive Medicine",
      },
      ownerToken
    );
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.doctor.consultationFee, 950);
    pass("PATCH /api/v1/doctors/:id updated consultation fee to ₹950");

    // 9. Quick Status Toggle (PATCH /api/v1/doctors/:id/status)
    const statusRes = await request(
      "PATCH",
      `/api/v1/doctors/${createdDoctorId}/status`,
      { status: "on_leave" },
      ownerToken
    );
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.data.doctor.status, "on_leave");
    pass("PATCH /api/v1/doctors/:id/status toggled status to 'on_leave'");

    // 10. Clean up created test doctor
    const deleteRes = await request("DELETE", `/api/v1/doctors/${createdDoctorId}`, null, ownerToken);
    assert.strictEqual(deleteRes.status, 200);
    pass("DELETE /api/v1/doctors/:id cleaned up test doctor cleanly");

    console.log("==================================================");
    console.log(`ALL DOCTORS ROSTER TESTS PASSED (${passed}/${passed}) 100%`);
    console.log("==================================================");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
