const http = require("http");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

async function runSuite() {
  console.log("==================================================");
  console.log("TriGyna Doctor Consultations & Clinical Records Test Suite");
  console.log("==================================================");

  await mongoose.connect(env.MONGODB_URI);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Doctor login
  let doctorUser = await User.findOne({ email: "ananya.sharma@trigyna.test" });
  if (!doctorUser) {
    throw new Error("Dr. Ananya Sharma user not found in database");
  }

  const token = jwt.sign({ id: doctorUser._id, role: doctorUser.role }, env.JWT_SECRET, { expiresIn: "1h" });
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
    // 1. KPI Summary
    console.log("\n--- Suite 1: Consultation KPI Summary & Real-time Metrics ---");
    const summaryRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/summary`, { headers: authHeaders });
    const summaryData = await summaryRes.json();
    assert(summaryRes.status === 200, "KPI Summary returns HTTP 200");
    const s = summaryData.data;
    assert(s.totalConsultations >= 45, `Total consultations count: ${s.totalConsultations}`);
    assert(s.draftConsultations >= 1, `Draft consultations count: ${s.draftConsultations}`);
    assert(s.finalizedConsultations >= 40, `Finalized consultations count: ${s.finalizedConsultations}`);
    assert(s.uniquePatients >= 10, `Unique patients count: ${s.uniquePatients}`);
    assert(typeof s.totalTrend === "string", `Total trend computed: "${s.totalTrend}"`);
    assert(typeof s.draftTrend === "string", `Draft trend computed: "${s.draftTrend}"`);
    assert(typeof s.finalizedTrend === "string", `Finalized trend computed: "${s.finalizedTrend}"`);
    assert(typeof s.thisWeekTrend === "string", `This week trend computed: "${s.thisWeekTrend}"`);
    assert(typeof s.uniquePatientsTrend === "string", `Unique patients trend computed: "${s.uniquePatientsTrend}"`);

    // 2. Directory & Segmentation
    console.log("\n--- Suite 2: Consultations Directory & Segmentation ---");
    const allRes = await fetch(`${baseUrl}/api/v1/doctor/consultations?page=1&limit=10`, { headers: authHeaders });
    const allData = await allRes.json();
    assert(allRes.status === 200, "Directory listing returns HTTP 200");
    assert(Array.isArray(allData.data.consultations), "Consultations array present");
    assert(allData.data.total >= 45, `Total count matching filter: ${allData.data.total}`);
    assert(allData.data.counts.all >= 45, `All tab badge count: ${allData.data.counts.all}`);
    assert(allData.data.counts.drafts >= 1, `Drafts tab badge count: ${allData.data.counts.drafts}`);
    assert(allData.data.counts.finalized >= 40, `Finalized tab badge count: ${allData.data.counts.finalized}`);

    // Drafts Filter
    const draftsRes = await fetch(`${baseUrl}/api/v1/doctor/consultations?tab=drafts`, { headers: authHeaders });
    const draftsData = await draftsRes.json();
    assert(draftsRes.status === 200, "Drafts filter returns HTTP 200");
    assert(
      draftsData.data.consultations.every((c) => !c.isFinalized),
      "All consultations in Drafts view are unfinalized"
    );

    // Finalized Filter
    const finRes = await fetch(`${baseUrl}/api/v1/doctor/consultations?tab=finalized`, { headers: authHeaders });
    const finData = await finRes.json();
    assert(finRes.status === 200, "Finalized filter returns HTTP 200");
    assert(
      finData.data.consultations.every((c) => c.isFinalized),
      "All consultations in Finalized view are finalized"
    );

    // 3. Search Filter
    console.log("\n--- Suite 3: Consultation Search Filtering ---");
    const searchRes = await fetch(`${baseUrl}/api/v1/doctor/consultations?search=Sanya`, { headers: authHeaders });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, "Search query returns HTTP 200");
    assert(
      searchData.data.consultations.some((c) => c.patientId?.fullName?.includes("Sanya")),
      "Search found patient Sanya Khanna"
    );

    // 4. Diagnoses Dropdown Catalog
    console.log("\n--- Suite 4: Distinct Diagnoses Catalog ---");
    const diagRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/diagnoses`, { headers: authHeaders });
    const diagData = await diagRes.json();
    assert(diagRes.status === 200, "Diagnoses catalog returns HTTP 200");
    assert(Array.isArray(diagData.data.diagnoses), "Diagnoses is an array");
    assert(diagData.data.diagnoses.length > 0, `Loaded ${diagData.data.diagnoses.length} distinct diagnoses`);

    // 5. Eligible Appointments
    console.log("\n--- Suite 5: Eligible Appointments for New Consultation ---");
    const apptRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/eligible-appointments`, { headers: authHeaders });
    const apptData = await apptRes.json();
    assert(apptRes.status === 200, "Eligible appointments returns HTTP 200");
    assert(Array.isArray(apptData.data.appointments), "Appointments is an array");
    assert(apptData.data.appointments.length > 0, `Found ${apptData.data.appointments.length} eligible appointments`);

    // 6. Create Draft, Autosave, Finalize, Lock Workflow
    console.log("\n--- Suite 6: Full Clinical Lifecycle (Draft -> Autosave -> Finalize -> Lock) ---");
    // Pick an eligible appointment without an existing finalized consultation
    const targetAppt = apptData.data.appointments.find((a) => !a.existingConsultation?.isFinalized) || apptData.data.appointments[0];

    const createRes = await fetch(`${baseUrl}/api/v1/doctor/consultations`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        appointmentId: targetAppt._id,
        patientId: targetAppt.patient?._id,
        chiefComplaints: "Patient reports mild pelvic cramping and occasional nausea.",
        examinationNotes: "Video consultation: Patient alert, responsive, no acute distress.",
        diagnosis: "Pregnancy with mild hyperemesis gravidarum",
        treatmentPlan: "Hydration, small frequent meals, ginger infusion, monitor symptoms.",
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 200, "Create/initialize draft returns HTTP 200");
    const newConsId = createData.data.consultation._id;
    assert(!!newConsId, `Consultation created with ID: ${newConsId}`);
    assert(createData.data.consultation.isFinalized === false, "Consultation is currently a draft");

    // Autosave draft update
    const autosaveRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/${newConsId}/autosave`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        chiefComplaints: "Patient reports mild pelvic cramping, nausea improving with hydration.",
        treatmentPlan: "Hydration protocol confirmed. Vitamin B6 supplementation recommended.",
        followUpAdvice: "Schedule review in 7 days.",
      }),
    });
    const autosaveData = await autosaveRes.json();
    assert(autosaveRes.status === 200, "Autosave returns HTTP 200");
    assert(autosaveData.data.consultation.treatmentPlan.includes("Vitamin B6"), "Autosave persisted treatment plan changes");

    // Get Consultation Detail
    const detailRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/${newConsId}`, { headers: authHeaders });
    const detailData = await detailRes.json();
    assert(detailRes.status === 200, "Get consultation detail returns HTTP 200");
    assert(detailData.data.consultation.patientId.fullName === targetAppt.patient.fullName, "Patient correctly populated");

    // Finalize Consultation
    const finalizeRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/${newConsId}/finalize`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        diagnosis: "Pregnancy with hyperemesis gravidarum - Stabilized",
        treatmentPlan: "Continue maternal multivitamin and B6. Fetal kick counts advised.",
        medications: [
          {
            name: "Pyridoxine (Vitamin B6)",
            dosage: "20 mg",
            frequency: "Twice daily after food",
            duration: "10 days",
            instructions: "Take with water",
          },
        ],
        followUpDate: "2026-11-20",
        followUpReason: "Assess nausea improvement and maternal weight.",
      }),
    });
    const finalizeData = await finalizeRes.json();
    assert(finalizeRes.status === 200, "Finalize consultation returns HTTP 200");
    assert(finalizeData.data.consultation.isFinalized === true, "Consultation is now finalized");

    // Verify Direct Editing is REJECTED on Finalized Record
    const rejectEditRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/${newConsId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ diagnosis: "Hacked or accidental edit" }),
    });
    assert(rejectEditRes.status === 409, "Direct edit on finalized consultation is strictly rejected with 409 Conflict");

    // Add Amendment to Finalized Record
    const amendRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/${newConsId}/amendments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        reason: "Patient called noting allergic rash to synthetic B6 formulation, switched to natural dietary source.",
        newTreatmentPlan: "Discontinue synthetic B6. Increase dietary legume intake.",
      }),
    });
    const amendData = await amendRes.json();
    assert(amendRes.status === 200, "Post-finalization amendment attached with HTTP 200");
    assert(amendData.data.consultation.amendments.length > 0, "Amendment added to audit history");

    // 7. Read-only Finalized Record
    console.log("\n--- Suite 7: Finalized Clinical Record View ---");
    const recordRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/${newConsId}/record`, { headers: authHeaders });
    const recordData = await recordRes.json();
    assert(recordRes.status === 200, "Finalized clinical record retrieved with HTTP 200");
    assert(!!recordData.data.doctorInfo.name, `Doctor info: ${recordData.data.doctorInfo.name}`);
    assert(!!recordData.data.prescription, "Associated prescription linked to record");
    assert(!!recordData.data.followUp, "Associated follow-up linked to record");

    // 8. CSV Export
    console.log("\n--- Suite 8: CSV Export ---");
    const exportRes = await fetch(`${baseUrl}/api/v1/doctor/consultations/export`, { headers: authHeaders });
    assert(exportRes.status === 200, "CSV Export returns HTTP 200");
    const csvText = await exportRes.text();
    assert(csvText.includes("Consultation Code,Date,Time,Patient Code,Patient Name"), "CSV contains proper healthcare columns");

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

