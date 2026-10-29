const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");

// Load environment from apps/api/.env
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const app = require("../app");
const env = require("../config/env");

// Models for isolated test setup
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");

const TEST_DB_URI = "mongodb://127.0.0.1:27017/trigyna_test";

function makeRequest(baseUrl, method, routePath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(routePath, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
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
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function runSecurityRemediationTests() {
  console.log("==========================================================");
  console.log("   TriGyna Phase 2 — Stage A: Security Remediation Tests  ");
  console.log("==========================================================");
  console.log("Using Isolated Test Database:", TEST_DB_URI);

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

  // Connect to isolated test database
  await mongoose.connect(TEST_DB_URI);
  console.log("Connected to isolated test database:", mongoose.connection.name);

  // Clean test database
  await Promise.all([
    User.deleteMany({}),
    Doctor.deleteMany({}),
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    Consultation.deleteMany({}),
    Prescription.deleteMany({}),
  ]);

  // Spin up ephemeral test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral test server running at ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------
    // Setup Test Actors
    // -------------------------------------------------------------
    // Doctor A (Dr. Alice)
    const userDoctorA = await User.create({
      name: "Dr. Alice Sharma",
      email: "alice@trigyna.test",
      phone: "+919800000001",
      passwordHash: "dummyhash",
      role: "doctor",
      status: "active",
    });
    const doctorA = await Doctor.create({
      userId: userDoctorA._id,
      specialization: ["Gynecology"],
      qualifications: "MS, OBGYN",
      status: "active",
    });

    // Doctor B (Dr. Bob)
    const userDoctorB = await User.create({
      name: "Dr. Bob Verma",
      email: "bob@trigyna.test",
      phone: "+919800000002",
      passwordHash: "dummyhash",
      role: "doctor",
      status: "active",
    });
    const doctorB = await Doctor.create({
      userId: userDoctorB._id,
      specialization: ["Reproductive Medicine"],
      qualifications: "MD",
      status: "active",
    });

    // Receptionist
    const userReception = await User.create({
      name: "Riya Receptionist",
      email: "reception@trigyna.test",
      phone: "+919800000003",
      passwordHash: "dummyhash",
      role: "reception",
      status: "active",
    });

    // CRM Agent
    const userCrm = await User.create({
      name: "Chetan CRM",
      email: "crm@trigyna.test",
      phone: "+919800000004",
      passwordHash: "dummyhash",
      role: "crm",
      status: "active",
    });

    // Patient 1 (Alice's Patient)
    const userPatient1 = await User.create({
      name: "Pooja Patient",
      email: "pooja@trigyna.test",
      phone: "+919800000005",
      passwordHash: "dummyhash",
      role: "patient",
      status: "active",
    });
    const patient1 = await Patient.create({
      patientCode: "TG-P-9001",
      fullName: "Pooja Patient",
      phone: "+919800000005",
      userId: userPatient1._id,
      assignedDoctorId: doctorA._id,
      status: "active",
    });

    // Patient 2 (Bob's Patient)
    const userPatient2 = await User.create({
      name: "Meera Patient",
      email: "meera@trigyna.test",
      phone: "+919800000006",
      passwordHash: "dummyhash",
      role: "patient",
      status: "active",
    });
    const patient2 = await Patient.create({
      patientCode: "TG-P-9002",
      fullName: "Meera Patient",
      phone: "+919800000006",
      userId: userPatient2._id,
      assignedDoctorId: doctorB._id,
      status: "active",
    });

    // Clinical Records for Patient 1 with Doctor A
    const appt1 = await Appointment.create({
      appointmentCode: "TG-A-9001",
      patientId: patient1._id,
      doctorId: doctorA._id,
      appointmentDate: new Date(),
      startTime: "10:00",
      endTime: "10:30",
      status: "completed",
    });

    const consult1 = await Consultation.create({
      appointmentId: appt1._id,
      patientId: patient1._id,
      doctorId: doctorA._id,
      diagnosis: "Mild Endometriosis Stage 1",
      chiefComplaints: "Lower pelvic pain",
      isFinalized: true,
    });

    const rx1 = await Prescription.create({
      consultationId: consult1._id,
      patientId: patient1._id,
      doctorId: doctorA._id,
      appointmentId: appt1._id,
      medications: [{ name: "Med A", dosage: "500mg", frequency: "1-0-1", duration: "5 days" }],
      isReleasedToPatient: true,
    });

    // Unlinked Patient Chart with same family phone as new user
    const unlinkedPatient = await Patient.create({
      patientCode: "TG-P-9099",
      fullName: "Family Sister Patient",
      phone: "+919777777777",
      status: "active",
    });

    const unlinkedUser = await User.create({
      name: "Family Brother User",
      email: "brother@trigyna.test",
      phone: "+919777777777",
      passwordHash: "dummyhash",
      role: "patient",
      status: "active",
    });

    // Generate JWT tokens
    const tokenDoctorA = generateToken(userDoctorA);
    const tokenDoctorB = generateToken(userDoctorB);
    const tokenReception = generateToken(userReception);
    const tokenCrm = generateToken(userCrm);
    const tokenPatient1 = generateToken(userPatient1);
    const tokenPatient2 = generateToken(userPatient2);
    const tokenUnlinked = generateToken(unlinkedUser);

    console.log("--- Suite A.1: Cross-Doctor IDOR Prevention ---");

    // Test 1: Doctor A accesses their own patient history (Should SUCCEED)
    const resDocA = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/doctor/patients/${patient1._id}/history`,
      null,
      tokenDoctorA
    );
    assert(
      resDocA.status === 200 && resDocA.body.success === true,
      "Authorized Doctor A can access Patient 1 clinical history (200 OK)"
    );

    // Test 2: Doctor B accesses Patient 1 history (Should be REJECTED with 403 Forbidden)
    const resDocB = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/doctor/patients/${patient1._id}/history`,
      null,
      tokenDoctorB
    );
    assert(
      resDocB.status === 403,
      "Cross-Doctor IDOR blocked: Doctor B cannot access Patient 1 history (403 Forbidden)"
    );

    // Test 3: Doctor B accesses Patient 1 profile by ID (Should be REJECTED with 403 Forbidden)
    const resDocBProfile = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/doctor/patients/${patient1._id}`,
      null,
      tokenDoctorB
    );
    assert(
      resDocBProfile.status === 403,
      "Doctor B cannot access Patient 1 profile by ID (403 Forbidden)"
    );

    console.log("\n--- Suite A.2: Clinical Consultation & Prescription Role Enforcement ---");

    // Test 4: Reception tries to view consultation clinical notes
    const resRecepConsult = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/clinical/consultations/appointment/${appt1._id}`,
      null,
      tokenReception
    );
    assert(
      resRecepConsult.status === 403,
      "Unauthorized Reception role cannot view clinical consultation notes (403 Forbidden)"
    );

    // Test 5: CRM tries to view consultation clinical notes
    const resCrmConsult = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/clinical/consultations/appointment/${appt1._id}`,
      null,
      tokenCrm
    );
    assert(
      resCrmConsult.status === 403,
      "Unauthorized CRM role cannot view clinical consultation notes (403 Forbidden)"
    );

    // Test 6: Reception tries to view patient prescriptions
    const resRecepRx = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/clinical/prescriptions/patient/${patient1._id}`,
      null,
      tokenReception
    );
    assert(
      resRecepRx.status === 403,
      "Unauthorized Reception role cannot view prescriptions (403 Forbidden)"
    );

    // Test 7: Doctor B (unrelated) tries to view Patient 1 prescriptions
    const resDocBRx = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/clinical/prescriptions/patient/${patient1._id}`,
      null,
      tokenDoctorB
    );
    assert(
      resDocBRx.status === 403,
      "Doctor B without clinical relationship cannot view Patient 1 prescriptions (403 Forbidden)"
    );

    // Test 8: Patient 2 tries to view Patient 1 prescriptions
    const resPatient2Rx = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/clinical/prescriptions/patient/${patient1._id}`,
      null,
      tokenPatient2
    );
    assert(
      resPatient2Rx.status === 403,
      "Patient 2 cannot view Patient 1 prescriptions (403 Forbidden)"
    );

    // Test 9: Patient 1 views their own prescriptions (Should SUCCEED)
    const resPatient1Rx = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/clinical/prescriptions/patient/${patient1._id}`,
      null,
      tokenPatient1
    );
    assert(
      resPatient1Rx.status === 200 && resPatient1Rx.body.data.prescriptions.length === 1,
      "Patient 1 can access their own prescriptions (200 OK)"
    );

    console.log("\n--- Suite A.3: Safe Patient Identity Linking & Phone Collision Defense ---");

    // Test 10: Unlinked user requests /me - should NOT auto-link to unlinked patient with same phone
    const resMeUnlinked = await makeRequest(
      baseUrl,
      "GET",
      "/api/v1/patient-portal/me",
      null,
      tokenUnlinked
    );
    assert(
      resMeUnlinked.status === 404,
      "Unlinked user with shared phone is NOT automatically bound to arbitrary patient chart (404 Not Found)"
    );

    // Verify in database that unlinked patient was NOT mutated
    const checkUnlinkedPatient = await Patient.findById(unlinkedPatient._id);
    assert(
      !checkUnlinkedPatient.userId,
      "Database verification: Patient document userId remains null after phone-matched user login"
    );

    // Test 11: Attempt verified link with WRONG phone
    const resLinkFail = await makeRequest(
      baseUrl,
      "POST",
      "/api/v1/patient-portal/me/link-chart",
      { patientCode: "TG-P-9099", verificationPhone: "+919999999999" },
      tokenUnlinked
    );
    assert(
      resLinkFail.status === 403,
      "Verified linking rejects mismatching phone number (403 Forbidden)"
    );

    // Test 12: Attempt verified link with CORRECT phone
    const resLinkSuccess = await makeRequest(
      baseUrl,
      "POST",
      "/api/v1/patient-portal/me/link-chart",
      { patientCode: "TG-P-9099", verificationPhone: "+919777777777" },
      tokenUnlinked
    );
    assert(
      resLinkSuccess.status === 200 && resLinkSuccess.body.success === true,
      "Verified linking with matching patientCode and phone succeeds (200 OK)"
    );

    const checkLinkedPatient = await Patient.findById(unlinkedPatient._id);
    assert(
      checkLinkedPatient.userId && checkLinkedPatient.userId.toString() === unlinkedUser._id.toString(),
      "Database verification: Patient chart is now securely linked to verified user ID"
    );

    console.log("\n--- Suite A.4: Unauthenticated Request Guard ---");

    // Test 13: Requesting patient clinical history without token
    const resNoAuth = await makeRequest(
      baseUrl,
      "GET",
      `/api/v1/doctor/patients/${patient1._id}/history`
    );
    assert(
      resNoAuth.status === 401,
      "Unauthenticated request to clinical history rejected with 401 Unauthorized"
    );
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log("\n==========================================================");
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityRemediationTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
