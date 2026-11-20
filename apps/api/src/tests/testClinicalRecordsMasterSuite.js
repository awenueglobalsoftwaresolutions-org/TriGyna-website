const mongoose = require("mongoose");
const http = require("http");
const app = require("../app");
const User = require("../modules/users/user.model");
const Consultation = require("../modules/clinical/consultation.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

async function runMasterClinicalTests() {
  console.log("==================================================");
  console.log("TriGyna Clinical Records & EHR Master Test Suite");
  console.log("==================================================");

  await mongoose.connect(env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestRunner] Server running at ${baseUrl}`);

  // Fetch or create owner user
  let owner = await User.findOne({ role: "owner" });
  if (!owner) {
    owner = await User.create({
      name: "Sushil Kushwaha",
      phone: "919172772326",
      email: "owner@trigyna.com",
      password: "HashPassword123!",
      role: "owner",
      status: "active",
    });
  }

  const token = jwt.sign({ id: owner._id, role: owner.role }, env.JWT_SECRET, { expiresIn: "1h" });
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

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
    // Test 1: Stats
    console.log("\n--- Suite 1: Clinical KPI Statistics ---");
    const statsRes = await fetch(`${baseUrl}/api/v1/clinical/consultations/stats`, { headers: authHeaders });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200, "Stats returns 200 OK");
    assert(statsData.data.totalConsultations >= 0, `Total consultations count: ${statsData.data.totalConsultations}`);
    assert(statsData.data.finalizedRecords >= 0, `Finalized count: ${statsData.data.finalizedRecords}`);
    assert(statsData.data.activeTreatmentPlans >= 0, `Active treatment plans: ${statsData.data.activeTreatmentPlans}`);
    assert(statsData.data.followUpsDue >= 0, `Follow-ups due: ${statsData.data.followUpsDue}`);

    // Test 2: Consultations List with Pagination & Filters
    console.log("\n--- Suite 2: Consultations Listing & Filtering ---");
    const listRes = await fetch(`${baseUrl}/api/v1/clinical/consultations?limit=20&page=1`, { headers: authHeaders });
    const listData = await listRes.json();
    assert(listRes.status === 200, "List consultations returns 200 OK");
    assert(Array.isArray(listData.data.consultations), "Consultations is an array");
    assert(listData.data.total >= 0, `Total records in database: ${listData.data.total}`);

    // Test 3: Diagnoses Catalog
    console.log("\n--- Suite 3: Diagnoses Catalog ---");
    const diagRes = await fetch(`${baseUrl}/api/v1/clinical/diagnoses`, { headers: authHeaders });
    const diagData = await diagRes.json();
    assert(diagRes.status === 200, "Diagnoses catalog returns 200 OK");
    assert(Array.isArray(diagData.data.diagnoses), "Diagnoses list is an array");
    assert(diagData.data.diagnoses.length > 0, `Found ${diagData.data.diagnoses.length} distinct diagnoses`);

    // Test 4: Treatment Plans
    console.log("\n--- Suite 4: Treatment Plans Management ---");
    const tpRes = await fetch(`${baseUrl}/api/v1/clinical/treatment-plans`, { headers: authHeaders });
    const tpData = await tpRes.json();
    assert(tpRes.status === 200, "List treatment plans returns 200 OK");
    assert(Array.isArray(tpData.data.plans), "Treatment plans is an array");

    // Test 5: Prescriptions Listing
    console.log("\n--- Suite 5: Prescriptions Listing ---");
    const rxRes = await fetch(`${baseUrl}/api/v1/clinical/prescriptions`, { headers: authHeaders });
    const rxData = await rxRes.json();
    assert(rxRes.status === 200, "List prescriptions returns 200 OK");
    assert(Array.isArray(rxData.data.prescriptions), "Prescriptions is an array");

    // Test 6: Patient EHR Timeline
    console.log("\n--- Suite 6: Patient EHR Timeline ---");
    const anyPatient = await Patient.findOne();
    if (anyPatient) {
      const timelineRes = await fetch(`${baseUrl}/api/v1/clinical/patients/${anyPatient._id}/timeline`, { headers: authHeaders });
      const timelineData = await timelineRes.json();
      assert(timelineRes.status === 200, `EHR timeline returns 200 for patient ${anyPatient.fullName}`);
      assert(Array.isArray(timelineData.data.timeline), "Timeline is an array");
      assert(timelineData.data.timeline.length > 0, `Timeline events count: ${timelineData.data.timeline.length}`);
    }

    // Test 7: Export CSV
    console.log("\n--- Suite 7: CSV Export ---");
    const exportRes = await fetch(`${baseUrl}/api/v1/clinical/consultations/export`, { headers: authHeaders });
    assert(exportRes.status === 200, "Export consultations returns 200 OK");
    assert(exportRes.headers.get("content-type").includes("text/csv"), "Content type is text/csv");
    const csvText = await exportRes.text();
    assert(csvText.includes("Consultation Code"), "CSV contains headers");

    // Test 8: Clinical Reports Analytics
    console.log("\n--- Suite 8: Clinical Reports Analytics ---");
    const analyticsRes = await fetch(`${baseUrl}/api/v1/clinical/reports/analytics`, { headers: authHeaders });
    const analyticsData = await analyticsRes.json();
    assert(analyticsRes.status === 200, "Clinical reports analytics returns 200 OK");
    assert(Array.isArray(analyticsData.data.topDiagnoses), "Top diagnoses is an array");
    assert(Array.isArray(analyticsData.data.doctorPerformance), "Doctor performance is an array");

    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  if (failed > 0) process.exit(1);
}

runMasterClinicalTests().catch((err) => {
  console.error("Clinical tests runner error:", err);
  process.exit(1);
});
