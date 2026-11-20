const http = require("http");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");

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
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          // raw string
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log("=== STARTING MY PATIENTS MODULE API TEST ===");
  await connectDB();

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      BASE_URL = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    // 1. Authenticate Dr. Ananya
    const loginRes = await request("POST", "/api/v1/auth/login", {
      identifier: "ananya.sharma@trigyna.test",
      password: "TriGyna@123",
    });

    if (loginRes.status !== 200 || !loginRes.body.data?.token) {
      throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
    }
    const token = loginRes.body.data.token;
    console.log("[PASS] Dr. Ananya authenticated");

    // 2. Test GET /api/v1/doctor/patients/summary
    const summaryRes = await request("GET", "/api/v1/doctor/patients/summary", null, token);
    console.log(`Summary Status: ${summaryRes.status}`);
    if (summaryRes.status !== 200 || !summaryRes.body.data?.kpis) {
      throw new Error(`Summary failed: ${JSON.stringify(summaryRes.body)}`);
    }
    const kpis = summaryRes.body.data.kpis;
    const qf = summaryRes.body.data.quickFilters;
    console.log("[PASS] Patient summary returns 200");
    console.log(`- Total Patients: ${kpis.totalPatients} (${kpis.totalPatientsDelta})`);
    console.log(`- Active Patients: ${kpis.activePatients} (${kpis.activePatientsDelta})`);
    console.log(`- With Upcoming Appt: ${kpis.withUpcomingAppt} (${kpis.withUpcomingApptDelta})`);
    console.log(`- Follow-up Due: ${kpis.followupDue} (${kpis.followupDueDelta})`);
    console.log(`- New Patients: ${kpis.newPatients} (${kpis.newPatientsDelta})`);
    console.log(`- Completed Care: ${kpis.completedCare} (${kpis.completedCareDelta})`);
    console.log(`- Quick Filters: All=${qf.all}, Active=${qf.active}, Upcoming=${qf.upcoming}, FollowupDue=${qf.followupDue}, Previous=${qf.previous}`);

    // 3. Test GET /api/v1/doctor/patients directory listing
    const listRes = await request("GET", "/api/v1/doctor/patients?limit=10", null, token);
    if (listRes.status !== 200 || !Array.isArray(listRes.body.data?.patients)) {
      throw new Error(`Directory listing failed: ${JSON.stringify(listRes.body)}`);
    }
    console.log("[PASS] Patient directory listing returned 200");
    const pts = listRes.body.data.patients;
    console.log(`- Patients retrieved: ${pts.length}`);
    if (pts.length > 0) {
      const p = pts[0];
      console.log(`- Sample patient: ${p.fullName} (${p.patientCode}), Service: ${p.service}, LastAppt: ${p.lastAppointment}, NextAppt: ${p.nextAppointment}, Status: ${p.status}`);
    }

    // 4. Test GET /api/v1/doctor/patients/export
    const exportRes = await request("GET", "/api/v1/doctor/patients/export", null, token);
    if (exportRes.status !== 200 || !exportRes.raw.includes("Patient Code")) {
      throw new Error(`Export failed: ${exportRes.status}`);
    }
    console.log("[PASS] Patient export returned 200 with CSV payload");

    // 5. Test Register / Add Patient
    const newPtPhone = `98200${Math.floor(10000 + Math.random() * 90000)}`;
    const addRes = await request(
      "POST",
      "/api/v1/doctor/patients",
      {
        fullName: "Simran Kaur",
        phone: newPtPhone,
        age: 32,
        gender: "female",
        allergies: ["Sulfa Drugs"],
        medicalHistory: "PCOS review and metabolic profile.",
      },
      token
    );

    if (addRes.status !== 201 && addRes.status !== 200) {
      throw new Error(`Add patient failed: ${JSON.stringify(addRes.body)}`);
    }
    const createdPatient = addRes.body.data.patient;
    console.log(`[PASS] Add patient succeeded: ${createdPatient.fullName} (${createdPatient.patientCode})`);

    // 6. Test Patient Profile Overview
    const overviewRes = await request("GET", `/api/v1/doctor/patients/${createdPatient._id}/overview`, null, token);
    if (overviewRes.status !== 200 || !overviewRes.body.data?.metrics) {
      throw new Error(`Overview failed: ${JSON.stringify(overviewRes.body)}`);
    }
    console.log("[PASS] Patient profile overview returned 200");

    // 7. Test Patient Allergies
    const allergiesRes = await request("GET", `/api/v1/doctor/patients/${createdPatient._id}/allergies`, null, token);
    if (allergiesRes.status !== 200 || !Array.isArray(allergiesRes.body.data?.allergies)) {
      throw new Error(`Allergies failed: ${JSON.stringify(allergiesRes.body)}`);
    }
    console.log("[PASS] Patient allergies returned 200");
    console.log(`- Allergies count: ${allergiesRes.body.data.allergies.length}`);

    // 8. Test Patient Medications
    const medsRes = await request("GET", `/api/v1/doctor/patients/${createdPatient._id}/medications`, null, token);
    if (medsRes.status !== 200) {
      throw new Error(`Medications failed: ${JSON.stringify(medsRes.body)}`);
    }
    console.log("[PASS] Patient active medications returned 200");

    // 9. Test Patient Documents
    const docsRes = await request("GET", `/api/v1/doctor/patients/${createdPatient._id}/documents`, null, token);
    if (docsRes.status !== 200) {
      throw new Error(`Documents failed: ${JSON.stringify(docsRes.body)}`);
    }
    console.log("[PASS] Patient documents returned 200");

    console.log("=== ALL MY PATIENTS API CHECKS PASSED ===");
  } finally {
    if (server) server.close();
    await disconnectDB();
  }
}

runTest().catch((err) => {
  console.error("Test failed", err);
  process.exit(1);
});
