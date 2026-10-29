/**
 * TriGyna Doctor Clinical Workspace End-to-End Test Suite
 * Validates doctor authentication, scoped authorization, KPI calculations,
 * appointment status transitions, consultation lifecycle, and prescriptions.
 */

const http = require("http");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");

let server;
let BASE_URL;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
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
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log("=== STARTING TRIGYNA DOCTOR CLINICAL WORKSPACE VERIFICATION ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    BASE_URL = `http://127.0.0.1:${server.address().port}`;
    // 1. Unauthorized Access Test
    console.log("Test 1: Testing unauthorized protection on doctor endpoints...");
    const unauthRes = await request("GET", "/api/v1/doctor/dashboard");
    assert(unauthRes.status === 401, "Protected /api/v1/doctor/dashboard rejects unauthenticated requests with 401");

    // 2. Doctor Login
    console.log("\nTest 2: Authenticating Dr. Ananya Sharma...");
    const loginRes = await request("POST", "/api/v1/auth/login", {
      identifier: "ananya.sharma@trigyna.test",
      password: "TriGyna@123",
    });

    assert(loginRes.status === 200, "Doctor login succeeds with HTTP 200");
    const token = loginRes.body?.data?.token;
    const userRole = loginRes.body?.data?.user?.role;
    assert(Boolean(token), "Received valid JWT access token");
    assert(userRole === "doctor", `User role is verified as doctor: "${userRole}"`);

    // 3. Doctor Dashboard Summary
    console.log("\nTest 3: Fetching Doctor Dashboard clinical overview...");
    const dashRes = await request("GET", "/api/v1/doctor/dashboard?date=2026-10-26", null, token);
    assert(dashRes.status === 200, "GET /api/v1/doctor/dashboard returned 200");
    const summary = dashRes.body?.data;
    assert(summary?.doctor?.name?.includes("Ananya"), `Doctor identity returned: ${summary?.doctor?.name}`);

    const todayApptsCount = summary?.kpis?.todayAppointments?.value ?? summary?.kpis?.todayAppointments;
    const waitingCount = summary?.kpis?.waitingPatients?.value ?? summary?.kpis?.waitingPatients;
    const completedCount = summary?.kpis?.consultationsCompleted?.value ?? summary?.kpis?.completedConsultations;
    const apptsArray = summary?.appointments ?? summary?.todayAppointments ?? [];
    const queueArray = summary?.patientQueue ?? [];
    const followupsArray = summary?.upcomingFollowUps ?? summary?.upcomingFollowups ?? [];
    const tasksArray = summary?.clinicalTasks ?? [];

    assert(todayApptsCount >= 10, `KPI todayAppointments calculated from DB: ${todayApptsCount}`);
    assert(waitingCount >= 0, `KPI waitingPatients in queue calculated: ${waitingCount}`);
    assert(typeof completedCount === "number", `KPI completedConsultations calculated: ${completedCount}`);
    assert(apptsArray.length > 0, `Returned ${apptsArray.length} today's appointments`);
    assert(queueArray.length > 0, `Returned ${queueArray.length} patients in waiting queue`);
    assert(followupsArray.length > 0, `Returned ${followupsArray.length} upcoming follow-ups`);
    assert(tasksArray.length > 0, `Returned ${tasksArray.length} clinical tasks`);

    // 4. Appointments Scoping
    console.log("\nTest 4: Verifying appointments scoping...");
    const apptsRes = await request("GET", "/api/v1/doctor/appointments?date=2026-10-26", null, token);
    assert(apptsRes.status === 200, "GET /api/v1/doctor/appointments returned 200");
    const apptsList = apptsRes.body?.data?.appointments || apptsRes.body?.data || [];
    assert(apptsList.length > 0, `Loaded ${apptsList.length} assigned appointments`);

    // 5. Patient Directory
    console.log("\nTest 5: Verifying authorized patient directory...");
    const ptsRes = await request("GET", "/api/v1/doctor/patients", null, token);
    assert(ptsRes.status === 200, "GET /api/v1/doctor/patients returned 200");
    const patientList = ptsRes.body?.data?.patients || ptsRes.body?.data || [];
    assert(patientList.length > 0, `Loaded ${patientList.length} authorized patients`);
    const testPatient = patientList[0];

    // Patient History
    const historyRes = await request("GET", `/api/v1/doctor/patients/${testPatient._id}/history`, null, token);
    assert(historyRes.status === 200, "GET /api/v1/doctor/patients/:id/history returned 200");
    assert(historyRes.body?.data?.patient?._id === testPatient._id, "Medical history correctly scoped to requested patient");

    // 6. Clinical Consultation Lifecycle
    console.log("\nTest 6: Testing Consultation Draft -> Finalize -> Lock workflow...");
    const existingConsRes = await request("GET", "/api/v1/doctor/consultations", null, token);
    const existingConsList = existingConsRes.body?.data?.consultations || [];
    const finSet = new Set(existingConsList.filter((c) => c.isFinalized).map((c) => String(c.appointmentId?._id || c.appointmentId)));

    const allApptsRes = await request("GET", "/api/v1/doctor/appointments", null, token);
    const allApptsList = allApptsRes.body?.data?.appointments || [];
    const testAppt = allApptsList.find((a) => !finSet.has(String(a._id))) || apptsList[0];

    // 6a. Create Draft
    const draftRes = await request(
      "POST",
      "/api/v1/doctor/consultations",
      {
        appointmentId: testAppt._id,
        patientId: testPatient._id,
        chiefComplaints: "Mild pelvic pressure, routine 2nd trimester evaluation",
        examinationNotes: "BP 118/76 mmHg, FHR regular @ 144 bpm. No abdominal tenderness.",
        diagnosis: "Intrauterine Pregnancy, 24 weeks gestation",
        treatmentPlan: "Continue maternal multivitamin and calcium supplement.",
        followUpAdvice: "Anomaly scan follow-up in 2 weeks",
        medications: [
          {
            name: "Calci-D 500mg",
            dosage: "500mg",
            frequency: "Once daily",
            duration: "30 days",
            instructions: "After lunch",
          },
        ],
      },
      token
    );
    assert(draftRes.status === 201 || draftRes.status === 200, `POST /api/v1/doctor/consultations created draft (${draftRes.status})`);
    const createdCons = draftRes.body?.data?.consultation || draftRes.body?.data;
    assert(createdCons?.isFinalized === false, "Consultation initially created as draft (isFinalized=false)");

    // 6b. Finalize Consultation
    const finalizeRes = await request(
      "POST",
      `/api/v1/doctor/consultations/${createdCons._id}/finalize`,
      {
        diagnosis: "Intrauterine Pregnancy, 24 weeks gestation - Confirmed Normal",
        treatmentPlan: "Prescription authorized. Patient advised on fetal kick counts.",
        followUpDate: "2026-11-09",
        followUpReason: "Routine 26-week gestational review",
      },
      token
    );
    assert(finalizeRes.status === 200, "POST /api/v1/doctor/consultations/:id/finalize succeeded with 200");
    const finalizedCons = finalizeRes.body?.data?.consultation || finalizeRes.body?.data;
    assert(finalizedCons?.isFinalized === true, "Consultation is now legally finalized and signed");

    // 6c. Verify appointment status updated to completed
    const updatedApptRes = await request("GET", `/api/v1/doctor/appointments/${testAppt._id}`, null, token);
    const updatedAppt = updatedApptRes.body?.data?.appointment || updatedApptRes.body?.data;
    assert(updatedAppt?.status === "completed", "Linked appointment status transitioned to 'completed'");

    // 6d. Test Amendment Workflow on Finalized record
    const amendRes = await request(
      "POST",
      `/api/v1/doctor/consultations/${createdCons._id}/amend`,
      {
        reason: "Patient reported mild nausea in evening; added doxylamine suggestion",
        addendumNotes: "Oral hydration stressed. Take doxylamine 10mg at bedtime if severe.",
      },
      token
    );
    assert(amendRes.status === 200, "Authorized amendment successfully attached to finalized consultation");

    // 7. Clinical Tasks Toggle
    console.log("\nTest 7: Toggling clinical task completion...");
    if (tasksArray.length > 0) {
      const taskToggleRes = await request("PATCH", `/api/v1/doctor/tasks/${tasksArray[0]._id}/toggle`, {}, token);
      assert(taskToggleRes.status === 200, "PATCH /api/v1/doctor/tasks/:id/toggle returned 200");
    }

    // 8. Clinical Reports & Workload
    console.log("\nTest 8: Verifying clinical activity reports...");
    const reportRes = await request("GET", "/api/v1/doctor/reports", null, token);
    assert(reportRes.status === 200, "GET /api/v1/doctor/reports returned 200");
    const reportMetrics = reportRes.body?.data?.metrics || reportRes.body?.data?.stats || reportRes.body?.data;
    assert(typeof reportMetrics?.completedAppointments === "number", "Report returned calculated completed count");

    // 9. Profile and Availability
    console.log("\nTest 9: Testing profile & availability update...");
    const profileRes = await request("GET", "/api/v1/doctor/profile", null, token);
    assert(profileRes.status === 200, "GET /api/v1/doctor/profile returned 200");
    const spec = String(profileRes.body?.data?.doctor?.specialization || "");
    assert(spec.includes("Obstetrician") || spec.includes("Gynecologist") || spec.length > 0, "Doctor specialization verified");

    const availRes = await request(
      "PATCH",
      "/api/v1/doctor/availability",
      {
        bio: "Senior Consultant Obstetrician and Gynecologist with 12+ years of experience in high-risk pregnancies and maternal wellness.",
      },
      token
    );
    assert(availRes.status === 200, "PATCH /api/v1/doctor/availability updated bio successfully");

    console.log(`\n======================================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
  } catch (error) {
    console.error("Test execution failed with error:", error);
    failed++;
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTestSuite();
