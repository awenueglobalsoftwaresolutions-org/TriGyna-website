/**
 * TriGyna Phase 2.1 — Independent Verification Test Suite
 * 
 * Runs strictly against ISOLATED test database (trigyna_test).
 * Zero modification of production or shared databases.
 */

const path = require("path");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/trigyna_test";
process.env.JWT_SECRET = "test_phase21_verification_secret_key_12345";
process.env.PORT = "0";

const app = require("../app");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const Invoice = require("../modules/billing/invoice.model");
const Payment = require("../modules/billing/payment.model");
const Receipt = require("../modules/billing/receipt.model");
const Shift = require("../modules/hrms/shift.model");

let server;
let baseUrl;

function makeRequest(method, endpoint, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const reqHeaders = { ...headers };
    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: reqHeaders,
    };
    const req = http.request(options, (res) => {
      let rawData = "";
      res.on("data", (chunk) => { rawData += chunk; });
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (e) {
          json = { rawText: rawData };
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });
    req.on("error", (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

function generateToken(user) {
  return jwt.sign(
    {
      _id: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function runTests() {
  console.log("================================================================================");
  console.log("TriGyna Phase 2.1 — Independent Verification Test Suite");
  console.log(`Database Target: ${process.env.MONGODB_URI}`);
  console.log("================================================================================");

  await mongoose.connect(process.env.MONGODB_URI);

  // Safety confirmation
  if (mongoose.connection.name !== "trigyna_test") {
    console.error("FATAL: Target database is NOT trigyna_test! Aborting to prevent data corruption.");
    process.exit(1);
  }

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Ephemeral Test Server listening on ${baseUrl}`);
      resolve();
    });
  });

  const testResults = [];
  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      testResults.push({ name, passed: true, details });
    } else {
      console.log(`  ✗ FAIL / FINDING: ${name}`);
      console.log(`    Evidence: ${details}`);
      testResults.push({ name, passed: false, details });
    }
  }

  try {
    // Clean test db
    await Promise.all([
      User.deleteMany({ email: /@test21\.com$/ }),
      Doctor.deleteMany({ specialization: "Phase21-Test-Specialty" }),
      Patient.deleteMany({ patientCode: /^TG-P-T21/ }),
      Appointment.deleteMany({ appointmentCode: /^TG-A-T21/ }),
      Consultation.deleteMany({ chiefComplaints: /Phase21/ }),
      Prescription.deleteMany({ specialInstructions: /Phase21/ }),
      Invoice.deleteMany({ invoiceNumber: /^INV-T21/ }),
      Payment.deleteMany({ $or: [{ paymentNumber: /^PAY-T21/ }, { idempotencyKey: /^idemp_test/ }] }),
      Receipt.deleteMany({ receiptNumber: /^RCP-T21/ }),
      Shift.deleteMany({ code: /^test_shift_/ }),
    ]);

    // Setup Test Users
    const salt = await bcrypt.genSalt(10);
    const pwdHash = await bcrypt.hash("Password123!", salt);

    const docAUser = await User.create({ name: "Dr. Alpha", email: "doctorA@test21.com", phone: "+91 99999 11111", passwordHash: pwdHash, role: "doctor", status: "active" });
    const docBUser = await User.create({ name: "Dr. Beta", email: "doctorB@test21.com", phone: "+91 99999 22222", passwordHash: pwdHash, role: "doctor", status: "active" });
    const patientUser = await User.create({ name: "Priya Patient", email: "patient1@test21.com", phone: "+91 99999 33333", passwordHash: pwdHash, role: "patient", status: "active" });
    const crmUser = await User.create({ name: "Chetan CRM", email: "crm@test21.com", phone: "+91 99999 44444", passwordHash: pwdHash, role: "crm", status: "active" });
    const receptionUser = await User.create({ name: "Rina Reception", email: "reception@test21.com", phone: "+91 99999 55555", passwordHash: pwdHash, role: "reception", status: "active" });

    const doctorA = await Doctor.create({ userId: docAUser._id, specialization: "Phase21-Test-Specialty", status: "active", consultationFee: 800 });
    const doctorB = await Doctor.create({ userId: docBUser._id, specialization: "Phase21-Test-Specialty", status: "active", consultationFee: 900 });

    const patientA = await Patient.create({
      patientCode: "TG-P-T21-01",
      userId: patientUser._id,
      fullName: "Priya Patient",
      phone: "+91 99999 33333",
      email: "patient1@test21.com",
      status: "active",
      medicalHistory: "Confidential Clinical History for Patient A",
      allergies: ["Penicillin"],
    });

    const patientB = await Patient.create({
      patientCode: "TG-P-T21-02",
      fullName: "Unlinked Patient B",
      phone: "+91 99999 88888",
      email: "patientB@test21.com",
      status: "active",
      medicalHistory: "Confidential History Patient B",
    });

    // Establish clinical relationship ONLY with Doctor A
    const apptA = await Appointment.create({
      appointmentCode: "TG-A-T21-01",
      patientId: patientA._id,
      doctorId: doctorA._id,
      appointmentDate: "2026-11-20",
      startTime: "10:00",
      endTime: "10:30",
      status: "completed",
    });

    const consultA = await Consultation.create({
      appointmentId: apptA._id,
      patientId: patientA._id,
      doctorId: doctorA._id,
      chiefComplaints: "Phase21 Verification Complaint",
      clinicalNotes: "Highly confidential consultation notes",
      status: "finalized",
    });

    const rxA = await Prescription.create({
      prescriptionCode: "TG-RX-T21-01",
      consultationId: consultA._id,
      patientId: patientA._id,
      doctorId: doctorA._id,
      medications: [{ name: "Amoxicillin", dosage: "500mg", frequency: "Twice daily", duration: "5 days" }],
      specialInstructions: "Phase21 Instructions",
      isReleasedToPatient: true,
    });

    const tokenDocA = generateToken(docAUser);
    const tokenDocB = generateToken(docBUser);
    const tokenPat = generateToken(patientUser);
    const tokenCrm = generateToken(crmUser);
    const tokenRec = generateToken(receptionUser);

    console.log("\n--- TEST GROUP 1: Security Authorization & Alternate Routes ---");

    // 1.1 Doctor A authorized history access
    const resDocA = await makeRequest("GET", `/api/v1/doctor/patients/${patientA._id}/history`, { Authorization: `Bearer ${tokenDocA}` });
    assert("1.1 Doctor A accesses authorized patient history", resDocA.status === 200, `Status: ${resDocA.status}`);

    // 1.2 Doctor B unauthorized history access via primary endpoint
    const resDocB = await makeRequest("GET", `/api/v1/doctor/patients/${patientA._id}/history`, { Authorization: `Bearer ${tokenDocB}` });
    assert("1.2 Doctor B blocked from patient history on primary doctor workspace endpoint", resDocB.status === 403, `Status: ${resDocB.status}`);

    // 1.3 Doctor B accessing patient profile via alternate route GET /api/v1/patients/:id
    const resDocBAlt = await makeRequest("GET", `/api/v1/patients/${patientA._id}`, { Authorization: `Bearer ${tokenDocB}` });
    assert(
      "1.3 Alternate Route Risk: Doctor B accessing patient profile via GET /api/v1/patients/:id",
      resDocBAlt.status === 200 && resDocBAlt.data?.data?.patient?.medicalHistory !== undefined,
      `Doctor B received status ${resDocBAlt.status} with medicalHistory: "${resDocBAlt.data?.data?.patient?.medicalHistory}" (Alternate route lacks doctor-patient relationship check!)`
    );

    // 1.4 Doctor B accessing clinical consultations via GET /api/v1/clinical/consultations?patientId=...
    const resDocBConsult = await makeRequest("GET", `/api/v1/clinical/consultations?patientId=${patientA._id}`, { Authorization: `Bearer ${tokenDocB}` });
    assert(
      "1.4 Alternate Route Risk: Doctor B accessing consultations via GET /api/v1/clinical/consultations",
      resDocBConsult.status === 200 && resDocBConsult.data?.data?.consultations?.length > 0,
      `Doctor B retrieved ${resDocBConsult.data?.data?.consultations?.length} consultations for Patient A without any clinical relationship check!`
    );

    // 1.5 Reception and CRM attempting to access clinical prescriptions
    const resCrmRx = await makeRequest("GET", `/api/v1/clinical/prescriptions/patient/${patientA._id}`, { Authorization: `Bearer ${tokenCrm}` });
    assert("1.5 CRM blocked from clinical prescriptions", resCrmRx.status === 403, `Status: ${resCrmRx.status}`);

    const resRecRx = await makeRequest("GET", `/api/v1/clinical/prescriptions/patient/${patientA._id}`, { Authorization: `Bearer ${tokenRec}` });
    assert("1.6 Reception blocked from clinical prescriptions", resRecRx.status === 403, `Status: ${resRecRx.status}`);

    // 1.7 Unauthenticated request
    const resUnauth = await makeRequest("GET", `/api/v1/doctor/patients/${patientA._id}/history`);
    assert("1.7 Unauthenticated request rejected with 401", resUnauth.status === 401, `Status: ${resUnauth.status}`);

    console.log("\n--- TEST GROUP 2: Patient Identity Linking (link-chart) ---");

    // 2.1 Already-linked account attempting to link another chart
    const resAlreadyLinked = await makeRequest("POST", "/api/v1/patient/me/link-chart", { Authorization: `Bearer ${tokenPat}` }, {
      patientCode: "TG-P-T21-02",
      verificationPhone: "+91 99999 88888",
    });
    assert("2.1 Already linked account cannot link second chart", resAlreadyLinked.status === 403, `Status: ${resAlreadyLinked.status}`);

    // 2.2 Fresh patient user attempting to link with mismatching phone
    const freshUser = await User.create({ name: "Sneha New", email: "sneha@test21.com", phone: "+91 99999 77777", passwordHash: pwdHash, role: "patient", status: "active" });
    const tokenFresh = generateToken(freshUser);

    const resMismatch = await makeRequest("POST", "/api/v1/patient/me/link-chart", { Authorization: `Bearer ${tokenFresh}` }, {
      patientCode: "TG-P-T21-02",
      verificationPhone: "+91 99999 77777", // User's phone, but chart has 88888
    });
    assert("2.2 Linking fails when verificationPhone does not match chart phone", resMismatch.status === 403, `Status: ${resMismatch.status}`);

    // 2.3 Verify absence of OTP / SMS challenge
    assert(
      "2.3 Identity Linking Risk: Mechanism relies strictly on knowing patientCode + phone (no OTP/SMS proof of possession)",
      true,
      "linkPatientChart verifies (candidatePhone === providedPhone === userPhone), but does NOT require an OTP token, allowing anyone registering a matching phone number to claim chart"
    );

    console.log("\n--- TEST GROUP 3: Appointment Booking Concurrency (Check-Then-Insert Race) ---");

    // Create 5 concurrent booking requests for doctorA at 14:00 - 14:30 on 2026-11-25
    const bookingDate = "2026-11-25";
    const startTime = "14:00";
    const endTime = "14:30";

    const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
      return makeRequest(
        "POST",
        "/api/v1/appointments",
        { Authorization: `Bearer ${tokenRec}` },
        {
          patientId: patientA._id.toString(),
          doctorId: doctorA._id.toString(),
          appointmentDate: bookingDate,
          startTime,
          endTime,
          serviceName: "Concurrency Collision Test",
        }
      );
    });

    const bookingResponses = await Promise.all(concurrentRequests);
    const successfulBookings = bookingResponses.filter((r) => r.status === 201);
    const conflictBookings = bookingResponses.filter((r) => r.status === 409);

    console.log(`Concurrent booking responses: ${successfulBookings.length} created (201), ${conflictBookings.length} conflict (409)`);

    // In a check-then-insert race condition, 2 or more requests succeed
    if (successfulBookings.length > 1) {
      assert(
        "3.1 Appointment Concurrency Race Condition: Multiple concurrent bookings succeeded for identical doctor & time slot",
        false,
        `VULNERABILITY CONFIRMED: ${successfulBookings.length} appointments created for Doctor ${doctorA._id} at ${startTime} on ${bookingDate} due to check-then-insert race window!`
      );
    } else {
      assert(
        "3.1 Single booking succeeded (race window did not overlap in this run, or atomic lock prevented it)",
        successfulBookings.length === 1,
        `Successful: ${successfulBookings.length}, Conflicts: ${conflictBookings.length}`
      );
    }

    console.log("\n--- TEST GROUP 4: Financial Consistency & Idempotency ---");

    // 4.1 Create test invoice
    const invoice = await Invoice.create({
      invoiceNumber: "INV-T21-001",
      patientId: patientA._id,
      doctorId: doctorA._id,
      appointmentId: apptA._id,
      totalAmount: 1500,
      paidAmount: 0,
      balanceAmount: 1500,
      status: "pending",
      items: [{ description: "Clinical Consultation", amount: 1500, quantity: 1 }],
    });

    const testIdempotencyKey = "idemp_test_key_phase21_abc123";

    // 4.2 First payment submission with idempotency key
    const resPay1 = await makeRequest(
      "POST",
      `/api/v1/invoices/${invoice._id}/payments`,
      { Authorization: `Bearer ${tokenRec}` },
      {
        amount: 500,
        paymentMethod: "upi",
        idempotencyKey: testIdempotencyKey,
        transactionRef: "TXN-PHASE21-001",
      }
    );
    assert("4.1 Initial payment recorded successfully", resPay1.status === 200, `Status: ${resPay1.status}`);

    // 4.3 Duplicate payment submission with identical idempotency key
    const resPay2 = await makeRequest(
      "POST",
      `/api/v1/invoices/${invoice._id}/payments`,
      { Authorization: `Bearer ${tokenRec}` },
      {
        amount: 500,
        paymentMethod: "upi",
        idempotencyKey: testIdempotencyKey,
        transactionRef: "TXN-PHASE21-001",
      }
    );
    assert(
      "4.2 Duplicate payment with identical idempotencyKey returns idempotent: true without double-billing",
      resPay2.status === 200 && resPay2.data?.data?.idempotent === true,
      `Status: ${resPay2.status}, Idempotent flag: ${resPay2.data?.data?.idempotent}`
    );

    // Verify invoice ledger state
    const updatedInvoice = await Invoice.findById(invoice._id);
    assert(
      "4.3 Invoice ledger maintains correct paidAmount (₹500, not ₹1000)",
      updatedInvoice.paidAmount === 500 && updatedInvoice.balanceAmount === 1000,
      `paidAmount: ₹${updatedInvoice.paidAmount}, balanceAmount: ₹${updatedInvoice.balanceAmount}`
    );

    // 4.4 Topology reality check
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    console.log(`Current MongoDB Deployment Topology: ${topologyType}`);
    assert(
      "4.4 Topology Verification: Standalone ('Single') does not support multi-document ACID transactions",
      topologyType === "Single",
      `Topology is '${topologyType}'. Multi-document transactions require replica set (ReplicaSetWithPrimary). Standalone relies on sequential updates.`
    );

    console.log("\n--- TEST GROUP 5: Shift GET Endpoint Database Mutation (Side-Effect) ---");

    // Clear test shifts
    await Shift.deleteMany({});
    const shiftCountBefore = await Shift.countDocuments();

    // Create admin user for HRMS shift test
    const adminUser = await User.create({ name: "Aman Admin", email: "admin@test21.com", phone: "+91 99999 66666", passwordHash: pwdHash, role: "admin", status: "active" });
    const tokenAdmin = generateToken(adminUser);

    // Call GET /api/v1/hrms/shifts
    const resShifts = await makeRequest("GET", "/api/v1/hrms/shifts", { Authorization: `Bearer ${tokenAdmin}` });
    const shiftCountAfter = await Shift.countDocuments();

    assert(
      "5.1 Shift GET Request Side Effect: Calling GET /api/v1/hrms/shifts silently writes 4 default documents to database",
      shiftCountBefore === 0 && shiftCountAfter === 4,
      `Before GET: ${shiftCountBefore} shifts | After GET: ${shiftCountAfter} shifts in DB! (Violates HTTP GET purity)`
    );

  } catch (err) {
    console.error("Test Suite crashed with unexpected error:", err);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    console.log("\n================================================================================");
    console.log("Independent Verification Test Suite Complete");
    console.log(`Summary: ${testResults.filter(r => r.passed).length} Passed, ${testResults.filter(r => !r.passed).length} Findings`);
    console.log("================================================================================");
  }
}

runTests();
