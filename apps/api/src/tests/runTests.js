process.env.NODE_ENV = "test";
const http = require("http");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const Lead = require("../modules/crm/lead.model");
const bootstrapOwner = require("../scripts/bootstrapOwner");

let server;
let baseUrl;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
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

async function runTests() {
  console.log("==================================================");
  console.log("TriGyna Healthcare Platform — End-to-End Test Suite");
  console.log("==================================================");

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

  try {
    await connectDB();
    await bootstrapOwner();

    // Clean up test data from any previous test runs to ensure test idempotency
    await User.deleteMany({ phone: { $in: ["+919123456780", "+919876543210"] } });
    await Doctor.deleteMany({ qualifications: "BHMS, MD (Consultant Homoeopath)" });
    await Patient.deleteMany({ phone: "+919876543210" });
    await Lead.deleteMany({ phone: "+919876543210" });
    await Appointment.deleteMany({ serviceName: "Homoeopathy" });
    await Consultation.deleteMany({ diagnosis: { $regex: /Allergic Rhinitis/i } });
    await Prescription.deleteMany({ dietaryAdvice: "Avoid iced beverages during morning hours." });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[TestRunner] Ephemeral test server running at ${baseUrl}`);

    // Test 1: Health Endpoint
    console.log("\n--- Suite 1: Health & System Diagnostics ---");
    const healthRes = await makeRequest("GET", "/health");
    assert(healthRes.status === 200 && healthRes.body.data.status === "UP", "Health endpoint returns 200 and status UP");
    assert(healthRes.body.data.database === "connected", "Database connection reports connected");

    // Test 2: Authentication
    console.log("\n--- Suite 2: Authentication & RBAC ---");
    const badLoginRes = await makeRequest("POST", "/api/v1/auth/login", {
      identifier: "trigyna.health@gmail.com",
      password: "WrongPassword!999",
    });
    assert(badLoginRes.status === 401, "Bad password rejected with 401 Unauthorized");

    const goodLoginRes = await makeRequest("POST", "/api/v1/auth/login", {
      identifier: "trigyna.health@gmail.com",
      password: "TriGyna@2326",
    });
    assert(goodLoginRes.status === 200 && goodLoginRes.body.data.token, "Owner login succeeded with JWT token");
    const ownerToken = goodLoginRes.body.data.token;

    const meRes = await makeRequest("GET", "/api/v1/auth/me", null, ownerToken);
    assert(meRes.status === 200 && meRes.body.data.user.role === "owner", "Current user retrieved with owner role");

    // Test 3: Public Website Enquiry API
    console.log("\n--- Suite 3: Public Website Enquiry & CRM ---");
    const invalidEnquiry = await makeRequest("POST", "/api/v1/public/enquiries", {
      fullName: "",
      phone: "123",
      consent: false,
    });
    assert(invalidEnquiry.status === 400, "Incomplete public enquiry rejected with 400 Validation Error");

    const runSuffix = Date.now().toString().slice(-6);
    const validPhone = `+919876${runSuffix}`;
    const validEnquiry = await makeRequest("POST", "/api/v1/public/enquiries", {
      fullName: "Ananya Test Patient",
      phone: validPhone,
      email: `ananya.test.${runSuffix}@example.com`,
      serviceInterest: "Homoeopathy",
      consultationMode: "Online Video Consultation",
      message: "Inquiring about chronic allergy wellness consultations.",
      consent: true,
    });
    assert(validEnquiry.status === 201 && validEnquiry.body.data.leadId, "Valid enquiry saved in MongoDB with leadId");
    const leadId = validEnquiry.body.data.leadId;

    // Test 4: CRM Lead Operations
    const leadsList = await makeRequest("GET", "/api/v1/crm/leads", null, ownerToken);
    assert(leadsList.status === 200 && leadsList.body.data.leads.length > 0, "CRM leads list retrieved by authorized staff");

    const addNoteRes = await makeRequest(
      "POST",
      `/api/v1/crm/leads/${leadId}/notes`,
      { body: "Called patient via phone; patient confirmed interest for Saturday." },
      ownerToken
    );
    assert(addNoteRes.status === 200, "Staff successfully appended activity note to lead");

    const updateLeadRes = await makeRequest(
      "PATCH",
      `/api/v1/crm/leads/${leadId}`,
      { status: "qualified" },
      ownerToken
    );
    assert(updateLeadRes.status === 200 && updateLeadRes.body.data.lead.status === "qualified", "Lead transitioned to 'qualified'");

    // Test 5: Healthcare Operations (Doctor & Patient Registration)
    console.log("\n--- Suite 4: Healthcare Operations (Doctors, Patients, Appointments) ---");
    // Create Doctor User & Profile
    const docUserRes = await makeRequest(
      "POST",
      "/api/v1/users",
      {
        name: "Dr. Sunita Sharma",
        phone: `+919123${runSuffix}`,
        email: `dr.sunita.${runSuffix}@trigyna.com`,
        password: "DoctorPassword@2026",
        role: "doctor",
      },
      ownerToken
    );
    assert(docUserRes.status === 201, "Doctor staff user created successfully");
    const doctorUserId = docUserRes.body.data.user.id;

    const docProfileRes = await makeRequest(
      "POST",
      "/api/v1/doctors",
      {
        userId: doctorUserId,
        specialization: ["Homoeopathy", "Women's Wellness"],
        qualifications: "BHMS, MD (Consultant Homoeopath)",
        consultationFee: 700,
      },
      ownerToken
    );
    assert(docProfileRes.status === 201 && docProfileRes.body.data.doctor._id, "Doctor professional profile registered");
    const doctorId = docProfileRes.body.data.doctor._id;

    // Register Patient
    const patientRes = await makeRequest(
      "POST",
      "/api/v1/patients",
      {
        fullName: "Ananya Test Patient",
        phone: validPhone,
        gender: "female",
        age: 28,
        medicalHistory: "Seasonal allergic rhinitis",
        allergies: ["Dust"],
      },
      ownerToken
    );
    assert(patientRes.status === 201 && patientRes.body.data.patient.patientCode, "Patient chart registered with unique code");
    const patientId = patientRes.body.data.patient._id;

    // Duplicate Phone Check
    const dupPatientRes = await makeRequest(
      "POST",
      "/api/v1/patients",
      {
        fullName: "Duplicate Ananya",
        phone: validPhone,
      },
      ownerToken
    );
    assert(dupPatientRes.status === 409, "Duplicate patient registration caught with 409 Conflict");

    // Test 6: Scheduling & Concurrency Collision Check
    const apptDate = "2026-10-25";
    const apptTime = "11:00";
    const apptRes1 = await makeRequest(
      "POST",
      "/api/v1/appointments",
      {
        patientId,
        doctorId,
        serviceName: "Homoeopathy",
        appointmentDate: apptDate,
        startTime: apptTime,
        mode: "Online Video Consultation",
      },
      ownerToken
    );
    assert(apptRes1.status === 201 && apptRes1.body.data.appointment.appointmentCode, "Appointment booked with code");
    const appointmentId = apptRes1.body.data.appointment._id;

    // Attempt double booking on same doctor and slot
    const apptResConflict = await makeRequest(
      "POST",
      "/api/v1/appointments",
      {
        patientId,
        doctorId,
        serviceName: "Homoeopathy",
        appointmentDate: apptDate,
        startTime: apptTime,
      },
      ownerToken
    );
    assert(apptResConflict.status === 409, "Concurrent double-booking rejected with 409 Conflict");

    // Test 7: Clinical Encounter & Finalization
    console.log("\n--- Suite 5: Clinical Encounters & Prescriptions ---");
    const saveConsultation = await makeRequest(
      "POST",
      "/api/v1/clinical/consultations",
      {
        appointmentId,
        chiefComplaints: "Recurrent sneezing, nasal congestion in mornings for 6 months.",
        examinationNotes: "Mild nasal mucosa inflammation.",
        diagnosis: "Allergic Rhinitis",
        treatmentPlan: "Constitutional Homoeopathy protocol",
        followUpAdvice: "Review after 3 weeks",
      },
      ownerToken
    );
    assert(saveConsultation.status === 200, "Doctor saved consultation draft");
    const consultationId = saveConsultation.body.data.consultation._id;

    const savePrescription = await makeRequest(
      "POST",
      "/api/v1/clinical/prescriptions",
      {
        consultationId,
        medications: [
          {
            name: "Allium Cepa",
            dosage: "30C",
            frequency: "Twice daily",
            duration: "14 days",
            instructions: "Take 4 pills dry on tongue",
          },
        ],
        dietaryAdvice: "Avoid iced beverages during morning hours.",
      },
      ownerToken
    );
    assert(savePrescription.status === 200, "Doctor attached prescription medications");

    const finalizeRes = await makeRequest(
      "POST",
      `/api/v1/clinical/consultations/${consultationId}/finalize`,
      {},
      ownerToken
    );
    assert(finalizeRes.status === 200 && finalizeRes.body.data.consultation.isFinalized, "Consultation finalized and locked");

    // Verify locked consultation rejects raw edit
    const lockedEditRes = await makeRequest(
      "POST",
      "/api/v1/clinical/consultations",
      {
        appointmentId,
        diagnosis: "Overwritten diagnosis attempt",
      },
      ownerToken
    );
    assert(lockedEditRes.status === 409, "Direct edits to finalized consultation blocked with 409 Conflict");

    // Verify authorized amendment
    const amendRes = await makeRequest(
      "POST",
      `/api/v1/clinical/consultations/${consultationId}/amendments`,
      {
        reason: "Patient reported family history of asthma during telephone follow-up.",
        newDiagnosis: "Allergic Rhinitis with Atopic diathesis",
      },
      ownerToken
    );
    assert(amendRes.status === 200 && amendRes.body.data.consultation.amendments.length === 1, "Amendment appended with full audit history");

    // Test 8: Reports Summary
    console.log("\n--- Suite 6: Database-Derived Reports ---");
    const reportsRes = await makeRequest("GET", "/api/v1/reports/summary", null, ownerToken);
    assert(
      reportsRes.status === 200 &&
      reportsRes.body.data.metrics.crm.totalLeads >= 1 &&
      reportsRes.body.data.metrics.clinical.totalPatients >= 1,
      "Reports summary reflects real database records"
    );

    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("[TestRunner] Unexpected failure during test execution:", error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
