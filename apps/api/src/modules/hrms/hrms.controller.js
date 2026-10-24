const Employee = require("./employee.model");
const Attendance = require("./attendance.model");
const LeaveRequest = require("./leave.model");
const AttendanceCorrection = require("./attendance-correction.model");
const Payroll = require("./payroll.model");
const User = require("../users/user.model");
const AuditLog = require("../audit/audit.model");
const Task = require("../tasks/task.model");
const Organization = require("../organization/organization.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

// Helper to get today's YYYY-MM-DD
function getTodayString() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

// ----------------- Employees -----------------
async function listEmployees(req, res, next) {
  try {
    const { department, status, search } = req.query;
    const query = {};

    if (department) query.department = department;
    if (status) query.status = status;

    let employees = await Employee.find(query)
      .populate("userId", "name email phone role status")
      .sort({ createdAt: -1 });

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      employees = employees.filter(
        (emp) =>
          emp.employeeCode.match(regex) ||
          emp.designation.match(regex) ||
          (emp.userId && emp.userId.name && emp.userId.name.match(regex))
      );
    }

    return sendSuccess(res, { employees, count: employees.length }, "Employees retrieved");
  } catch (err) {
    return next(err);
  }
}

async function createEmployee(req, res, next) {
  try {
    const {
      userId,
      employeeCode,
      department,
      designation,
      joiningDate,
      salary,
      employmentType,
      shift,
      emergencyContact,
      name,
      phone,
      email,
      role,
      password,
    } = req.body;

    let targetUserId = userId;
    if (!targetUserId) {
      if (!name || !phone) {
        return next(new ValidationError("Either User ID, or Employee Name and Phone are required"));
      }
      let user = await User.findOne({
        $or: [
          { phone: phone.trim() },
          ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ],
      });
      if (!user) {
        const passwordHash = await User.hashPassword(password || "TriGyna@123");
        user = await User.create({
          name: name.trim(),
          phone: phone.trim(),
          email: email ? email.trim().toLowerCase() : undefined,
          passwordHash,
          role: role || (department === "Clinical" || department === "Medical" ? "doctor" : "admin"),
          status: "active",
        });
      }
      targetUserId = user._id;
    }

    const finalCode = employeeCode
      ? employeeCode.trim()
      : `EMP-${Date.now().toString().slice(-5)}`;

    if (!designation) {
      return next(new ValidationError("Designation is required"));
    }

    const existingCode = await Employee.findOne({ employeeCode: finalCode });
    if (existingCode) {
      return next(new ConflictError(`Employee Code '${finalCode}' is already assigned`));
    }

    const existingUser = await Employee.findOne({ userId: targetUserId });
    if (existingUser) {
      return next(new ConflictError("An employee record already exists for this user"));
    }

    const newEmp = await Employee.create({
      userId: targetUserId,
      employeeCode: finalCode,
      department: department || "Administration",
      designation: designation.trim(),
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      salary: salary || 0,
      employmentType: employmentType || "full_time",
      shift: shift || "general",
      emergencyContact: emergencyContact || {},
      status: "active",
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "EMPLOYEE_CREATED",
      targetEntity: "Employee",
      targetId: newEmp._id.toString(),
      details: { employeeCode: newEmp.employeeCode, department: newEmp.department },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { employee: newEmp }, "Employee onboarded successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// Offboard Employee
async function offboardEmployee(req, res, next) {
  try {
    const { reason } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return next(new NotFoundError("Employee not found"));
    }

    employee.status = "offboarded";
    employee.offboardingDetails = {
      exitDate: new Date(),
      reason: reason || "Standard offboarding procedure completed",
      handoverComplete: true,
      offboardedBy: req.user._id,
    };
    await employee.save();

    // Revoke linked user login access
    if (employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { status: "suspended" });
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "EMPLOYEE_OFFBOARDED",
      targetEntity: "Employee",
      targetId: employee._id.toString(),
      details: { employeeCode: employee.employeeCode, reason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { employee }, "Employee offboarded and login access revoked successfully");
  } catch (err) {
    return next(err);
  }
}

// ----------------- Attendance -----------------
async function checkIn(req, res, next) {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return next(new ValidationError("No active employee profile is linked to your user account"));
    }

    const today = getTodayString();
    let record = await Attendance.findOne({ employeeId: employee._id, workDate: today });

    if (record && record.checkInTime) {
      return next(new ConflictError("You have already checked in for today"));
    }

    if (!record) {
      record = await Attendance.create({
        employeeId: employee._id,
        workDate: today,
        checkInTime: new Date(),
        status: "present",
      });
    } else {
      record.checkInTime = new Date();
      record.status = "present";
      await record.save();
    }

    return sendSuccess(res, { attendance: record }, "Checked in successfully");
  } catch (err) {
    return next(err);
  }
}

async function checkOut(req, res, next) {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return next(new ValidationError("No active employee profile is linked to your user account"));
    }

    const today = getTodayString();
    const record = await Attendance.findOne({ employeeId: employee._id, workDate: today });

    if (!record || !record.checkInTime) {
      return next(new ValidationError("Cannot check out without a valid check-in for today"));
    }

    if (record.checkOutTime) {
      return next(new ConflictError("You have already checked out for today"));
    }

    const now = new Date();
    record.checkOutTime = now;
    const diffMs = now.getTime() - new Date(record.checkInTime).getTime();
    record.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    await record.save();

    return sendSuccess(res, { attendance: record }, "Checked out successfully");
  } catch (err) {
    return next(err);
  }
}

async function getAttendance(req, res, next) {
  try {
    const { date, employeeId } = req.query;
    const query = {};

    if (date) query.workDate = date;

    if (!["owner", "admin", "hrms"].includes(req.user.role)) {
      const myEmp = await Employee.findOne({ userId: req.user._id });
      if (!myEmp) {
        return sendSuccess(res, { attendance: [] }, "No records found");
      }
      query.employeeId = myEmp._id;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    const records = await Attendance.find(query)
      .sort({ workDate: -1, createdAt: -1 })
      .populate({
        path: "employeeId",
        populate: { path: "userId", select: "name email phone" },
      });

    return sendSuccess(res, { records, count: records.length }, "Attendance records retrieved");
  } catch (err) {
    return next(err);
  }
}

// ----------------- Attendance Corrections -----------------
async function requestAttendanceCorrection(req, res, next) {
  try {
    const { workDate, requestedCheckIn, requestedCheckOut, reason } = req.body;
    if (!workDate || !requestedCheckIn || !requestedCheckOut || !reason) {
      return next(new ValidationError("Work date, requested times, and justification reason are required"));
    }

    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return next(new ValidationError("No active employee profile linked to account"));
    }

    const existingAtt = await Attendance.findOne({ employeeId: employee._id, workDate });

    const correction = await AttendanceCorrection.create({
      employeeId: employee._id,
      workDate,
      originalCheckIn: existingAtt ? existingAtt.checkInTime : null,
      originalCheckOut: existingAtt ? existingAtt.checkOutTime : null,
      requestedCheckIn: new Date(requestedCheckIn),
      requestedCheckOut: new Date(requestedCheckOut),
      reason: reason.trim(),
      status: "pending",
    });

    return sendSuccess(res, { correction }, "Attendance correction request submitted for review", 201);
  } catch (err) {
    return next(err);
  }
}

async function listAttendanceCorrections(req, res, next) {
  try {
    const query = {};
    if (!["owner", "admin", "hrms"].includes(req.user.role)) {
      const myEmp = await Employee.findOne({ userId: req.user._id });
      if (!myEmp) return sendSuccess(res, { corrections: [] }, "No records found");
      query.employeeId = myEmp._id;
    }

    const corrections = await AttendanceCorrection.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "employeeId",
        populate: { path: "userId", select: "name email phone" },
      })
      .populate("reviewedBy", "name role");

    return sendSuccess(res, { corrections, count: corrections.length }, "Attendance corrections retrieved");
  } catch (err) {
    return next(err);
  }
}

async function reviewAttendanceCorrection(req, res, next) {
  try {
    const { status, reviewNote } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return next(new ValidationError("Status must be 'approved' or 'rejected'"));
    }

    const correction = await AttendanceCorrection.findById(req.params.id);
    if (!correction) {
      return next(new NotFoundError("Correction request not found"));
    }

    correction.status = status;
    correction.reviewedBy = req.user._id;
    correction.reviewNote = reviewNote ? reviewNote.trim() : "";
    correction.reviewedAt = new Date();
    await correction.save();

    // If approved, update or create Attendance record
    if (status === "approved") {
      let att = await Attendance.findOne({
        employeeId: correction.employeeId,
        workDate: correction.workDate,
      });

      const diffMs = new Date(correction.requestedCheckOut).getTime() - new Date(correction.requestedCheckIn).getTime();
      const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

      if (!att) {
        att = await Attendance.create({
          employeeId: correction.employeeId,
          workDate: correction.workDate,
          checkInTime: correction.requestedCheckIn,
          checkOutTime: correction.requestedCheckOut,
          totalHours,
          status: "present",
        });
      } else {
        att.checkInTime = correction.requestedCheckIn;
        att.checkOutTime = correction.requestedCheckOut;
        att.totalHours = totalHours;
        att.status = "present";
        await att.save();
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: `ATTENDANCE_CORRECTION_${status.toUpperCase()}`,
      targetEntity: "AttendanceCorrection",
      targetId: correction._id.toString(),
      details: { employeeId: correction.employeeId, workDate: correction.workDate, status },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { correction }, `Attendance correction ${status}`);
  } catch (err) {
    return next(err);
  }
}

// ----------------- Leave Requests -----------------
async function applyLeave(req, res, next) {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!startDate || !endDate || !reason) {
      return next(new ValidationError("Start date, end date, and reason are required"));
    }

    let targetEmployeeId = req.body.employeeId;
    if (!targetEmployeeId) {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) {
        return next(new ValidationError("No active employee profile is linked to your account"));
      }
      targetEmployeeId = employee._id;
    }

    const leave = await LeaveRequest.create({
      employeeId: targetEmployeeId,
      leaveType: leaveType || "casual",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason.trim(),
      status: "pending",
    });

    return sendSuccess(res, { leave }, "Leave application submitted", 201);
  } catch (err) {
    return next(err);
  }
}

async function listLeaveRequests(req, res, next) {
  try {
    const query = {};

    if (!["owner", "admin", "hrms"].includes(req.user.role)) {
      const myEmp = await Employee.findOne({ userId: req.user._id });
      if (!myEmp) return sendSuccess(res, { leaves: [] }, "No records found");
      query.employeeId = myEmp._id;
    }

    const leaves = await LeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "employeeId",
        populate: { path: "userId", select: "name email phone" },
      })
      .populate("reviewedBy", "name role");

    return sendSuccess(res, { leaves, count: leaves.length }, "Leave requests retrieved");
  } catch (err) {
    return next(err);
  }
}

async function reviewLeaveRequest(req, res, next) {
  try {
    const { status, reviewNote } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return next(new ValidationError("Status must be either 'approved' or 'rejected'"));
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return next(new NotFoundError("Leave request not found"));
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewNote = reviewNote ? reviewNote.trim() : "";
    await leave.save();

    // If approved, update leave balance in employee profile
    if (status === "approved") {
      const employee = await Employee.findById(leave.employeeId);
      if (employee && employee.leaveBalances) {
        const type = leave.leaveType || "casual";
        if (employee.leaveBalances[type]) {
          employee.leaveBalances[type].used = (employee.leaveBalances[type].used || 0) + 1;
          await employee.save();
        }
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: `LEAVE_${status.toUpperCase()}`,
      targetEntity: "LeaveRequest",
      targetId: leave._id.toString(),
      details: { employeeId: leave.employeeId, status },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { leave }, `Leave request ${status}`);
  } catch (err) {
    return next(err);
  }
}

// ----------------- Payroll -----------------
async function generatePayroll(req, res, next) {
  try {
    const { payrollPeriod } = req.body; // e.g. "2026-10"
    if (!payrollPeriod || !/^\d{4}-\d{2}$/.test(payrollPeriod)) {
      return next(new ValidationError("A valid payroll period in YYYY-MM format is required"));
    }

    const activeEmployees = await Employee.find({ status: { $in: ["active", "probation"] } });
    if (!activeEmployees.length) {
      return sendSuccess(res, { records: [] }, "No active employees found to calculate payroll");
    }

    const generated = [];

    for (const emp of activeEmployees) {
      const baseSalary = emp.salary || 35000;
      const allowances = {
        hra: Math.round(baseSalary * 0.2),
        medical: 1500,
        special: Math.round(baseSalary * 0.1),
      };
      const totalAllowances = allowances.hra + allowances.medical + allowances.special;
      const grossPay = baseSalary + totalAllowances;

      const deductions = {
        providentFund: Math.round(baseSalary * 0.12),
        professionalTax: 200,
        tds: Math.round(grossPay * 0.05),
      };
      const totalDeductions = deductions.providentFund + deductions.professionalTax + deductions.tds;
      const netPay = grossPay - totalDeductions;

      // Upsert payroll record
      const record = await Payroll.findOneAndUpdate(
        { payrollPeriod, employeeId: emp._id },
        {
          payrollPeriod,
          employeeId: emp._id,
          baseSalary,
          allowances,
          deductions,
          workedDays: 26,
          leaveDays: 0,
          grossPay,
          netPay,
          status: "draft",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      generated.push(record);
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PAYROLL_GENERATED",
      targetEntity: "Payroll",
      details: { period: payrollPeriod, count: generated.length },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { payroll: generated, count: generated.length }, `Payroll generated for period ${payrollPeriod}`);
  } catch (err) {
    return next(err);
  }
}

async function listPayroll(req, res, next) {
  try {
    const { period } = req.query;
    const query = {};
    if (period) query.payrollPeriod = period;

    const payroll = await Payroll.find(query)
      .sort({ payrollPeriod: -1, createdAt: -1 })
      .populate({
        path: "employeeId",
        populate: { path: "userId", select: "name email phone" },
      })
      .populate("approvedBy", "name role");

    return sendSuccess(res, { payroll, count: payroll.length }, "Payroll records retrieved");
  } catch (err) {
    return next(err);
  }
}

async function approvePayroll(req, res, next) {
  try {
    const { id } = req.params;
    const record = await Payroll.findById(id);
    if (!record) {
      return next(new NotFoundError("Payroll record not found"));
    }

    record.status = "locked";
    record.approvedBy = req.user._id;
    record.approvedAt = new Date();
    await record.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PAYROLL_APPROVED_LOCKED",
      targetEntity: "Payroll",
      targetId: record._id.toString(),
      details: { period: record.payrollPeriod, employeeId: record.employeeId },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { payroll: record }, "Payroll record approved and locked successfully");
  } catch (err) {
    return next(err);
  }
}

// ----------------- Staff Activity Monitoring -----------------
async function getStaffActivity(req, res, next) {
  try {
    const todayStr = getTodayString();

    // 1. Fetch recent audit activities by staff/admin
    const recentActivities = await AuditLog.find({
      actorRole: { $in: ["owner", "admin", "doctor", "reception", "crm", "hrms"] },
    })
      .sort({ timestamp: -1 })
      .limit(30)
      .populate("actorId", "name email role");

    // 2. Fetch recent task operations
    const recentTasks = await Task.find()
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    // 3. Today's attendance summary
    const todayAttendance = await Attendance.find({ date: todayStr }).populate({
      path: "employeeId",
      populate: { path: "userId", select: "name email phone role" },
    });

    const activeEmployees = await Employee.find({ status: "active" }).populate(
      "userId",
      "name email phone role"
    );

    const totalStaff = activeEmployees.length;
    const presentCount = todayAttendance.filter(
      (a) => a.status === "present" || a.status === "half_day"
    ).length;
    const lateCount = todayAttendance.filter((a) => a.isLate).length;

    // 4. Tasks counts
    const taskCounts = {
      open: await Task.countDocuments({ status: "open" }),
      inProgress: await Task.countDocuments({ status: "in_progress" }),
      completed: await Task.countDocuments({ status: "completed" }),
      overdue: await Task.countDocuments({ status: "overdue" }),
    };

    return sendSuccess(
      res,
      {
        summary: {
          totalStaff,
          presentToday: presentCount,
          lateToday: lateCount,
          tasksPending: taskCounts.open + taskCounts.inProgress,
          tasksCompleted: taskCounts.completed,
        },
        taskCounts,
        todayAttendance,
        recentActivities,
        recentTasks,
        activeStaff: activeEmployees,
      },
      "Staff activity feed retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

// ----------------- HRMS Dashboard Overview -----------------
async function getHrmsDashboard(req, res, next) {
  try {
    const todayStr = getTodayString();
    const [totalStaff, activeEmployees, todayAttendance, pendingLeaves, pendingCorrections, payroll] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: "active" }),
      Attendance.find({ date: todayStr }),
      LeaveRequest.countDocuments({ status: "pending" }),
      AttendanceCorrection.countDocuments({ status: "pending" }),
      Payroll.find().sort({ payrollPeriod: -1, createdAt: -1 }).limit(10),
    ]);

    const presentToday = todayAttendance.filter((a) => a.status === "present" || a.status === "half_day").length;
    const lateToday = todayAttendance.filter((a) => a.isLate).length;
    const onLeaveToday = todayAttendance.filter((a) => a.status === "leave").length;

    return sendSuccess(
      res,
      {
        summary: {
          totalStaff,
          activeEmployees,
          presentToday,
          lateToday,
          onLeaveToday,
          pendingLeaves,
          pendingCorrections,
          payrollStatus: payroll.length > 0 ? payroll[0].status : "draft",
        },
        recentPayroll: payroll,
      },
      "HRMS dashboard metrics retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

// ----------------- Departments -----------------
async function listDepartments(req, res, next) {
  try {
    const org = await Organization.findOne();
    const defaultDepts = [
      { code: "ADMIN", name: "Administration", description: "Clinic administration and operations" },
      { code: "CLINICAL", name: "Clinical", description: "Doctors, specialists, and nursing staff" },
      { code: "RECEPTION", name: "Reception", description: "Front desk and patient reception" },
      { code: "CRM", name: "CRM", description: "Lead intake and patient relationship management" },
      { code: "HR", name: "HR", description: "Human resources, attendance, and payroll" },
      { code: "FINANCE", name: "Finance", description: "Accounts, billing, and financial reconciliations" },
    ];
    let departments = (org?.departments && org.departments.length > 0) ? org.departments : defaultDepts;

    const staffByDept = await Employee.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$department", count: { $sum: 1 } } }
    ]);
    const countMap = {};
    staffByDept.forEach((d) => { countMap[d._id] = d.count; });

    const formatted = departments.map((d) => ({
      _id: d._id || d.code,
      code: d.code,
      name: d.name,
      description: d.description || "",
      headOfDepartment: d.headOfDepartment || "Unassigned",
      staffCount: countMap[d.name] || 0,
      status: d.status || "active",
    }));

    return sendSuccess(res, { departments: formatted, count: formatted.length }, "Departments retrieved");
  } catch (err) {
    return next(err);
  }
}

async function createDepartment(req, res, next) {
  try {
    const { name, code, description, headOfDepartment } = req.body;
    if (!name) {
      return next(new ValidationError("Department name is required"));
    }
    const cleanCode = (code || name.replace(/[^A-Za-z0-9]/g, "").slice(0, 10)).toUpperCase();

    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: "TriGyna Health & Wellness Clinic",
        code: "TRIGYNA-HQ",
        contactEmail: "trigyna.health@gmail.com",
        contactPhone: "+919172772326",
        departments: [],
      });
    }

    const existing = org.departments?.find((d) => d.code === cleanCode || d.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return sendSuccess(res, { department: existing }, "Department already exists", 200);
    }

    org.departments.push({
      code: cleanCode,
      name: name.trim(),
      description: description ? description.trim() : "",
      headOfDepartment: headOfDepartment ? headOfDepartment.trim() : "Unassigned",
      status: "active",
    });

    await org.save();
    const createdDept = org.departments[org.departments.length - 1];
    return sendSuccess(res, { department: createdDept }, "Department created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// ----------------- Shifts -----------------
async function listShifts(req, res, next) {
  try {
    const defaultShifts = [
      { code: "general", name: "General Shift", startTime: "09:00", endTime: "17:00", description: "Standard daytime operational shift" },
      { code: "morning", name: "Morning Clinical", startTime: "08:00", endTime: "16:00", description: "Early morning OPD & lab shift" },
      { code: "evening", name: "Evening Clinical", startTime: "14:00", endTime: "22:00", description: "Afternoon & evening consultations" },
      { code: "night", name: "Night On-Call", startTime: "22:00", endTime: "06:00", description: "Emergency and in-patient monitoring" },
    ];

    const shiftAgg = await Employee.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$shift", count: { $sum: 1 } } }
    ]);
    const shiftCountMap = {};
    shiftAgg.forEach((s) => { shiftCountMap[s._id] = s.count; });

    const shifts = defaultShifts.map((s) => ({
      ...s,
      staffCount: shiftCountMap[s.code] || 0,
    }));

    return sendSuccess(res, { shifts, count: shifts.length }, "Shift rosters retrieved");
  } catch (err) {
    return next(err);
  }
}

async function createShift(req, res, next) {
  try {
    const { code, name, startTime, endTime, description } = req.body;
    if (!name || !startTime || !endTime) {
      return next(new ValidationError("Shift name, startTime, and endTime are required"));
    }
    const cleanCode = (code || name.replace(/[^A-Za-z0-9]/g, "_").toLowerCase()).trim();
    const shift = {
      code: cleanCode,
      name: name.trim(),
      startTime,
      endTime,
      description: description ? description.trim() : "",
      createdAt: new Date(),
    };
    return sendSuccess(res, { shift }, "Shift roster created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// ----------------- Leave Approval & Rejection -----------------
async function approveLeave(req, res, next) {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return next(new NotFoundError("Leave request not found"));
    }
    if (leave.status === "approved") {
      return sendSuccess(res, { leave }, "Leave request is already approved");
    }

    const employee = await Employee.findById(leave.employeeId);
    if (!employee) {
      return next(new NotFoundError("Associated employee not found"));
    }

    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const leaveTypeKey = leave.leaveType === "paid" ? "earned" : leave.leaveType;
    if (!employee.leaveBalances) {
      employee.leaveBalances = {
        casual: { total: 12, used: 0 },
        sick: { total: 10, used: 0 },
        earned: { total: 15, used: 0 },
        unpaid: { used: 0 },
      };
    }
    if (employee.leaveBalances[leaveTypeKey]) {
      employee.leaveBalances[leaveTypeKey].used = (employee.leaveBalances[leaveTypeKey].used || 0) + diffDays;
    } else {
      employee.leaveBalances[leaveTypeKey] = { used: diffDays };
    }

    employee.markModified("leaveBalances");
    await employee.save();

    leave.status = "approved";
    leave.reviewedBy = req.user._id;
    leave.reviewNote = reviewNote || "Approved";
    await leave.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "LEAVE_APPROVED",
      targetEntity: "LeaveRequest",
      targetId: leave._id.toString(),
      details: {
        employeeId: employee._id.toString(),
        days: diffDays,
        leaveType: leave.leaveType,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { leave, employee }, "Leave request approved successfully");
  } catch (err) {
    return next(err);
  }
}

async function rejectLeave(req, res, next) {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return next(new NotFoundError("Leave request not found"));
    }

    leave.status = "rejected";
    leave.reviewedBy = req.user._id;
    leave.reviewNote = reviewNote || "Rejected";
    await leave.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "LEAVE_REJECTED",
      targetEntity: "LeaveRequest",
      targetId: leave._id.toString(),
      details: {
        employeeId: leave.employeeId?.toString(),
        reason: reviewNote,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { leave }, "Leave request rejected successfully");
  } catch (err) {
    return next(err);
  }
}

// ----------------- Digital Payslip -----------------
async function getPayslip(req, res, next) {
  try {
    const { id } = req.params;
    const payroll = await Payroll.findById(id)
      .populate({
        path: "employeeId",
        populate: { path: "userId", select: "name email phone role" },
      })
      .populate("approvedBy", "name role");

    if (!payroll) {
      return next(new NotFoundError("Payslip / Payroll record not found"));
    }

    const org = await Organization.findOne();
    const employee = payroll.employeeId;
    const user = employee?.userId;

    const payslip = {
      _id: payroll._id,
      payslipNumber: `PS-${payroll.payrollPeriod}-${employee?.employeeCode || "EMP"}`,
      payrollPeriod: payroll.payrollPeriod,
      status: payroll.status,
      generationDate: payroll.createdAt,
      approvedAt: payroll.approvedAt,
      approvedBy: payroll.approvedBy?.name || "HR Department",
      organization: {
        name: org?.name || "TriGyna Health & Wellness Clinic",
        address: org?.address ? `${org.address.street}, ${org.address.city}, ${org.address.state} - ${org.address.pincode}` : "Baner Road, Pune, Maharashtra 411045",
        phone: org?.contactPhone || "+91 9172772326",
        email: org?.contactEmail || "trigyna.health@gmail.com",
        gstin: org?.gstNumber || "27ABCDE1234F1Z5",
      },
      employee: {
        _id: employee?._id,
        employeeCode: employee?.employeeCode,
        fullName: user?.name || "Staff Member",
        email: user?.email,
        phone: user?.phone,
        department: employee?.department,
        designation: employee?.designation,
        shift: employee?.shift,
        joiningDate: employee?.joiningDate,
        workedDays: payroll.workedDays || 26,
        leaveDays: payroll.leaveDays || 0,
      },
      earnings: {
        baseSalary: payroll.baseSalary,
        hra: payroll.allowances?.hra || 0,
        medical: payroll.allowances?.medical || 0,
        special: payroll.allowances?.special || 0,
        totalAllowances: (payroll.allowances?.hra || 0) + (payroll.allowances?.medical || 0) + (payroll.allowances?.special || 0),
      },
      deductions: {
        providentFund: payroll.deductions?.providentFund || 0,
        professionalTax: payroll.deductions?.professionalTax || 0,
        tds: payroll.deductions?.tds || 0,
        totalDeductions: (payroll.deductions?.providentFund || 0) + (payroll.deductions?.professionalTax || 0) + (payroll.deductions?.tds || 0),
      },
      grossPay: payroll.grossPay,
      netPay: payroll.netPay,
    };

    return sendSuccess(res, { payslip }, "Payslip retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
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
};
