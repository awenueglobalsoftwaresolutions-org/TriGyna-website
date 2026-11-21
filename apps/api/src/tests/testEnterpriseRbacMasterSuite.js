const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const app = require("../app");
const env = require("../config/env");

const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const Lead = require("../modules/crm/lead.model");
const Invoice = require("../modules/billing/invoice.model");
const AuditLog = require("../modules/audit/audit.model");

const TEST_DB_URI = process.env.TEST_DB_URI || "mongodb://127.0.0.1:27017/trigyna_test";

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

function generateToken(user, customAuthVersion = null) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      authVersion: customAuthVersion !== null ? customAuthVersion : (user.authVersion || 1),
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function runEnterpriseRbacMasterSuite() {
  console.log("================================================================================");
  console.log("   TriGyna Enterprise RBAC, ABAC & Resource-Level Authorization Master Suite   ");
  console.log("================================================================================");
  console.log("Test Database:", TEST_DB_URI);

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

  // 1. Connect to isolated database
  await mongoose.connect(TEST_DB_URI);
  console.log("Connected to isolated test database:", mongoose.connection.name);

  // 2. Clean test collections
  await Promise.all([
    User.deleteMany({}),
    Doctor.deleteMany({}),
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    Consultation.deleteMany({}),
    Prescription.deleteMany({}),
    Lead.deleteMany({}),
    Invoice.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // 3. Ephemeral Server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral test server running at ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------
    // Provision Fixtures: Roles, Doctors, Sales, Patients
    // -------------------------------------------------------------
    // Owner
    const userOwner = await User.create({
      name: "Owner Sushil",
      email: "owner@trigyna.test",
      phone: "+919999000001",
      passwordHash: await User.hashPassword("TriGyna@123"),
      role: "owner",
      status: "active",
      authVersion: 1,
    });

    // Admin
    const userAdmin = await User.create({
      name: "Admin Officer",
      email: "admin@trigyna.test",
      phone: "+919999000002",
      passwordHash: await User.hashPassword("TriGyna@123"),
      role: "admin",
      status: "active",
      authVersion: 1,
    });

    // Doctor A
    const userDocA = await User.create({
      name: "Dr. Alice Gynecologist",
      email: "alice@trigyna.test",
      phone: "+919999000003",
      passwordHash: await User.hashPassword("TriGyna@123"),
      role: "doctor",
      status: "active",
      authVersion: 1,
    });
    const doctorA = await Doctor.create({
      userId: userDocA._id,
      specialization: ["Gynecology"],
      status: "active",
    });

    // Doctor B
    const userDocB = await User.create({
      name: "Dr. Bob Reproductive",
      email: "bob@trigyna.test",
      phone: "+919999000004",
      passwordHash: await User.hashPassword("TriGyna@123"),
      role: "doctor",
      status: "active",
      authVersion: 1,
    });
    const doctorB = await Doctor.create({
      userId: userDocB._id,
      specialization: ["Reproductive Medicine"],
      status: "active",
    });

    // Sales Rep 1
    const userSales1 = await User.create({
      name: "Sam Sales1",
      email: "sales1@trigyna.test",
      phone: "+919999000005",
      passwordHash: await User.hashPassword("TriGyna@123"),
      role: "sales",
      status: "active",
      authVersion: 1,
    });

    // Sales Rep 2
    const userSales2 = await User.create({
      name: "Sally Sales2",
      email: "sales2@trigyna.test",
      phone: "+919999000006",
      passwordHash: await User.hashPassword("TriGyna@123"),
      role: "sales",
      status: "active",
      authVersion: 1,
    });

    // Patient 1
    const userPatient1 = await User.create({
      name: "Pooja Patient1",
      email: "patient1@trigyna.test",
      phone: "+919999000007",
      passwordHash: await User.hashPassword("TriGyna@123"),
      role: "patient",
      status: "active",
      authVersion: 1,
    });
    const patient1 = await Patient.create({
      patientCode: "TG-P-8001",
      fullName: "Pooja Patient1",
      phone: "+919999000007",
      email: "patient1@trigyna.test",
      userId: userPatient1._id,
      assignedDoctorId: doctorA._id,
      status: "active",
    });

    // Patient 2
    const userPatient2 = await User.create({
      name: "Preeti Patient2",
      email: "patient2@trigyna.test",
      phone: "+919999000008",
      passwordHash: await User.hashPassword("TriGyna@123"),
      role: "patient",
      status: "active",
      authVersion: 1,
    });
    const patient2 = await Patient.create({
      patientCode: "TG-P-8002",
      fullName: "Preeti Patient2",
      phone: "+919999000008",
      email: "patient2@trigyna.test",
      userId: userPatient2._id,
      assignedDoctorId: doctorB._id,
      status: "active",
    });

    // Clinical Records for Patient 1 with Doctor A
    const appt1 = await Appointment.create({
      appointmentCode: "TG-A-8001",
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
      diagnosis: "Polycystic Ovary Syndrome (PCOS)",
      chiefComplaints: "Irregular cycles",
      isFinalized: true,
      status: "finalized",
    });

    const draftConsult = await Consultation.create({
      appointmentId: appt1._id,
      patientId: patient1._id,
      doctorId: doctorA._id,
      diagnosis: "Confidential Draft Investigation",
      isFinalized: false,
      status: "draft",
    });

    const rx1 = await Prescription.create({
      prescriptionCode: "TG-RX-8001",
      consultationId: consult1._id,
      patientId: patient1._id,
      doctorId: doctorA._id,
      appointmentId: appt1._id,
      medications: [{ name: "Inositol 2000mg", dosage: "1 satchet", frequency: "1-0-0", duration: "30 days" }],
      isReleasedToPatient: true,
      status: "finalized",
    });

    // Leads for Sales Reps
    const lead1 = await Lead.create({
      fullName: "Lead One",
      phone: "+919888800001",
      serviceInterest: "PCOS Program",
      assignedTo: userSales1._id,
      status: "new",
    });

    const lead2 = await Lead.create({
      fullName: "Lead Two",
      phone: "+919888800002",
      serviceInterest: "Fertility Consultation",
      assignedTo: userSales2._id,
      status: "new",
    });

    // Invoices
    const invoice1 = await Invoice.create({
      invoiceNumber: "INV-2026-8001",
      patientId: patient1._id,
      doctorId: doctorA._id,
      totalAmount: 1500,
      paidAmount: 1500,
      balanceAmount: 0,
      status: "paid",
    });

    const invoice2 = await Invoice.create({
      invoiceNumber: "INV-2026-8002",
      patientId: patient2._id,
      doctorId: doctorB._id,
      totalAmount: 2000,
      paidAmount: 2000,
      balanceAmount: 0,
      status: "paid",
    });

    // Tokens
    const tokenOwner = generateToken(userOwner);
    const tokenAdmin = generateToken(userAdmin);
    const tokenDocA = generateToken(userDocA);
    const tokenDocB = generateToken(userDocB);
    const tokenSales1 = generateToken(userSales1);
    const tokenSales2 = generateToken(userSales2);
    const tokenPatient1 = generateToken(userPatient1);
    const tokenPatient2 = generateToken(userPatient2);

    console.log("--------------------------------------------------------------------------------");
    console.log("Suite 1: Cross-Doctor IDOR & Resource Scoping (Doctor Isolation)");
    console.log("--------------------------------------------------------------------------------");

    // 1.1 Doctor A accesses Patient 1 history
    const resDocAHistory = await makeRequest(baseUrl, "GET", `/api/v1/doctor/patients/${patient1._id}/history`, null, tokenDocA);
    assert(resDocAHistory.status === 200, "Assigned Doctor A can access Patient 1 history (200 OK)");

    // 1.2 Doctor B accesses Patient 1 history
    const resDocBHistory = await makeRequest(baseUrl, "GET", `/api/v1/doctor/patients/${patient1._id}/history`, null, tokenDocB);
    assert(resDocBHistory.status === 403, "Doctor B (unassigned) blocked from Patient 1 history (403 Forbidden)");

    // 1.3 Doctor B queries Patient 1 prescriptions
    const resDocBRx = await makeRequest(baseUrl, "GET", `/api/v1/clinical/prescriptions/patient/${patient1._id}`, null, tokenDocB);
    assert(resDocBRx.status === 403, "Doctor B blocked from Patient 1 prescriptions (403 Forbidden)");

    // 1.4 Doctor A queries Patient 1 prescriptions
    const resDocARx = await makeRequest(baseUrl, "GET", `/api/v1/clinical/prescriptions/patient/${patient1._id}`, null, tokenDocA);
    assert(resDocARx.status === 200, "Doctor A can retrieve assigned Patient 1 prescriptions (200 OK)");

    console.log("\n--------------------------------------------------------------------------------");
    console.log("Suite 2: Sales Team Scoping, Lead Isolation & Clinical Boundary Defense");
    console.log("--------------------------------------------------------------------------------");

    // 2.1 Sales Rep 1 accesses own assigned Lead 1
    const resSales1Lead1 = await makeRequest(baseUrl, "GET", `/api/v1/crm/leads/${lead1._id}`, null, tokenSales1);
    assert(resSales1Lead1.status === 200, "Sales Rep 1 can view assigned Lead 1 (200 OK)");

    // 2.2 Sales Rep 1 accesses Sales Rep 2's Lead 2 (IDOR Prevention)
    const resSales1Lead2 = await makeRequest(baseUrl, "GET", `/api/v1/crm/leads/${lead2._id}`, null, tokenSales1);
    assert(resSales1Lead2.status === 403, "IDOR Blocked: Sales Rep 1 cannot access Sales Rep 2's lead (403 Forbidden)");

    // 2.3 Sales Rep 1 attempts to update Sales Rep 2's lead
    const resSales1UpdateLead2 = await makeRequest(baseUrl, "PATCH", `/api/v1/crm/leads/${lead2._id}`, { status: "lost" }, tokenSales1);
    assert(resSales1UpdateLead2.status === 403, "IDOR Blocked: Sales Rep 1 cannot update Sales Rep 2's lead (403 Forbidden)");

    // 2.4 Sales Rep attempts to access Clinical Consultation notes (Healthcare Confidentiality)
    const resSalesClinical = await makeRequest(baseUrl, "GET", `/api/v1/clinical/consultations/${consult1._id}`, null, tokenSales1);
    assert(resSalesClinical.status === 403, "Sales Rep strictly forbidden from reading clinical consultation notes (403 Forbidden)");

    // 2.5 Sales Rep attempts to query prescriptions
    const resSalesRx = await makeRequest(baseUrl, "GET", `/api/v1/clinical/prescriptions`, null, tokenSales1);
    assert(resSalesRx.status === 403, "Sales Rep strictly forbidden from accessing prescriptions catalogue (403 Forbidden)");

    // 2.6 Sales Rep attempts to access admin refunds approval
    const resSalesRefund = await makeRequest(baseUrl, "POST", `/api/v1/admin/refunds/${invoice1._id}/approve`, {}, tokenSales1);
    assert(resSalesRefund.status === 403, "Sales Rep forbidden from administrative refund approvals (403 Forbidden)");

    console.log("\n--------------------------------------------------------------------------------");
    console.log("Suite 3: Patient Privacy, Cross-Patient Isolation & Draft Confidentiality");
    console.log("--------------------------------------------------------------------------------");

    // 3.1 Patient 1 accesses own profile
    const resPat1Self = await makeRequest(baseUrl, "GET", `/api/v1/patients/${patient1._id}`, null, tokenPatient1);
    assert(resPat1Self.status === 200, "Patient 1 can access own profile (200 OK)");

    // 3.2 Patient 1 accesses Patient 2 profile (Cross-Patient IDOR)
    const resPat1Other = await makeRequest(baseUrl, "GET", `/api/v1/patients/${patient2._id}`, null, tokenPatient1);
    assert(resPat1Other.status === 403, "Patient 1 blocked from Patient 2 profile (403 Forbidden)");

    // 3.3 Patient 1 accesses own invoice
    const resPat1Inv = await makeRequest(baseUrl, "GET", `/api/v1/invoices/${invoice1._id}`, null, tokenPatient1);
    assert(resPat1Inv.status === 200, "Patient 1 can view own invoice (200 OK)");

    // 3.4 Patient 1 accesses Patient 2 invoice
    const resPat1OtherInv = await makeRequest(baseUrl, "GET", `/api/v1/invoices/${invoice2._id}`, null, tokenPatient1);
    assert(resPat1OtherInv.status === 403, "Patient 1 blocked from Patient 2 invoice (403 Forbidden)");

    // 3.5 Patient 1 attempts to view unfinalized draft consultation
    const resPatDraft = await makeRequest(baseUrl, "GET", `/api/v1/clinical/consultations/${draftConsult._id}`, null, tokenPatient1);
    assert(resPatDraft.status === 403, "Patient cannot view unfinalized clinical draft notes (403 Forbidden)");

    // 3.6 Patient 1 views finalized consultation
    const resPatFinalized = await makeRequest(baseUrl, "GET", `/api/v1/clinical/consultations/${consult1._id}`, null, tokenPatient1);
    assert(resPatFinalized.status === 200, "Patient can view finalized signed consultation (200 OK)");

    console.log("\n--------------------------------------------------------------------------------");
    console.log("Suite 4: Account Suspension & Instant Token Invalidation via authVersion");
    console.log("--------------------------------------------------------------------------------");

    // 4.1 Verify userSales1 token works
    const check1 = await makeRequest(baseUrl, "GET", `/api/v1/auth/me`, null, tokenSales1);
    assert(check1.status === 200, "Active Sales Rep 1 session is valid (200 OK)");

    // 4.2 Admin suspends userSales1
    const suspendRes = await makeRequest(
      baseUrl,
      "PATCH",
      `/api/v1/users/${userSales1._id}/status`,
      { status: "suspended", reason: "Security violation investigation" },
      tokenAdmin
    );
    assert(suspendRes.status === 200, "Admin suspends Sales Rep 1 (200 OK)");

    // 4.3 Sales Rep 1 tries to access /auth/me with existing token -> MUST BE REJECTED WITH 403 FORBIDDEN
    const blockedRes = await makeRequest(baseUrl, "GET", `/api/v1/auth/me`, null, tokenSales1);
    assert(blockedRes.status === 403, "Suspended user token is immediately blocked (403 Forbidden)");

    // 4.4 Reactivate account, but bump authVersion via session revocation
    await User.findByIdAndUpdate(userSales1._id, { status: "active", authVersion: 2 });
    const reactivatedUser = await User.findById(userSales1._id);

    // Old token has authVersion: 1, User record has authVersion: 2 -> MUST BE REJECTED WITH 401 UNAUTHORIZED
    const revokedRes = await makeRequest(baseUrl, "GET", `/api/v1/auth/me`, null, tokenSales1);
    assert(revokedRes.status === 401, "Token with outdated authVersion is rejected (401 Unauthorized)");

    // Login to obtain fresh token with authVersion: 2 -> MUST SUCCEED
    const loginRes = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
      identifier: "sales1@trigyna.test",
      password: "TriGyna@123",
    });
    assert(loginRes.status === 200, "User can log in to obtain fresh token (200 OK)");
    const freshSalesToken = loginRes.body?.data?.token;

    const freshCheck = await makeRequest(baseUrl, "GET", `/api/v1/auth/me`, null, freshSalesToken);
    assert(freshCheck.status === 200, "Fresh session token with updated authVersion succeeds (200 OK)");

    console.log("\n--------------------------------------------------------------------------------");
    console.log("Suite 5: Privilege Escalation Prevention & Granular Permissions (ABAC)");
    console.log("--------------------------------------------------------------------------------");

    // 5.1 Admin tries to demote Owner account -> MUST FAIL
    const demoteOwnerRes = await makeRequest(
      baseUrl,
      "PATCH",
      `/api/v1/users/${userOwner._id}`,
      { role: "admin" },
      tokenAdmin
    );
    assert(demoteOwnerRes.status === 403, "Non-owner Admin cannot demote an Owner (403 Forbidden)");

    // 5.2 Patient tries to access Admin user management -> MUST FAIL
    const patAdminRes = await makeRequest(baseUrl, "GET", `/api/v1/users`, null, tokenPatient1);
    assert(patAdminRes.status === 403, "Patient cannot access /users management endpoint (403 Forbidden)");

    // 5.3 Granular Permission Override: Grant `leads.view_all` to Sales Rep 1
    const permGrantRes = await makeRequest(
      baseUrl,
      "PATCH",
      `/api/v1/users/${userSales1._id}/permissions`,
      { customPermissions: ["leads.view_all"], deniedPermissions: [] },
      tokenAdmin
    );
    assert(permGrantRes.status === 200, "Admin grants custom permission 'leads.view_all' to Sales Rep 1");

    // Log in to get new token reflecting permission
    const sales1PermLogin = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
      identifier: "sales1@trigyna.test",
      password: "TriGyna@123",
    });
    const tokenSales1Elevated = sales1PermLogin.body?.data?.token;

    // Sales Rep 1 can now view Lead 2 (previously blocked)
    const resSales1Lead2Granted = await makeRequest(baseUrl, "GET", `/api/v1/crm/leads/${lead2._id}`, null, tokenSales1Elevated);
    assert(resSales1Lead2Granted.status === 200, "Sales Rep 1 with 'leads.view_all' can now view Lead 2 (200 OK)");

    // 5.4 Granular Permission Denial: Deny `leads.view_all`
    await makeRequest(
      baseUrl,
      "PATCH",
      `/api/v1/users/${userSales1._id}/permissions`,
      { customPermissions: [], deniedPermissions: ["leads.view_all"] },
      tokenAdmin
    );
    const sales1DenyLogin = await makeRequest(baseUrl, "POST", "/api/v1/auth/login", {
      identifier: "sales1@trigyna.test",
      password: "TriGyna@123",
    });
    const tokenSales1Denied = sales1DenyLogin.body?.data?.token;

    const resSales1Lead2Denied = await makeRequest(baseUrl, "GET", `/api/v1/crm/leads/${lead2._id}`, null, tokenSales1Denied);
    assert(resSales1Lead2Denied.status === 403, "Explicit denial re-blocks Sales Rep 1 from Lead 2 (403 Forbidden)");

    console.log("\n--------------------------------------------------------------------------------");
    console.log("Suite 6: Enterprise Audit Trail Verification");
    console.log("--------------------------------------------------------------------------------");

    // 6.1 Check Audit Log for Suspended User
    const suspendAudit = await AuditLog.findOne({ action: "USER_SUSPENDED", targetId: userSales1._id.toString() });
    assert(!!suspendAudit, "Audit record exists for USER_SUSPENDED");

    // 6.2 Check Audit Log for Permissions Update
    const permsAudit = await AuditLog.findOne({ action: "USER_PERMISSIONS_UPDATED", targetId: userSales1._id.toString() });
    assert(!!permsAudit, "Audit record exists for USER_PERMISSIONS_UPDATED");

    // 6.3 Query Permissions Catalog Endpoint
    const catalogRes = await makeRequest(baseUrl, "GET", "/api/v1/users/permissions/catalog", null, tokenAdmin);
    assert(
      catalogRes.status === 200 && catalogRes.body?.data?.permissions?.USERS_VIEW === "users.view",
      "Permissions catalogue endpoint returns full granular schema (200 OK)"
    );

  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log("\nIsolated test server stopped and MongoDB connection closed.");
  }

  console.log("================================================================================");
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runEnterpriseRbacMasterSuite().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}

module.exports = runEnterpriseRbacMasterSuite;
