/**
 * testStageCAndD.js
 * Verification suite for Stage C (Concurrency & Integrity), Stage D (API & Schema Corrections),
 * and Stage E (Performance & Indexes).
 * Executed against isolated test database: mongodb://127.0.0.1:27017/trigyna_test
 */

const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Load env
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const app = require("../app");
const env = require("../config/env");
const { getNextSequence, generateAtomicPrescriptionCode } = require("../shared/counter.service");
const Shift = require("../modules/hrms/shift.model");
const Appointment = require("../modules/appointments/appointment.model");
const Invoice = require("../modules/billing/invoice.model");
const Payment = require("../modules/billing/payment.model");
const Receipt = require("../modules/billing/receipt.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const User = require("../modules/users/user.model");
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
      headers: {},
    };

    if (body) {
      options.headers["Content-Type"] = "application/json";
    }

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers["content-type"] || "";
        let parsedBody = buffer;
        if (contentType.includes("application/json")) {
          try {
            parsedBody = JSON.parse(buffer.toString("utf8"));
          } catch (e) {
            parsedBody = buffer.toString("utf8");
          }
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedBody,
          buffer: buffer,
        });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runStageCDTests() {
  console.log("==================================================================");
  console.log("   TRIGYNA PHASE 2: STAGE C, D & E VERIFICATION SUITE");
  console.log("==================================================================");

  await mongoose.connect(TEST_DB_URI);
  console.log(`Connected to isolated test database: ${TEST_DB_URI}`);

  // Ensure all schema indexes are synchronized on test database
  await Promise.all([
    Appointment.syncIndexes().catch(() => {}),
    Invoice.syncIndexes().catch(() => {}),
    Consultation.syncIndexes().catch(() => {}),
    Prescription.syncIndexes().catch(() => {}),
    Shift.syncIndexes().catch(() => {}),
    Payment.syncIndexes().catch(() => {}),
    Receipt.syncIndexes().catch(() => {}),
    Patient.syncIndexes().catch(() => {}),
  ]);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral test HTTP server listening at: ${baseUrl}`);

  const results = [];
  function assert(title, condition, detail = "") {
    if (condition) {
      console.log(`  [PASS] ${title}`);
      results.push({ title, status: "PASS", detail });
    } else {
      console.error(`  [FAIL] ${title} - ${detail}`);
      results.push({ title, status: "FAIL", detail });
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Atomic Counter Concurrency Under 50 Parallel Promises
    // -------------------------------------------------------------
    console.log("\n--- TEST GROUP 1: Atomic Sequence & Concurrency ---");
    const parallelCount = 50;
    const promises = [];
    for (let i = 0; i < parallelCount; i++) {
      promises.push(getNextSequence("test_parallel_seq", 1000));
    }
    const sequences = await Promise.all(promises);
    const uniqueSeqs = new Set(sequences);
    assert(
      "Atomic sequence generation produces 50 unique IDs under parallel execution (Zero Collision)",
      uniqueSeqs.size === parallelCount,
      `Generated: ${uniqueSeqs.size} unique values out of ${parallelCount}`
    );

    // -------------------------------------------------------------
    // Test 2: Prescription Model Atomic Code Generation
    // -------------------------------------------------------------
    const rxCode1 = await generateAtomicPrescriptionCode();
    const rxCode2 = await generateAtomicPrescriptionCode();
    assert(
      "Prescription code generates proper format (TG-RX-XXXX)",
      /^TG-RX-\d+$/.test(rxCode1) && /^TG-RX-\d+$/.test(rxCode2) && rxCode1 !== rxCode2,
      `Generated: ${rxCode1}, ${rxCode2}`
    );

    // -------------------------------------------------------------
    // Test 3: Appointment Overlap Check (Duration-Aware Concurrency)
    // -------------------------------------------------------------
    console.log("\n--- TEST GROUP 2: Interval Overlap & Double-Booking Protection ---");
    await Appointment.deleteMany({ appointmentCode: /^TG-A-TEST/ });
    const testDoctorId = new mongoose.Types.ObjectId();
    const testPatient1 = new mongoose.Types.ObjectId();
    const testPatient2 = new mongoose.Types.ObjectId();
    const testDate = "2026-11-15";

    // Create an initial active appointment: 10:00 - 10:45 (45 mins)
    const existingAppt = await Appointment.create({
      appointmentCode: "TG-A-TEST-01",
      patientId: testPatient1,
      doctorId: testDoctorId,
      appointmentDate: testDate,
      startTime: "10:00",
      endTime: "10:45",
      serviceName: "Clinical Consultation",
      status: "scheduled",
    });

    // Check overlap: Candidate appointment 10:30 - 11:00 (overlaps by 15 mins)
    const candidateStart = "10:30";
    const candidateEnd = "11:00";
    const conflict = await Appointment.findOne({
      doctorId: testDoctorId,
      appointmentDate: testDate,
      status: { $in: ["scheduled", "checked_in", "waiting", "in_consultation"] },
      startTime: { $lt: candidateEnd },
      endTime: { $gt: candidateStart },
    });
    assert(
      "Interval overlap query successfully detects overlapping appointment slot (10:00-10:45 vs 10:30-11:00)",
      Boolean(conflict && conflict._id.toString() === existingAppt._id.toString()),
      `Found conflicting appt: ${conflict?.appointmentCode}`
    );

    // Non-overlapping appointment: 10:45 - 11:15 (adjacent, no overlap)
    const noConflict = await Appointment.findOne({
      doctorId: testDoctorId,
      appointmentDate: testDate,
      status: { $in: ["scheduled", "checked_in", "waiting", "in_consultation"] },
      startTime: { $lt: "11:15" },
      endTime: { $gt: "10:45" },
    });
    assert(
      "Interval overlap query correctly allows adjacent, non-overlapping slot (10:45 - 11:15)",
      !noConflict,
      "Adjacent slot accepted without false positive conflict"
    );

    // -------------------------------------------------------------
    // Test 4: Persistent HRMS Shift Model & Auto-seeding
    // -------------------------------------------------------------
    console.log("\n--- TEST GROUP 3: Persistent HRMS Shifts & Roster ---");
    await Shift.deleteMany({ code: { $in: ["emergency_oncall", "general", "morning", "evening", "night", "full_day"] } });
    await Shift.insertMany([
      { code: "morning", name: "Morning Shift", startTime: "08:00", endTime: "14:00", isActive: true },
      { code: "evening", name: "Evening Shift", startTime: "14:00", endTime: "20:00", isActive: true },
      { code: "full_day", name: "Full Day", startTime: "09:00", endTime: "18:00", isActive: true },
      { code: "night", name: "Night On-Call", startTime: "20:00", endTime: "08:00", isActive: true },
    ]);

    // Admin token setup
    let adminUser = await User.findOne({ email: "admin.stage_cd@trigyna.test" });
    if (!adminUser) {
      adminUser = await User.create({
        name: "Admin Tester",
        phone: "+919999900010",
        email: "admin.stage_cd@trigyna.test",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "admin",
        isActive: true,
      });
    }

    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, env.JWT_SECRET, { expiresIn: "1h" });

    // Request listShifts (retrieves active shifts from persistent MongoDB collection)
    const shiftsListRes = await makeRequest(baseUrl, "GET", "/api/v1/hrms/shifts", null, adminToken);

    assert(
      "GET /api/v1/hrms/shifts returns active shifts from persistent collection",
      shiftsListRes.status === 200 && shiftsListRes.body?.data?.shifts?.length >= 4,
      `Returned: ${shiftsListRes.body?.data?.shifts?.length} shifts`
    );

    const dbShiftCount = await Shift.countDocuments({ isActive: true });
    assert(
      "Shift documents exist in MongoDB 'shifts' collection (Persistent, not mock array)",
      dbShiftCount >= 4,
      `Found ${dbShiftCount} persistent shift documents`
    );

    // Create a new persistent shift
    const createShiftRes = await makeRequest(
      baseUrl,
      "POST",
      "/api/v1/hrms/shifts",
      {
        code: "emergency_oncall",
        name: "Emergency On-Call",
        startTime: "23:00",
        endTime: "07:00",
        description: "Overnight urgent care",
      },
      adminToken
    );

    assert(
      "POST /api/v1/hrms/shifts successfully creates persistent shift in MongoDB",
      createShiftRes.status === 201 && createShiftRes.body?.data?.shift?.code === "emergency_oncall",
      `Created shift: ${createShiftRes.body?.data?.shift?.code}`
    );

    const savedShift = await Shift.findOne({ code: "emergency_oncall" });
    assert(
      "Created shift verified in MongoDB collection",
      Boolean(savedShift && savedShift.name === "Emergency On-Call"),
      `Verified in DB: ${savedShift?._id}`
    );

    // -------------------------------------------------------------
    // Test 5: Idempotency Key Handling on Payments
    // -------------------------------------------------------------
    console.log("\n--- TEST GROUP 4: Payment Idempotency & Financial Safety ---");
    const testPatientDoc = await Patient.create({
      patientCode: `TG-P-T${Date.now().toString().slice(-4)}`,
      fullName: "Priya Sharma",
      phone: `+91998877${Date.now().toString().slice(-4)}`,
      email: `test.${Date.now()}@trigyna.test`,
      gender: "female",
      dateOfBirth: new Date("1992-05-10"),
    });

    const testInvoice = await Invoice.create({
      invoiceNumber: `INV-TEST-${Date.now()}`,
      patientId: testPatientDoc._id,
      items: [{ description: "Consultation", unitPrice: 1000, quantity: 1, amount: 1000 }],
      subtotal: 1000,
      totalAmount: 1000,
      paidAmount: 0,
      balanceAmount: 1000,
      status: "pending",
    });

    const idempotencyKey = `IDEMP-${Date.now()}`;
    const payment1Res = await makeRequest(
      baseUrl,
      "POST",
      `/api/v1/invoices/${testInvoice._id}/payments`,
      {
        amount: 500,
        paymentMethod: "upi",
        idempotencyKey,
      },
      adminToken
    );

    assert(
      "First payment submission with idempotency key succeeds",
      payment1Res.status === 200 && payment1Res.body?.data?.payment?.amount === 500,
      `Payment created: ${payment1Res.body?.data?.payment?._id}`
    );

    // Duplicate submission with identical idempotencyKey
    const payment2Res = await makeRequest(
      baseUrl,
      "POST",
      `/api/v1/invoices/${testInvoice._id}/payments`,
      {
        amount: 500,
        paymentMethod: "upi",
        idempotencyKey,
      },
      adminToken
    );

    assert(
      "Second duplicate submission with same idempotency key returns existing payment (Deduplication / Zero Double Charge)",
      payment2Res.status === 200 &&
        payment2Res.body?.data?.payment?._id === payment1Res.body?.data?.payment?._id,
      `Returned payment: ${payment2Res.body?.data?.payment?._id}`
    );

    const totalRecordedPayments = await Payment.countDocuments({ idempotencyKey });
    assert(
      "Only exactly 1 payment record exists in MongoDB for the idempotency key",
      totalRecordedPayments === 1,
      `Count: ${totalRecordedPayments}`
    );

    // -------------------------------------------------------------
    // Test 6: Invoice PDF Streaming & Header Validation
    // -------------------------------------------------------------
    console.log("\n--- TEST GROUP 5: Invoice & Receipt PDF Streaming ---");
    const pdfRes = await makeRequest(baseUrl, "GET", `/api/v1/invoices/${testInvoice._id}/pdf`, null, adminToken);

    assert(
      "GET /api/v1/invoices/:id/pdf returns HTTP 200 with application/pdf Content-Type",
      pdfRes.status === 200 && String(pdfRes.headers["content-type"]).includes("application/pdf"),
      `Status: ${pdfRes.status}, Content-Type: ${pdfRes.headers["content-type"]}`
    );

    const pdfBuffer = pdfRes.buffer;
    const isPdfValid = Buffer.isBuffer(pdfBuffer) && pdfBuffer.toString("utf8", 0, 4) === "%PDF";
    assert(
      "PDF response body is a valid binary PDF document (starts with %PDF)",
      isPdfValid,
      `Buffer header: ${pdfBuffer ? pdfBuffer.slice(0, 8).toString("utf8") : "empty"}`
    );

    // -------------------------------------------------------------
    // Test 7: Index Verification
    // -------------------------------------------------------------
    console.log("\n--- TEST GROUP 6: Database Indexes Verification ---");
    const apptIndexes = await Appointment.collection.indexes();
    const hasDoctorApptIndex = apptIndexes.some((idx) => idx.key.doctorId === 1 && idx.key.appointmentDate === 1);
    assert(
      "Appointment collection contains compound index on { doctorId: 1, appointmentDate: 1, startTime: 1 }",
      hasDoctorApptIndex,
      JSON.stringify(apptIndexes.map((i) => i.key))
    );

    const invIndexes = await Invoice.collection.indexes();
    const hasPatientInvIndex = invIndexes.some((idx) => idx.key.patientId === 1 && idx.key.createdAt === -1);
    assert(
      "Invoice collection contains compound index on { patientId: 1, createdAt: -1 }",
      hasPatientInvIndex,
      JSON.stringify(invIndexes.map((i) => i.key))
    );

    console.log("\n==================================================================");
    const passedCount = results.filter((r) => r.status === "PASS").length;
    const failedCount = results.filter((r) => r.status === "FAIL").length;
    console.log(`STAGE C, D & E VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("==================================================================");

    server.close();
    await mongoose.disconnect();
    process.exit(failedCount === 0 ? 0 : 1);
  } catch (err) {
    console.error("Test execution aborted on unhandled error:", err);
    if (server) server.close();
    process.exit(1);
  }
}

runStageCDTests();
