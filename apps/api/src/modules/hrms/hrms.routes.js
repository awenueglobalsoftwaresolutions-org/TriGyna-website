const express = require("express");
const {
  listEmployees,
  createEmployee,
  offboardEmployee,
  checkIn,
  checkOut,
  getAttendance,
  requestAttendanceCorrection,
  listAttendanceCorrections,
  reviewAttendanceCorrection,
  applyLeave,
  listLeaveRequests,
  reviewLeaveRequest,
  approveLeave,
  rejectLeave,
  generatePayroll,
  listPayroll,
  approvePayroll,
  getStaffActivity,
  getHrmsDashboard,
  listDepartments,
  createDepartment,
  listShifts,
  createShift,
  getPayslip,
} = require("./hrms.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// HRMS Dashboard & Staff Activity
router.get("/dashboard", requireRole("owner", "admin", "hrms", "hr"), getHrmsDashboard);
router.get("/activity", requireRole("owner", "admin", "hrms", "hr"), getStaffActivity);

// Departments & Shifts
router.get("/departments", requireRole("owner", "admin", "hrms", "hr"), listDepartments);
router.post("/departments", requireRole("owner", "admin", "hrms", "hr"), createDepartment);
router.get("/shifts", requireRole("owner", "admin", "hrms", "hr"), listShifts);
router.post("/shifts", requireRole("owner", "admin", "hrms", "hr"), createShift);

// Employee operations
router.get("/employees", requireRole("owner", "admin", "hrms", "hr"), listEmployees);
router.post("/employees", requireRole("owner", "admin", "hrms", "hr"), createEmployee);
router.post("/employees/:id/offboard", requireRole("owner", "admin", "hrms", "hr"), offboardEmployee);

// Attendance routes
router.post("/attendance/check-in", checkIn);
router.post("/attendance/check-out", checkOut);
router.get("/attendance", getAttendance);

// Attendance corrections
router.post("/attendance/corrections", requestAttendanceCorrection);
router.get("/attendance/corrections", listAttendanceCorrections);
router.patch("/attendance/corrections/:id/review", requireRole("owner", "admin", "hrms", "hr"), reviewAttendanceCorrection);

// Leave routes & Actions
router.post("/leave-requests", applyLeave);
router.get("/leave-requests", listLeaveRequests);
router.get("/leaves", requireRole("owner", "admin", "hrms", "hr"), listLeaveRequests);
router.post("/leaves/:id/approve", requireRole("owner", "admin", "hrms", "hr"), approveLeave);
router.post("/leaves/:id/reject", requireRole("owner", "admin", "hrms", "hr"), rejectLeave);
router.patch("/leave-requests/:id/review", requireRole("owner", "admin", "hrms", "hr"), reviewLeaveRequest);

// Payroll routes, Runs & Payslips
router.post("/payroll/generate", requireRole("owner", "admin", "hrms", "hr", "finance"), generatePayroll);
router.post("/payroll/runs", requireRole("owner", "admin", "hrms", "hr", "finance"), generatePayroll);
router.get("/payroll", requireRole("owner", "admin", "hrms", "hr", "finance"), listPayroll);
router.patch("/payroll/:id/approve", requireRole("owner", "admin", "finance"), approvePayroll);
router.post("/payroll/runs/:id/finalize", requireRole("owner", "admin", "finance"), approvePayroll);
router.get("/payslips/:id", getPayslip);

module.exports = router;
