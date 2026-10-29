process.env.NODE_ENV = "test";
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { connectDB, disconnectDB } = require("../config/database");
const User = require("../modules/users/user.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const Appointment = require("../modules/appointments/appointment.model");
const SlotReservation = require("../modules/appointments/slot-reservation.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const Invoice = require("../modules/billing/invoice.model");
const Lead = require("../modules/crm/lead.model");
const Employee = require("../modules/hrms/employee.model");
const AuditLog = require("../modules/audit/audit.model");

const app = require("../app");

let server;
let API_BASE = "http://127.0.0.1:5000/api/v1";
const NEXT_BASE = "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failed++;
  }
}

function request(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === "https:" ? https : http;
    const reqOptions = {
      method: options.method || "GET",
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    const req = client.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runMasterE2ESuite() {
  console.log("==================================================================");
  console.log("TriGyna Healthcare Management — Master End-to-End Verification");
  console.log("==================================================================");

  await connectDB();
  server = app.listen(0);
  const port = server.address().port;
  API_BASE = `http://127.0.0.1:${port}/api/v1`;
  console.log(`[TestServer] Ephemeral server running at ${API_BASE}`);

  // Tokens cache
  const tokens = {};

  // -------------------------------------------------------------
  // SUITE 1: Authentication & Role Assignment
  // -------------------------------------------------------------
  console.log("\n--- Suite 1: Authentication & Role Assignment ---");

  const accounts = [
    { role: "owner", identifier: "+919172772326", pass: "TriGyna@2326", expectedRole: "owner", dest: "/admin/dashboard" },
    { role: "admin", identifier: "admin@trigyna.test", pass: "TriGyna@123", expectedRole: "admin", dest: "/admin/dashboard" },
    { role: "doctor", identifier: "doctor@trigyna.test", pass: "TriGyna@123", expectedRole: "doctor", dest: "/doctor/dashboard" },
    { role: "reception", identifier: "reception@trigyna.test", pass: "TriGyna@123", expectedRole: "reception", dest: "/reception/dashboard" },
    { role: "patient", identifier: "patient@trigyna.test", pass: "TriGyna@123", expectedRole: "patient", dest: "/patient/dashboard" },
  ];

  for (const acc of accounts) {
    const res = await request(`${API_BASE}/auth/login`, { method: "POST" }, {
      identifier: acc.identifier,
      password: acc.pass,
    });
    assert(res.status === 200, `Login for ${acc.role} (${acc.identifier}) returned 200 OK`);
    assert(res.body?.success === true, `Response success=true for ${acc.role}`);
    const token = res.body?.data?.token || res.body?.data?.tokens?.accessToken;
    assert(Boolean(token), `JWT access token received for ${acc.role}`);
    assert(res.body?.data?.user?.role === acc.expectedRole, `User role is '${acc.expectedRole}'`);
    assert(!res.body?.data?.user?.passwordHash, `Password hash is NOT exposed in response for ${acc.role}`);
    tokens[acc.role] = token;
    tokens[`${acc.role}_refresh`] = res.body?.data?.refreshToken || res.body?.data?.tokens?.refreshToken;
  }

  // Invalid password check
  const badPassRes = await request(`${API_BASE}/auth/login`, { method: "POST" }, {
    identifier: "admin@trigyna.test",
    password: "WrongPassword999!",
  });
  assert(badPassRes.status === 401, "Invalid password returns 401 Unauthorized");

  // Inactive account check
  await User.updateOne({ email: "admin@trigyna.test" }, { status: "inactive" });
  const inactiveRes = await request(`${API_BASE}/auth/login`, { method: "POST" }, {
    identifier: "admin@trigyna.test",
    password: "TriGyna@123",
  });
  assert(inactiveRes.status === 401 || inactiveRes.status === 403, "Inactive account rejected with 401/403");
  // Restore active status
  await User.updateOne({ email: "admin@trigyna.test" }, { status: "active" });

  // -------------------------------------------------------------
  // SUITE 2: Role-Based Route & API Endpoint Authorization
  // -------------------------------------------------------------
  console.log("\n--- Suite 2: Role-Based Route & API Endpoint Authorization ---");

  // /users -> only owner/admin
  const adminUsers = await request(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assert(adminUsers.status === 200, "Admin can access /users (200)");
  const doctorUsers = await request(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${tokens.doctor}` } });
  assert(doctorUsers.status === 403, "Doctor is forbidden from /users (403)");
  const receptionUsers = await request(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${tokens.reception}` } });
  assert(receptionUsers.status === 403, "Reception is forbidden from /users (403)");
  const patientUsers = await request(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${tokens.patient}` } });
  assert(patientUsers.status === 403, "Patient is forbidden from /users (403)");

  // /crm/leads -> only owner/admin
  const adminLeads = await request(`${API_BASE}/crm/leads`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assert(adminLeads.status === 200, "Admin can access /crm/leads (200)");
  const doctorLeads = await request(`${API_BASE}/crm/leads`, { headers: { Authorization: `Bearer ${tokens.doctor}` } });
  assert(doctorLeads.status === 403, "Doctor is forbidden from /crm/leads (403)");
  const patientLeads = await request(`${API_BASE}/crm/leads`, { headers: { Authorization: `Bearer ${tokens.patient}` } });
  assert(patientLeads.status === 403, "Patient is forbidden from /crm/leads (403)");

  // /hrms/employees -> only owner/admin
  const adminHrms = await request(`${API_BASE}/hrms/employees`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assert(adminHrms.status === 200, "Admin can access /hrms/employees (200)");
  const receptionHrms = await request(`${API_BASE}/hrms/employees`, { headers: { Authorization: `Bearer ${tokens.reception}` } });
  assert(receptionHrms.status === 403, "Reception is forbidden from /hrms/employees (403)");

  // /audit -> only owner/admin
  const adminAudit = await request(`${API_BASE}/audit`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assert(adminAudit.status === 200, "Admin can access /audit logs (200)");
  const patientAudit = await request(`${API_BASE}/audit`, { headers: { Authorization: `Bearer ${tokens.patient}` } });
  assert(patientAudit.status === 403, "Patient is forbidden from /audit logs (403)");

  // -------------------------------------------------------------
  // SUITE 3: End-to-End User Journeys
  // -------------------------------------------------------------
  console.log("\n--- Suite 3: End-to-End User Journeys ---");

  // Journey 1: Reception registers patient -> books slot -> appointment in queue
  console.log("\n  -> Journey 1: Patient Intake & Appointment Booking (Reception)");
  const testPhone = "98" + Math.floor(10000000 + Math.random() * 90000000);
  const regRes = await request(`${API_BASE}/patients`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.reception}` },
  }, {
    fullName: "Pooja Kulkarni",
    phone: testPhone,
    gender: "female",
    age: 27,
    bloodGroup: "B+",
    allergies: ["Sulfa drugs"],
    medicalHistory: "PCOD Remission seeker",
  });
  assert(regRes.status === 201, "Reception successfully registers patient (201 Created)");
  const newPatientId = regRes.body?.data?.patient?._id;
  assert(Boolean(newPatientId), "Patient chart ID returned");

  // Find doctor
  const doc = await Doctor.findOne();
  const testApptDate = "2026-12-25";
  const testApptTime = "14:15";
  await SlotReservation.deleteMany({ doctorId: doc._id, appointmentDate: testApptDate, slotTime: { $in: ["14:15", "14:30"] } });

  const bookRes = await request(`${API_BASE}/appointments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.reception}` },
  }, {
    patientId: newPatientId,
    doctorId: doc._id.toString(),
    serviceName: "Clinical Homoeopathic Consultation",
    appointmentDate: testApptDate,
    startTime: testApptTime,
    mode: "in_person",
  });
  assert(bookRes.status === 201, "Reception books collision-free appointment (201 Created)");
  const apptId = bookRes.body?.data?.appointment?._id;
  assert(Boolean(apptId), "Appointment ID generated");

  // Reception checks in patient
  const checkinRes = await request(`${API_BASE}/appointments/${apptId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokens.reception}` },
  }, { status: "checked_in" });
  assert(checkinRes.status === 200, "Reception marks patient checked_in (200 OK)");

  // Journey 2: Doctor views queue -> clinical consultation draft -> homeopathic remedy -> finalize & lock
  console.log("\n  -> Journey 2: Doctor Consultation & Posology Prescription");
  const consultDraft = await request(`${API_BASE}/clinical/consultations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.doctor}` },
  }, {
    appointmentId: apptId,
    chiefComplaints: "Irregular cycles, cystic acne, severe fatigue during luteal phase",
    examinationNotes: "BP: 118/76 mmHg, BMI: 23.1, Thyroid normal, clear chest",
    diagnosis: "PCOD with hyperandrogenism, constitutional Sepia indication",
    treatmentPlan: "Sepia 200C weekly dose alongside evening primrose and low-GI nutrition",
    followUpAdvice: "Review in 4 weeks with symptom diary",
  });
  assert(consultDraft.status === 201 || consultDraft.status === 200, "Doctor saves clinical draft (200/201)");
  const consultId = consultDraft.body?.data?.consultation?._id;
  assert(Boolean(consultId), "Consultation draft ID generated");

  // Prescribe homeopathic remedies
  const rxRes = await request(`${API_BASE}/clinical/prescriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.doctor}` },
  }, {
    consultationId: consultId,
    medications: [
      {
        name: "Sepia Officinalis",
        dosage: "4 pills",
        frequency: "Once a week on Sunday morning",
        duration: "1 month",
        instructions: "Take on clean empty tongue. No coffee 30 mins before/after.",
      },
      {
        name: "Pulsatilla Nigricans",
        dosage: "4 pills",
        frequency: "Twice daily",
        duration: "14 days",
        instructions: "Dissolve dry on tongue.",
      },
    ],
    dietaryAdvice: "Avoid raw onions, strong garlic, and camphorated balms for maximum remedy action.",
  });
  assert(rxRes.status === 201 || rxRes.status === 200, "Doctor writes homeopathic prescription (200/201)");

  // Finalize consultation
  const finalizeRes = await request(`${API_BASE}/clinical/consultations/${consultId}/finalize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.doctor}` },
  });
  assert(finalizeRes.status === 200, "Doctor finalizes and locks clinical record (200 OK)");
  assert(finalizeRes.body?.data?.consultation?.isFinalized === true, "Consultation is marked isFinalized=true");

  // Verify record is locked against direct edit
  const directEdit = await request(`${API_BASE}/clinical/consultations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.doctor}` },
  }, {
    appointmentId: apptId,
    chiefComplaints: "Tampered complaints",
  });
  assert(directEdit.status === 409, "Locked consultation rejects direct edits with 409 Conflict");

  // Journey 3: Legal Amendment
  console.log("\n  -> Journey 3: Legal Clinical Amendment Workflow");
  const amendRes = await request(`${API_BASE}/clinical/consultations/${consultId}/amendments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.doctor}` },
  }, {
    reason: "Patient reported family history of hypothyroidism on second inquiry",
    addendumNotes: "Advised TSH, Free T3/T4 evaluation alongside pelvic scan.",
  });
  assert(amendRes.status === 200, "Doctor appends legal amendment (200 OK)");
  assert(amendRes.body?.data?.consultation?.amendments?.length > 0, "Amendment added to permanent audit history");

  // Journey 4: POS Billing & Payment Collection
  console.log("\n  -> Journey 4: Reception POS Billing & Payment Receipt");
  const invoiceRes = await request(`${API_BASE}/billing/invoices`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.reception}` },
  }, {
    patientId: newPatientId,
    appointmentId: apptId,
    items: [
      { description: "Dr. Harshali Sutar Clinical Consultation", quantity: 1, amount: 800 },
      { description: "Homoeopathic Posology Remedy Kit (1 Month)", quantity: 1, amount: 450 },
    ],
    subtotal: 1250,
    tax: 0,
    discount: 0,
    total: 1250,
    status: "paid",
    paymentMethod: "upi",
  });
  assert(invoiceRes.status === 201, "Reception issues POS invoice (201 Created)");
  const invoiceId = invoiceRes.body?.data?.invoice?._id;
  assert(invoiceRes.body?.data?.invoice?.status === "paid", "Invoice recorded as status=paid");

  // Journey 5: Patient Portal Scoped Access
  console.log("\n  -> Journey 5: Patient Portal Scoped Privacy Verification");
  const patientUser = await User.findOne({ email: "patient@trigyna.test" });
  const myPatient = await Patient.findOne({
    $or: [{ email: patientUser.email }, { phone: patientUser.phone }, { userId: patientUser._id }],
  });
  assert(Boolean(myPatient), "Seeded patient profile found in database");

  // Associate appointment & invoice with myPatient
  await Appointment.updateOne({ _id: apptId }, { patientId: myPatient._id });
  await Invoice.updateOne({ _id: invoiceId }, { patientId: myPatient._id });

  const patientAppts = await request(`${API_BASE}/appointments`, {
    headers: { Authorization: `Bearer ${tokens.patient}` },
  });
  assert(patientAppts.status === 200, "Patient retrieves appointments (200 OK)");
  assert(patientAppts.body?.data?.appointments?.length > 0, "Patient sees their scheduled appointment");

  const patientInvoices = await request(`${API_BASE}/billing/invoices`, {
    headers: { Authorization: `Bearer ${tokens.patient}` },
  });
  assert(patientInvoices.status === 200, "Patient retrieves own invoices (200 OK)");
  assert(patientInvoices.body?.data?.invoices?.some((i) => i._id === invoiceId), "Patient sees newly issued invoice");

  // Patient CANNOT see other patients' profiles (403 Forbidden)
  const otherPatient = await Patient.findOne({
    _id: { $ne: myPatient._id },
    email: { $ne: patientUser.email },
    phone: { $ne: patientUser.phone },
  });
  if (otherPatient) {
    const leakCheck = await request(`${API_BASE}/patients/${otherPatient._id}`, {
      headers: { Authorization: `Bearer ${tokens.patient}` },
    });
    assert(leakCheck.status === 403, "Patient cannot access other patient's record (403 Forbidden)");
  }

  // Journey 6: Admin Unified Oversight
  console.log("\n  -> Journey 6: Admin Unified Module Oversight");
  const summaryReport = await request(`${API_BASE}/reports/summary`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  assert(summaryReport.status === 200, "Admin retrieves system KPI summary (200 OK)");
  assert(Boolean(summaryReport.body?.data?.metrics?.appointments), "KPI summary contains appointments data");
  assert(Boolean(summaryReport.body?.data?.metrics?.finance), "KPI summary contains finance data");

  const auditRes = await request(`${API_BASE}/audit`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  assert(auditRes.status === 200, "Admin reads immutable audit logs (200 OK)");
  assert(auditRes.body?.data?.logs?.length > 0, "Audit trail contains recorded system actions");

  // Journey 7: Public Website Non-Regression & Health Check
  console.log("\n  -> Journey 7: Public Website Non-Regression & Live Health Check");
  const healthRes = await request(`${API_BASE}/health`);
  assert(healthRes.status === 200, "/api/v1/health returns 200 OK");
  assert(healthRes.body?.success === true, "Health status indicates healthy backend");

  // -------------------------------------------------------------
  // SUITE 4: Audit for Hardcoded IP/Port in UI files
  // -------------------------------------------------------------
  console.log("\n--- Suite 4: Audit for Hardcoded IP / Port Strings in UI ---");
  const uiDirs = ["src/components/dashboard", "src/app/admin", "src/app/doctor", "src/app/reception", "src/app/patient"];
  let hardcodedFound = false;
  for (const dir of uiDirs) {
    const fullDir = path.join(process.cwd(), dir);
    if (fs.existsSync(fullDir)) {
      const files = fs.readdirSync(fullDir, { recursive: true });
      for (const f of files) {
        if (typeof f === "string" && (f.endsWith(".tsx") || f.endsWith(".ts"))) {
          const content = fs.readFileSync(path.join(fullDir, f), "utf8");
          if (content.includes("127.0.0.1:5000") || content.includes("localhost:5000")) {
            console.error(`  [WARN] Found hardcoded IP in ${f}`);
            hardcodedFound = true;
          }
        }
      }
    }
  }
  assert(!hardcodedFound, "Zero hardcoded 127.0.0.1:5000 / localhost:5000 strings in dashboard UI components");

  console.log("\n==================================================================");
  console.log(`MASTER E2E VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (server) await new Promise((res) => server.close(res));
  await disconnectDB();
  process.exit(failed > 0 ? 1 : 0);
}

runMasterE2ESuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
