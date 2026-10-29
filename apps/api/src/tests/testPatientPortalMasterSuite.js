/**
 * TriGyna Master Patient Portal Test Suite
 * Comprehensive automated verification for Phase 14 & Final Acceptance Criteria
 * Covers:
 * 1. Database connection verification (trigyna_test isolation)
 * 2. Patient authentication, token verification & account healing
 * 3. Profile security, allowed field updates & password change
 * 4. IDOR isolation (appointments, consultations, prescriptions, invoices, notifications)
 * 5. Clinical privacy (examinationNotes stripping across all endpoints)
 * 6. Doctor availability, HRMS approved leave & conflict protection
 * 7. Self-service booking and atomic rescheduling
 * 8. Billing integrity and verified payment/receipt state
 * 9. Notification ownership and read persistence
 */

process.env.NODE_ENV = "test";
const http = require("http");
const assert = require("assert");
const mongoose = require("mongoose");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");

const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const Invoice = require("../modules/billing/invoice.model");
const Notification = require("../modules/notifications/notification.model");
const LeaveRequest = require("../modules/hrms/leave.model");
const Employee = require("../modules/hrms/employee.model");

let server;
let baseUrl;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const normalizedPath = path.startsWith("/api/v1") ? path : `/api/v1${path}`;
    const url = new URL(normalizedPath, baseUrl);
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
        } catch {
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

let passedCount = 0;
let failedCount = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failedCount++;
    throw err;
  }
}

async function runMasterSuite() {
  console.log("================================================================================");
  console.log("  TriGyna Patient Portal Master Integration & Security Suite (Test DB)");
  console.log("================================================================================\n");

  const conn = await connectDB();

  // Verification: Database must be trigyna_test
  assert.strictEqual(
    conn.name,
    "trigyna_test",
    `FATAL: Tests must strictly run on 'trigyna_test'! Currently connected to '${conn.name}'`
  );
  console.log(`[Safety Guard Passed] Connected to isolated test database: ${conn.name}\n`);

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      console.log(`[Test Server] Ephemeral HTTP listener started on port ${port}\n`);
      resolve();
    });
  });

  // Seed isolated test fixtures
  const testRunId = Date.now();
  const doctorEmail = `doc_master_${testRunId}@trigyna.test`;
  const patientAEmail = `patient_a_${testRunId}@trigyna.test`;
  const patientBEmail = `patient_b_${testRunId}@trigyna.test`;

  let doctorUser, doctor, employee;
  let patientAUser, patientA;
  let patientBUser, patientB;
  let patientAToken, patientBToken, doctorToken;
  let patientAAppt, patientBAppt;
  let patientAConsultation, patientBConsultation;
  let patientAPrescription;
  let patientAInvoice, patientBInvoice;
  let patientANotification, patientBNotification;

  const leaveDate = "2026-11-20";
  const validApptDate = "2026-11-25";
  const rescheduleDate = "2026-11-26";

  try {
    // 1. Setup Doctor & HRMS Staff
    doctorUser = await User.create({
      name: "Dr. Master Clinician",
      email: doctorEmail,
      phone: `98000${String(testRunId).slice(-5)}`,
      passwordHash: await User.hashPassword("DoctorSecurePass123!"),
      role: "doctor",
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      qualifications: "BHMS, MD (Homoeopathy)",
      specialization: ["Gynaecology", "PCOS Management"],
      consultationFee: 850,
      availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      timeSlots: [
        { startTime: "10:00", endTime: "10:30" },
        { startTime: "11:00", endTime: "11:30" },
        { startTime: "14:00", endTime: "14:30" },
      ],
    });

    employee = await Employee.create({
      userId: doctorUser._id,
      employeeCode: `EMP-${String(testRunId).slice(-4)}`,
      designation: "Consultant Homoeopath",
      department: "Clinical",
      employmentType: "full_time",
    });

    // Approved Leave for Doctor on 2026-11-20
    await LeaveRequest.create({
      employeeId: employee._id,
      leaveType: "paid",
      startDate: new Date(`${leaveDate}T00:00:00.000Z`),
      endDate: new Date(`${leaveDate}T23:59:59.999Z`),
      reason: "Annual Medical Conference",
      status: "approved",
      reviewedBy: doctorUser._id,
    });

    // 2. Setup Patient A
    patientAUser = await User.create({
      name: "Priya Patient Alpha",
      email: patientAEmail,
      phone: `97000${String(testRunId).slice(-5)}`,
      passwordHash: await User.hashPassword("AlphaSecretPass123!"),
      role: "patient",
    });

    patientA = await Patient.create({
      userId: patientAUser._id,
      patientCode: `TG-PA-${String(testRunId).slice(-4)}`,
      fullName: patientAUser.name,
      email: patientAEmail,
      phone: patientAUser.phone,
      gender: "female",
      bloodGroup: "O+",
      dateOfBirth: new Date("1995-05-15"),
      address: "101, Lotus Enclave, Mumbai",
      emergencyContact: {
        name: "Rahul Alpha",
        relationship: "Spouse",
        phone: "9876543210",
      },
    });

    // 3. Setup Patient B
    patientBUser = await User.create({
      name: "Meera Patient Beta",
      email: patientBEmail,
      phone: `96000${String(testRunId).slice(-5)}`,
      passwordHash: await User.hashPassword("BetaSecretPass123!"),
      role: "patient",
    });

    patientB = await Patient.create({
      userId: patientBUser._id,
      patientCode: `TG-PB-${String(testRunId).slice(-4)}`,
      fullName: patientBUser.name,
      email: patientBEmail,
      phone: patientBUser.phone,
      gender: "female",
      bloodGroup: "A+",
      dateOfBirth: new Date("1992-08-20"),
      address: "202, Palm Heights, Pune",
    });

    // 4. Appointments
    patientAAppt = await Appointment.create({
      appointmentCode: `APT-A-${String(testRunId).slice(-4)}`,
      patientId: patientA._id,
      doctorId: doctor._id,
      serviceName: "Homoeopathy Consultation",
      appointmentDate: validApptDate,
      startTime: "10:00",
      endTime: "10:30",
      mode: "Online Video Consultation",
      status: "scheduled",
      paymentStatus: "paid",
    });

    patientBAppt = await Appointment.create({
      appointmentCode: `APT-B-${String(testRunId).slice(-4)}`,
      patientId: patientB._id,
      doctorId: doctor._id,
      serviceName: "PCOS Management",
      appointmentDate: validApptDate,
      startTime: "11:00",
      endTime: "11:30",
      mode: "Online Video Consultation",
      status: "scheduled",
      paymentStatus: "paid",
    });

    // 5. Consultations with confidential examinationNotes
    patientAConsultation = await Consultation.create({
      appointmentId: patientAAppt._id,
      patientId: patientA._id,
      doctorId: doctor._id,
      chiefComplaints: "Irregular menstrual cycle (38-42 days) with mild hormonal acne",
      diagnosis: "Polycystic Ovarian Syndrome (PCOS)",
      examinationNotes: "INTERNAL CLINICAL NOTE: Patient exhibits mild hirsutism and stress-induced cortisol elevation. Strict confidential follow-up.",
      treatmentPlan: "Prescribed constitutional remedy Pulsatilla 200C and low GI diet",
      followUpAdvice: "Review basal body temperature chart in 14 days",
      isFinalized: true,
      finalizedAt: new Date(),
    });

    patientBConsultation = await Consultation.create({
      appointmentId: patientBAppt._id,
      patientId: patientB._id,
      doctorId: doctor._id,
      chiefComplaints: "Hormonal acne and fatigue",
      diagnosis: "Acne Vulgaris",
      examinationNotes: "INTERNAL CLINICAL NOTE: Confidential dermatological assessment for Patient B.",
      treatmentPlan: "Maintain skin hygiene and Sepia 30C",
      followUpAdvice: "Follow-up in 4 weeks",
      isFinalized: true,
      finalizedAt: new Date(),
    });

    // 6. Prescription for Patient A
    patientAPrescription = await Prescription.create({
      prescriptionCode: `RX-A-${String(testRunId).slice(-4)}`,
      consultationId: patientAConsultation._id,
      patientId: patientA._id,
      doctorId: doctor._id,
      medications: [
        {
          name: "Pulsatilla",
          dosage: "200C",
          frequency: "Once daily morning",
          duration: "14 days",
          instructions: "Take sublingually on an empty stomach",
        },
      ],
      dietaryAdvice: "Avoid raw onions and strong caffeine 30 minutes before and after remedy.",
      isReleasedToPatient: true,
    });

    // 7. Invoices
    patientAInvoice = await Invoice.create({
      invoiceNumber: `INV-A-${String(testRunId).slice(-4)}`,
      patientId: patientA._id,
      doctorId: doctor._id,
      appointmentId: patientAAppt._id,
      items: [{ description: "Homoeopathy Consultation", quantity: 1, unitPrice: 850, amount: 850 }],
      subtotal: 850,
      totalAmount: 850,
      paidAmount: 850,
      balanceAmount: 0,
      status: "paid",
      paymentMethod: "upi",
      payments: [
        {
          amount: 850,
          paymentMethod: "upi",
          receiptNumber: `REC-A-${String(testRunId).slice(-4)}`,
          recordedAt: new Date(),
        },
      ],
    });

    patientBInvoice = await Invoice.create({
      invoiceNumber: `INV-B-${String(testRunId).slice(-4)}`,
      patientId: patientB._id,
      doctorId: doctor._id,
      appointmentId: patientBAppt._id,
      items: [{ description: "PCOS Management", quantity: 1, unitPrice: 850, amount: 850 }],
      subtotal: 850,
      totalAmount: 850,
      paidAmount: 850,
      balanceAmount: 0,
      status: "paid",
      paymentMethod: "upi",
      payments: [
        {
          amount: 850,
          paymentMethod: "upi",
          receiptNumber: `REC-B-${String(testRunId).slice(-4)}`,
          recordedAt: new Date(),
        },
      ],
    });

    // 8. Notifications
    patientANotification = await Notification.create({
      recipientId: patientAUser._id,
      recipientRole: "patient",
      title: "Consultation Confirmed",
      message: "Your video consultation with Dr. Master is confirmed for Nov 25.",
      type: "appointment",
      read: false,
    });

    patientBNotification = await Notification.create({
      recipientId: patientBUser._id,
      recipientRole: "doctor",
      title: "Private Report Available",
      message: "Confidential report for Patient B is ready for download.",
      type: "clinical",
      read: false,
    });

    console.log("[Seeding Complete] Isolated test fixtures initialized successfully.\n");

    // =========================================================================
    // SECTION 1: Authentication & Identity Derivation
    // =========================================================================
    console.log("--- SECTION 1: Authentication, Tokens & Identity Derivation ---");

    await runTest("Patient A logs in and obtains verified JWT", async () => {
      const res = await makeRequest("POST", "/auth/login", {
        identifier: patientAEmail,
        password: "AlphaSecretPass123!",
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data && res.body.data.token);
      patientAToken = res.body.data.token;
    });

    await runTest("Patient B logs in and obtains verified JWT", async () => {
      const res = await makeRequest("POST", "/auth/login", {
        identifier: patientBEmail,
        password: "BetaSecretPass123!",
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data && res.body.data.token);
      patientBToken = res.body.data.token;
    });

    await runTest("Doctor logs in and obtains doctor role token", async () => {
      const res = await makeRequest("POST", "/auth/login", {
        identifier: doctorEmail,
        password: "DoctorSecurePass123!",
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data && res.body.data.token);
      doctorToken = res.body.data.token;
    });

    await runTest("Unauthenticated request to /patient/me/profile is rejected with 401", async () => {
      const res = await makeRequest("GET", "/patient/me/profile");
      assert.strictEqual(res.status, 401);
    });

    await runTest("Patient A profile resolves patient record matching authenticated user", async () => {
      const res = await makeRequest("GET", "/patient/me/profile", null, patientAToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.patient.patientCode, patientA.patientCode);
      assert.strictEqual(res.body.data.patient.email, patientAEmail);
    });

    await runTest("Patient account self-healing: User with patientId heals patient.userId", async () => {
      // Create user with patientId reference but unlinked patient.userId
      const unlinkedEmail = `unlinked_${testRunId}@trigyna.test`;
      const unlinkedPatCode = `TG-PU-${String(testRunId).slice(-4)}`;
      const unlinkedPatient = await Patient.create({
        patientCode: unlinkedPatCode,
        fullName: "Unlinked Patient",
        email: unlinkedEmail,
        phone: `95000${String(testRunId).slice(-5)}`,
      });
      const unlinkedUser = await User.create({
        name: "Unlinked User",
        email: unlinkedEmail,
        phone: unlinkedPatient.phone,
        passwordHash: await User.hashPassword("UnlinkedPass123!"),
        role: "patient",
        patientId: unlinkedPatient._id,
      });

      const loginRes = await makeRequest("POST", "/auth/login", {
        identifier: unlinkedEmail,
        password: "UnlinkedPass123!",
      });
      assert.strictEqual(loginRes.status, 200);
      const unlinkedToken = loginRes.body.data.token;

      const profileRes = await makeRequest("GET", "/patient/me/profile", null, unlinkedToken);
      assert.strictEqual(profileRes.status, 200);
      assert.strictEqual(profileRes.body.data.patient.patientCode, unlinkedPatCode);

      // Verify healing in database
      const healedPatient = await Patient.findById(unlinkedPatient._id);
      assert.strictEqual(healedPatient.userId.toString(), unlinkedUser._id.toString());
    });

    // =========================================================================
    // SECTION 2: Profile Security, Validation & Password Management
    // =========================================================================
    console.log("\n--- SECTION 2: Profile Security, Field Allowlists & Password Change ---");

    await runTest("Password change rejects incorrect current password", async () => {
      const res = await makeRequest(
        "PATCH",
        "/patient/me/password",
        {
          currentPassword: "WrongPassword999!",
          newPassword: "BrandNewSecurePass123!",
        },
        patientAToken
      );
      assert.ok(res.status === 401 || res.status === 400);
    });

    await runTest("Password change rejects weak/short new password (< 8 chars)", async () => {
      const res = await makeRequest(
        "PATCH",
        "/patient/me/password",
        {
          currentPassword: "AlphaSecretPass123!",
          newPassword: "short",
        },
        patientAToken
      );
      assert.strictEqual(res.status, 400);
    });

    await runTest("Password change succeeds with valid credentials and allows subsequent login", async () => {
      const res = await makeRequest(
        "PATCH",
        "/patient/me/password",
        {
          currentPassword: "AlphaSecretPass123!",
          newPassword: "AlphaUpdatedPass456!",
        },
        patientAToken
      );
      assert.strictEqual(res.status, 200);

      // Verify login with new password
      const reLogin = await makeRequest("POST", "/auth/login", {
        identifier: patientAEmail,
        password: "AlphaUpdatedPass456!",
      });
      assert.strictEqual(reLogin.status, 200);
      patientAToken = reLogin.body.data.token; // Refresh active token
    });

    await runTest("Profile update allows safe fields (address, emergency contact) and ignores protected role changes", async () => {
      const res = await makeRequest(
        "PUT",
        "/patient/me/profile",
        {
          address: "Flat 404, Sea Green Towers, Mumbai",
          role: "admin", // Malicious attempt to elevate role
          patientCode: "TG-HACK-CODE", // Malicious attempt to alter EHR code
        },
        patientAToken
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.patient.address, "Flat 404, Sea Green Towers, Mumbai");
      assert.strictEqual(res.body.data.patient.patientCode, patientA.patientCode); // Preserved

      // Verify role unchanged in database
      const userDoc = await User.findById(patientAUser._id);
      assert.strictEqual(userDoc.role, "patient");
    });

    // =========================================================================
    // SECTION 3: IDOR Isolation & Cross-Patient Data Protection
    // =========================================================================
    console.log("\n--- SECTION 3: IDOR Protection & Resource Ownership Isolation ---");

    await runTest("Patient A cannot access Patient B's appointments", async () => {
      const res = await makeRequest("GET", "/patient/me/appointments", null, patientAToken);
      assert.strictEqual(res.status, 200);
      const appts = res.body.data.appointments;
      assert.ok(appts.some((a) => a.appointmentCode === patientAAppt.appointmentCode));
      assert.ok(!appts.some((a) => a.appointmentCode === patientBAppt.appointmentCode));
    });

    await runTest("Patient A cannot cancel Patient B's appointment (IDOR rejection)", async () => {
      const res = await makeRequest(
        "POST",
        `/appointments/${patientBAppt._id}/cancel`,
        { reason: "Malicious cancellation attempt" },
        patientAToken
      );
      assert.strictEqual(res.status, 403);
    });

    await runTest("Patient A cannot reschedule Patient B's appointment (IDOR rejection)", async () => {
      const res = await makeRequest(
        "POST",
        `/appointments/${patientBAppt._id}/reschedule`,
        { appointmentDate: rescheduleDate, startTime: "14:00" },
        patientAToken
      );
      assert.strictEqual(res.status, 403);
    });

    await runTest("Patient A cannot access Patient B's invoices or receipts", async () => {
      const res = await makeRequest("GET", "/patient/me/invoices", null, patientAToken);
      assert.strictEqual(res.status, 200);
      const invoices = res.body.data.invoices;
      assert.ok(invoices.some((inv) => inv.invoiceNumber === patientAInvoice.invoiceNumber));
      assert.ok(!invoices.some((inv) => inv.invoiceNumber === patientBInvoice.invoiceNumber));
    });

    await runTest("Patient A cannot view Patient B's prescriptions", async () => {
      const res = await makeRequest("GET", "/patient/me/prescriptions", null, patientAToken);
      assert.strictEqual(res.status, 200);
      const prescriptions = res.body.data.prescriptions;
      assert.ok(prescriptions.every((p) => p.patientId._id.toString() === patientA._id.toString()));
    });

    await runTest("Patient A cannot view Patient B's notifications", async () => {
      const res = await makeRequest("GET", "/patient/me/notifications", null, patientAToken);
      assert.strictEqual(res.status, 200);
      const notifs = res.body.data.notifications;
      assert.ok(notifs.some((n) => n.title === "Consultation Confirmed"));
      assert.ok(!notifs.some((n) => n.title === "Private Report Available"));
    });

    // =========================================================================
    // SECTION 4: Clinical Privacy & Internal Notes Masking
    // =========================================================================
    console.log("\n--- SECTION 4: Clinical Privacy & Internal Note Stripping ---");

    await runTest("GET /patient/me/consultations strips confidential examinationNotes", async () => {
      const res = await makeRequest("GET", "/patient/me/consultations", null, patientAToken);
      assert.strictEqual(res.status, 200);
      const consults = res.body.data.consultations;
      assert.ok(consults.length > 0);
      const c = consults[0];
      assert.strictEqual(c.examinationNotes, undefined, "examinationNotes must be stripped for patient caller");
      assert.ok(c.followUpAdvice, "Patient visible advice must remain present");
    });

    await runTest("GET /clinical/consultations/:id strips examinationNotes for patient role", async () => {
      const res = await makeRequest("GET", `/clinical/consultations/${patientAConsultation._id}`, null, patientAToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.consultation.examinationNotes, undefined);
    });

    await runTest("GET /clinical/consultations/:id preserves examinationNotes for doctor role", async () => {
      const res = await makeRequest("GET", `/clinical/consultations/${patientAConsultation._id}`, null, doctorToken);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.consultation.examinationNotes.includes("INTERNAL CLINICAL NOTE"));
    });

    await runTest("GET /clinical/appointments/:id/consultation strips examinationNotes for patient", async () => {
      const res = await makeRequest("GET", `/clinical/appointments/${patientAAppt._id}/consultation`, null, patientAToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.consultation.examinationNotes, undefined);
    });

    // =========================================================================
    // SECTION 5: Doctor Availability, HRMS Approved Leave & Booking Reschedule
    // =========================================================================
    console.log("\n--- SECTION 5: Availability, HRMS Leave Integration & Scheduling ---");

    await runTest("Doctor availability on approved HRMS leave date flags isOnLeave: true and disables slots", async () => {
      const res = await makeRequest(
        "GET",
        `/appointments/availability?doctorId=${doctor._id}&date=${leaveDate}`,
        null,
        patientAToken
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.isOnLeave, true);
      assert.ok(res.body.data.leaveDetails);
      assert.strictEqual(res.body.data.availableSlotsCount, 0);
      assert.ok(res.body.data.slots.every((s) => s.isAvailable === false));
    });

    await runTest("Booking appointment on doctor approved leave date is blocked with 409 Conflict", async () => {
      const res = await makeRequest(
        "POST",
        "/appointments",
        {
          doctorId: doctor._id,
          serviceName: "Homoeopathy Consultation",
          appointmentDate: leaveDate,
          startTime: "10:00",
          mode: "Online Video Consultation",
        },
        patientAToken
      );
      assert.strictEqual(res.status, 409);
      assert.ok((res.body?.error?.message || res.body?.message || "").includes("leave"));
    });

    await runTest("Rescheduling appointment to doctor approved leave date is blocked with 409 Conflict", async () => {
      const res = await makeRequest(
        "POST",
        `/appointments/${patientAAppt._id}/reschedule`,
        {
          appointmentDate: leaveDate,
          startTime: "10:00",
        },
        patientAToken
      );
      assert.strictEqual(res.status, 409);
      assert.ok((res.body?.error?.message || res.body?.message || "").includes("leave"));

      // Verify original appointment remains untouched
      const original = await Appointment.findById(patientAAppt._id);
      assert.strictEqual(original.appointmentDate, validApptDate);
    });

    await runTest("Patient self-booking without patientId in request body derives identity from JWT", async () => {
      const res = await makeRequest(
        "POST",
        "/appointments",
        {
          doctorId: doctor._id,
          serviceName: "Homoeopathy Consultation",
          appointmentDate: "2026-11-28",
          startTime: "14:00",
          mode: "Online Video Consultation",
          notes: "Derived patient self-booking test",
        },
        patientAToken
      );
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.appointment.patientId.toString(), patientA._id.toString());
    });

    await runTest("Rescheduling appointment to an available non-leave date succeeds atomically", async () => {
      const res = await makeRequest(
        "POST",
        `/appointments/${patientAAppt._id}/reschedule`,
        {
          appointmentDate: rescheduleDate,
          startTime: "14:00",
        },
        patientAToken
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.appointment.appointmentDate, rescheduleDate);
      assert.strictEqual(res.body.data.appointment.startTime, "14:00");
    });

    // =========================================================================
    // SECTION 6: Billing & Financial Integrity
    // =========================================================================
    console.log("\n--- SECTION 6: Billing & Financial Integrity ---");

    await runTest("Patient invoices return accurate totals and receipt metadata", async () => {
      const res = await makeRequest("GET", "/patient/me/invoices", null, patientAToken);
      assert.strictEqual(res.status, 200);
      const invoices = res.body.data.invoices;
      const inv = invoices.find((i) => i.invoiceNumber === patientAInvoice.invoiceNumber);
      assert.ok(inv);
      assert.strictEqual(inv.totalAmount, 850);
      assert.strictEqual(inv.paidAmount, 850);
      assert.strictEqual(inv.balanceAmount, 0);
      assert.strictEqual(inv.status, "paid");
      assert.ok(inv.payments[0].receiptNumber.startsWith("REC-A-"));
    });

    // =========================================================================
    // SECTION 7: Notifications & Follow-ups
    // =========================================================================
    console.log("\n--- SECTION 7: Notifications & Read State Persistence ---");

    await runTest("Marking notification as read persists in database", async () => {
      const res = await makeRequest(
        "PATCH",
        `/patient/me/notifications/${patientANotification._id}/read`,
        {},
        patientAToken
      );
      assert.strictEqual(res.status, 200);

      // Verify in DB
      const updated = await Notification.findById(patientANotification._id);
      assert.strictEqual(updated.read, true);
    });

    console.log("\n================================================================================");
    console.log(`  ALL ${passedCount} MASTER SUITE TESTS COMPLETED SUCCESSFULLY! (${failedCount} Failures)`);
    console.log("================================================================================\n");
  } finally {
    // Clean up test records
    if (doctorUser) await User.deleteOne({ _id: doctorUser._id });
    if (doctor) await Doctor.deleteOne({ _id: doctor._id });
    if (employee) await Employee.deleteOne({ _id: employee._id });
    if (patientAUser) await User.deleteOne({ _id: patientAUser._id });
    if (patientA) await Patient.deleteOne({ _id: patientA._id });
    if (patientBUser) await User.deleteOne({ _id: patientBUser._id });
    if (patientB) await Patient.deleteOne({ _id: patientB._id });
    await LeaveRequest.deleteMany({ reason: "Annual Medical Conference" });
    await Appointment.deleteMany({ patientId: { $in: [patientA?._id, patientB?._id] } });
    await Consultation.deleteMany({ patientId: { $in: [patientA?._id, patientB?._id] } });
    await Prescription.deleteMany({ patientId: { $in: [patientA?._id, patientB?._id] } });
    await Invoice.deleteMany({ patientId: { $in: [patientA?._id, patientB?._id] } });
    await Notification.deleteMany({ recipientId: { $in: [patientAUser?._id, patientBUser?._id] } });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  }
}

runMasterSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL ERROR IN MASTER SUITE:", err);
    process.exit(1);
  });
