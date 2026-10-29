"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UserCheck,
  Clock,
  DollarSign,
  Plus,
  Search,
  Loader2,
  X,
  RefreshCw,
  Lock,
  FileText,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface PayslipData {
  _id: string;
  payslipNumber: string;
  payrollPeriod: string;
  status: string;
  generationDate?: string;
  approvedAt?: string;
  approvedBy?: string;
  organization: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
  };
  employee: {
    _id?: string;
    employeeCode?: string;
    fullName: string;
    email?: string;
    phone?: string;
    department?: string;
    designation?: string;
    shift?: string;
    joiningDate?: string;
    workedDays?: number;
    leaveDays?: number;
  };
  earnings: {
    baseSalary: number;
    hra: number;
    medical: number;
    special: number;
    totalAllowances: number;
  };
  deductions: {
    providentFund: number;
    professionalTax: number;
    tds: number;
    totalDeductions: number;
  };
  grossPay: number;
  netPay: number;
}

interface EmployeeItem {
  _id: string;
  employeeCode: string;
  department: string;
  designation: string;
  salary?: number;
  status: string;
  shift: string;
  userId?: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    role: string;
  };
  createdAt: string;
}

interface AttendanceItem {
  _id: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  isLate: boolean;
  totalHoursWorked?: number;
  employeeId?: {
    employeeCode: string;
    userId?: { name: string };
  };
}

interface PendingCorrection {
  _id: string;
  attendanceDate: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  status: string;
  employeeId?: {
    employeeCode: string;
    userId?: { name: string };
  };
}

interface LeaveRequestItem {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  employeeId?: {
    employeeCode: string;
    userId?: { name: string };
  };
}

interface PayrollRecord {
  _id: string;
  payrollPeriod: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  status: "draft" | "locked" | "paid";
  employeeId?: {
    employeeCode: string;
    userId?: { name: string };
  };
}

interface ActivitySummary {
  summary: {
    totalStaff: number;
    presentToday: number;
    lateToday: number;
    tasksPending: number;
    tasksCompleted: number;
  };
  recentActivities: Array<{
    _id: string;
    action: string;
    targetEntity: string;
    timestamp: string;
    actorRole?: string;
  }>;
}

export function HrmsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [subTab, setSubTab] = useState<"staff" | "attendance" | "leaves" | "activity" | "payroll">("staff");

  // Staff state
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    department: "Clinical",
    designation: "Clinical Nurse Specialist",
    salary: 35000,
    shift: "morning",
    role: "reception",
  });

  // Attendance state
  const [todayAttendance, setTodayAttendance] = useState<AttendanceItem[]>([]);
  const [corrections, setCorrections] = useState<PendingCorrection[]>([]);
  const [isPunching, setIsPunching] = useState(false);

  // Leave state
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);

  // Activity state
  const [activityData, setActivityData] = useState<ActivitySummary | null>(null);

  // Payroll state
  const [payrollPeriod, setPayrollPeriod] = useState<string>("2026-10");
  const [payrollList, setPayrollList] = useState<PayrollRecord[]>([]);
  const [isCalculatingPayroll, setIsCalculatingPayroll] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);
  const [, setIsLoadingPayslip] = useState(false);

  // Dynamic Organization Departments & HRMS Shifts
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([
    "Administration",
    "Clinical",
    "Reception",
    "CRM",
    "HR",
    "Finance",
  ]);
  const [availableShifts, setAvailableShifts] = useState<Array<{ code: string; name: string }>>([
    { code: "general", name: "General Shift (09:00 - 17:00)" },
    { code: "morning", name: "Morning Clinical (08:00 - 16:00)" },
    { code: "evening", name: "Evening Clinical (14:00 - 22:00)" },
    { code: "night", name: "Night On-Call (22:00 - 06:00)" },
  ]);

  useEffect(() => {
    Promise.allSettled([
      api.get<{ organization?: { departments?: Array<{ name: string }> } }>("/organization"),
      api.get<{ shifts?: Array<{ code: string; name: string; startTime?: string; endTime?: string }> }>("/hrms/shifts"),
    ]).then(([orgRes, shiftRes]) => {
      if (orgRes.status === "fulfilled" && orgRes.value.data?.organization?.departments) {
        const orgDepts = orgRes.value.data.organization.departments.map((d) => d.name);
        setAvailableDepartments((prev) => Array.from(new Set([...prev, ...orgDepts])));
      }
      if (shiftRes.status === "fulfilled" && shiftRes.value.data?.shifts && shiftRes.value.data.shifts.length > 0) {
        setAvailableShifts(
          shiftRes.value.data.shifts.map((s) => ({
            code: s.code,
            name: `${s.name}${s.startTime && s.endTime ? ` (${s.startTime} - ${s.endTime})` : ""}`,
          }))
        );
      }
    });
  }, []);

  // 1. Load Employees
  const loadEmployees = useCallback(async () => {
    try {
      const res = await api.get<{ employees: EmployeeItem[] }>("/hrms/employees");
      if (res.data?.employees) {
        setEmployees(res.data.employees);
      }
    } catch {
      showNotification("Failed to load staff directory", true);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [showNotification]);

  // 2. Load Attendance & Corrections
  const loadAttendance = useCallback(async () => {
    try {
      const [attRes, corrRes] = await Promise.all([
        api.get<{ attendance: AttendanceItem[] }>("/hrms/attendance?limit=30"),
        api.get<{ corrections: PendingCorrection[] }>("/hrms/attendance/corrections"),
      ]);
      if (attRes.data?.attendance) setTodayAttendance(attRes.data.attendance);
      if (corrRes.data?.corrections) setCorrections(corrRes.data.corrections);
    } catch {
      // fallback
    }
  }, []);

  // 3. Load Leaves
  const loadLeaves = useCallback(async () => {
    try {
      const res = await api.get<{ leaves: LeaveRequestItem[] }>("/hrms/leaves");
      if (res.data?.leaves) {
        setLeaves(res.data.leaves);
      }
    } catch {
      // fallback
    }
  }, []);

  // 4. Load Staff Activity
  const loadActivity = useCallback(async () => {
    try {
      const res = await api.get<ActivitySummary>("/hrms/activity");
      if (res.data) {
        setActivityData(res.data);
      }
    } catch {
      // fallback
    }
  }, []);

  // 5. Load Payroll
  const loadPayroll = useCallback(async () => {
    try {
      const res = await api.get<{ payroll: PayrollRecord[] }>(`/hrms/payroll?period=${payrollPeriod}`);
      if (res.data?.payroll) {
        setPayrollList(res.data.payroll);
      }
    } catch {
      // fallback
    }
  }, [payrollPeriod]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEmployees();
      loadAttendance();
      loadLeaves();
      loadActivity();
      loadPayroll();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadEmployees, loadAttendance, loadLeaves, loadActivity, loadPayroll]);

  // Handle Check-in / Check-out
  const handleCheckIn = async () => {
    try {
      setIsPunching(true);
      const res = await api.post("/hrms/attendance/check-in", {});
      if (res.success) {
        showNotification("Clock-in recorded successfully!");
        loadAttendance();
        loadActivity();
      } else {
        showNotification(res.message || "Clock-in failed", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error punching clock-in", true);
    } finally {
      setIsPunching(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setIsPunching(true);
      const res = await api.post("/hrms/attendance/check-out", {});
      if (res.success) {
        showNotification("Clock-out recorded successfully! Worked hours updated.");
        loadAttendance();
        loadActivity();
      } else {
        showNotification(res.message || "Clock-out failed", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error punching clock-out", true);
    } finally {
      setIsPunching(false);
    }
  };

  // Handle Add Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.phone) {
      showNotification("Please provide full name and phone number", true);
      return;
    }

    try {
      setIsSubmittingStaff(true);
      const res = await api.post<{ employee: EmployeeItem }>("/hrms/employees", {
        name: staffForm.name,
        phone: staffForm.phone,
        email: staffForm.email || undefined,
        password: staffForm.password || "TriGyna@123",
        role: staffForm.role,
        department: staffForm.department,
        designation: staffForm.designation,
        salary: Number(staffForm.salary),
        shift: staffForm.shift,
      });

      if (res.success) {
        showNotification(`Employee ${staffForm.name} onboarded and account provisioned!`);
        setIsAddStaffModalOpen(false);
        setStaffForm({
          name: "",
          phone: "",
          email: "",
          password: "",
          department: "Clinical",
          designation: "Clinical Nurse Specialist",
          salary: 35000,
          shift: "morning",
          role: "reception",
        });
        loadEmployees();
      } else {
        showNotification(res.message || "Failed to create employee", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error adding employee", true);
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Handle Leave Review
  const handleReviewLeave = async (leaveId: string, status: "approved" | "rejected") => {
    try {
      const res = await api.post(`/hrms/leaves/${leaveId}/${status}`, {
        reviewNote: `Leave request ${status} by admin`,
      });
      if (res.success) {
        showNotification(`Leave request ${status} successfully!`);
        loadLeaves();
      } else {
        showNotification(res.message || "Failed to review leave", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error reviewing leave", true);
    }
  };

  // Handle Correction Review
  const handleReviewCorrection = async (corrId: string, status: "approved" | "rejected") => {
    try {
      const res = await api.patch(`/hrms/attendance/corrections/${corrId}/review`, { status });
      if (res.success) {
        showNotification(`Attendance correction ${status} successfully!`);
        loadAttendance();
      } else {
        showNotification(res.message || "Failed to review correction", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error reviewing correction", true);
    }
  };

  // Handle Generate Payroll
  const handleCalculatePayroll = async () => {
    try {
      setIsCalculatingPayroll(true);
      const res = await api.post<{ payroll: PayrollRecord[] }>("/hrms/payroll/runs", {
        payrollPeriod,
      });
      if (res.success) {
        showNotification(`Payroll calculated for ${payrollPeriod} across active staff!`);
        loadPayroll();
      } else {
        showNotification(res.message || "Payroll calculation failed", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error calculating payroll", true);
    } finally {
      setIsCalculatingPayroll(false);
    }
  };

  // Handle Lock Payroll
  const handleLockPayroll = async (payrollId: string) => {
    try {
      const res = await api.post(`/hrms/payroll/runs/${payrollId}/finalize`, {
        note: "Approved and locked for bank disbursement",
      });
      if (res.success) {
        showNotification("Payroll record approved and locked!");
        loadPayroll();
      } else {
        showNotification(res.message || "Failed to lock payroll record", true);
      }
    } catch {
      showNotification("Failed to lock payroll record", true);
    }
  };

  // Handle Open Payslip
  const handleOpenPayslip = async (payrollId: string) => {
    try {
      setIsLoadingPayslip(true);
      const res = await api.get<{ payslip: PayslipData }>(`/hrms/payslips/${payrollId}`);
      if (res.data?.payslip) {
        setSelectedPayslip(res.data.payslip);
      } else {
        showNotification(res.message || "Failed to load digital payslip", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error fetching payslip", true);
    } finally {
      setIsLoadingPayslip(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = emp.userId?.name?.toLowerCase() || "";
    const code = emp.employeeCode?.toLowerCase() || "";
    const des = emp.designation?.toLowerCase() || "";
    const q = staffSearch.toLowerCase();
    return name.includes(q) || code.includes(q) || des.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top HRMS Navigation Bar */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-base font-serif font-bold text-[#17221D]">Human Resources Management (HRMS)</h2>
            </div>
            <p className="text-xs text-[#626B63] mt-1">
              Staff directory, attendance station, daily timecards, leave management, activity monitoring, and monthly payroll.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddStaffModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold rounded-2xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-[#E8E2D6]">
          {[
            { id: "staff", label: "Staff Directory", count: employees.length },
            { id: "attendance", label: "Attendance & Punches", count: todayAttendance.length },
            { id: "leaves", label: "Leave Requests", count: leaves.filter((l) => l.status === "pending").length },
            { id: "activity", label: "Staff Activity Live" },
            { id: "payroll", label: "Monthly Payroll", count: payrollList.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as typeof subTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                subTab === tab.id
                  ? "bg-[#154734] text-white shadow-xs"
                  : "bg-gray-50 text-[#626B63] hover:bg-gray-100"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    subTab === tab.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TAB 1: STAFF DIRECTORY */}
      {subTab === "staff" && (
        <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by staff name, code, designation..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
              />
            </div>
            <button
              onClick={loadEmployees}
              className="p-2 border border-[#E8E2D6] rounded-xl hover:bg-gray-50 text-[#154734] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {isLoadingEmployees ? (
            <div className="py-12 text-center text-xs text-[#626B63] flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
              <span>Loading staff directory...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#626B63]">No staff members found matching query.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Employee Name</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Designation</th>
                    <th className="py-3 px-3">Shift</th>
                    <th className="py-3 px-3">Base Salary</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D6]/60">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-[#F9F7F1]/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#154734]">{emp.employeeCode}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#17221D]">{emp.userId?.name || "Staff Member"}</div>
                        <div className="text-[10px] text-[#626B63] font-mono">
                          {emp.userId?.phone} {emp.userId?.email ? `• ${emp.userId.email}` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#17221D] font-medium">{emp.department}</td>
                      <td className="py-3 px-3 text-[#626B63]">{emp.designation}</td>
                      <td className="py-3 px-3 font-mono text-[#154734] font-semibold capitalize">{emp.shift}</td>
                      <td className="py-3 px-3 font-mono font-bold text-[#17221D]">
                        ₹{emp.salary ? emp.salary.toLocaleString() : "N/A"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: ATTENDANCE & PUNCH STATION */}
      {subTab === "attendance" && (
        <div className="space-y-6">
          {/* Punch Station Card */}
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#17221D] font-serif">Quick Attendance Punch Station</h3>
              <p className="text-xs text-[#626B63] mt-0.5">
                Staff and administrators can clock in upon arrival and clock out upon shift completion.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPunching}
                onClick={handleCheckIn}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>Clock In Now</span>
              </button>
              <button
                type="button"
                disabled={isPunching}
                onClick={handleCheckOut}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>Clock Out</span>
              </button>
            </div>
          </div>

          {/* Pending Corrections Queue */}
          {corrections.length > 0 && (
            <div className="bg-white rounded-3xl border border-blue-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#17221D] uppercase tracking-wider">
                  Pending Timecard Corrections ({corrections.length})
                </h3>
              </div>
              <div className="space-y-2">
                {corrections.map((corr) => (
                  <div
                    key={corr._id}
                    className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#17221D]">
                        {corr.employeeId?.userId?.name || "Staff"} ({corr.employeeId?.employeeCode})
                      </div>
                      <div className="text-[11px] text-[#626B63]">
                        Date: <span className="font-mono font-bold text-[#17221D]">{corr.attendanceDate}</span> • Reason: &ldquo;{corr.reason}&rdquo;
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => handleReviewCorrection(corr._id, "approved")}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-bold cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReviewCorrection(corr._id, "rejected")}
                        className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[10px] font-bold cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Log Table */}
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#17221D] mb-4 font-serif">Daily Attendance Records</h3>
            {todayAttendance.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#626B63]">No punches logged yet today.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Employee</th>
                      <th className="py-3 px-3">In Time</th>
                      <th className="py-3 px-3">Out Time</th>
                      <th className="py-3 px-3">Hours</th>
                      <th className="py-3 px-3">Punctuality</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D6]/60 font-mono text-[11px]">
                    {todayAttendance.map((att) => (
                      <tr key={att._id} className="hover:bg-[#F9F7F1]/50">
                        <td className="py-2.5 px-3 text-[#17221D]">{att.attendanceDate}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <strong>{att.employeeId?.userId?.name || "Staff"}</strong>{" "}
                          <span className="text-[#626B63] font-mono">({att.employeeId?.employeeCode})</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#154734] font-bold">{att.checkInTime || "--:--"}</td>
                        <td className="py-2.5 px-3 text-[#154734]">{att.checkOutTime || "--:--"}</td>
                        <td className="py-2.5 px-3 font-bold text-[#17221D]">{att.totalHoursWorked || 0} hrs</td>
                        <td className="py-2.5 px-3">
                          {att.isLate ? (
                            <span className="text-red-600 font-bold">Late Arrival</span>
                          ) : (
                            <span className="text-emerald-700">On Time</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-bold">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {att.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LEAVE MANAGEMENT */}
      {subTab === "leaves" && (
        <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#17221D] font-serif">Staff Leave Requests</h3>
          {leaves.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#626B63]">No leave requests on file.</div>
          ) : (
            <div className="space-y-3">
              {leaves.map((l) => (
                <div
                  key={l._id}
                  className="p-4 bg-[#F9F7F1] border border-[#E8E2D6] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[#17221D]">{l.employeeId?.userId?.name || "Staff"}</strong>
                      <span className="font-mono text-[10px] text-[#626B63]">({l.employeeId?.employeeCode})</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-900">
                        {l.leaveType}
                      </span>
                    </div>
                    <p className="text-[#626B63] mt-1 font-mono text-[11px]">
                      {l.startDate} to {l.endDate} ({l.totalDays} days)
                    </p>
                    <p className="text-[#17221D] mt-0.5 italic">&ldquo;{l.reason}&rdquo;</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {l.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleReviewLeave(l._id, "approved")}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewLeave(l._id, "rejected")}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                        {l.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: STAFF ACTIVITY LIVE */}
      {subTab === "activity" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#626B63]">Active Employees</span>
              <p className="text-2xl font-bold font-serif text-[#17221D] mt-1">
                {activityData?.summary?.totalStaff ?? employees.length}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Present Today</span>
              <p className="text-2xl font-bold font-serif text-emerald-900 mt-1">
                {activityData?.summary?.presentToday ?? 0}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-800">Pending Tasks</span>
              <p className="text-2xl font-bold font-serif text-amber-900 mt-1">
                {activityData?.summary?.tasksPending ?? 0}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
              <span className="text-[10px] uppercase font-bold text-blue-800">Tasks Completed</span>
              <p className="text-2xl font-bold font-serif text-blue-900 mt-1">
                {activityData?.summary?.tasksCompleted ?? 0}
              </p>
            </div>
          </div>

          {/* Activity Logs */}
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#17221D] mb-4 font-serif">Recent Staff Operational Events</h3>
            {activityData?.recentActivities && activityData.recentActivities.length > 0 ? (
              <div className="divide-y divide-[#E8E2D6]/60">
                {activityData.recentActivities.map((act) => (
                  <div key={act._id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono font-bold text-[10px] border border-emerald-200">
                        {act.action}
                      </span>
                      <span className="text-[#17221D] font-medium">{act.targetEntity}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#626B63]">
                      {new Date(act.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#626B63]">No recent events recorded.</div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: MONTHLY PAYROLL */}
      {subTab === "payroll" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#17221D] font-serif">Monthly Payroll Calculations</h3>
              <p className="text-xs text-[#626B63] mt-0.5">
                Calculate base salaries, attendance adjustments, statutory rules, and locked payslip distributions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="month"
                value={payrollPeriod}
                onChange={(e) => setPayrollPeriod(e.target.value)}
                className="px-3 py-2 text-xs border border-[#E8E2D6] rounded-xl bg-white text-[#17221D] focus:outline-none font-mono"
              />
              <button
                type="button"
                disabled={isCalculatingPayroll}
                onClick={handleCalculatePayroll}
                className="px-4 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isCalculatingPayroll ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                <span>Calculate Payroll</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#626B63]">
                {payrollList.length} Payroll Records for {payrollPeriod}
              </span>
            </div>

            {payrollList.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#626B63]">
                No payroll calculated for period {payrollPeriod}. Click &ldquo;Calculate Payroll&rdquo; above to run the batch calculation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Employee</th>
                      <th className="py-3 px-3">Base Salary</th>
                      <th className="py-3 px-3">Allowances</th>
                      <th className="py-3 px-3">Deductions</th>
                      <th className="py-3 px-3">Gross Pay</th>
                      <th className="py-3 px-3">Net Payable</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Payslip</th>
                      <th className="py-3 px-3 text-right">Lock / Approve</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D6]/60 font-mono text-[11px]">
                    {payrollList.map((p) => (
                      <tr key={p._id} className="hover:bg-[#F9F7F1]/50">
                        <td className="py-3 px-3 font-sans">
                          <strong>{p.employeeId?.userId?.name || "Staff Member"}</strong>
                          <div className="text-[10px] text-[#626B63] font-mono">{p.employeeId?.employeeCode}</div>
                        </td>
                        <td className="py-3 px-3 text-[#17221D]">₹{p.baseSalary?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-emerald-700">+₹{p.allowances?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-red-600">-₹{p.deductions?.toLocaleString()}</td>
                        <td className="py-3 px-3 font-bold text-[#17221D]">₹{p.grossPay?.toLocaleString()}</td>
                        <td className="py-3 px-3 font-bold text-[#154734] text-xs">₹{p.netPay?.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                              p.status === "locked"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleOpenPayslip(p._id)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#154734] bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title="View digital printable payslip"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Payslip</span>
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {p.status !== "locked" ? (
                            <button
                              onClick={() => handleLockPayroll(p._id)}
                              className="px-3 py-1 bg-[#154734] text-white rounded-lg text-[10px] font-bold hover:bg-[#0E3828] cursor-pointer"
                            >
                              Approve &amp; Lock
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-sans text-[10px] font-bold flex items-center justify-end gap-1">
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsAddStaffModalOpen(false)} />
          <div className="relative bg-white border border-[#E8E2D6] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E2D6]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-serif font-bold text-[#154734]">Onboard New Staff Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStaffModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#17221D] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Anjali Srivastava"
                  className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Work Email</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="anjali@trigyna.com"
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Department</label>
                  <select
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl bg-white text-[#17221D] focus:outline-none"
                  >
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">System Role</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl bg-white text-[#17221D] focus:outline-none"
                  >
                    <option value="reception">Receptionist</option>
                    <option value="crm">CRM Executive</option>
                    <option value="doctor">Doctor</option>
                    <option value="hrms">HR Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#17221D] mb-1">Designation Title</label>
                <input
                  type="text"
                  value={staffForm.designation}
                  onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                  placeholder="e.g. Senior Patient Counselor"
                  className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={staffForm.salary}
                    onChange={(e) => setStaffForm({ ...staffForm, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Shift</label>
                  <select
                    value={staffForm.shift}
                    onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl bg-white text-[#17221D] focus:outline-none"
                  >
                    {availableShifts.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8E2D6]">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="px-4 py-2 border border-[#E8E2D6] rounded-xl text-[#626B63] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="px-5 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {isSubmittingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{isSubmittingStaff ? "Onboarding..." : "Onboard Staff"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIGITAL PRINTABLE PAYSLIP */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSelectedPayslip(null)} />
          <div className="relative bg-white border border-[#E8E2D6] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl z-10 animate-fade-in max-h-[92vh] overflow-y-auto">
            {/* Header / Actions */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E2D6] print:hidden">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#154734]">Digital Payslip</h3>
                  <p className="text-[11px] text-[#626B63] font-mono">{selectedPayslip.payslipNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Payslip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Payslip Body */}
            <div className="bg-[#FAF9F5] p-6 sm:p-8 rounded-2xl border border-[#E8E2D6] space-y-6 text-[#17221D]">
              {/* Clinic Branding */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E8E2D6]">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#154734] tracking-tight">
                    {selectedPayslip.organization?.name || "TriGyna Health & Wellness Clinic"}
                  </h2>
                  <p className="text-xs text-[#626B63] mt-1 max-w-sm">
                    {selectedPayslip.organization?.address}
                  </p>
                  <p className="text-xs text-[#626B63] mt-0.5">
                    Phone: {selectedPayslip.organization?.phone} • Email: {selectedPayslip.organization?.email}
                  </p>
                  <p className="text-xs font-mono text-[#626B63]">
                    GSTIN: {selectedPayslip.organization?.gstin}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="px-3 py-1 rounded-full text-xs uppercase font-mono font-bold tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Salary Slip
                  </span>
                  <p className="text-xs font-bold text-[#17221D] mt-2 font-mono">
                    Period: {selectedPayslip.payrollPeriod}
                  </p>
                  <p className="text-[11px] text-[#626B63] font-mono">
                    Slip #: {selectedPayslip.payslipNumber}
                  </p>
                </div>
              </div>

              {/* Employee Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white rounded-xl border border-[#E8E2D6] text-xs">
                <div>
                  <span className="text-[10px] text-[#626B63] uppercase font-bold block">Employee Name</span>
                  <span className="font-bold text-[#17221D]">{selectedPayslip.employee?.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626B63] uppercase font-bold block">Staff Code</span>
                  <span className="font-mono font-bold text-[#17221D]">{selectedPayslip.employee?.employeeCode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626B63] uppercase font-bold block">Department</span>
                  <span className="font-medium text-[#17221D]">{selectedPayslip.employee?.department || "General"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626B63] uppercase font-bold block">Designation</span>
                  <span className="font-medium text-[#17221D]">{selectedPayslip.employee?.designation || "Staff"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626B63] uppercase font-bold block">Worked Days</span>
                  <span className="font-mono font-bold text-[#154734]">{selectedPayslip.employee?.workedDays ?? 26}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626B63] uppercase font-bold block">Leave Days</span>
                  <span className="font-mono font-bold text-[#626B63]">{selectedPayslip.employee?.leaveDays ?? 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626B63] uppercase font-bold block">Status</span>
                  <span className="font-mono font-bold uppercase text-emerald-800">{selectedPayslip.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626B63] uppercase font-bold block">Shift</span>
                  <span className="font-medium capitalize text-[#17221D]">{selectedPayslip.employee?.shift || "Regular"}</span>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="bg-white rounded-xl border border-[#E8E2D6] overflow-hidden">
                  <div className="bg-emerald-50/70 px-4 py-2 font-bold text-[#154734] border-b border-[#E8E2D6]">
                    Earnings Breakdown
                  </div>
                  <div className="p-4 space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#626B63] font-sans">Basic Salary:</span>
                      <span className="font-bold">₹{selectedPayslip.earnings?.baseSalary?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#626B63] font-sans">HRA:</span>
                      <span>₹{selectedPayslip.earnings?.hra?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#626B63] font-sans">Medical Allowance:</span>
                      <span>₹{selectedPayslip.earnings?.medical?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#626B63] font-sans">Special Allowance:</span>
                      <span>₹{selectedPayslip.earnings?.special?.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-[#E8E2D6] flex justify-between font-bold text-[#154734]">
                      <span className="font-sans">Gross Earnings:</span>
                      <span>₹{selectedPayslip.grossPay?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="bg-white rounded-xl border border-[#E8E2D6] overflow-hidden">
                  <div className="bg-red-50/70 px-4 py-2 font-bold text-red-900 border-b border-[#E8E2D6]">
                    Deductions Breakdown
                  </div>
                  <div className="p-4 space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#626B63] font-sans">Provident Fund (PF):</span>
                      <span>₹{selectedPayslip.deductions?.providentFund?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#626B63] font-sans">Professional Tax (PT):</span>
                      <span>₹{selectedPayslip.deductions?.professionalTax?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#626B63] font-sans">TDS / Tax:</span>
                      <span>₹{selectedPayslip.deductions?.tds?.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-[#E8E2D6] flex justify-between font-bold text-red-700">
                      <span className="font-sans">Total Deductions:</span>
                      <span>₹{selectedPayslip.deductions?.totalDeductions?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Callout */}
              <div className="bg-[#154734] text-white p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-emerald-200 font-bold block">
                    Net Salary Payable
                  </span>
                  <span className="text-[11px] text-emerald-100">
                    Direct Credit / Bank Transfer
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-mono tracking-tight">
                    ₹{selectedPayslip.netPay?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Signatures & Footer */}
              <div className="pt-4 border-t border-[#E8E2D6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-[#626B63]">
                <div>
                  <p>Authorized Signatory: <strong className="text-[#17221D]">{selectedPayslip.approvedBy || "HR & Accounts"}</strong></p>
                  {selectedPayslip.approvedAt && (
                    <p className="font-mono text-[10px]">Date: {new Date(selectedPayslip.approvedAt).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="text-right italic">
                  This is a computer-generated payslip from TriGyna Management System.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
