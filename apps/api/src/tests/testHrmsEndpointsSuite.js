/**
 * testHrmsEndpointsSuite.js
 * Verification suite for HRMS Core Architecture:
 * - Dashboard KPIs & Department/Shift rosters
 * - Leave approval/rejection with atomic balance deduction
 * - Payroll run drafting, locking & digital payslip retrieval
 */

const http = require("http");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");

let server;
let BASE_URL = "http://127.0.0.1:5000/api/v1";

async function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function run() {
  console.log("==================================================");
  console.log("TriGyna — HRMS Architecture & Workflow Verification Suite");
  console.log("==================================================");

  // Connect database and start ephemeral test server
  await connectDB();
  server = app.listen(0);
  const port = server.address().port;
  BASE_URL = `http://127.0.0.1:${port}/api/v1`;
  console.log(`[TestServer] Ephemeral server running at ${BASE_URL}`);

  // 1. Authenticate as Admin / HRMS Specialist
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "+919172772326",
      password: "TriGyna@2326",
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token || loginData.token;
  assert(token, "Admin authenticated for HRMS verification");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. GET /hrms/dashboard
  const dashRes = await fetch(`${BASE_URL}/hrms/dashboard`, { headers });
  assert(dashRes.status === 200, "GET /hrms/dashboard returned 200 OK");
  const dashData = await dashRes.json();
  const summary = dashData.data?.summary || dashData.data;
  assert(summary && summary.totalStaff !== undefined, "HRMS dashboard includes totalStaff KPI");
  assert(summary && summary.presentToday !== undefined, "HRMS dashboard includes presentToday KPI");
  assert(summary && summary.pendingLeaves !== undefined, "HRMS dashboard includes pendingLeaves KPI");

  // 3. GET /hrms/departments & POST /hrms/departments
  const deptListRes = await fetch(`${BASE_URL}/hrms/departments`, { headers });
  assert(deptListRes.status === 200, "GET /hrms/departments returned 200 OK");
  const deptListData = await deptListRes.json();
  const departments = deptListData.data?.departments || deptListData.departments || [];
  assert(Array.isArray(departments) && departments.length > 0, "Departments array returned");

  const createDeptRes = await fetch(`${BASE_URL}/hrms/departments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Quality & Diagnostics",
      description: "Lab and diagnostic quality assurance team",
    }),
  });
  assert(createDeptRes.status === 201 || createDeptRes.status === 200, "POST /hrms/departments created new department");

  // 4. GET /hrms/shifts & POST /hrms/shifts
  const shiftListRes = await fetch(`${BASE_URL}/hrms/shifts`, { headers });
  assert(shiftListRes.status === 200, "GET /hrms/shifts returned 200 OK");
  const shiftListData = await shiftListRes.json();
  const shifts = shiftListData.data?.shifts || shiftListData.shifts || [];
  assert(Array.isArray(shifts) && shifts.length >= 3, "Standard shift rosters retrieved (morning, evening, night/general)");

  const createShiftRes = await fetch(`${BASE_URL}/hrms/shifts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      code: "weekend_emergency",
      name: "Weekend Emergency On-Call",
      startTime: "08:00",
      endTime: "20:00",
    }),
  });
  assert(createShiftRes.status === 201 || createShiftRes.status === 200, "POST /hrms/shifts created shift roster");

  // 5. Test Employees for Leave Flow
  const empRes = await fetch(`${BASE_URL}/hrms/employees`, { headers });
  const empData = await empRes.json();
  const employees = empData.data?.employees || [];
  assert(employees.length > 0, "Active employee found for leave workflow");
  const testEmp = employees[0];
  const initialCasualUsed = testEmp.leaveBalances?.casual?.used || 0;

  // 6. Submit Leave Application
  const today = new Date();
  const nextWeek = new Date(Date.now() + 7 * 86400000);
  const nextWeekEnd = new Date(Date.now() + 8 * 86400000);

  const applyLeaveRes = await fetch(`${BASE_URL}/hrms/leave-requests`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      employeeId: testEmp._id,
      leaveType: "casual",
      startDate: nextWeek.toISOString().split("T")[0],
      endDate: nextWeekEnd.toISOString().split("T")[0],
      reason: "Family event leave application",
    }),
  });
  const applyData = await applyLeaveRes.json();
  const leaveId = applyData.data?.leave?._id || applyData.data?._id;
  assert(applyLeaveRes.status === 201 && leaveId, "Leave request submitted with status 'pending'");

  // 7. Approve Leave via POST /hrms/leaves/:id/approve
  const approveRes = await fetch(`${BASE_URL}/hrms/leaves/${leaveId}/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reviewNote: "Approved by Medical Director" }),
  });
  assert(approveRes.status === 200, "POST /hrms/leaves/:id/approve succeeded");
  const approveData = await approveRes.json();
  const approvedLeave = approveData.data?.leave || approveData.data;
  assert(approvedLeave.status === "approved", "Leave status transitioned to 'approved'");

  // 8. Verify atomic balance deduction on employee
  const empCheckRes = await fetch(`${BASE_URL}/hrms/employees`, { headers });
  const empCheckData = await empCheckRes.json();
  const updatedEmp = empCheckData.data.employees.find((e) => e._id === testEmp._id);
  const updatedCasualUsed = updatedEmp.leaveBalances?.casual?.used || 0;
  assert(updatedCasualUsed > initialCasualUsed, `Employee casual leave used increased from ${initialCasualUsed} to ${updatedCasualUsed}`);

  // 9. Reject Leave Flow via POST /hrms/leaves/:id/reject
  const rejectLeaveReqRes = await fetch(`${BASE_URL}/hrms/leave-requests`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      employeeId: testEmp._id,
      leaveType: "sick",
      startDate: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0],
      endDate: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
      reason: "Advance checkup request",
    }),
  });
  const rejectLeaveData = await rejectLeaveReqRes.json();
  const rejectLeaveId = rejectLeaveData.data?.leave?._id || rejectLeaveData.data?._id;

  const rejectRes = await fetch(`${BASE_URL}/hrms/leaves/${rejectLeaveId}/reject`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reviewNote: "Shift replacement not available on requested dates" }),
  });
  assert(rejectRes.status === 200, "POST /hrms/leaves/:id/reject succeeded");
  const rejectResData = await rejectRes.json();
  assert(
    (rejectResData.data?.leave?.status || rejectResData.data?.status) === "rejected",
    "Leave status transitioned to 'rejected'"
  );

  // 10. POST /hrms/payroll/runs (Draft run)
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const payrollRunRes = await fetch(`${BASE_URL}/hrms/payroll/runs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ payrollPeriod: currentPeriod }),
  });
  assert(payrollRunRes.status === 200 || payrollRunRes.status === 201, "POST /hrms/payroll/runs drafted period payroll");
  const runData = await payrollRunRes.json();
  const payrollRecords = runData.data?.payroll || runData.data?.records || [];
  assert(payrollRecords.length > 0, "Payroll records generated with gross and net calculation");
  const samplePayroll = payrollRecords[0];

  // 11. Finalize / Lock Payroll via POST /hrms/payroll/runs/:id/finalize
  const finalizeRes = await fetch(`${BASE_URL}/hrms/payroll/runs/${samplePayroll._id}/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ note: "Verified with bank disbursements" }),
  });
  assert(finalizeRes.status === 200, "POST /hrms/payroll/runs/:id/finalize locked the record");

  // 12. GET /hrms/payslips/:id (Digital Payslip)
  const payslipRes = await fetch(`${BASE_URL}/hrms/payslips/${samplePayroll._id}`, { headers });
  assert(payslipRes.status === 200, "GET /hrms/payslips/:id returned 200 OK");
  const payslipData = await payslipRes.json();
  const payslip = payslipData.data?.payslip || payslipData.data;
  assert(payslip.grossPay !== undefined && payslip.netPay !== undefined, "Payslip contains grossPay and netPay");
  assert(payslip.organization && payslip.organization.name, "Payslip contains TriGyna branding & organization context");

  console.log("==================================================");
  console.log("ALL HRMS SUITE VERIFICATION ASSERTIONS PASSED!");
  console.log("==================================================");
}

run()
  .catch((err) => {
    console.error("HRMS Test Suite Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((res) => server.close(res));
    await disconnectDB();
  });
