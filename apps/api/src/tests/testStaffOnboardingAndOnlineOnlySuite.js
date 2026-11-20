/**
 * TriGyna Master Verification Suite
 * 1. 100% Online-Only Video Consultation Architecture
 * 2. Admin-Controlled Centralized Staff Onboarding (Doctor & Sales)
 * 3. Doctor Professional Credential Verification Policy
 * 4. Secure Account Activation (No plaintext credentials over WhatsApp/Email)
 * 5. Legacy Offline Appointments Preservation
 */

const http = require("http");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const StaffInvitation = require("../modules/admin/staff-invitation.model");
const StaffOnboarding = require("../modules/admin/staff-onboarding.model");

let server;
let baseUrl;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runMasterSuite() {
  console.log("==================================================");
  console.log("TriGyna — Online-Only & Staff Onboarding Master Suite");
  console.log("==================================================");

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna_test";
  await mongoose.connect(uri);
  console.log("[Database] Connected successfully to:", uri);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestServer] Ephemeral server running at ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Admin
    const adminRes = await request("POST", "/api/v1/auth/login", {
      identifier: "admin@trigyna.test",
      password: "TriGyna@123",
    });
    assert(adminRes.status === 200, "Admin login returned 200 OK");
    const adminToken = adminRes.body.data.token;

    // Authenticate Doctor
    const docRes = await request("POST", "/api/v1/auth/login", {
      identifier: "doctor@trigyna.test",
      password: "TriGyna@123",
    });
    assert(docRes.status === 200, "Doctor login returned 200 OK");
    const docToken = docRes.body.data.token;

    // Authenticate Sales
    const salesRes = await request("POST", "/api/v1/auth/login", {
      identifier: "sales@trigyna.test",
      password: "TriGyna@123",
    });
    assert(salesRes.status === 200, "Sales login returned 200 OK");
    const salesToken = salesRes.body.data.token;

    // ==================================================
    // SUITE 1: Online-Only Consultation Business Rules
    // ==================================================
    console.log("\n--- Suite 1: Online-Only Consultation Enforcement ---");

    // 1a. Public Enquiry rejects offline mode
    const offlineEnquiryRes = await request("POST", "/api/v1/public/enquiries", {
      fullName: "Test Offline Visitor",
      phone: "+919876543210",
      email: "offline@test.com",
      serviceInterest: "Skin & Hair",
      consultationMode: "In-Clinic Consultation",
      consent: true,
    });
    assert(offlineEnquiryRes.status === 400, "Public enquiry rejects 'In-Clinic Consultation' with 400");

    // 1b. Public Enquiry accepts online mode
    const enquiryPhone = "+9198765" + Date.now().toString().slice(-5);
    const onlineEnquiryRes = await request("POST", "/api/v1/public/enquiries", {
      fullName: "Test Online Visitor",
      phone: enquiryPhone,
      email: "online@test.com",
      serviceInterest: "Skin & Hair",
      consultationMode: "Online Video Consultation",
      consent: true,
    });
    assert(onlineEnquiryRes.status === 201, "Public enquiry accepts 'Online Video Consultation' with 201");

    // 1c. Appointment booking rejects offline consultation
    const existingDoctor = await Doctor.findOne({ isVerified: true, status: "active" });
    const existingPatient = await Patient.findOne();

    const offlineApptRes = await request(
      "POST",
      "/api/v1/appointments",
      {
        patientId: existingPatient._id,
        doctorId: existingDoctor._id,
        appointmentDate: "2026-11-20",
        startTime: "11:00",
        endTime: "11:30",
        mode: "In-Clinic Consultation",
      },
      adminToken
    );
    assert(offlineApptRes.status === 400, "Appointment booking rejects 'In-Clinic Consultation' with 400");

    // 1d. Order creation rejects offline consultation
    const offlineOrderRes = await request(
      "POST",
      "/api/v1/orders",
      {
        customerName: "Offline Order Test",
        customerPhone: "9876543211",
        serviceName: "Skin & Hair",
        consultationMode: "In-Clinic Consultation",
      },
      adminToken
    );
    assert(offlineOrderRes.status === 400, "Order creation rejects 'In-Clinic Consultation' with 400");

    // ==================================================
    // SUITE 2: Admin Staff Onboarding RBAC & Security
    // ==================================================
    console.log("\n--- Suite 2: Admin Staff Onboarding RBAC & Validation ---");

    // 2a. Doctor cannot onboard staff (403)
    const docOnboardAttempt = await request(
      "POST",
      "/api/v1/admin/staff/onboard",
      {
        role: "doctor",
        name: "Unauthorized Dr",
        email: "unauth.doc@test.com",
        phone: "9876500001",
        registrationNumber: "TG-12345",
      },
      docToken
    );
    assert(docOnboardAttempt.status === 403, "Doctor is forbidden (403) from onboarding staff");

    // 2b. Sales cannot onboard staff (403)
    const salesOnboardAttempt = await request(
      "POST",
      "/api/v1/admin/staff/onboard",
      {
        role: "sales",
        name: "Unauthorized Sales",
        email: "unauth.sales@test.com",
        phone: "9876500002",
      },
      salesToken
    );
    assert(salesOnboardAttempt.status === 403, "Sales is forbidden (403) from onboarding staff");

    // 2c. Invalid role is rejected (400)
    const invalidRoleRes = await request(
      "POST",
      "/api/v1/admin/staff/onboard",
      {
        role: "reception",
        name: "Invalid Staff",
        email: "invalid.staff@test.com",
        phone: "9876500003",
      },
      adminToken
    );
    assert(invalidRoleRes.status === 400, "Staff onboarding rejects non-staff roles with 400");

    // 2d. Admin successfully onboards a Doctor (with verification = false initially)
    const uniqueNum = Date.now().toString().slice(-6);
    const newDocEmail = `dr.onboard${uniqueNum}@trigyna.test`;
    const newDocPhone = `98${uniqueNum}01`;

    const onboardDocRes = await request(
      "POST",
      "/api/v1/admin/staff/onboard",
      {
        role: "doctor",
        name: `Dr. Ananya Sharma ${uniqueNum}`,
        email: newDocEmail,
        phone: newDocPhone,
        department: "Clinical",
        designation: "Consultant Homoeopath",
        qualifications: "BHMS, MD (Hom)",
        specialization: ["Homoeopathy", "PCOD/PCOS Management"],
        registrationNumber: `MCI-DELHI-${uniqueNum}`,
        registrationCouncil: "Delhi Homoeopathic Council",
        experienceYears: "7+ Years",
        consultationFee: 700,
        isVerified: false, // Pending verification
      },
      adminToken
    );
    if (onboardDocRes.status !== 201) {
      console.log("ONBOARD ERROR BODY:", JSON.stringify(onboardDocRes.body, null, 2));
    }
    assert(onboardDocRes.status === 201, "Admin successfully onboards a Doctor (201 Created)");
    const onboardedDocData = onboardDocRes.body.data;
    const onboardedDocUserId = onboardedDocData.user._id;
    const onboardedDoctorId = onboardedDocData.doctor._id;

    assert(onboardedDocData.user.status === "invited", "Onboarded doctor status is 'invited'");
    assert(onboardedDocData.doctor.isVerified === false, "Onboarded doctor is initially unverified");
    assert(onboardedDocData.doctor.verificationStatus === "pending", "Doctor verificationStatus is 'pending'");

    // Verify StaffInvitation record was created with hashed token
    const invitationRecord = await StaffInvitation.findOne({ userId: onboardedDocUserId });
    assert(Boolean(invitationRecord), "StaffInvitation record created in MongoDB");
    assert(Boolean(invitationRecord.tokenHash), "Token is stored as a secure hash");
    assert(invitationRecord.invitationStatus === "pending", "Invitation status is 'pending'");

    // Verify StaffOnboarding tracking record
    const onboardingDocRecord = await StaffOnboarding.findOne({ userId: onboardedDocUserId });
    assert(Boolean(onboardingDocRecord), "StaffOnboarding tracking record exists");
    assert(onboardingDocRecord.onboardingStatus === "INVITATION_SENT", "Onboarding status is 'INVITATION_SENT'");
    assert(onboardingDocRecord.emailStatus === "sent", "Email status is 'sent'");
    assert(["sent", "queued", "accepted"].includes(onboardingDocRecord.whatsappStatus), "WhatsApp status is tracked");

    // 2e. Admin onboards a Sales team member
    const newSalesEmail = `sales.onboard${uniqueNum}@trigyna.test`;
    const newSalesPhone = `98${uniqueNum}02`;

    const onboardSalesRes = await request(
      "POST",
      "/api/v1/admin/staff/onboard",
      {
        role: "sales",
        name: `Rahul Verma ${uniqueNum}`,
        email: newSalesEmail,
        phone: newSalesPhone,
        department: "CRM",
        designation: "Senior Sales Executive",
        salesRole: "Senior Sales Executive",
        monthlyTarget: 40,
      },
      adminToken
    );
    assert(onboardSalesRes.status === 201, "Admin successfully onboards Sales staff (201 Created)");
    const onboardedSalesUserId = onboardSalesRes.body.data.user._id;

    // 2f. Duplicate staff onboarding is rejected with 409
    const duplicateOnboardRes = await request(
      "POST",
      "/api/v1/admin/staff/onboard",
      {
        role: "doctor",
        name: "Duplicate Doc",
        email: newDocEmail,
        phone: newDocPhone,
        registrationNumber: "MCI-9999",
      },
      adminToken
    );
    assert(duplicateOnboardRes.status === 409, "Duplicate staff onboarding rejected with 409 Conflict");

    // ==================================================
    // SUITE 3: Doctor Credential Verification Gate Policy
    // ==================================================
    console.log("\n--- Suite 3: Doctor Credential Verification Gate ---");

    // 3a. Clinical appointment with unverified doctor MUST BE BLOCKED
    const blockUnverifiedApptRes = await request(
      "POST",
      "/api/v1/appointments",
      {
        patientId: existingPatient._id,
        doctorId: onboardedDoctorId,
        appointmentDate: "2026-11-22",
        startTime: "14:00",
        endTime: "14:30",
        mode: "Online Video Consultation",
      },
      adminToken
    );
    const errorMsg = blockUnverifiedApptRes.body.error?.message || blockUnverifiedApptRes.body.message || "";
    assert(
      blockUnverifiedApptRes.status === 400 && errorMsg.includes("pending verification"),
      "Booking with unverified doctor is blocked with 400 (credentials pending verification)"
    );

    // 3b. Doctor availability returns 0 slots and verificationPending = true
    const availRes = await request(
      "GET",
      `/api/v1/appointments/availability?doctorId=${onboardedDoctorId}&date=2026-11-22`,
      null,
      adminToken
    );
    assert(availRes.status === 200, "Availability check returns 200");
    assert(availRes.body.data.verificationPending === true, "Availability indicates verificationPending: true");
    assert(availRes.body.data.availableSlotsCount === 0, "Unverified doctor has 0 available slots");

    // 3c. Admin verifies doctor credentials
    const verifyDocRes = await request(
      "PATCH",
      `/api/v1/admin/staff/${onboardedDoctorId}/verify-credentials`,
      {
        registrationNumber: `MCI-DELHI-${uniqueNum}-VERIFIED`,
        registrationCouncil: "Delhi Homoeopathic Medical Council",
        notes: "Verified against council register online portal.",
      },
      adminToken
    );
    assert(verifyDocRes.status === 200, "Admin verified doctor credentials (200 OK)");
    assert(verifyDocRes.body.data.doctor.isVerified === true, "Doctor isVerified is now true");
    assert(verifyDocRes.body.data.doctor.verificationStatus === "verified", "Doctor verificationStatus is 'verified'");

    // 3d. Now clinical appointment CAN be scheduled with the verified doctor
    const verifiedApptRes = await request(
      "POST",
      "/api/v1/appointments",
      {
        patientId: existingPatient._id,
        doctorId: onboardedDoctorId,
        appointmentDate: "2026-11-22",
        startTime: "14:00",
        endTime: "14:30",
        mode: "Online Video Consultation",
      },
      adminToken
    );
    assert(verifiedApptRes.status === 201, "Booking succeeds for verified doctor (201 Created)");
    const createdAppointmentId = verifiedApptRes.body.data.appointment._id;

    // ==================================================
    // SUITE 4: Secure Account Activation Workflow
    // ==================================================
    console.log("\n--- Suite 4: Secure Account Activation & Credentials Setup ---");

    // 4a. Retrieve raw activation URL from onboarding response
    const rawActivationUrl = onboardDocRes.body.data.invitation.activationUrl;
    const urlObj = new URL(rawActivationUrl);
    const rawToken = urlObj.searchParams.get("token");
    assert(Boolean(rawToken), "Valid raw activation token extracted from invitation URL");

    // 4b. Verify token endpoint validates token
    const verifyTokenRes = await request(
      "GET",
      `/api/v1/auth/verify-activation-token?token=${rawToken}`
    );
    assert(verifyTokenRes.status === 200, "verify-activation-token returned 200 for valid token");
    assert(verifyTokenRes.body.data.valid === true, "Token validity is confirmed true");

    // 4c. Invited user cannot log in before activation
    const prematureLoginRes = await request("POST", "/api/v1/auth/login", {
      identifier: newDocEmail,
      password: "AnyPassword123!",
    });
    assert(prematureLoginRes.status === 401, "Premature login blocked with 401 Unauthorized");

    // 4d. Consuming activation token to set password
    const activateRes = await request("POST", "/api/v1/auth/activate-account", {
      token: rawToken,
      password: "SecureDoctorPassword@2026",
      confirmPassword: "SecureDoctorPassword@2026",
    });
    assert(activateRes.status === 200, "activate-account returned 200 OK");

    // 4e. Reusing the token must fail
    const reuseTokenRes = await request("POST", "/api/v1/auth/activate-account", {
      token: rawToken,
      password: "AnotherPassword123!",
      confirmPassword: "AnotherPassword123!",
    });
    assert(reuseTokenRes.status === 400, "Reusing consumed activation token fails with 400");

    // 4f. Activated user can now log in
    const activeDocLoginRes = await request("POST", "/api/v1/auth/login", {
      identifier: newDocEmail,
      password: "SecureDoctorPassword@2026",
    });
    assert(activeDocLoginRes.status === 200, "Newly activated doctor logs in successfully (200 OK)");
    const newDocAuthToken = activeDocLoginRes.body.data.token;
    assert(activeDocLoginRes.body.data.user.role === "doctor", "Doctor role returned in login payload");

    // 4g. Meeting Link workflow: Doctor adds Google Meet link to the scheduled appointment
    const meetLinkRes = await request(
      "PUT",
      `/api/v1/appointments/${createdAppointmentId}/meeting-link`,
      {
        provider: "google_meet",
        meetingLink: "https://meet.google.com/abc-defg-hij",
      },
      newDocAuthToken
    );
    assert(meetLinkRes.status === 200, "Doctor adds valid Google Meet link (200 OK)");
    assert(meetLinkRes.body.data.meetingStatus === "ready", "Meeting status becomes 'ready'");

    // 4h. Invalid meeting provider domain is rejected
    const invalidMeetRes = await request(
      "PUT",
      `/api/v1/appointments/${createdAppointmentId}/meeting-link`,
      {
        provider: "google_meet",
        meetingLink: "https://random-sketchy-site.com/meet",
      },
      newDocAuthToken
    );
    assert(invalidMeetRes.status === 400, "Invalid meeting domain is rejected with 400");

    // ==================================================
    // SUITE 5: Legacy Offline Records Preservation
    // ==================================================
    console.log("\n--- Suite 5: Legacy Historical Data Safety ---");

    const legacyAppts = await Appointment.find({ isLegacy: true });
    assert(legacyAppts.length === 53, `All 53 legacy offline appointments preserved (found: ${legacyAppts.length})`);

    const sampleLegacy = legacyAppts[0];
    assert(sampleLegacy.legacyPreserved === true, "Legacy appointment has legacyPreserved: true");
    assert(
      sampleLegacy.mode === "In-Clinic Consultation",
      `Historical mode preserved as 'In-Clinic Consultation'`
    );

    console.log("\n==================================================");
    console.log(`MASTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log("[TestServer] Ephemeral server closed cleanly.");
    }
    await mongoose.disconnect();
    console.log("[Database] MongoDB connection closed.");
  }

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runMasterSuite().catch((err) => {
    console.error("Test Suite Unhandled Exception:", err);
    process.exit(1);
  });
}

module.exports = { runMasterSuite };
