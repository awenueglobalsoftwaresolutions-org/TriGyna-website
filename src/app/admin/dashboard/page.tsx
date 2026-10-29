"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import RoleGuard from "@/components/dashboard/RoleGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";
import { A4PaymentReceipt, PaymentReceiptData, ReceiptItem } from "@/components/billing/A4PaymentReceipt";
import { MarketingTab } from "@/components/dashboard/admin/MarketingTab";
import { WhatsAppInboxTab } from "@/components/dashboard/admin/WhatsAppInboxTab";
import { PatientsTab } from "@/components/dashboard/admin/PatientsTab";
import { DoctorsTab } from "@/components/dashboard/admin/DoctorsTab";
import { AppointmentsTab } from "@/components/dashboard/admin/AppointmentsTab";
import { ConsultationsTab } from "@/components/dashboard/admin/ConsultationsTab";
import { FollowUpsTab } from "@/components/dashboard/admin/FollowUpsTab";
import { ServicesTab } from "@/components/dashboard/admin/ServicesTab";
import { CalendarTab } from "@/components/dashboard/admin/CalendarTab";
import { TasksTab } from "@/components/dashboard/admin/TasksTab";
import { HrmsTab } from "@/components/dashboard/admin/HrmsTab";
import { ReportsTab } from "@/components/dashboard/admin/ReportsTab";
import { IntegrationsTab } from "@/components/dashboard/admin/IntegrationsTab";
import { AdminOverviewExact } from "@/components/dashboard/admin/AdminOverviewExact";
import { CrmExactTab } from "@/components/dashboard/admin/CrmExactTab";
import { BillingTab } from "@/components/dashboard/admin/BillingTab";

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

interface Invoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "pending" | "partially_paid" | "paid" | "refunded" | "cancelled";
  paymentMethod?: string;
  createdAt: string;
  items?: { description: string; quantity?: number; amount: number }[];
  patientId?: {
    fullName: string;
    patientCode: string;
    phone?: string;
    email?: string;
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

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");

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

  // Invoices & Billing state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [adminReceiptModal, setAdminReceiptModal] = useState<PaymentReceiptData | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

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

  // 1. Fetch Users Directory
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

  const handleViewReceipt = async (inv: Invoice) => {
    try {
      setLoadingReceiptId(inv._id);
      setAdminReceiptModal(null); // Clear previous receipt to prevent flashing outdated records

      interface ApiReceiptPayload extends PaymentReceiptData {
        amountPaid?: number;
      }
      const res = await api.get<{ receipt: ApiReceiptPayload }>(`/receipts/by-invoice/${inv._id}`);
      if (res.success && res.data?.receipt) {
        const r = res.data.receipt;
        const formatted: PaymentReceiptData = {
          _id: r._id,
          receiptNumber: r.receiptNumber || `RCP/${inv.invoiceNumber}`,
          invoiceNumber: r.invoiceNumber || inv.invoiceNumber,
          issuedAt: r.issuedAt || inv.createdAt,
          paidAt: r.paidAt || r.issuedAt,
          patientName: r.patientName || inv.patientId?.fullName || "—",
          patientCode: r.patientCode || inv.patientId?.patientCode || "—",
          patientPhone: r.patientPhone || inv.patientId?.phone || "—",
          patientEmail: r.patientEmail || inv.patientId?.email,
          doctorName: r.doctorName || "Consultant Doctor",
          doctorQualifications: r.doctorQualifications || "",
          doctorSpecialization: r.doctorSpecialization || "Women Health & Wellness",
          serviceName: r.serviceName || inv.items?.[0]?.description || "Clinical Service",
          appointmentDateTime: r.appointmentDateTime || "",
          duration: r.duration || "30 Minutes",
          appointmentMode: r.appointmentMode || "Clinical Consultation",
          items:
            Array.isArray(r.items) && r.items.length > 0
              ? r.items.map((it: ReceiptItem) => ({
                  description: it.description,
                  details: it.details,
                  quantity: it.quantity || 1,
                  unitPrice: it.unitPrice !== undefined ? it.unitPrice : it.amount,
                  amount: it.amount,
                }))
              : inv.items?.map((it) => ({
                  description: it.description,
                  details: it.quantity ? `Qty: ${it.quantity}` : undefined,
                  quantity: it.quantity || 1,
                  unitPrice: it.amount,
                  amount: it.amount,
                })) || [],
          paymentMethod: r.paymentMethod || (inv.paymentMethod ? inv.paymentMethod.toUpperCase() : "UPI"),
          providerTransactionId: r.providerTransactionId,
          paymentStatus: r.paymentStatus || (inv.status === "paid" ? "Paid" : inv.status),
          subtotal: r.subtotal !== undefined ? r.subtotal : inv.totalAmount,
          discountAmount: r.discountAmount || 0,
          taxRate: r.taxRate || 0,
          taxAmount: r.taxAmount || 0,
          totalAmount: r.totalAmount !== undefined ? r.totalAmount : inv.totalAmount,
          totalPaid: r.amountPaid !== undefined ? r.amountPaid : (inv.paidAmount || inv.totalAmount),
          balanceAmount: r.balanceAmount !== undefined ? r.balanceAmount : Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)),
          refundDetails: r.refundDetails,
          verificationToken: r.verificationToken,
          organization: r.organization,
        };
        setAdminReceiptModal(formatted);
      } else {
        showNotification("Receipt not available: No confirmed payment record found for this invoice.", true);
      }
    } catch (err: unknown) {
      console.error("Failed to load receipt:", err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj?.response?.data?.message || errorObj?.message || "Failed to load receipt record.";
      showNotification(msg, true);
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const handleDownloadInvoicePdf = (inv: Invoice) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    window.open(`${apiUrl}/receipts/by-invoice/${inv._id}/pdf`, "_blank");
  };

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

  // Tab switch fetcher
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!isMounted) return;
      if (activeTab === "users") await loadUsers();
      else if (activeTab === "approvals") await loadApprovals();
      else if (activeTab === "billing") await loadInvoices();
      else if (activeTab === "audit") await loadAuditLogs();
    })();
    return () => {
      isMounted = false;
    };
  }, [activeTab, loadUsers, loadApprovals, loadInvoices, loadAuditLogs]);

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
                else if (activeTab === "billing") loadInvoices();
                else if (activeTab === "audit") loadAuditLogs();
              }}
              className="p-2 rounded-xl border border-[#E2E9E3] bg-white hover:bg-[#F7F9F7] text-[#154734] transition-colors cursor-pointer"
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
      <div className={adminReceiptModal ? "print:hidden" : ""}>
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW & KPIS (EXACT REFERENCE UI) */}
        {activeTab === "overview" && (
          <AdminOverviewExact onTabChange={setActiveTab} showNotification={showNotification} />
        )}

        {/* TAB 2: USER DIRECTORY & RBAC */}
        {activeTab === "users" && (
          <div className="bg-white rounded-2xl border border-[#E2E9E3] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="text-xs border border-[#E2E9E3] rounded-xl px-3 py-2 bg-white text-[#18231D] focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="owner">Owner / SuperAdmin</option>
                  <option value="admin">Administrator</option>
                  <option value="doctor">Doctor</option>
                  <option value="reception">Reception</option>
                  <option value="patient">Patient</option>
                </select>
              </div>
              <span className="text-xs text-[#68756D] font-medium self-end sm:self-center">
                {users.length} accounts found
              </span>
            </div>

            {isLoadingUsers ? (
              <div className="py-12 text-center text-[#68756D] flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#154734] mb-2" />
                <span className="text-xs">Loading user directory...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-[#68756D] text-xs">
                No user accounts match current search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E9E3] text-[#68756D] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Name &amp; Contact</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E9E3]/60">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-[#F7F9F7]/50 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-[#18231D]">{u.name}</p>
                          <p className="text-[#68756D] text-[11px] font-mono">{u.phone} {u.email ? `• ${u.email}` : ""}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
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
                            className="px-2.5 py-1 text-[11px] font-semibold border border-[#E2E9E3] rounded-lg bg-white hover:bg-[#F7F9F7] text-[#154734] cursor-pointer"
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
            <div className="bg-white rounded-2xl border border-[#E2E9E3] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#18231D]">Staff Leave Requests</h3>
                  <p className="text-xs text-[#68756D]">Review, authorize, or decline pending clinic employee leaves.</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {pendingLeaves.length} Pending
                </span>
              </div>

              {isLoadingApprovals ? (
                <div className="py-8 text-center text-xs text-[#68756D]">Loading approvals...</div>
              ) : pendingLeaves.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#68756D]">No pending leave requests requiring review.</div>
              ) : (
                <div className="space-y-3">
                  {pendingLeaves.map((leave) => (
                    <div
                      key={leave._id}
                      className="p-4 bg-[#F7F9F7] border border-[#E2E9E3] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#18231D]">
                            {leave.employeeId?.userId?.name || "Staff Member"}
                          </span>
                          <span className="text-[10px] text-[#68756D] font-mono">
                            ({leave.employeeId?.employeeCode || "EMP"})
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-semibold capitalize">
                            {leave.leaveType}
                          </span>
                        </div>
                        <p className="text-[#68756D] mt-1">
                          {leave.startDate} to {leave.endDate} ({leave.totalDays} day{leave.totalDays > 1 ? "s" : ""})
                        </p>
                        <p className="text-[11px] text-[#18231D] mt-0.5 italic">&ldquo;{leave.reason}&rdquo;</p>
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
            <div className="bg-white rounded-2xl border border-[#E2E9E3] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#18231D]">Attendance Time-Card Corrections</h3>
                  <p className="text-xs text-[#68756D]">Review clock-in/out dispute requests from staff.</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  {pendingCorrections.length} Pending
                </span>
              </div>

              {pendingCorrections.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#68756D]">No pending attendance corrections.</div>
              ) : (
                <div className="space-y-3">
                  {pendingCorrections.map((corr) => (
                    <div
                      key={corr._id}
                      className="p-4 bg-[#F7F9F7] border border-[#E2E9E3] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#18231D]">
                            {corr.employeeId?.userId?.name || "Staff Member"}
                          </span>
                          <span className="text-[10px] text-[#68756D] font-mono">
                            Date: {corr.attendanceDate}
                          </span>
                        </div>
                        <p className="text-[#68756D] mt-1">
                          Requested In: <span className="font-mono font-semibold text-[#18231D]">{corr.requestedCheckIn || "N/A"}</span> | Requested Out: <span className="font-mono font-semibold text-[#18231D]">{corr.requestedCheckOut || "N/A"}</span>
                        </p>
                        <p className="text-[11px] text-[#18231D] mt-0.5 italic">&ldquo;{corr.reason}&rdquo;</p>
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
          <div className="bg-white rounded-2xl border border-[#E2E9E3] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter audit records by action or entity..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                />
              </div>
              <span className="text-xs text-[#68756D] font-medium self-end sm:self-center">
                {auditLogs.length} immutable records
              </span>
            </div>

            {isLoadingAudit ? (
              <div className="py-12 text-center text-xs text-[#68756D]">Loading security logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#68756D]">No audit trail entries found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E9E3] text-[#68756D] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Entity &amp; Target</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Details / IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E9E3]/60">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-[#F7F9F7]/50 font-mono text-[11px]">
                        <td className="py-2.5 px-3 text-[#68756D]">
                          {new Date(log.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#18231D]">
                          {log.targetEntity} {log.targetId ? `(${log.targetId.slice(-6)})` : ""}
                        </td>
                        <td className="py-2.5 px-3 capitalize text-[#68756D]">{log.actorRole || "system"}</td>
                        <td className="py-2.5 px-3 text-[#68756D] truncate max-w-xs">
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

        {/* TAB 5: CRM EXACT WORKSPACE (7-STAGE PIPELINE, ALL LEADS, FOLLOW-UPS, CONVERSIONS) */}
        {activeTab === "crm" && (
          <CrmExactTab showNotification={showNotification} onTabChange={setActiveTab} />
        )}

        {/* TAB 6: HRMS SUITE (Directory, Attendance, Leaves, Corrections, Activity, Payroll) */}
        {activeTab === "hrms" && <HrmsTab showNotification={showNotification} />}


        {/* TAB 7: BILLING & PAYMENTS */}
        {activeTab === "billing" && (
          <BillingTab
            invoices={invoices}
            isLoading={isLoadingInvoices}
            onRefresh={loadInvoices}
            onViewReceipt={handleViewReceipt}
            onDownloadPdf={handleDownloadInvoicePdf}
            loadingReceiptId={loadingReceiptId}
          />
        )}

        {/* TAB 8: ORGANIZATION & FACILITIES */}
        {activeTab === "organization" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E2E9E3] p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#154734] text-white flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#18231D]">TriGyna Healthcare &amp; Wellness</h3>
                  <p className="text-xs text-[#68756D]">Headquarters: 100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-[#F7F9F7] border border-[#E2E9E3] rounded-2xl">
                  <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                    Flagship Centre
                  </span>
                  <h4 className="text-sm font-semibold text-[#18231D] mt-2">Indiranagar Clinical Facility</h4>
                  <p className="text-xs text-[#68756D] mt-1">100 Feet Rd, Indiranagar, Bengaluru</p>
                  <p className="text-xs text-[#154734] font-mono mt-2 font-semibold">Operating: 08:00 - 20:00 (Mon - Sat)</p>
                </div>

                <div className="p-4 bg-[#F7F9F7] border border-[#E2E9E3] rounded-2xl">
                  <span className="text-[10px] font-semibold uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                    Branch Centre
                  </span>
                  <h4 className="text-sm font-semibold text-[#18231D] mt-2">Koramangala Specialty Clinic</h4>
                  <p className="text-xs text-[#68756D] mt-1">80 Feet Rd, 4th Block, Koramangala, Bengaluru</p>
                  <p className="text-xs text-[#154734] font-mono mt-2 font-semibold">Operating: 09:00 - 19:00 (Mon - Sat)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: MARKETING & META ADS */}
        {activeTab === "marketing" && <MarketingTab showNotification={showNotification} />}

        {/* TAB 10: WHATSAPP BUSINESS INBOX */}
        {activeTab === "whatsapp" && <WhatsAppInboxTab showNotification={showNotification} />}

        {/* TAB 11: PATIENT DIRECTORY & PROFILES */}
        {activeTab === "patients" && <PatientsTab showNotification={showNotification} />}

        {/* TAB 12: DOCTOR ROSTER & CLINICAL SCHEDULES */}
        {activeTab === "doctors" && <DoctorsTab showNotification={showNotification} />}

        {/* TAB 13: MASTER APPOINTMENT DISPATCH */}
        {activeTab === "appointments" && <AppointmentsTab showNotification={showNotification} />}

        {/* TAB 14: CLINICAL ENCOUNTERS & PRESCRIPTIONS */}
        {activeTab === "consultations" && <ConsultationsTab showNotification={showNotification} />}

        {/* TAB 15: PATIENT CARE FOLLOW-UPS */}
        {activeTab === "followups" && <FollowUpsTab showNotification={showNotification} />}

        {/* TAB 16: SERVICES & PROGRAMMES CATALOGUE */}
        {activeTab === "services" && <ServicesTab showNotification={showNotification} />}

        {/* TAB 17: MASTER SHARED CALENDAR */}
        {activeTab === "calendar" && <CalendarTab showNotification={showNotification} />}

        {/* TAB 18: OPERATIONAL TASKS & TICKETS */}
        {activeTab === "tasks" && <TasksTab showNotification={showNotification} />}

        {/* TAB 19: INSTITUTIONAL REPORTS & ANALYTICS */}
        {activeTab === "reports" && <ReportsTab showNotification={showNotification} />}

        {/* TAB 20: INTEGRATIONS HUB */}
        {activeTab === "integrations" && <IntegrationsTab showNotification={showNotification} />}

        {/* MODAL: PROVISION NEW USER */}
        {isProvisionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsProvisionModalOpen(false)} />
            <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl z-10 animate-fade-in">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E9E3]">
                <h3 className="text-base font-semibold text-[#154734]">Provision New Staff Account</h3>
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
                  <label className="block font-medium text-[#18231D] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={provisionForm.name}
                    onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Mehta"
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#18231D] mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={provisionForm.phone}
                    onChange={(e) => setProvisionForm({ ...provisionForm, phone: e.target.value })}
                    placeholder="e.g. 9000000010"
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#18231D] mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={provisionForm.email}
                    onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                    placeholder="staff@trigyna.com"
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#18231D] mb-1">Role Assignment</label>
                  <select
                    value={provisionForm.role}
                    onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value as StaffUser["role"] })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="reception">Reception / Front Desk</option>
                    <option value="admin">Administrator (CRM/HRMS Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#18231D] mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={provisionForm.password}
                    onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                    placeholder="Temporary password..."
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProvisionModalOpen(false)}
                    className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-[#68756D] hover:bg-gray-50 cursor-pointer"
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
            <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl z-10 animate-fade-in">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E9E3]">
                <h3 className="text-base font-semibold text-[#154734]">Reset User Password</h3>
                <button
                  type="button"
                  onClick={() => setIsResetPwdModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <p className="text-[#68756D]">
                  Enter a new temporary password for <span className="font-semibold text-[#18231D]">{selectedUser.name}</span> ({selectedUser.phone}).
                </p>

                <div>
                  <label className="block font-medium text-[#18231D] mb-1">New Temporary Password</label>
                  <input
                    type="text"
                    required
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="e.g. TriGyna@2026"
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl font-mono focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetPwdModalOpen(false)}
                    className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-[#68756D] hover:bg-gray-50 cursor-pointer"
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
      </div>

        {/* ADMIN A4 RECEIPT MODAL */}
        {adminReceiptModal && (
          <div className="receipt-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible print:block">
            <div className="receipt-modal-dialog relative bg-white rounded-3xl max-w-[225mm] w-full p-4 sm:p-6 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150 my-auto print:static print:p-0 print:m-0 print:max-w-none print:border-none print:rounded-none print:shadow-none print:bg-transparent">
              <div className="no-print flex items-center justify-between pb-3 mb-2 border-b border-[#E4EEE7]">
                <span className="text-xs font-semibold text-[#68766F]">
                  Admin Preview • Official Payment Receipt {adminReceiptModal.receiptNumber}
                </span>
                <button
                  onClick={() => setAdminReceiptModal(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full overflow-x-auto print:overflow-visible">
                <A4PaymentReceipt receipt={adminReceiptModal} showActions={true} />
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
