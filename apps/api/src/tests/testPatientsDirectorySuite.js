const assert = require("assert");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const User = require("../modules/users/user.model");
const Patient = require("../modules/patients/patient.model");

async function run() {
  console.log("================================================================================");
  console.log("Starting TriGyna Patients Directory API & Database Integration Test Suite");
  console.log("================================================================================\n");

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
  await mongoose.connect(uri);

  const env = require("../config/env");

  // 1. Find or create an admin user for generating valid auth token
  let admin = await User.findOne({ role: { $in: ["owner", "admin"] } });
  if (!admin) {
    admin = await User.create({
      name: "Sushil Kumar Kushwaha",
      phone: "+91 99999 88888",
      email: "admin@trigyna.com",
      role: "admin",
      status: "active",
      passwordHash: "dummyhash",
    });
  }

  const token = jwt.sign(
    { id: admin._id.toString(), role: admin.role, phone: admin.phone },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const baseUrl = "http://127.0.0.1:5000/api/v1";

  // Helper fetcher
  async function apiGet(endpoint) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: res.status, body: await res.json() };
  }

  async function apiPost(endpoint, data) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return { status: res.status, body: await res.json() };
  }

  // TEST 1: Stats Endpoint
  console.log("Test 1: GET /api/v1/patients/stats");
  const statsRes = await apiGet("/patients/stats");
  console.log("Status:", statsRes.status);
  console.log("KPIs:", JSON.stringify(statsRes.body.data?.kpis, null, 2));
  console.log("Tab Counts:", JSON.stringify(statsRes.body.data?.tabCounts, null, 2));
  assert.strictEqual(statsRes.status, 200, "Stats endpoint should return 200");
  assert.ok(statsRes.body.data.kpis.totalPatients > 0, "Total patients must be > 0");
  assert.ok(statsRes.body.data.tabCounts.all > 0, "Tab count 'all' must be > 0");
  console.log("[PASS] Test 1 passed\n");

  // TEST 2: List Patients with Pagination and Tabs
  console.log("Test 2: GET /api/v1/patients?limit=5&tab=all");
  const listRes = await apiGet("/patients?limit=5&tab=all");
  console.log("Status:", listRes.status);
  console.log("Total:", listRes.body.data?.total, "Returned:", listRes.body.data?.patients?.length);
  assert.strictEqual(listRes.status, 200);
  assert.ok(listRes.body.data.patients.length > 0, "Should return list of patients");
  const sandeep = listRes.body.data.patients.find((p) => p.patientCode === "TR-1016");
  console.log("Sandeep Kumar found:", !!sandeep);
  console.log("[PASS] Test 2 passed\n");

  // TEST 3: Get Patient Overview for Sandeep Kumar
  const targetPatient = await Patient.findOne({ patientCode: "TR-1016" });
  assert.ok(targetPatient, "TR-1016 must exist");

  console.log(`Test 3: GET /api/v1/patients/${targetPatient._id}/overview`);
  const overviewRes = await apiGet(`/patients/${targetPatient._id}/overview`);
  console.log("Status:", overviewRes.status);
  console.log("Clinical Summary:", overviewRes.body.data?.clinicalSummary);
  console.log("Recent Activity events count:", overviewRes.body.data?.recentActivity?.length);
  assert.strictEqual(overviewRes.status, 200);
  assert.strictEqual(overviewRes.body.data.patient.patientCode, "TR-1016");
  assert.ok(overviewRes.body.data.recentActivity.length > 0, "Activity must contain real events");
  console.log("[PASS] Test 3 passed\n");

  // TEST 4: Pre-Registration Duplicate Check
  console.log("Test 4: POST /api/v1/patients/duplicate-check with existing phone");
  const dupRes = await apiPost("/patients/duplicate-check", { phone: "+91 98765 43225" });
  console.log("Status:", dupRes.status);
  console.log("Duplicate matches found:", dupRes.body.data?.matchCount);
  assert.strictEqual(dupRes.status, 200);
  assert.strictEqual(dupRes.body.data.hasDuplicates, true);
  console.log("[PASS] Test 4 passed\n");

  // TEST 5: Export CSV Endpoint
  console.log("Test 5: GET /api/v1/patients/export");
  const exportRes = await fetch(`${baseUrl}/patients/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Export status:", exportRes.status);
  const csvText = await exportRes.text();
  console.log("CSV Header preview:", csvText.split("\n")[0]);
  assert.strictEqual(exportRes.status, 200);
  assert.ok(csvText.includes("Patient Code"), "CSV should contain 'Patient Code' header");
  console.log("[PASS] Test 5 passed\n");

  // TEST 6: Merge Preview & Safe Execution Test
  console.log("Test 6: Duplicate Patient Merge Safety");
  // Create a temporary duplicate patient
  const dupPatient = await Patient.create({
    patientCode: "TR-TEST-DUP-01",
    fullName: "Sandeep Kumar Duplicate",
    phone: "+91 98765 43229",
    status: "active",
    isArchived: false,
  });

  const previewRes = await apiPost("/patients/merge/preview", {
    canonicalId: targetPatient._id.toString(),
    duplicateId: dupPatient._id.toString(),
  });
  console.log("Merge preview status:", previewRes.status);
  assert.strictEqual(previewRes.status, 200);
  assert.strictEqual(previewRes.body.data.canonical.patientCode, "TR-1016");

  const mergeRes = await apiPost("/patients/merge/execute", {
    canonicalId: targetPatient._id.toString(),
    duplicateId: dupPatient._id.toString(),
    reason: "Integration test duplicate verification",
  });
  console.log("Merge execute status:", mergeRes.status);
  assert.strictEqual(mergeRes.status, 200);

  const reloadedDup = await Patient.findById(dupPatient._id);
  assert.strictEqual(reloadedDup.status, "merged");
  assert.strictEqual(reloadedDup.isArchived, true);
  assert.strictEqual(reloadedDup.mergedInto.toString(), targetPatient._id.toString());
  console.log("[PASS] Test 6 passed\n");

  // Clean up test dup patient
  await Patient.findByIdAndDelete(dupPatient._id);

  console.log("================================================================================");
  console.log("ALL 6 PATIENT DIRECTORY INTEGRATION TESTS PASSED PERFECTLY!");
  console.log("================================================================================");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
