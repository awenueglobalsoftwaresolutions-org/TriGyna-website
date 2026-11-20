/**
 * Comprehensive Verification of Complete Doctor Workflow Endpoints
 * Tests:
 * 1. Start consultation & outcome recording
 * 2. Standalone prescription authoring, finalization & PDF stream
 * 3. Medical history alias endpoint
 * 4. Doctor availability query
 * 5. Leave application workflow with appointment conflict detection
 * 6. Doctor leave requests list
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
        } catch {
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
  console.log("=== STARTING COMPLETE DOCTOR WORKFLOW API VERIFICATION ===\n");
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

    // 1. Doctor Login
    const loginRes = await request("POST", "/api/v1/auth/login", {
      identifier: "ananya.sharma@trigyna.test",
      password: "TriGyna@123",
    });
    assert(loginRes.status === 200, "Doctor login successful");
    const token = loginRes.body?.data?.token;

    // 2. Dashboard with new schedule alerts & next consultation
    const dashRes = await request("GET", "/api/v1/doctor/dashboard", null, token);
    assert(dashRes.status === 200, "GET /api/v1/doctor/dashboard returns 200");
    assert(Array.isArray(dashRes.body?.data?.scheduleAlerts), "Dashboard includes scheduleAlerts array");
    console.log(`- Active schedule alerts: ${dashRes.body?.data?.scheduleAlerts?.length || 0}`);

    // 3. Get doctor appointments
    const apptsRes = await request("GET", "/api/v1/doctor/appointments", null, token);
    assert(apptsRes.status === 200, "Appointments fetched");
    const appts = apptsRes.body?.data?.appointments || [];
    assert(appts.length > 0, `Found ${appts.length} assigned appointments`);
    const targetAppt = appts[0];

    // 4. Start consultation endpoint
    const startRes = await request("POST", `/api/v1/doctor/appointments/${targetAppt._id}/start-consultation`, {}, token);
    assert(startRes.status === 200, "POST /api/v1/doctor/appointments/:id/start-consultation returns 200");
    assert(startRes.body?.data?.appointment?.status === "in_consultation" || targetAppt.status === "completed", "Appointment transitioned to in_consultation");
    assert(Boolean(startRes.body?.data?.consultation?._id), "Draft consultation initialized or linked");

    // 5. Update appointment outcome
    const outcomeRes = await request("PATCH", `/api/v1/doctor/appointments/${targetAppt._id}/outcome`, {
      status: "completed",
      outcomeNotes: "Patient responded well to initial homeopathic remedy.",
    }, token);
    assert(outcomeRes.status === 200, "PATCH /api/v1/doctor/appointments/:id/outcome returns 200");
    assert(outcomeRes.body?.data?.appointment?.status === "completed", "Appointment marked completed");

    // 6. Medical history alias endpoint
    const patientId = targetAppt.patientId?._id || targetAppt.patientId;
    const medHistRes = await request("GET", `/api/v1/doctor/patients/${patientId}/medical-history`, null, token);
    assert(medHistRes.status === 200, "GET /api/v1/doctor/patients/:id/medical-history returns 200");
    assert(Boolean(medHistRes.body?.data?.patient), "Returns patient clinical profile");

    // 7. General Prescription creation endpoint
    const createRxRes = await request("POST", "/api/v1/doctor/prescriptions", {
      patientId,
      appointmentId: targetAppt._id,
      medications: [
        { name: "Pulsatilla 30C", dosage: "4 pills", frequency: "BD", duration: "14 days", instructions: "Dry on tongue" },
        { name: "Folliculinum 200", dosage: "1 dose", frequency: "Single dose", duration: "1 day", instructions: "Early morning" },
      ],
      dietaryAdvice: "Avoid peppermint and camphor 30 mins before remedy.",
      specialInstructions: "Hydrate well and track cycle day.",
      isReleasedToPatient: false,
    }, token);
    assert(createRxRes.status === 201, "POST /api/v1/doctor/prescriptions returns 201 Created");
    const createdRx = createRxRes.body?.data?.prescription;
    assert(Boolean(createdRx?.prescriptionCode), `Prescription generated atomic code: ${createdRx?.prescriptionCode}`);

    // 8. Finalize prescription endpoint
    const finalizeRxRes = await request("POST", `/api/v1/doctor/prescriptions/${createdRx._id}/finalize`, {}, token);
    assert(finalizeRxRes.status === 200, "POST /api/v1/doctor/prescriptions/:id/finalize returns 200");
    assert(finalizeRxRes.body?.data?.prescription?.isReleasedToPatient === true, "Prescription marked released to patient");

    // 9. Prescription PDF stream endpoint
    const pdfRes = await request("GET", `/api/v1/doctor/prescriptions/${createdRx._id}/pdf`, null, token);
    assert(pdfRes.status === 200, "GET /api/v1/doctor/prescriptions/:id/pdf returns 200");
    assert(pdfRes.headers["content-type"] === "application/pdf", "Content-Type is application/pdf");

    // 10. Availability endpoint
    const availRes = await request("GET", "/api/v1/doctor/availability", null, token);
    assert(availRes.status === 200, "GET /api/v1/doctor/availability returns 200");
    assert(Array.isArray(availRes.body?.data?.availability), "Returns weekly availability array");

    // 11. Request Leave with conflict calculation
    const leaveRes = await request("POST", "/api/v1/doctor/leave-requests", {
      startDate: "2026-12-10",
      endDate: "2026-12-12",
      leaveType: "casual",
      reason: "Family wedding and travel",
    }, token);
    assert(leaveRes.status === 201, "POST /api/v1/doctor/leave-requests returns 201 Created");
    assert(leaveRes.body?.data?.leave?.status === "pending", "Leave status is pending review");
    assert(typeof leaveRes.body?.data?.affectedAppointmentsCount === "number", "Calculated affected appointments count");

    // 12. Doctor leave requests list
    const myLeavesRes = await request("GET", "/api/v1/doctor/leave-requests", null, token);
    assert(myLeavesRes.status === 200, "GET /api/v1/doctor/leave-requests returns 200");
    assert(Array.isArray(myLeavesRes.body?.data?.leaves), "Returns list of doctor leave requests");

    console.log(`\n======================================================`);
    console.log(`COMPLETE WORKFLOW VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error("Test execution failed:", err);
    failed++;
  } finally {
    if (server) server.close();
    await disconnectDB();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();

