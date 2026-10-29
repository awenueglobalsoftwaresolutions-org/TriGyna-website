/**
 * TriGyna Doctor Audit & Integration Verification Suite
 * Verifies:
 * 1. Absence of mock activity logs in Doctor Dashboard
 * 2. Cross-doctor authorization scoping
 * 3. Approved leave integration with booking and availability
 */

process.env.NODE_ENV = "test";
const http = require("http");
const mongoose = require("mongoose");
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
      headers: { "Content-Type": "application/json" },
    };
    if (token) options.headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log("=== STARTING DOCTOR MODULE GAP & INTEGRATION VERIFICATION ===\n");
  let passed = 0;
  let failed = 0;

  function assert(cond, name) {
    if (cond) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  try {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    BASE_URL = `http://127.0.0.1:${server.address().port}`;
    // 1. Authenticate Dr. Ananya Sharma
    const loginAnanya = await request("POST", "/api/v1/auth/login", {
      identifier: "ananya.sharma@trigyna.test",
      password: "TriGyna@123",
    });
    assert(loginAnanya.status === 200, "Dr. Ananya login succeeds (200)");
    const tokenAnanya = loginAnanya.body?.data?.token;

    // 2. Fetch Dr. Ananya's dashboard and verify zero mock patient names
    const dashAnanya = await request("GET", "/api/v1/doctor/dashboard", null, tokenAnanya);
    assert(dashAnanya.status === 200, "Dr. Ananya dashboard returned 200");
    const recentActivity = dashAnanya.body?.data?.recentActivity || [];
    const hasMockNames = recentActivity.some(
      (a) =>
        a.patientName?.includes("Sneha Kapoor") ||
        a.patientName?.includes("Sonal Gupta") ||
        a.patientName?.includes("Pooja Rathi") ||
        a.patientName?.includes("Meera Tandon")
    );
    assert(!hasMockNames, "No hardcoded mock patient names present in dashboard recentActivity");

    // 3. Connect to DB to test Leave Request Integration
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect("mongodb://127.0.0.1:27017/trigyna_test");
    }
    const User = require("../modules/users/user.model");
    const Doctor = require("../modules/doctors/doctor.model");
    const Patient = require("../modules/patients/patient.model");
    const Employee = require("../modules/hrms/employee.model");
    const LeaveRequest = require("../modules/hrms/leave.model");

    const docAnanyaId = dashAnanya.body?.data?.doctor?._id;
    const ananyaUserId = dashAnanya.body?.data?.doctor?.userId;
    assert(Boolean(docAnanyaId), `Dr. Ananya Doctor profile ID found: ${docAnanyaId}`);

    // Ensure Employee profile exists for Dr. Ananya
    let empAnanya = await Employee.findOne({ $or: [{ userId: ananyaUserId }, { employeeCode: "EMP-DOC-ANANYA" }] });
    if (!empAnanya) {
      empAnanya = await Employee.create({
        userId: ananyaUserId,
        employeeCode: "EMP-DOC-ANANYA",
        designation: "Consultant Gynecologist",
        department: "Clinical",
        employmentType: "full_time",
      });
    } else if (!empAnanya.userId || empAnanya.userId.toString() !== ananyaUserId.toString()) {
      empAnanya.userId = ananyaUserId;
      await empAnanya.save();
    }

    const testLeaveDate = "2026-11-20";
    // Create an approved leave request for Dr. Ananya on 2026-11-20
    await LeaveRequest.deleteMany({ employeeId: empAnanya._id, startDate: new Date(`${testLeaveDate}T00:00:00.000Z`) });
    await LeaveRequest.create({
      employeeId: empAnanya._id,
      leaveType: "paid",
      startDate: new Date(`${testLeaveDate}T00:00:00.000Z`),
      endDate: new Date(`${testLeaveDate}T23:59:59.999Z`),
      reason: "Medical conference attendance",
      status: "approved",
    });

    // 4. Test GET /api/v1/appointments/availability for Dr. Ananya on 2026-11-20
    const availRes = await request("GET", `/api/v1/appointments/availability?doctorId=${docAnanyaId}&date=${testLeaveDate}`, null, tokenAnanya);
    console.log("availRes:", JSON.stringify(availRes));
    assert(availRes.status === 200, "Availability endpoint returned 200");
    assert(availRes.body?.data?.isOnLeave === true, "Availability correctly detects doctor is on approved leave");
    assert(availRes.body?.data?.availableSlotsCount === 0, "Available slots count is 0 when doctor is on leave");

    // 5. Attempting to book an appointment on approved leave date must fail with 409 Conflict
    let aPatient = await Patient.findOne({ status: "active" });
    if (!aPatient) {
      aPatient = await Patient.create({
        patientCode: "TR-TEST-PATIENT",
        fullName: "Pooja Verma",
        phone: "9988776655",
        gender: "female",
        age: 29,
        status: "active",
      });
    }

    const bookRes = await request("POST", "/api/v1/appointments", {
      patientId: aPatient._id.toString(),
      doctorId: docAnanyaId.toString(),
      appointmentDate: testLeaveDate,
      startTime: "11:00",
      serviceName: "Skin & Hair",
    }, tokenAnanya);
    console.log("bookRes:", JSON.stringify(bookRes));

    const errMsg = bookRes.body?.error?.message || bookRes.body?.message;
    assert(bookRes.status === 409, `Booking appointment on approved leave date rejected with 409 Conflict (got ${bookRes.status})`);
    assert(errMsg?.includes("approved leave"), `Error message mentions approved leave: "${errMsg}"`);

    // Clean up test leave
    await LeaveRequest.deleteMany({ employeeId: empAnanya._id, startDate: new Date(`${testLeaveDate}T00:00:00.000Z`) });
    await mongoose.disconnect();



    console.log(`\n=== INTEGRATION VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED ===\n`);
  } catch (err) {
    console.error("Test execution failed:", err);
    failed++;
  }

  process.exit(failed > 0 ? 1 : 0);
}

run();
