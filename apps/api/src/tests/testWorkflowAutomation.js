const mongoose = require("mongoose");
const http = require("http");
const app = require("../app");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Package = require("../modules/packages/package.model");
const Entitlement = require("../modules/packages/entitlement.model");
const SessionTransaction = require("../modules/packages/session-transaction.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const Notification = require("../modules/notifications/notification.model");

const TEST_PORT = 54123;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api/v1`;

let server;
let adminToken = "";
let doctorToken = "";
let patientToken = "";
let doctorId = "";
let doctorUserId = "";
let patientId = "";
let patientUserId = "";
let packageId = "";
let testAppointmentId = "";
let testPrescriptionId = "";

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`);
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks);
          let parsed;
          try {
            parsed = JSON.parse(raw.toString("utf8"));
          } catch {
            parsed = raw; // Could be binary buffer (e.g. PDF)
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed,
            raw,
          });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function pass(msg) {
  console.log(`  \x1b[32m[PASS]\x1b[0m ${msg}`);
}

function fail(msg, err) {
  console.error(`  \x1b[31m[FAIL]\x1b[0m ${msg}`, err || "");
  process.exit(1);
}

async function runWorkflowAutomationTests() {
  console.log("==================================================");
  console.log("TriGyna — Business Workflow & Automation Verification Suite");
  console.log("==================================================");

  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna");
  server = app.listen(TEST_PORT);

  try {
    // 1. Authenticate Roles
    console.log("\n--- Suite 1: Authentication & Identity Scoping ---");
    let adminRes = await request("POST", "/auth/login", {
      identifier: "admin@trigyna.test",
      password: "TriGyna@123",
    });
    if (adminRes.status !== 200) {
      adminRes = await request("POST", "/auth/login", {
        identifier: "+919172772326",
        password: "TriGyna@2326",
      });
    }
    if (adminRes.status !== 200) fail("Admin login failed", adminRes.data);
    adminToken = adminRes.data.data.token;
    pass("Admin / Owner authenticated");

    const docRes = await request("POST", "/auth/login", {
      identifier: "ananya.sharma@trigyna.test",
      password: "TriGyna@123",
    });
    if (docRes.status !== 200) fail("Doctor login failed", docRes.data);
    doctorToken = docRes.data.data.token;
    doctorUserId = docRes.data.data.user.id || docRes.data.data.user._id;
    const docDoc = await Doctor.findOne({ userId: doctorUserId });
    if (!docDoc) fail("Doctor document not found for user " + doctorUserId);
    doctorId = docDoc._id.toString();
    pass(`Doctor authenticated (${docRes.data.data.user.name})`);

    const patRes = await request("POST", "/auth/login", {
      identifier: "patient@trigyna.test",
      password: "TriGyna@123",
    });
    if (patRes.status !== 200) fail("Patient login failed", patRes.data);
    patientToken = patRes.data.data.token;
    patientUserId = patRes.data.data.user.id || patRes.data.data.user._id;
    let patDoc = await Patient.findOne({ email: "patient@trigyna.test" });
    if (!patDoc) patDoc = await Patient.findOne({ userId: patientUserId });
    if (patDoc && !patDoc.userId) {
      patDoc.userId = patientUserId;
      await patDoc.save();
    }
    patientId = patDoc._id.toString();
    pass(`Patient authenticated (${patDoc.fullName}, #${patDoc.patientCode})`);

    // 2. Package Catalog & Entitlements & Session Credit Ledger
    console.log("\n--- Suite 2: Healthcare Packages & Session Credit Ledger ---");
    const pkgRes = await request("GET", "/packages");
    if (pkgRes.status !== 200 || !pkgRes.data.data.packages.length) {
      fail("Failed to retrieve package catalog", pkgRes.data);
    }
    const testPkg = pkgRes.data.data.packages[0];
    packageId = testPkg._id;
    pass(`Retrieved published package "${testPkg.name}" with ${testPkg.totalSessions} sessions`);

    // Clean up previous entitlements for clean ledger test
    await Entitlement.deleteMany({ patientId });
    await SessionTransaction.deleteMany({ patientId });

    // Purchase / Activate Package for patient
    const purchaseRes = await request(
      "POST",
      "/packages/purchase",
      {
        packageId,
        patientId,
        orderId: `ORD-TEST-${Date.now()}`,
        paymentId: `PAY-TEST-${Date.now()}`,
      },
      adminToken
    );
    if (purchaseRes.status !== 201) fail("Package activation failed", purchaseRes.data);
    const entitlement = purchaseRes.data.data.entitlement;
    if (entitlement.availableSessions !== testPkg.totalSessions || entitlement.reservedSessions !== 0 || entitlement.consumedSessions !== 0) {
      fail("Entitlement initial state incorrect", entitlement);
    }
    pass(`Package activated: ${testPkg.name} -> Available: ${entitlement.availableSessions}, Reserved: 0, Consumed: 0`);

    // Verify session summary from patient endpoint
    const myEntRes = await request("GET", "/packages/entitlements/my", null, patientToken);
    if (myEntRes.status !== 200 || myEntRes.data.data.aggregate.totalAvailable !== testPkg.totalSessions) {
      fail("My entitlements summary mismatch", myEntRes.data);
    }
    pass("Patient verified live session credit balance (Available: " + myEntRes.data.data.aggregate.totalAvailable + ")");

    // 3. Appointment Booking & Credit Reservation
    console.log("\n--- Suite 3: Atomic Appointment Booking & Credit Reservation ---");
    const testDate = "2026-11-20";
    const testTime = "14:00";
    // Clean slot conflicts and existing appointments for this patient
    const SlotReservation = require("../modules/appointments/slot-reservation.model");
    await SlotReservation.deleteMany({ doctorId, appointmentDate: testDate });
    await Appointment.deleteMany({ patientId });
    await Appointment.deleteMany({ doctorId, appointmentDate: testDate });

    const bookRes = await request(
      "POST",
      "/appointments",
      {
        patientId,
        doctorId,
        appointmentDate: testDate,
        startTime: testTime,
        mode: "Online Video Consultation",
        serviceName: "Skin & Hair Consultation",
      },
      patientToken
    );
    if (bookRes.status !== 201) fail("Appointment booking failed", bookRes.data);
    testAppointmentId = bookRes.data.data.appointment._id;
    pass(`Appointment booked atomically (#${bookRes.data.data.appointment.appointmentCode})`);

    // Verify 1 session was automatically reserved
    const checkReserve = await Entitlement.findById(entitlement._id);
    if (checkReserve.availableSessions !== testPkg.totalSessions - 1 || checkReserve.reservedSessions !== 1) {
      fail("Session credit reservation accounting failed", checkReserve);
    }
    pass(`Session credit state after booking: Available: ${checkReserve.availableSessions}, Reserved: ${checkReserve.reservedSessions}, Consumed: ${checkReserve.consumedSessions}`);

    // 4. Google Meet / Zoom Video Link Management
    console.log("\n--- Suite 4: Google Meet / Zoom Video Link Management ---");
    // Invalid non-HTTPS URL rejection
    const invalidUrlRes = await request(
      "PUT",
      `/appointments/${testAppointmentId}/meeting-link`,
      { provider: "google_meet", meetingLink: "http://meet.google.com/abc-defg-hij" },
      doctorToken
    );
    if (invalidUrlRes.status !== 400) fail("Expected 400 rejection for non-HTTPS URL", invalidUrlRes.data);
    pass("Insecure non-HTTPS URL correctly rejected with 400 Validation Error");

    // Invalid domain rejection
    const invalidDomainRes = await request(
      "PUT",
      `/appointments/${testAppointmentId}/meeting-link`,
      { provider: "google_meet", meetingLink: "https://sketchy-site.com/abc-defg-hij" },
      doctorToken
    );
    if (invalidDomainRes.status !== 400) fail("Expected 400 rejection for unauthorized domain", invalidDomainRes.data);
    pass("Unauthorized meeting domain correctly rejected with 400 Validation Error");

    // Valid Google Meet link update
    const validMeetUrl = "https://meet.google.com/xyz-abcd-efg";
    const updateMeetRes = await request(
      "PUT",
      `/appointments/${testAppointmentId}/meeting-link`,
      { provider: "google_meet", meetingLink: validMeetUrl },
      doctorToken
    );
    if (updateMeetRes.status !== 200 || updateMeetRes.data.data.meetingStatus !== "ready") {
      fail("Failed to update valid Google Meet link", updateMeetRes.data);
    }
    pass("Assigned Doctor attached verified Google Meet link -> Status 'ready'");

    // Patient retrieves meeting details
    const patMeetRes = await request("GET", `/appointments/${testAppointmentId}/meeting-details`, null, patientToken);
    if (patMeetRes.status !== 200 || patMeetRes.data.data.meetingLink !== validMeetUrl) {
      fail("Patient failed to fetch authorized meeting details", patMeetRes.data);
    }
    pass(`Patient retrieved authorized consultation link: ${patMeetRes.data.data.meetingLink} (${patMeetRes.data.data.meetingProvider})`);

    // Verify patient dashboard includes ready meetingUrl
    const patDashRes = await request("GET", "/patient/me/dashboard", null, patientToken);
    if (patDashRes.status !== 200) fail("Patient dashboard load failed", patDashRes.data);
    const nextAppt = patDashRes.data.data.nextAppointment;
    if (!nextAppt || nextAppt.meetingStatus !== "ready" || !nextAppt.joinEligible || !nextAppt.meetingUrl) {
      fail("Patient dashboard nextAppointment missing verified meeting url", nextAppt);
    }
    pass("Patient Dashboard dynamically displays live 'Join Consultation' link");

    // 5. Clinical Encounter, Prescription & Session Consumption
    console.log("\n--- Suite 5: Clinical Finalization, Prescription PDF & Credit Consumption ---");
    // Save draft
    const draftRes = await request(
      "POST",
      "/clinical/consultations",
      {
        appointmentId: testAppointmentId,
        chiefComplaints: "Persistent hair thinning and dry scalp for 3 months",
        diagnosis: "Telogen Effluvium with nutritional deficiency",
        treatmentPlan: "Homoeopathic constitutional medicine + biotin & iron rich diet",
        followUpAdvice: "Review in 3 weeks",
      },
      doctorToken
    );
    if (draftRes.status !== 200) fail("Clinical draft save failed", draftRes.data);
    const consultationId = draftRes.data.data.consultation._id;
    pass("Doctor saved clinical encounter draft");

    // Save prescription
    const rxRes = await request(
      "POST",
      "/clinical/prescriptions",
      {
        consultationId,
        medications: [
          {
            name: "Wiesbaden 200CH",
            dosage: "4 Pills",
            frequency: "1-0-1",
            duration: "21 Days",
            instructions: "Take 30 minutes before meals on clean tongue",
          },
          {
            name: "Arnica Montana Hair Oil",
            dosage: "External",
            frequency: "Twice weekly",
            duration: "1 Month",
            instructions: "Gentle scalp massage before washing",
          },
        ],
        dietaryAdvice: "Increase leafy greens, soaked almonds, flax seeds, and ensure 3L water daily.",
        isReleasedToPatient: true,
      },
      doctorToken
    );
    if (rxRes.status !== 200) fail("Prescription save failed", rxRes.data);
    testPrescriptionId = rxRes.data.data.prescription._id;
    pass(`Prescription generated with atomic code #${rxRes.data.data.prescription.prescriptionCode}`);

    // Finalize consultation
    const finalizeRes = await request("POST", `/clinical/consultations/${consultationId}/finalize`, {}, doctorToken);
    if (finalizeRes.status !== 200) fail("Consultation finalization failed", finalizeRes.data);
    pass("Consultation finalized and locked against tampering");

    // Verify session credit permanently transferred from Reserved to Consumed
    const checkConsumed = await Entitlement.findById(entitlement._id);
    if (checkConsumed.reservedSessions !== 0 || checkConsumed.consumedSessions !== 1) {
      fail("Session credit consumption accounting failed", checkConsumed);
    }
    pass(`Session credit state after consultation: Available: ${checkConsumed.availableSessions}, Reserved: ${checkConsumed.reservedSessions}, Consumed: ${checkConsumed.consumedSessions}`);

    // Verify duplicate finalize is blocked (idempotency check)
    const repeatFinalize = await request("POST", `/clinical/consultations/${consultationId}/finalize`, {}, doctorToken);
    if (repeatFinalize.status !== 409) fail("Expected 409 on repeat finalize", repeatFinalize.data);
    const recheckConsumed = await Entitlement.findById(entitlement._id);
    if (recheckConsumed.consumedSessions !== 1) {
      fail("Idempotency failed: session credit double-consumed!", recheckConsumed);
    }
    pass("Idempotency verified: Duplicate finalization blocked and session credits protected");

    // 6. Download Prescription PDF
    console.log("\n--- Suite 6: Digitally Verified Prescription PDF Stream ---");
    const pdfRes = await request("GET", `/clinical/prescriptions/${testPrescriptionId}/pdf`, null, patientToken);
    if (pdfRes.status !== 200) fail("Prescription PDF download failed", pdfRes.data);
    if (pdfRes.headers["content-type"] !== "application/pdf") {
      fail("Expected application/pdf content type", pdfRes.headers);
    }
    if (!pdfRes.raw || pdfRes.raw.length < 1000) {
      fail("PDF buffer size unexpectedly small", pdfRes.raw?.length);
    }
    // Check PDF magic bytes '%PDF'
    const magic = pdfRes.raw.slice(0, 4).toString("utf8");
    if (magic !== "%PDF") fail(`Invalid PDF magic header: '${magic}'`);
    pass(`Patient successfully downloaded authentic A4 Prescription PDF (${pdfRes.raw.length} bytes, format: ${magic})`);

    // 7. Notification Verification
    console.log("\n--- Suite 7: Notification Event Outbox Verification ---");
    const notifRes = await request("GET", "/notifications", null, patientToken);
    if (notifRes.status !== 200 || !notifRes.data.data.notifications.length) {
      fail("Patient notification list empty", notifRes.data);
    }
    const notifications = notifRes.data.data.notifications;
    const hasMeetNotif = notifications.some((n) => n.title.includes("Video") || n.message.includes("video link"));
    const hasRxNotif = notifications.some((n) => n.title.includes("Prescription") || n.message.includes("prescription"));
    if (!hasMeetNotif) fail("Missing video link notification", notifications);
    if (!hasRxNotif) fail("Missing prescription notification", notifications);
    pass("Verified automated notifications dispatched: 'Video Consultation Link Ready' & 'Prescription Available'");

    console.log("\n==================================================");
    console.log("WORKFLOW AUTOMATION SUITE: ALL TESTS PASSED (100%)");
    console.log("==================================================");
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runWorkflowAutomationTests().catch((err) => {
  console.error("Fatal Test Runner Error:", err);
  process.exit(1);
});
