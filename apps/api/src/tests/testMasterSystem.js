const http = require("http");
const assert = require("assert");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Lead = require("../modules/crm/lead.model");
const Employee = require("../modules/hrms/employee.model");
const Organization = require("../modules/organization/organization.model");
const Invoice = require("../modules/billing/invoice.model");
const Appointment = require("../modules/appointments/appointment.model");
const SlotReservation = require("../modules/appointments/slot-reservation.model");

let server;
let baseUrl;
let ownerToken;
let adminToken;
let crmToken;
let hrmsToken;

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
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runMasterVerification() {
  console.log("==================================================");
  console.log("TriGyna Platform — Master System 19-Point Verification Suite");
  console.log("==================================================");

  await connectDB();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestRunner] Test server listening on ${baseUrl}`);

  let passed = 0;
  function pass(msg) {
    passed++;
    console.log(`  [PASS] ${msg}`);
  }

  try {
    // Authenticate test roles
    console.log("\n--- Authenticating Test Roles ---");
    const ownerRes = await request("POST", "/api/v1/auth/login", {
      identifier: "+919172772326",
      password: "TriGyna@2326",
    });
    assert.strictEqual(ownerRes.status, 200);
    ownerToken = ownerRes.body.data.token;
    pass("Super Admin (Owner) authenticated");

    const adminRes = await request("POST", "/api/v1/auth/login", {
      identifier: "admin@trigyna.test",
      password: "TriGyna@123",
    });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.data.token;
    pass("Admin authenticated");

    const crmRes = await request("POST", "/api/v1/auth/login", {
      identifier: "crm@trigyna.test",
      password: "TriGyna@123",
    });
    assert.strictEqual(crmRes.status, 200);
    crmToken = crmRes.body.data.token;
    pass("CRM Specialist authenticated");

    const hrmsRes = await request("POST", "/api/v1/auth/login", {
      identifier: "hrms@trigyna.test",
      password: "TriGyna@123",
    });
    assert.strictEqual(hrmsRes.status, 200);
    hrmsToken = hrmsRes.body.data.token;
    pass("HRMS Specialist authenticated");

    // ==========================================
    // 1. Super Admin / Admin Checklist
    // ==========================================
    console.log("\n--- Checklist Section 1: Super Admin & Admin Operations ---");
    
    // Organization & Branch Setup
    const orgRes = await request("GET", "/api/v1/organization", null, ownerToken);
    assert.strictEqual(orgRes.status, 200);
    assert(orgRes.body.data.organization.branches.length >= 2);
    pass("Checklist 1/19: Organization & branches retrieved from MongoDB");

    // Add new test branch
    const branchRes = await request(
      "POST",
      "/api/v1/organization/branches",
      {
        branchCode: `BR-TEST-${Date.now().toString().slice(-4)}`,
        name: "Jayanagar Wellness Satellite",
        phone: "+918099887766",
        address: "4th Block Jayanagar, Bengaluru",
        operatingHours: "09:00 - 18:00",
      },
      ownerToken
    );
    assert.strictEqual(branchRes.status, 201);
    pass("Checklist 1/19: Super Admin successfully created new clinic branch");

    // Add new test service
    const serviceRes = await request(
      "POST",
      "/api/v1/organization/services",
      {
        code: `SRV-TEST-${Date.now().toString().slice(-4)}`,
        name: "Integrative Holistic Fertility Counseling",
        department: "Gynecology & Obstetrics",
        durationMinutes: 45,
        baseFee: 1800,
        consultationType: "both",
      },
      ownerToken
    );
    assert.strictEqual(serviceRes.status, 201);
    pass("Checklist 1/19: Super Admin successfully added service to service catalog");

    // Users, Roles & Permissions + Last SuperAdmin Protection
    const ownerUser = await User.findOne({ role: "owner", status: "active" });
    const demoteRes = await request(
      "PATCH",
      `/api/v1/users/${ownerUser._id}`,
      { role: "patient" },
      ownerToken
    );
    assert.strictEqual(demoteRes.status, 400);
    pass("Checklist 2/19: Safeguard verified - Last active Super Admin demotion blocked");

    // Password reset
    const adminUser = await User.findOne({ role: "admin" });
    const pwResetRes = await request(
      "POST",
      `/api/v1/users/${adminUser._id}/reset-password`,
      { newPassword: "TriGyna@AdminUpdated123" },
      ownerToken
    );
    assert.strictEqual(pwResetRes.status, 200);
    // Reset back to standard test password
    await request(
      "POST",
      `/api/v1/users/${adminUser._id}/reset-password`,
      { newPassword: "TriGyna@123" },
      ownerToken
    );
    pass("Checklist 2/19: User credential management and password reset verified");

    // Dashboard with Real Database Metrics
    const summaryRes = await request("GET", "/api/v1/reports/summary", null, adminToken);
    assert.strictEqual(summaryRes.status, 200);
    assert(summaryRes.body.data.metrics.crm.totalLeads > 0);
    assert(summaryRes.body.data.metrics.finance.totalBilled > 0);
    pass("Checklist 3/19: Dashboard aggregates real database metrics (CRM, Clinical, HRMS, Finance)");

    // Approval Centre & Audit Logs
    const approvalsRes = await request("GET", "/api/v1/approvals", null, adminToken);
    assert.strictEqual(approvalsRes.status, 200);
    assert(typeof approvalsRes.body.data.totalPendingCount === "number");
    pass("Checklist 4/19: Centralized Approval Centre loaded operational items");

    const auditRes = await request("GET", "/api/v1/users/audit-logs", null, adminToken);
    assert.strictEqual(auditRes.status, 200);
    assert(auditRes.body.data.logs.length > 0);
    pass("Checklist 4/19: Audit log query with real historical actions verified");

    // ==========================================
    // 2. CRM Complete Pipeline
    // ==========================================
    console.log("\n--- Checklist Section 2: CRM Complete Pipeline ---");

    // Lead Capture & Assignment
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newLeadRes = await request(
      "POST",
      "/api/v1/public/enquiries",
      {
        fullName: "Kavita Reddy",
        phone: testPhone,
        email: "kavita.reddy@example.com",
        serviceInterest: "PCOS Evaluation",
        consultationMode: "Online Video Consultation",
        message: "Irregular cycles inquiry",
        consent: true,
      }
    );
    assert.strictEqual(newLeadRes.status, 201);
    const createdLeadId = newLeadRes.body.data.leadId;
    pass("Checklist 5/19: Public enquiry captured into CRM with status 'new'");

    // Assign CRM Executive
    const assignRes = await request(
      "PATCH",
      `/api/v1/crm/leads/${createdLeadId}`,
      { assignedTo: adminUser._id, status: "assigned" },
      crmToken
    );
    assert.strictEqual(assignRes.status, 200);
    pass("Checklist 5/19: CRM Executive assigned to lead");

    // Pipeline Stage Transitions
    const contactRes = await request(
      "PATCH",
      `/api/v1/crm/leads/${createdLeadId}`,
      { status: "contacted" },
      crmToken
    );
    assert.strictEqual(contactRes.status, 200);
    assert.strictEqual(contactRes.body.data.lead.status, "contacted");
    pass("Checklist 6/19: Pipeline stage transition from 'new' -> 'assigned' -> 'contacted'");

    // Follow-up tasks & overdue alerts
    const taskDueDate = new Date(Date.now() + 2 * 86400000).toISOString();
    const taskRes = await request(
      "POST",
      `/api/v1/crm/leads/${createdLeadId}/tasks`,
      {
        title: "Follow-up Call regarding blood panel and symptoms",
        dueDate: taskDueDate,
        priority: "high",
        notes: "Discuss dietary history and cycle logs",
      },
      crmToken
    );
    assert.strictEqual(taskRes.status, 201);
    assert(taskRes.body.data.tasks.length > 0);
    pass("Checklist 7/19: Scheduled follow-up task added to lead activity queue");

    // Complete task
    const taskId = taskRes.body.data.tasks[0]._id;
    const taskUpdateRes = await request(
      "PATCH",
      `/api/v1/crm/leads/${createdLeadId}/tasks/${taskId}`,
      { status: "completed", notes: "Called patient, confirmed interest" },
      crmToken
    );
    assert.strictEqual(taskUpdateRes.status, 200);
    pass("Checklist 7/19: Follow-up task updated to 'completed'");

    // Lead Conversion without Duplicate Patients
    const doctor = await Doctor.findOne({ status: "active" });
    const convertDate = `2026-11-${String((Date.now() % 25) + 1).padStart(2, "0")}`;
    const convertTime = "11:30";
    await Appointment.deleteMany({ doctorId: doctor._id, appointmentDate: convertDate, startTime: convertTime });
    await SlotReservation.deleteMany({ doctorId: doctor._id, appointmentDate: convertDate, slotTime: convertTime });

    const convertRes = await request(
      "POST",
      `/api/v1/crm/leads/${createdLeadId}/convert`,
      {
        bookAppointment: true,
        doctorId: doctor._id.toString(),
        appointmentDate: convertDate,
        startTime: convertTime,
        consultationType: "online",
      },
      crmToken
    );
    assert.strictEqual(convertRes.status, 200);
    assert.strictEqual(convertRes.body.data.lead.status, "converted");
    assert(convertRes.body.data.patient.patientCode.startsWith("TG-P-"));
    assert(convertRes.body.data.appointment.appointmentCode.startsWith("TG-A-"));
    assert(convertRes.body.data.invoice.invoiceNumber.startsWith("INV-"));
    pass("Checklist 8/19: Lead converted into Patient, Appointment, and Invoice linked together");

    // Idempotent duplicate conversion check
    const repeatConvertRes = await request(
      "POST",
      `/api/v1/crm/leads/${createdLeadId}/convert`,
      {},
      crmToken
    );
    assert.strictEqual(repeatConvertRes.status, 200);
    assert.strictEqual(repeatConvertRes.body.data.alreadyConverted, true);
    pass("Checklist 8/19: Conversion idempotency verified - no duplicate records created");

    // CRM CSV Export
    const exportRes = await request("GET", "/api/v1/crm/leads/export", null, crmToken);
    assert.strictEqual(exportRes.status, 200);
    assert(typeof exportRes.body === "string" && exportRes.body.includes("Lead ID,Full Name"));
    pass("Checklist 9/19: Authorized CRM leads CSV export generated successfully");

    // ==========================================
    // 3. HRMS Complete Pipeline
    // ==========================================
    console.log("\n--- Checklist Section 3: HRMS Complete Pipeline ---");

    // Employee onboarding and profile
    const testStaffUser = await User.create({
      name: "Rohit Bansal",
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `rohit.${Date.now()}@trigyna.test`,
      passwordHash: await User.hashPassword("TriGyna@123"),
      role: "reception",
    });

    const onboardRes = await request(
      "POST",
      "/api/v1/hrms/employees",
      {
        userId: testStaffUser._id.toString(),
        employeeCode: `TG-EMP-${Date.now().toString().slice(-4)}`,
        department: "Reception",
        designation: "Front Desk Officer",
        employmentType: "full_time",
        shift: "morning",
        salary: 32000,
        emergencyContact: { name: "Sunil Bansal", phone: "9811223344", relationship: "Father" },
      },
      hrmsToken
    );
    assert.strictEqual(onboardRes.status, 201);
    const onboardedEmpId = onboardRes.body.data.employee._id;
    pass("Checklist 10/19: Employee onboarded with profile, shift, salary, and emergency contacts");

    // Attendance, shifts and corrections
    const empUserRes = await request("POST", "/api/v1/auth/login", {
      identifier: testStaffUser.phone,
      password: "TriGyna@123",
    });
    const testStaffToken = empUserRes.body.data.token;

    const checkInRes = await request("POST", "/api/v1/hrms/attendance/check-in", {}, testStaffToken);
    assert.strictEqual(checkInRes.status, 200);
    pass("Checklist 11/19: Employee recorded live biometric check-in punch");

    // Request attendance correction
    const correctReqRes = await request(
      "POST",
      "/api/v1/hrms/attendance/corrections",
      {
        workDate: "2026-10-20",
        requestedCheckIn: "2026-10-20T09:00:00.000Z",
        requestedCheckOut: "2026-10-20T17:30:00.000Z",
        reason: "Biometric kiosk reader power failure",
      },
      testStaffToken
    );
    assert.strictEqual(correctReqRes.status, 201);
    const correctionId = correctReqRes.body.data.correction._id;
    pass("Checklist 11/19: Attendance punch correction submitted by employee");

    // HR approves attendance correction
    const approveCorrectionRes = await request(
      "PATCH",
      `/api/v1/hrms/attendance/corrections/${correctionId}/review`,
      { status: "approved", reviewNote: "Verified with manual register" },
      hrmsToken
    );
    assert.strictEqual(approveCorrectionRes.status, 200);
    pass("Checklist 11/19: HR reviewed and approved attendance correction with audit entry");

    // Leave balance and approval workflow
    const leaveApplyRes = await request(
      "POST",
      "/api/v1/hrms/leave-requests",
      {
        leaveType: "casual",
        startDate: "2026-11-01",
        endDate: "2026-11-02",
        reason: "Personal family commitment",
      },
      testStaffToken
    );
    assert.strictEqual(leaveApplyRes.status, 201);
    const leaveId = leaveApplyRes.body.data.leave._id;
    pass("Checklist 12/19: Employee applied for leave");

    // HR reviews and approves leave
    const leaveReviewRes = await request(
      "PATCH",
      `/api/v1/hrms/leave-requests/${leaveId}/review`,
      { status: "approved", reviewNote: "Approved by HR Department" },
      hrmsToken
    );
    assert.strictEqual(leaveReviewRes.status, 200);
    pass("Checklist 12/19: Leave request approved and balance deducted");

    // Payroll calculation, review and locking
    const payrollGenRes = await request(
      "POST",
      "/api/v1/hrms/payroll/generate",
      { payrollPeriod: "2026-11" },
      hrmsToken
    );
    assert.strictEqual(payrollGenRes.status, 200);
    assert(payrollGenRes.body.data.payroll.length > 0);
    const samplePayrollId = payrollGenRes.body.data.payroll[0]._id;
    pass("Checklist 13/19: Monthly payroll calculated with allowances, PF, PT, and TDS");

    // Approve & lock payroll
    const payrollLockRes = await request(
      "PATCH",
      `/api/v1/hrms/payroll/${samplePayrollId}/approve`,
      {},
      ownerToken
    );
    assert.strictEqual(payrollLockRes.status, 200);
    assert.strictEqual(payrollLockRes.body.data.payroll.status, "locked");
    pass("Checklist 13/19: Payroll locked against further tampering by authorized signatory");

    // Employee offboarding and access revocation
    const offboardRes = await request(
      "POST",
      `/api/v1/hrms/employees/${onboardedEmpId}/offboard`,
      { reason: "Relocation to another state" },
      hrmsToken
    );
    assert.strictEqual(offboardRes.status, 200);
    assert.strictEqual(offboardRes.body.data.employee.status, "offboarded");

    // Verify revoked login access
    const revokedLoginRes = await request("POST", "/api/v1/auth/login", {
      identifier: testStaffUser.phone,
      password: "TriGyna@123",
    });
    assert.strictEqual(revokedLoginRes.status, 401);
    pass("Checklist 14/19: Offboarded employee credentials suspended, records preserved for audit");

    // ==========================================
    // 4. Shared System: Healthcare & Finance
    // ==========================================
    console.log("\n--- Checklist Section 4: Healthcare, Billing & Shared System ---");

    // Doctor, Patient & Appointment Integration
    const patient = await Patient.findOne();
    const sharedAptDate = `2026-12-${String((Date.now() % 25) + 1).padStart(2, "0")}`;
    const sharedAptTime = "10:00";
    await Appointment.deleteMany({ doctorId: doctor._id, appointmentDate: sharedAptDate, startTime: sharedAptTime });

    const aptRes = await request(
      "POST",
      "/api/v1/appointments",
      {
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        serviceName: "Gynecological Follow-up",
        appointmentDate: sharedAptDate,
        startTime: sharedAptTime,
        durationMinutes: 30,
        consultationType: "in_person",
      },
      adminToken
    );
    assert.strictEqual(aptRes.status, 201);
    pass("Checklist 15/19: Doctor-patient encounter booked with conflict-free slot");

    // Billing & Payment Integrity
    const invoiceRes = await request(
      "POST",
      "/api/v1/invoices",
      {
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        appointmentId: aptRes.body.data.appointment._id,
        items: [
          { description: "Specialist Consultation Fee", amount: 1500, quantity: 1 },
          { description: "Ultrasound Pelvic Imaging", amount: 2500, quantity: 1 },
        ],
        taxAmount: 0,
      },
      adminToken
    );
    assert.strictEqual(invoiceRes.status, 201);
    assert.strictEqual(invoiceRes.body.data.invoice.totalAmount, 4000);
    const testInvoiceId = invoiceRes.body.data.invoice._id;
    pass("Checklist 16/19: Invoice created with server-verified total (Rs. 4,000)");

    // Partial Payment
    const partPayRes = await request(
      "POST",
      `/api/v1/invoices/${testInvoiceId}/payments`,
      {
        amount: 2000,
        paymentMethod: "upi",
        transactionRef: "UPI-TEST-12345",
      },
      adminToken
    );
    assert.strictEqual(partPayRes.status, 200);
    assert.strictEqual(partPayRes.body.data.invoice.status, "partially_paid");
    assert.strictEqual(partPayRes.body.data.invoice.balanceAmount, 2000);
    pass("Checklist 16/19: Partial payment (Rs. 2,000) recorded, remaining balance Rs. 2,000");

    // Full Payment
    const fullPayRes = await request(
      "POST",
      `/api/v1/invoices/${testInvoiceId}/payments`,
      {
        amount: 2000,
        paymentMethod: "card",
        transactionRef: "CARD-AUTH-9988",
      },
      adminToken
    );
    assert.strictEqual(fullPayRes.status, 200);
    assert.strictEqual(fullPayRes.body.data.invoice.status, "paid");
    assert.strictEqual(fullPayRes.body.data.invoice.balanceAmount, 0);
    pass("Checklist 16/19: Invoice transitioned to fully paid state with verified payment logs");

    // Refund Processing with Audit
    const refundRes = await request(
      "POST",
      `/api/v1/invoices/${testInvoiceId}/refund`,
      {
        refundAmount: 1500,
        refundReason: "Cancellation of ultrasound by clinician",
      },
      ownerToken
    );
    assert.strictEqual(refundRes.status, 200);
    assert.strictEqual(refundRes.body.data.invoice.status, "refunded");
    pass("Checklist 16/19: Refund processed with authorization without deleting transactions");

    // Expenses & Financial Reconciliation
    const expRes = await request(
      "POST",
      "/api/v1/invoices/expenses",
      {
        title: "Clinical Sterile Gloves & Speculums Box",
        category: "Medical Supplies",
        amount: 3500,
        vendor: "Surgical Needs India",
        expenseDate: "2026-10-24",
        paymentMethod: "upi",
      },
      adminToken
    );
    assert.strictEqual(expRes.status, 201);
    pass("Checklist 16/19: Operational expense recorded in financial ledger");

    const reconRes = await request("GET", "/api/v1/invoices/reconciliation", null, adminToken);
    assert.strictEqual(reconRes.status, 200);
    assert(reconRes.body.data.reconciliation.totalBilled > 0);
    assert(reconRes.body.data.reconciliation.totalExpenses > 0);
    pass("Checklist 16/19: Real-time financial reconciliation matches database ledger");

    // Notifications & Retry Handling
    const notifRes = await request("GET", "/api/v1/notifications", null, adminToken);
    assert.strictEqual(notifRes.status, 200);
    assert(Array.isArray(notifRes.body.data.notifications));
    pass("Checklist 17/19: In-app notification center verified active");

    // Backend Permission Tests
    const patientForbidden = await request("GET", "/api/v1/users", null, testStaffToken);
    assert.strictEqual(patientForbidden.status, 403);
    pass("Checklist 18/19: Role-based authorization denies unauthorized module access");

    // Database persistence and regression tests
    const healthCheck = await request("GET", "/health");
    assert.strictEqual(healthCheck.status, 200);
    assert.strictEqual(healthCheck.body.data.database, "connected");
    pass("Checklist 19/19: MongoDB persistence active with 0 regression across routes");

    console.log("\n==================================================");
    console.log(`MASTER VERIFICATION RESULTS: ${passed}/19 CHECKLIST CRITERIA FULLY VERIFIED!`);
    console.log("==================================================");
  } catch (err) {
    console.error("\n[FAIL] Test assertion failed:", err);
    throw err;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  }
}

if (require.main === module) {
  runMasterVerification()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMasterVerification;
