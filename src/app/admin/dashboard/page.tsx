"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  CreditCard,
  Briefcase,
  Activity,
  UserCheck,
  Building2,
  FolderLock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  Phone,
  Mail,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  TrendingUp,
  DollarSign,
  FileText,
  UserX,
  ChevronRight,
  Eye,
  Check,
  X,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import RoleGuard from "@/components/dashboard/RoleGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";

// Types
interface StaffUser {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  role: "owner" | "admin" | "doctor" | "reception" | "patient" | "crm" | "hrms";
  status: "active" | "inactive" | "suspended";
  createdAt: string;
}

interface PendingLeave {
  _id: string;
  employeeId?: {
    _id: string;
    employeeCode?: string;
    userId?: {
      name: string;
      email?: string;
      phone?: string;
    };
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface PendingCorrection {
  _id: string;
  employeeId?: {
    _id: string;
    employeeCode?: string;
    userId?: {
      name: string;
      email?: string;
      phone?: string;
    };
  };
  attendanceDate: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface Lead {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  serviceInterest: string;
  consultationMode: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  source: string;
  message?: string;
  followUpDate?: string;
  createdAt: string;
}

interface Employee {
  _id: string;
  employeeCode: string;
  department: string;
  designation: string;
  salary?: number;
  status: string;
  userId?: {
    name: string;
    phone: string;
    email?: string;
    role: string;
  };
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "pending" | "partially_paid" | "paid" | "refunded" | "cancelled";
  createdAt: string;
  patientId?: {
    fullName: string;
    patientCode: string;
  };
}

interface AuditLogItem {
  _id: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  actorRole?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

interface SummaryMetrics {
  appointments: { totalAppointments: number; todayAppointments: number; completedAppointments: number };
  patients: { totalPatients: number };
  billing: { totalRevenue: number; pendingDues: number };
  crm: { totalLeads: number; convertedLeads: number };
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Overview metrics
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Users Directory state
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [provisionForm, setProvisionForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "reception" as StaffUser["role"],
    status: "active" as StaffUser["status"],
  });

  // Approvals state
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<PendingCorrection[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);

  // CRM state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadStatusFilter, setLeadStatusFilter] = useState("");

  // HRMS state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Invoices & Billing state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // 1. Fetch Summary Metrics
  const loadMetrics = useCallback(async () => {
    try {
      setIsLoadingMetrics(true);
      const res = await api.get<{ metrics: SummaryMetrics }>("/reports/summary");
      if (res.data?.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch (err: unknown) {
      console.error("Failed to load metrics:", err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  // 2. Fetch Users Directory
  const loadUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const params = new URLSearchParams();
      if (userRoleFilter) params.append("role", userRoleFilter);
      if (userSearch.trim()) params.append("search", userSearch.trim());
      const res = await api.get<{ users: StaffUser[] }>(`/users?${params.toString()}`);
      if (res.data?.users) {
        setUsers(res.data.users);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load users", true);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userRoleFilter, userSearch]);

  // 3. Fetch Approvals Queue
  const loadApprovals = useCallback(async () => {
    try {
      setIsLoadingApprovals(true);
      const res = await api.get<{
        pendingLeaves: PendingLeave[];
        pendingCorrections: PendingCorrection[];
      }>("/approvals");
      if (res.data) {
        setPendingLeaves(res.data.pendingLeaves || []);
        setPendingCorrections(res.data.pendingCorrections || []);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load approvals", true);
    } finally {
      setIsLoadingApprovals(false);
    }
  }, []);

  // 4. Fetch CRM Leads
  const loadLeads = useCallback(async () => {
    try {
      setIsLoadingLeads(true);
      const params = new URLSearchParams();
      if (leadStatusFilter) params.append("status", leadStatusFilter);
      const res = await api.get<{ leads: Lead[] }>(`/crm/leads?${params.toString()}`);
      if (res.data?.leads) {
        setLeads(res.data.leads);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load CRM leads", true);
    } finally {
      setIsLoadingLeads(false);
    }
  }, [leadStatusFilter]);

  // 5. Fetch HRMS Employees
  const loadEmployees = useCallback(async () => {
    try {
      setIsLoadingEmployees(true);
      const res = await api.get<{ employees: Employee[] }>("/hrms/employees");
      if (res.data?.employees) {
        setEmployees(res.data.employees);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load HRMS employees", true);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, []);

  // 6. Fetch Invoices & Revenue
  const loadInvoices = useCallback(async () => {
    try {
      setIsLoadingInvoices(true);
      const res = await api.get<{ invoices: Invoice[] }>("/invoices?limit=50");
      if (res.data?.invoices) {
        setInvoices(res.data.invoices);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load invoices", true);
    } finally {
      setIsLoadingInvoices(false);
    }
  }, []);

  // 7. Fetch Audit Logs
  const loadAuditLogs = useCallback(async () => {
    try {
      setIsLoadingAudit(true);
      const params = new URLSearchParams();
      if (auditSearch.trim()) params.append("search", auditSearch.trim());
      const res = await api.get<{ logs: AuditLogItem[] }>(`/users/audit-logs?${params.toString()}`);
      if (res.data?.logs) {
        setAuditLogs(res.data.logs);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load audit logs", true);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [auditSearch]);

  // Initial load
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Tab switch fetcher
  useEffect(() => {
    if (activeTab === "users") loadUsers();
    else if (activeTab === "approvals") loadApprovals();
    else if (activeTab === "crm") loadLeads();
    else if (activeTab === "hrms") loadEmployees();
    else if (activeTab === "billing") loadInvoices();
    else if (activeTab === "audit") loadAuditLogs();
  }, [activeTab, loadUsers, loadApprovals, loadLeads, loadEmployees, loadInvoices, loadAuditLogs]);

  // User status toggle
  const handleToggleUserStatus = async (targetUser: StaffUser) => {
    const nextStatus = targetUser.status === "active" ? "suspended" : "active";
    try {
      await api.patch(`/users/${targetUser._id}`, { status: nextStatus });
      showNotification(`User '${targetUser.name}' status set to '${nextStatus}'`);
      loadUsers();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Status update failed", true);
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !tempPassword.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/users/${selectedUser._id}/reset-password`, {
        newPassword: tempPassword.trim(),
      });
      showNotification(`Temporary password updated for '${selectedUser.name}'`);
      setIsResetPwdModalOpen(false);
      setTempPassword("");
      setSelectedUser(null);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Password reset failed", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Provision New User Handler
  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionForm.name || !provisionForm.phone || !provisionForm.password) {
      showNotification("Name, phone, and initial password are required", true);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/users", provisionForm);
      showNotification(`Staff user '${provisionForm.name}' provisioned successfully with role '${provisionForm.role}'`);
      setIsProvisionModalOpen(false);
      setProvisionForm({
        name: "",
        phone: "",
        email: "",
        password: "",
        role: "reception",
        status: "active",
      });
      loadUsers();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "User creation failed", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approval review
  const handleReviewLeave = async (leaveId: string, status: "approved" | "rejected") => {
    try {
      await api.patch(`/hrms/leave-requests/${leaveId}/review`, { status, reviewNotes: `Decision by ${user?.name}` });
      showNotification(`Leave request ${status}`);
      loadApprovals();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Approval action failed", true);
    }
  };

  const handleReviewCorrection = async (corrId: string, status: "approved" | "rejected") => {
    try {
      await api.patch(`/hrms/attendance/corrections/${corrId}/review`, { status, notes: `Reviewed by Admin` });
      showNotification(`Attendance correction ${status}`);
      loadApprovals();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Correction review failed", true);
    }
  };

  return (
    <RoleGuard allowedRoles={["owner", "admin"]}>
      <DashboardShell
        role="admin"
        title="Admin Management Console"
        subtitle="Unified clinical management, staff RBAC, CRM pipeline, and institutional governance"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "users") loadUsers();
                else if (activeTab === "approvals") loadApprovals();
                else if (activeTab === "crm") loadLeads();
                else if (activeTab === "hrms") loadEmployees();
                else if (activeTab === "billing") loadInvoices();
                else if (activeTab === "audit") loadAuditLogs();
                else loadMetrics();
              }}
              className="p-2 rounded-xl border border-[#E8E2D6] bg-white hover:bg-[#F9F7F1] text-[#154734] transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {activeTab === "users" && (
              <button
                type="button"
                onClick={() => setIsProvisionModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Provision User</span>
              </button>
            )}
          </div>
        }
      >
        {/* Banner Alerts */}
        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW & KPIS */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#626B63] uppercase tracking-wider">Total Patients</span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold font-serif text-[#17221D]">
                    {isLoadingMetrics ? "..." : metrics?.patients?.totalPatients ?? 0}
                  </p>
                  <p className="text-[11px] text-[#626B63] mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span>Registered EHR records</span>
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#626B63] uppercase tracking-wider">Appointments</span>
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold font-serif text-[#17221D]">
                    {isLoadingMetrics ? "..." : metrics?.appointments?.totalAppointments ?? 0}
                  </p>
                  <p className="text-[11px] text-[#626B63] mt-1">
                    {metrics?.appointments?.todayAppointments ?? 0} scheduled today
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#626B63] uppercase tracking-wider">CRM Inquiries</span>
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold font-serif text-[#17221D]">
                    {isLoadingMetrics ? "..." : metrics?.crm?.totalLeads ?? 0}
                  </p>
                  <p className="text-[11px] text-purple-700 font-medium mt-1">
                    {metrics?.crm?.convertedLeads ?? 0} converted to patients
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#626B63] uppercase tracking-wider">Billed Revenue</span>
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold font-serif text-[#17221D]">
                    ₹{isLoadingMetrics ? "..." : (metrics?.billing?.totalRevenue ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    ₹{(metrics?.billing?.pendingDues ?? 0).toLocaleString()} outstanding
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Navigation Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className="bg-white p-5 rounded-3xl border border-[#E8E2D6] text-left hover:border-[#154734] transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#154734] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#154734] transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-[#17221D]">User &amp; RBAC Directory</h3>
                <p className="text-xs text-[#626B63] mt-1">Manage doctor, receptionist, staff accounts, password resets, and account suspension.</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("crm")}
                className="bg-white p-5 rounded-3xl border border-[#E8E2D6] text-left hover:border-[#154734] transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#154734] transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-[#17221D]">CRM Leads &amp; Growth</h3>
                <p className="text-xs text-[#626B63] mt-1">Review website inquiries, assign follow-ups, and convert leads into consultations.</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("approvals")}
                className="bg-white p-5 rounded-3xl border border-[#E8E2D6] text-left hover:border-[#154734] transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#154734] transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-[#17221D]">Staff Leave Approvals</h3>
                <p className="text-xs text-[#626B63] mt-1">Review clinic staff leave requests, attendance corrections, and payroll audits.</p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: USER DIRECTORY & RBAC */}
        {activeTab === "users" && (
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="text-xs border border-[#E8E2D6] rounded-xl px-3 py-2 bg-white text-[#17221D] focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="owner">Owner / SuperAdmin</option>
                  <option value="admin">Administrator</option>
                  <option value="doctor">Doctor</option>
                  <option value="reception">Reception</option>
                  <option value="patient">Patient</option>
                </select>
              </div>
              <span className="text-xs text-[#626B63] font-medium self-end sm:self-center">
                {users.length} accounts found
              </span>
            </div>

            {isLoadingUsers ? (
              <div className="py-12 text-center text-[#626B63] flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#154734] mb-2" />
                <span className="text-xs">Loading user directory...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-[#626B63] text-xs">
                No user accounts match current search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Name &amp; Contact</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D6]/60">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-[#F9F7F1]/50 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-[#17221D]">{u.name}</p>
                          <p className="text-[#626B63] text-[11px] font-mono">{u.phone} {u.email ? `• ${u.email}` : ""}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                              u.role === "owner"
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : u.role === "admin"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : u.role === "doctor"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : u.role === "reception"
                                ? "bg-teal-100 text-teal-800 border-teal-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              u.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setIsResetPwdModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold border border-[#E8E2D6] rounded-lg bg-white hover:bg-[#F9F7F1] text-[#154734] cursor-pointer"
                          >
                            Reset Password
                          </button>
                          {u.role !== "owner" && (
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer ${
                                u.status === "active"
                                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              {u.status === "active" ? "Suspend" : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APPROVALS */}
        {activeTab === "approvals" && (
          <div className="space-y-6">
            {/* Leave Requests */}
            <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#17221D]">Staff Leave Requests</h3>
                  <p className="text-xs text-[#626B63]">Review, authorize, or decline pending clinic employee leaves.</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {pendingLeaves.length} Pending
                </span>
              </div>

              {isLoadingApprovals ? (
                <div className="py-8 text-center text-xs text-[#626B63]">Loading approvals...</div>
              ) : pendingLeaves.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#626B63]">No pending leave requests requiring review.</div>
              ) : (
                <div className="space-y-3">
                  {pendingLeaves.map((leave) => (
                    <div
                      key={leave._id}
                      className="p-4 bg-[#F9F7F1] border border-[#E8E2D6] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#17221D]">
                            {leave.employeeId?.userId?.name || "Staff Member"}
                          </span>
                          <span className="text-[10px] text-[#626B63] font-mono">
                            ({leave.employeeId?.employeeCode || "EMP"})
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold capitalize">
                            {leave.leaveType}
                          </span>
                        </div>
                        <p className="text-[#626B63] mt-1">
                          {leave.startDate} to {leave.endDate} ({leave.totalDays} day{leave.totalDays > 1 ? "s" : ""})
                        </p>
                        <p className="text-[11px] text-[#17221D] mt-0.5 italic">&ldquo;{leave.reason}&rdquo;</p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(leave._id, "approved")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(leave._id, "rejected")}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance Corrections */}
            <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#17221D]">Attendance Time-Card Corrections</h3>
                  <p className="text-xs text-[#626B63]">Review clock-in/out dispute requests from staff.</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  {pendingCorrections.length} Pending
                </span>
              </div>

              {pendingCorrections.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#626B63]">No pending attendance corrections.</div>
              ) : (
                <div className="space-y-3">
                  {pendingCorrections.map((corr) => (
                    <div
                      key={corr._id}
                      className="p-4 bg-[#F9F7F1] border border-[#E8E2D6] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#17221D]">
                            {corr.employeeId?.userId?.name || "Staff Member"}
                          </span>
                          <span className="text-[10px] text-[#626B63] font-mono">
                            Date: {corr.attendanceDate}
                          </span>
                        </div>
                        <p className="text-[#626B63] mt-1">
                          Requested In: <span className="font-mono font-bold text-[#17221D]">{corr.requestedCheckIn || "N/A"}</span> | Requested Out: <span className="font-mono font-bold text-[#17221D]">{corr.requestedCheckOut || "N/A"}</span>
                        </p>
                        <p className="text-[11px] text-[#17221D] mt-0.5 italic">&ldquo;{corr.reason}&rdquo;</p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleReviewCorrection(corr._id, "approved")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept Correction</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewCorrection(corr._id, "rejected")}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter audit records by action or entity..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                />
              </div>
              <span className="text-xs text-[#626B63] font-medium self-end sm:self-center">
                {auditLogs.length} immutable records
              </span>
            </div>

            {isLoadingAudit ? (
              <div className="py-12 text-center text-xs text-[#626B63]">Loading security logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#626B63]">No audit trail entries found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Entity &amp; Target</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Details / IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D6]/60">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-[#F9F7F1]/50 font-mono text-[11px]">
                        <td className="py-2.5 px-3 text-[#626B63]">
                          {new Date(log.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#17221D]">
                          {log.targetEntity} {log.targetId ? `(${log.targetId.slice(-6)})` : ""}
                        </td>
                        <td className="py-2.5 px-3 capitalize text-[#626B63]">{log.actorRole || "system"}</td>
                        <td className="py-2.5 px-3 text-[#626B63] truncate max-w-xs">
                          {log.details ? JSON.stringify(log.details) : log.ipAddress || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CRM PIPELINE */}
        {activeTab === "crm" && (
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="text-xs border border-[#E8E2D6] rounded-xl px-3 py-2 bg-white text-[#17221D] focus:outline-none"
                >
                  <option value="">All Lead Stages</option>
                  <option value="new">New Inquiries</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted to Patients</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <span className="text-xs text-[#626B63] font-medium">{leads.length} leads in funnel</span>
            </div>

            {isLoadingLeads ? (
              <div className="py-12 text-center text-xs text-[#626B63]">Loading CRM pipeline...</div>
            ) : leads.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#626B63]">No CRM leads match the selected stage.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Lead Name</th>
                      <th className="py-3 px-3">Phone &amp; Source</th>
                      <th className="py-3 px-3">Service Interest</th>
                      <th className="py-3 px-3">Stage</th>
                      <th className="py-3 px-3">Inquiry Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D6]/60">
                    {leads.map((l) => (
                      <tr key={l._id} className="hover:bg-[#F9F7F1]/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-[#17221D]">{l.fullName}</td>
                        <td className="py-3 px-3 text-[#626B63]">
                          <p className="font-mono text-[#17221D]">{l.phone}</p>
                          <span className="text-[10px] bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200 capitalize">
                            {l.source}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#154734]">{l.serviceInterest}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border ${
                              l.status === "converted"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : l.status === "qualified"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : l.status === "contacted"
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#626B63] max-w-xs truncate">{l.message || "No notes"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: HRMS STAFF */}
        {activeTab === "hrms" && (
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#17221D]">Clinic Staff &amp; Practitioners Roster</h3>
                <p className="text-xs text-[#626B63]">Institutional staff records, departments, and payroll statuses.</p>
              </div>
              <span className="text-xs text-[#626B63] font-medium">{employees.length} active roster entries</span>
            </div>

            {isLoadingEmployees ? (
              <div className="py-12 text-center text-xs text-[#626B63]">Loading employee roster...</div>
            ) : employees.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#626B63]">No staff records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Employee Code</th>
                      <th className="py-3 px-3">Staff Name</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Designation</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D6]/60">
                    {employees.map((emp) => (
                      <tr key={emp._id} className="hover:bg-[#F9F7F1]/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#154734]">{emp.employeeCode}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-[#17221D]">{emp.userId?.name || "Staff Member"}</p>
                          <p className="text-[#626B63] text-[11px] font-mono">{emp.userId?.phone}</p>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#17221D]">{emp.department}</td>
                        <td className="py-3 px-3 text-[#626B63]">{emp.designation}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
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

        {/* TAB 7: BILLING & PAYMENTS */}
        {activeTab === "billing" && (
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#17221D]">Invoices &amp; Revenue Stream</h3>
                <p className="text-xs text-[#626B63]">Server-verified patient billing receipts and outstanding balances.</p>
              </div>
              <span className="text-xs text-[#626B63] font-medium">{invoices.length} invoices logged</span>
            </div>

            {isLoadingInvoices ? (
              <div className="py-12 text-center text-xs text-[#626B63]">Loading billing records...</div>
            ) : invoices.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#626B63]">No invoices recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Invoice #</th>
                      <th className="py-3 px-3">Patient</th>
                      <th className="py-3 px-3">Total Amount</th>
                      <th className="py-3 px-3">Paid Amount</th>
                      <th className="py-3 px-3">Balance</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D6]/60">
                    {invoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-[#F9F7F1]/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#154734]">{inv.invoiceNumber}</td>
                        <td className="py-3 px-3 font-medium text-[#17221D]">
                          {inv.patientId?.fullName || "Patient"}{" "}
                          <span className="text-[10px] text-[#626B63]">({inv.patientId?.patientCode})</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#17221D]">₹{inv.totalAmount.toLocaleString()}</td>
                        <td className="py-3 px-3 text-emerald-700 font-semibold">₹{inv.paidAmount.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-amber-700">₹{inv.balanceAmount.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                              inv.status === "paid"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : inv.status === "partially_paid"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : inv.status === "refunded"
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                          >
                            {inv.status}
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

        {/* TAB 8: ORGANIZATION & FACILITIES */}
        {activeTab === "organization" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#154734] text-white flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#17221D]">TriGyna Healthcare &amp; Wellness</h3>
                  <p className="text-xs text-[#626B63]">Headquarters: 100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-[#F9F7F1] border border-[#E8E2D6] rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                    Flagship Centre
                  </span>
                  <h4 className="text-sm font-bold text-[#17221D] mt-2">Indiranagar Clinical Facility</h4>
                  <p className="text-xs text-[#626B63] mt-1">100 Feet Rd, Indiranagar, Bengaluru</p>
                  <p className="text-xs text-[#154734] font-mono mt-2 font-semibold">Operating: 08:00 - 20:00 (Mon - Sat)</p>
                </div>

                <div className="p-4 bg-[#F9F7F1] border border-[#E8E2D6] rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                    Branch Centre
                  </span>
                  <h4 className="text-sm font-bold text-[#17221D] mt-2">Koramangala Specialty Clinic</h4>
                  <p className="text-xs text-[#626B63] mt-1">80 Feet Rd, 4th Block, Koramangala, Bengaluru</p>
                  <p className="text-xs text-[#154734] font-mono mt-2 font-semibold">Operating: 09:00 - 19:00 (Mon - Sat)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PROVISION NEW USER */}
        {isProvisionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsProvisionModalOpen(false)} />
            <div className="relative bg-white border border-[#E8E2D6] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl z-10 animate-fade-in">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E2D6]">
                <h3 className="text-base font-serif font-bold text-[#154734]">Provision New Staff Account</h3>
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProvisionUser} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={provisionForm.name}
                    onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Mehta"
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={provisionForm.phone}
                    onChange={(e) => setProvisionForm({ ...provisionForm, phone: e.target.value })}
                    placeholder="e.g. 9000000010"
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={provisionForm.email}
                    onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                    placeholder="staff@trigyna.com"
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Role Assignment</label>
                  <select
                    value={provisionForm.role}
                    onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value as StaffUser["role"] })}
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl bg-white text-[#17221D] focus:outline-none"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="reception">Reception / Front Desk</option>
                    <option value="admin">Administrator (CRM/HRMS Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={provisionForm.password}
                    onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                    placeholder="Temporary password..."
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProvisionModalOpen(false)}
                    className="px-4 py-2 border border-[#E8E2D6] rounded-xl text-[#626B63] hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? "Provisioning..." : "Create Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RESET PASSWORD */}
        {isResetPwdModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsResetPwdModalOpen(false)} />
            <div className="relative bg-white border border-[#E8E2D6] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl z-10 animate-fade-in">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E2D6]">
                <h3 className="text-base font-serif font-bold text-[#154734]">Reset User Password</h3>
                <button
                  type="button"
                  onClick={() => setIsResetPwdModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <p className="text-[#626B63]">
                  Enter a new temporary password for <span className="font-bold text-[#17221D]">{selectedUser.name}</span> ({selectedUser.phone}).
                </p>

                <div>
                  <label className="block font-semibold text-[#17221D] mb-1">New Temporary Password</label>
                  <input
                    type="text"
                    required
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="e.g. TriGyna@2026"
                    className="w-full px-3 py-2 border border-[#E8E2D6] rounded-xl font-mono focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetPwdModalOpen(false)}
                    className="px-4 py-2 border border-[#E8E2D6] rounded-xl text-[#626B63] hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
