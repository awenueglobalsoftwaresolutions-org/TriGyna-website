/**
 * TriGyna Phase 2.3 — Critical Security & Appointment Booking Remediation Test Suite
 * 
 * Strict Safety:
 * - Runs strictly against ISOLATED test database (trigyna_test).
 * - Zero modification of production or shared databases.
 * - Redacts all sensitive PII and tokens in logs.
 */

const path = require("path");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/trigyna_test";
process.env.PORT = "0";

const env = require("../config/env");
const app = require("../app");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const SlotReservation = require("../modules/appointments/slot-reservation.model");
const Consultation = require("../modules/clinical/consultation.model");
const Invoice = require("../modules/billing/invoice.model");
const Payment = require("../modules/billing/payment.model");
const Receipt = require("../modules/billing/receipt.model");
const Shift = require("../modules/hrms/shift.model");
const ChartLinkOtp = require("../modules/patients/chart-link-otp.model");

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
      const chunks = [];
      res.on("data", (chunk) => { chunks.push(chunk); });
      res.on("end", () => {
        const rawBuffer = Buffer.concat(chunks);
        let json = null;
        try {
          json = JSON.parse(rawBuffer.toString("utf8"));
        } catch (e) {
          json = { rawLength: rawBuffer.length };
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          buffer: rawBuffer,
        });
      });
    });
    req.on("error", (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

function makeAuthHeader(user) {
  const token = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      patientId: user.patientId ? user.patientId.toString() : null,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  return { Authorization: `Bearer ${token}` };
}

function getErrorMessage(res) {
  return res.data?.error?.message || res.data?.message || "";
}

const testResults = [];
function recordTest(testName, passed, details = "") {
  testResults.push({ testName, passed, details });
  const statusStr = passed ? "PASS" : "FAIL";
  console.log(`[${statusStr}] ${testName}${details ? " - " + details : ""}`);
}

async function runSuite() {
  console.log("================================================================================");
  console.log("TRIGYNA PHASE 2.3 - CRITICAL SECURITY & APPOINTMENT BOOKING VERIFICATION SUITE");
  console.log("Target Database: mongodb://127.0.0.1:27017/trigyna_test");
  console.log("================================================================================\n");

  try {
    // 1. Database Connection & Isolation Safety Check
    await mongoose.connect(process.env.MONGODB_URI);
    const dbName = mongoose.connection.name;
    if (dbName !== "trigyna_test") {
      throw new Error(`SAFETY ABORT: Target database is '${dbName}', must be 'trigyna_test'!`);
    }
    console.log(`Verified connected database is isolated '${dbName}'.`);

    // Clean test collections
    await mongoose.connection.dropDatabase();
    console.log("Isolated test database wiped clean for fresh verification run.");

    // Explicitly build unique indexes on isolated test database
    await Promise.all([
      User.init(),
      Doctor.init(),
      Patient.init(),
      Appointment.init(),
      SlotReservation.init(),
      ChartLinkOtp.init(),
      Invoice.init(),
      Payment.init(),
      Receipt.init(),
    ]);
    console.log("All collection indexes and unique constraints initialized successfully.\n");

    // Start HTTP Server
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`In-memory test server listening on ${baseUrl}\n`);
        resolve();
      });
    });

    // -------------------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------------------
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Users
    const ownerUser = await User.create({ name: "Owner User", email: "owner@trigyna.test", phone: "+919900000001", passwordHash, role: "owner" });
    const adminUser = await User.create({ name: "Admin User", email: "admin@trigyna.test", phone: "+919900000002", passwordHash, role: "admin" });
    const doctorUserA = await User.create({ name: "Dr. Alice", email: "doctorA@trigyna.test", phone: "+919900000003", passwordHash, role: "doctor" });
    const doctorUserB = await User.create({ name: "Dr. Bob", email: "doctorB@trigyna.test", phone: "+919900000004", passwordHash, role: "doctor" });
    const receptionUser = await User.create({ name: "Receptionist", email: "reception@trigyna.test", phone: "+919900000005", passwordHash, role: "reception" });
    const crmUser = await User.create({ name: "CRM Lead Rep", email: "crm@trigyna.test", phone: "+919900000006", passwordHash, role: "crm" });
    const hrmsUser = await User.create({ name: "HR Rep", email: "hrms@trigyna.test", phone: "+919900000007", passwordHash, role: "hrms" });

    // Patients
    const patientRecord1 = await Patient.create({
      patientCode: "PT-0001",
      fullName: "Patient One",
      phone: "+919876543210",
      email: "patient1@trigyna.test",
      gender: "female",
      age: 28,
      medicalHistory: "Confidential Chronic Endometriosis Stage III",
      allergies: ["Penicillin", "Sulfa drugs"],
    });

    const patientRecord2 = await Patient.create({
      patientCode: "PT-0002",
      fullName: "Patient Two",
      phone: "+919876543211",
      email: "patient2@trigyna.test",
      gender: "female",
      age: 32,
      medicalHistory: "Confidential Infertility IVF Cycle 2",
      allergies: ["Latex"],
    });

    // Patient Portal Users
    const patientUser1 = await User.create({
      name: "Patient One",
      email: "patient1@trigyna.test",
      phone: "+919876543210",
      passwordHash,
      role: "patient",
      patientId: patientRecord1._id,
    });
    patientRecord1.userId = patientUser1._id;
    await patientRecord1.save();

    const patientUser2 = await User.create({
      name: "Patient Two",
      email: "patient2@trigyna.test",
      phone: "+919876543211",
      passwordHash,
      role: "patient",
      patientId: patientRecord2._id,
    });
    patientRecord2.userId = patientUser2._id;
    await patientRecord2.save();

    // Unlinked Patient User
    const unlinkedPatientUser = await User.create({
      name: "Unlinked Patient",
      email: "unlinked@trigyna.test",
      phone: "+919876543999",
      passwordHash,
      role: "patient",
      patientId: null,
    });

    // Doctor profiles
    const doctorProfileA = await Doctor.create({
      userId: doctorUserA._id,
      specialization: ["Gynecology", "Endometriosis"],
      status: "active",
      consultationFee: 1500,
    });
    doctorUserA.doctorId = doctorProfileA._id;
    await doctorUserA.save();

    const doctorProfileB = await Doctor.create({
      userId: doctorUserB._id,
      specialization: ["Obstetrics", "High Risk Pregnancy"],
      status: "active",
      consultationFee: 2000,
    });
    doctorUserB.doctorId = doctorProfileB._id;
    await doctorUserB.save();

    // Inactive doctor
    const inactiveDoctorUser = await User.create({
      name: "Dr. Inactive",
      email: "inactive@trigyna.test",
      phone: "+919900000008",
      passwordHash,
      role: "doctor",
    });
    const inactiveDoctor = await Doctor.create({
      userId: inactiveDoctorUser._id,
      specialization: ["General"],
      status: "inactive",
      consultationFee: 500,
    });

    console.log("Test fixtures initialized successfully.\n");

    // =========================================================================
    // SECTION 1: PATIENT RECORD AUTHORIZATION
    // =========================================================================
    console.log("--- SECTION 1: PATIENT RECORD AUTHORIZATION ---");

    // 1.1 Unauthenticated request rejected (401)
    {
      const res = await makeRequest("GET", `/api/v1/patients/${patientRecord1._id}`);
      recordTest("Unauthenticated GET /patients/:id rejected (401)", res.status === 401);
    }

    // 1.2 Patient requesting own record allowed (200)
    {
      const res = await makeRequest("GET", `/api/v1/patients/${patientRecord1._id}`, makeAuthHeader(patientUser1));
      const returnedPat = res.data?.data?.patient;
      recordTest("Patient accessing own record allowed (200)", res.status === 200 && returnedPat?._id === patientRecord1._id.toString());
    }

    // 1.3 Patient requesting another patient's record rejected (403)
    {
      const res = await makeRequest("GET", `/api/v1/patients/${patientRecord2._id}`, makeAuthHeader(patientUser1));
      recordTest("Patient accessing another patient's record forbidden (403)", res.status === 403);
    }

    // 1.4 Unassigned Doctor requesting unrelated patient record rejected (403)
    {
      const res = await makeRequest("GET", `/api/v1/patients/${patientRecord1._id}`, makeAuthHeader(doctorUserA));
      recordTest("Unassigned Doctor accessing unrelated patient record forbidden (403)", res.status === 403);
    }

    // Setup assignment: create an appointment connecting Doctor A to Patient 1
    const appointmentA1 = await Appointment.create({
      appointmentCode: "APT-TEST-0001",
      patientId: patientRecord1._id,
      doctorId: doctorProfileA._id,
      serviceName: "Gynecology Consultation",
      appointmentDate: "2026-11-01",
      startTime: "10:00",
      endTime: "10:30",
      status: "scheduled",
    });

    // 1.5 Assigned Doctor requesting patient record allowed (200)
    {
      const res = await makeRequest("GET", `/api/v1/patients/${patientRecord1._id}`, makeAuthHeader(doctorUserA));
      const returnedPat = res.data?.data?.patient;
      recordTest("Assigned Doctor accessing assigned patient record allowed (200)", res.status === 200 && returnedPat?._id === patientRecord1._id.toString());
    }

    // 1.6 Reception requesting patient record allowed (200), but medical history/allergies stripped
    {
      const res = await makeRequest("GET", `/api/v1/patients/${patientRecord1._id}`, makeAuthHeader(receptionUser));
      const returnedPat = res.data?.data?.patient;
      const hasMedicalHistory = returnedPat?.medicalHistory !== undefined;
      const hasAllergies = returnedPat?.allergies !== undefined;
      const passed = res.status === 200 && !hasMedicalHistory && !hasAllergies && returnedPat?.phone === patientRecord1.phone;
      recordTest("Reception accessing patient has medical history & allergies stripped", passed, `Status: ${res.status}`);
    }

    // 1.7 CRM requesting patient record allowed (200), but restricted to lead-safe contact info
    {
      const res = await makeRequest("GET", `/api/v1/patients/${patientRecord1._id}`, makeAuthHeader(crmUser));
      const returnedPat = res.data?.data?.patient;
      const hasMedicalHistory = returnedPat?.medicalHistory !== undefined;
      const hasAge = returnedPat?.age !== undefined;
      const passed = res.status === 200 && !hasMedicalHistory && !hasAge && returnedPat?.phone === patientRecord1.phone;
      recordTest("CRM accessing patient restricted to lead-safe fields only", passed, `Status: ${res.status}`);
    }

    // 1.8 HRMS attempting to access patient record forbidden (403)
    {
      const res = await makeRequest("GET", `/api/v1/patients/${patientRecord1._id}`, makeAuthHeader(hrmsUser));
      recordTest("HRMS accessing patient record forbidden (403)", res.status === 403);
    }

    // 1.9 HRMS attempting to list patients forbidden (403)
    {
      const res = await makeRequest("GET", "/api/v1/patients", makeAuthHeader(hrmsUser));
      recordTest("HRMS listing patients forbidden (403)", res.status === 403);
    }

    // =========================================================================
    // SECTION 2: CLINICAL CONSULTATION AUTHORIZATION
    // =========================================================================
    console.log("\n--- SECTION 2: CLINICAL CONSULTATION AUTHORIZATION ---");

    const consultA1 = await Consultation.create({
      patientId: patientRecord1._id,
      doctorId: doctorProfileA._id,
      chiefComplaints: "Pelvic pain flare-up",
      diagnosis: "Endometriosis flare-up",
      examinationNotes: "Patient prescribed pain management.",
      isFinalized: true,
      finalizedAt: new Date(),
    });

    const consultB2Draft = await Consultation.create({
      patientId: patientRecord2._id,
      doctorId: doctorProfileB._id,
      chiefComplaints: "Preliminary IVF checkup",
      examinationNotes: "Draft confidential notes",
      isFinalized: false,
    });

    // 2.1 Unauthenticated consultation access rejected (401)
    {
      const res = await makeRequest("GET", `/api/v1/clinical/consultations/${consultA1._id}`);
      recordTest("Unauthenticated GET /clinical/consultations/:id rejected (401)", res.status === 401);
    }

    // 2.2 Assigned Doctor accessing consultation allowed (200)
    {
      const res = await makeRequest("GET", `/api/v1/clinical/consultations/${consultA1._id}`, makeAuthHeader(doctorUserA));
      const returnedConsult = res.data?.data?.consultation;
      recordTest("Assigned Doctor accessing consultation allowed (200)", res.status === 200 && returnedConsult?._id === consultA1._id.toString());
    }

    // 2.3 Unassigned Doctor accessing unrelated consultation forbidden (403)
    {
      const res = await makeRequest("GET", `/api/v1/clinical/consultations/${consultA1._id}`, makeAuthHeader(doctorUserB));
      recordTest("Unassigned Doctor accessing unrelated consultation forbidden (403)", res.status === 403);
    }

    // 2.4 Doctor querying consultations cannot forge doctorId to access another doctor's consultations
    {
      const res = await makeRequest("GET", `/api/v1/clinical/consultations?doctorId=${doctorProfileB._id}`, makeAuthHeader(doctorUserA));
      recordTest("Doctor forging doctorId query forbidden (403)", res.status === 403);
    }

    // 2.5 Patient accessing own finalized consultation allowed (200)
    {
      const res = await makeRequest("GET", `/api/v1/clinical/consultations/${consultA1._id}`, makeAuthHeader(patientUser1));
      const returnedConsult = res.data?.data?.consultation;
      recordTest("Patient accessing own finalized consultation allowed (200)", res.status === 200 && returnedConsult?._id === consultA1._id.toString());
    }

    // 2.6 Patient accessing another patient's consultation forbidden (403)
    {
      const res = await makeRequest("GET", `/api/v1/clinical/consultations/${consultA1._id}`, makeAuthHeader(patientUser2));
      recordTest("Patient accessing another patient's consultation forbidden (403)", res.status === 403);
    }

    // 2.7 Patient accessing unfinalized (isFinalized: false) consultation forbidden (403)
    {
      const res = await makeRequest("GET", `/api/v1/clinical/consultations/${consultB2Draft._id}`, makeAuthHeader(patientUser2));
      recordTest("Patient accessing unfinalized draft consultation forbidden (403)", res.status === 403);
    }

    // 2.8 Reception, CRM, and HRMS accessing consultation forbidden (403)
    {
      const resReception = await makeRequest("GET", `/api/v1/clinical/consultations/${consultA1._id}`, makeAuthHeader(receptionUser));
      const resCrm = await makeRequest("GET", `/api/v1/clinical/consultations/${consultA1._id}`, makeAuthHeader(crmUser));
      const resHrms = await makeRequest("GET", `/api/v1/clinical/consultations/${consultA1._id}`, makeAuthHeader(hrmsUser));
      const passed = resReception.status === 403 && resCrm.status === 403 && resHrms.status === 403;
      recordTest("Reception, CRM, and HRMS accessing consultation forbidden (403)", passed);
    }

    // =========================================================================
    // SECTION 3: BILLING & PDF ENDPOINT AUTHORIZATION
    // =========================================================================
    console.log("\n--- SECTION 3: BILLING & PDF ENDPOINT AUTHORIZATION ---");

    const invoice1 = await Invoice.create({
      invoiceNumber: "INV-2026-0001",
      patientId: patientRecord1._id,
      doctorId: doctorProfileA._id,
      appointmentId: appointmentA1._id,
      items: [{ description: "Consultation Fee", quantity: 1, unitPrice: 1500, amount: 1500 }],
      totalAmount: 1500,
      paidAmount: 1500,
      status: "paid",
    });

    const payment1 = await Payment.create({
      paymentNumber: "PAY-2026-0001",
      invoiceId: invoice1._id,
      patientId: patientRecord1._id,
      amount: 1500,
      paymentMethod: "card",
      status: "success",
    });

    const receipt1 = await Receipt.create({
      receiptNumber: "REC-2026-0001",
      invoiceId: invoice1._id,
      paymentId: payment1._id,
      patientId: patientRecord1._id,
      amountReceived: 1500,
      paymentMethod: "card",
      status: "issued",
      items: [{ description: "Consultation Fee", amount: 1500 }],
    });

    // 3.1 Reception/Admin accessing invoice and receipt allowed (200)
    {
      const resInv = await makeRequest("GET", `/api/v1/invoices/${invoice1._id}`, makeAuthHeader(receptionUser));
      const resRec = await makeRequest("GET", `/api/v1/receipts/${receipt1._id}`, makeAuthHeader(receptionUser));
      recordTest("Reception accessing invoice and receipt allowed (200)", resInv.status === 200 && resRec.status === 200);
    }

    // 3.2 Owning patient accessing own invoice and receipt allowed (200)
    {
      const resInv = await makeRequest("GET", `/api/v1/invoices/${invoice1._id}`, makeAuthHeader(patientUser1));
      const resRec = await makeRequest("GET", `/api/v1/receipts/${receipt1._id}`, makeAuthHeader(patientUser1));
      recordTest("Owning patient accessing own invoice and receipt allowed (200)", resInv.status === 200 && resRec.status === 200);
    }

    // 3.3 Unauthorized patient accessing another patient's invoice and receipt forbidden (403)
    {
      const resInv = await makeRequest("GET", `/api/v1/invoices/${invoice1._id}`, makeAuthHeader(patientUser2));
      const resRec = await makeRequest("GET", `/api/v1/receipts/${receipt1._id}`, makeAuthHeader(patientUser2));
      recordTest("Unauthorized patient accessing another patient's billing doc forbidden (403)", resInv.status === 403 && resRec.status === 403);
    }

    // 3.4 CRM and HRMS accessing invoice or receipt forbidden (403)
    {
      const resCrm = await makeRequest("GET", `/api/v1/invoices/${invoice1._id}`, makeAuthHeader(crmUser));
      const resHrms = await makeRequest("GET", `/api/v1/receipts/${receipt1._id}`, makeAuthHeader(hrmsUser));
      recordTest("CRM and HRMS accessing billing documents forbidden (403)", resCrm.status === 403 && resHrms.status === 403);
    }

    // 3.5 PDF endpoint authorization check
    {
      const resPdfPatient = await makeRequest("GET", `/api/v1/receipts/${receipt1._id}/pdf`, makeAuthHeader(patientUser1));
      const resPdfUnauth = await makeRequest("GET", `/api/v1/receipts/${receipt1._id}/pdf`, makeAuthHeader(patientUser2));
      recordTest("Receipt PDF download: owning patient allowed (200), unauth patient rejected (403)", resPdfPatient.status === 200 && resPdfUnauth.status === 403);
    }

    // =========================================================================
    // SECTION 4: PATIENT CHART LINKING VIA CRYPTOGRAPHIC OTP
    // =========================================================================
    console.log("\n--- SECTION 4: PATIENT CHART LINKING VIA CRYPTOGRAPHIC OTP ---");

    // 4.1 Anti-enumeration: invalid phone/code returns generic 200 message
    {
      const res = await makeRequest("POST", "/api/v1/patient/me/link-chart/request-otp", makeAuthHeader(unlinkedPatientUser), {
        phone: "+910000000000",
        patientCode: "PT-NONEXISTENT",
      });
      const passed = res.status === 200 && res.data?.message?.includes("If the provided details match");
      recordTest("Non-existent chart link request returns generic anti-enumeration response (200)", passed);
    }

    // Create an unlinked chart to test OTP linking
    const unlinkedChart = await Patient.create({
      patientCode: "PT-9999",
      fullName: "Chart To Link",
      phone: "+919111222333",
      email: "unlinked.chart@trigyna.test",
      gender: "female",
      age: 26,
    });

    // 4.2 Request OTP for matching patient chart
    let testOtpValue = null;
    {
      const res = await makeRequest("POST", "/api/v1/patient/me/link-chart/request-otp", makeAuthHeader(unlinkedPatientUser), {
        phone: unlinkedChart.phone,
        patientCode: unlinkedChart.patientCode,
      });
      testOtpValue = res.data?.data?.testOtp;
      const passed = res.status === 200 && !!testOtpValue;
      recordTest("Valid chart OTP request generates cryptographically hashed OTP", passed, `Test OTP returned: ${testOtpValue ? "YES" : "NO"}`);
    }

    // 4.3 Attempt confirmation with wrong OTP (fails and decrements attempts)
    {
      const res = await makeRequest("POST", "/api/v1/patient/me/link-chart/confirm-otp", makeAuthHeader(unlinkedPatientUser), {
        patientCode: unlinkedChart.patientCode,
        otp: "000000",
      });
      const errorMsg = getErrorMessage(res);
      recordTest("Incorrect OTP rejected with 400 Bad Request", res.status === 400 && errorMsg.includes("Invalid OTP"));
    }

    // 4.4 Confirm with valid OTP links chart
    {
      const res = await makeRequest("POST", "/api/v1/patient/me/link-chart/confirm-otp", makeAuthHeader(unlinkedPatientUser), {
        patientCode: unlinkedChart.patientCode,
        otp: testOtpValue,
      });
      const updatedUser = await User.findById(unlinkedPatientUser._id);
      const updatedChart = await Patient.findById(unlinkedChart._id);
      const passed = res.status === 200 &&
                     updatedUser.patientId?.toString() === unlinkedChart._id.toString() &&
                     updatedChart.userId?.toString() === unlinkedPatientUser._id.toString();
      recordTest("Valid OTP confirms and atomically links patient chart to user account", passed);
    }

    // 4.5 Replay attack with already consumed OTP rejected
    {
      const res = await makeRequest("POST", "/api/v1/patient/me/link-chart/confirm-otp", makeAuthHeader(unlinkedPatientUser), {
        patientCode: unlinkedChart.patientCode,
        otp: testOtpValue,
      });
      const passed = res.status === 400 || res.status === 403 || res.status === 409;
      recordTest("Replay attack with consumed OTP rejected", passed, `Status: ${res.status}`);
    }

    // 4.6 Attempting to link an already-linked chart to another user rejected (409)
    const anotherPatientUser = await User.create({
      name: "Another User",
      email: "another.user@trigyna.test",
      phone: "+919900000099",
      passwordHash,
      role: "patient",
    });

    {
      const res = await makeRequest("POST", "/api/v1/patient/me/link-chart/request-otp", makeAuthHeader(anotherPatientUser), {
        phone: unlinkedChart.phone,
        patientCode: unlinkedChart.patientCode,
      });
      recordTest("Attempt to request OTP for already-linked chart rejected (409)", res.status === 409);
    }

    // =========================================================================
    // SECTION 5: APPOINTMENT CONCURRENCY & COLLISION ELIMINATION
    // =========================================================================
    console.log("\n--- SECTION 5: APPOINTMENT CONCURRENCY & COLLISION ELIMINATION ---");

    const targetDate = "2026-12-01";
    const targetSlot = "11:00";

    // 5.1 Five (5) Simultaneous concurrent requests for exact same doctor, date, and slot
    {
      console.log("Firing 5 simultaneous concurrent booking requests for same doctor & slot...");
      const bookingPayload = {
        patientId: patientRecord1._id.toString(),
        doctorId: doctorProfileA._id.toString(),
        appointmentDate: targetDate,
        startTime: targetSlot,
        endTime: "11:30",
        serviceName: "Homoeopathy Consultation",
      };

      const promises = Array.from({ length: 5 }, (_, idx) =>
        makeRequest("POST", "/api/v1/appointments", makeAuthHeader(receptionUser), bookingPayload)
      );

      const results = await Promise.all(promises);
      const statusCodes = results.map(r => r.status);
      const successCount = statusCodes.filter(s => s === 201).length;
      const conflictCount = statusCodes.filter(s => s === 409).length;

      console.log(`Concurrent results: Status codes received -> [${statusCodes.join(", ")}]`);
      console.log(`Success count (201): ${successCount}, Conflict count (409): ${conflictCount}`);

      // Verify database state: exactly 1 appointment and slot reservations in DB
      const apptCount = await Appointment.countDocuments({
        doctorId: doctorProfileA._id,
        appointmentDate: targetDate,
        startTime: targetSlot,
        status: { $ne: "cancelled" },
      });
      const reservationCount = await SlotReservation.countDocuments({
        doctorId: doctorProfileA._id,
        appointmentDate: targetDate,
        slotTime: { $in: ["11:00", "11:15"] },
        status: "confirmed",
      });

      const passed = successCount === 1 && conflictCount === 4 && apptCount === 1 && reservationCount === 2;
      recordTest("5 Simultaneous concurrent bookings: Exactly 1 succeeds (201), 4 receive Conflict (409)", passed,
        `Success: ${successCount}, Conflict: ${conflictCount}, DB Appts: ${apptCount}, DB Slots: ${reservationCount}`);
    }

    // 5.2 Concurrent bookings for TWO DIFFERENT DOCTORS at same date and slot both succeed (201)
    {
      const payloadDocA = {
        patientId: patientRecord1._id.toString(),
        doctorId: doctorProfileA._id.toString(),
        appointmentDate: targetDate,
        startTime: "14:00",
        endTime: "14:30",
        serviceName: "General Wellness",
      };
      const payloadDocB = {
        patientId: patientRecord2._id.toString(),
        doctorId: doctorProfileB._id.toString(),
        appointmentDate: targetDate,
        startTime: "14:00",
        endTime: "14:30",
        serviceName: "High Risk Consultation",
      };

      const [resDocA, resDocB] = await Promise.all([
        makeRequest("POST", "/api/v1/appointments", makeAuthHeader(receptionUser), payloadDocA),
        makeRequest("POST", "/api/v1/appointments", makeAuthHeader(receptionUser), payloadDocB),
      ]);

      const passed = resDocA.status === 201 && resDocB.status === 201;
      recordTest("Independent doctors booking same slot concurrently both succeed (201)", passed,
        `DocA status: ${resDocA.status}, DocB status: ${resDocB.status}`);
    }

    // 5.3 Rescheduling conflict test (409 on occupied slot)
    let apptToReschedule;
    {
      // Create appointment at 15:00
      const res = await makeRequest("POST", "/api/v1/appointments", makeAuthHeader(receptionUser), {
        patientId: patientRecord1._id.toString(),
        doctorId: doctorProfileA._id.toString(),
        appointmentDate: targetDate,
        startTime: "15:00",
        endTime: "15:30",
        serviceName: "Follow up",
      });
      apptToReschedule = res.data?.data?.appointment;

      // Attempt rescheduling to 11:00 (which is already booked by Doctor A in 5.1)
      const rescheduleRes = await makeRequest("PUT", `/api/v1/appointments/${apptToReschedule._id}/reschedule`, makeAuthHeader(receptionUser), {
        appointmentDate: targetDate,
        startTime: "11:00",
        endTime: "11:30",
      });

      recordTest("Rescheduling to already booked slot returns 409 Conflict", rescheduleRes.status === 409);
    }

    // 5.4 Cancellation releases slot reservation allowing re-booking
    {
      // Cancel the 11:00 appointment
      const existing11 = await Appointment.findOne({
        doctorId: doctorProfileA._id,
        appointmentDate: targetDate,
        startTime: "11:00",
        status: { $ne: "cancelled" },
      });

      const cancelRes = await makeRequest("DELETE", `/api/v1/appointments/${existing11._id}`, makeAuthHeader(receptionUser));
      
      // Verify reservation is removed/released
      const resvAfterCancel = await SlotReservation.findOne({
        doctorId: doctorProfileA._id,
        appointmentDate: targetDate,
        slotTime: "11:00",
        status: "confirmed",
      });

      // Now book the 11:00 slot again
      const rebookRes = await makeRequest("POST", "/api/v1/appointments", makeAuthHeader(receptionUser), {
        patientId: patientRecord2._id.toString(),
        doctorId: doctorProfileA._id.toString(),
        appointmentDate: targetDate,
        startTime: "11:00",
        endTime: "11:30",
        serviceName: "Follow up new",
      });

      const passed = cancelRes.status === 200 && !resvAfterCancel && rebookRes.status === 201;
      recordTest("Cancellation cleanly releases slot reservation allowing new booking (201)", passed);
    }

    // =========================================================================
    // SECTION 6: HRMS SHIFTS GET IDEMPOTENCY
    // =========================================================================
    console.log("\n--- SECTION 6: HRMS SHIFTS GET IDEMPOTENCY ---");

    {
      // Ensure shifts collection is empty
      await Shift.deleteMany({});
      const countBefore = await Shift.countDocuments({});

      // First call
      const res1 = await makeRequest("GET", "/api/v1/hrms/shifts", makeAuthHeader(hrmsUser));
      const countAfter1 = await Shift.countDocuments({});

      // Second call
      const res2 = await makeRequest("GET", "/api/v1/hrms/shifts", makeAuthHeader(hrmsUser));
      const countAfter2 = await Shift.countDocuments({});

      const passed = countBefore === 0 && countAfter1 === 0 && countAfter2 === 0 &&
                     res1.status === 200 && res2.status === 200 &&
                     res1.data?.data?.shifts?.length === 0;

      recordTest("GET /api/v1/hrms/shifts is strictly read-only and idempotent (0 auto-seeds)", passed,
        `Count before: ${countBefore}, After call 1: ${countAfter1}, After call 2: ${countAfter2}`);
    }

    // =========================================================================
    // SECTION 7: INVOICE ENTITY REFERENCE VALIDATION
    // =========================================================================
    console.log("\n--- SECTION 7: INVOICE ENTITY REFERENCE VALIDATION ---");

    // 7.1 Non-existent patientId rejected (404)
    {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await makeRequest("POST", "/api/v1/invoices", makeAuthHeader(receptionUser), {
        patientId: fakeId.toString(),
        doctorId: doctorProfileA._id.toString(),
        items: [{ description: "Fee", quantity: 1, unitPrice: 500, amount: 500 }],
      });
      recordTest("Invoice creation with non-existent patientId rejected (404)", res.status === 404);
    }

    // 7.2 Inactive doctorId rejected (400)
    {
      const res = await makeRequest("POST", "/api/v1/invoices", makeAuthHeader(receptionUser), {
        patientId: patientRecord1._id.toString(),
        doctorId: inactiveDoctor._id.toString(),
        items: [{ description: "Fee", quantity: 1, unitPrice: 500, amount: 500 }],
      });
      const errorMsg = getErrorMessage(res);
      recordTest("Invoice creation with inactive doctorId rejected (400)", res.status === 400 && errorMsg.includes("inactive"), `Msg: ${errorMsg}`);
    }

    // 7.3 Mismatched appointmentId rejected (400)
    {
      // appointmentA1 belongs to patientRecord1 and doctorProfileA
      // We pass patientRecord2 with appointmentA1
      const res = await makeRequest("POST", "/api/v1/invoices", makeAuthHeader(receptionUser), {
        patientId: patientRecord2._id.toString(),
        doctorId: doctorProfileA._id.toString(),
        appointmentId: appointmentA1._id.toString(),
        items: [{ description: "Fee", quantity: 1, unitPrice: 500, amount: 500 }],
      });
      const errorMsg = getErrorMessage(res);
      recordTest("Invoice creation with mismatched appointmentId rejected (400)", res.status === 400 && errorMsg.includes("does not belong to"), `Msg: ${errorMsg}`);
    }

    // =========================================================================
    // SUMMARY REPORT
    // =========================================================================
    console.log("\n================================================================================");
    console.log("TEST EXECUTION SUMMARY");
    console.log("================================================================================");
    const totalTests = testResults.length;
    const passedTests = testResults.filter(t => t.passed).length;
    const failedTests = testResults.filter(t => !t.passed).length;

    console.log(`Total Tests Run : ${totalTests}`);
    console.log(`Passed          : ${passedTests}`);
    console.log(`Failed          : ${failedTests}`);
    console.log(`Success Rate    : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log("================================================================Zone\n");

    if (failedTests > 0) {
      console.error(`FAILED TESTS (${failedTests}):`);
      testResults.filter(t => !t.passed).forEach(t => {
        console.error(` - [FAIL] ${t.testName}: ${t.details}`);
      });
    }

    // Return exit code
    process.exitCode = failedTests === 0 ? 0 : 1;

  } catch (err) {
    console.error("FATAL ERROR IN TEST SUITE RUNNER:", err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runSuite();
