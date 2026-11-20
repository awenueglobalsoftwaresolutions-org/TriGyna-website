"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
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
  UserCheck2,
  Lock,
} from "lucide-react";
import RoleGuard from "@/components/dashboard/RoleGuard";
import { AdminDashboardShell } from "@/components/dashboard/admin/AdminDashboardShell";
import { api, getToken, getBaseUrl } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";
import { A4PaymentReceipt, BillingReceiptModal, PaymentReceiptData, ReceiptItem } from "@/components/billing/A4PaymentReceipt";
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
import { SalesTeamTab } from "@/components/dashboard/sales/tabs/SalesTeamTab";
import { ClinicBranchesTab } from "@/components/dashboard/admin/ClinicBranchesTab";

// Types
interface StaffUser {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  role: "owner" | "admin" | "doctor" | "reception" | "patient" | "crm" | "sales" | "hrms";
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

interface PendingRefund {
  _id: string;
  refundNumber: string;
  patientId?: {
    patientCode?: string;
    fullName?: string;
    phone?: string;
    email?: string;
  };
  orderId?: {
    orderNumber?: string;
    totalAmount?: number;
    paidAmount?: number;
  };
  invoiceId?: {
    invoiceNumber?: string;
    totalAmount?: number;
    paidAmount?: number;
  };
  requestedAmount: number;
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
  status: "pending" | "partially_paid" | "paid" | "refunded" | "cancelled" | "draft" | "issued" | "overdue" | string;
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

  // Search & Date Range filters from Top Bar
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("month");

  // Read tab parameter from URL on initial load and history navigation
  useEffect(() => {
    const handleUrlTab = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get("tab");
        if (urlTab) setActiveTab(urlTab);
      }
    };
    handleUrlTab();
    window.addEventListener("popstate", handleUrlTab);
    return () => window.removeEventListener("popstate", handleUrlTab);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("tab", tab);
      window.history.pushState({}, "", newUrl.toString());
    }
  };

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
  const [pendingRefunds, setPendingRefunds] = useState<PendingRefund[]>([]);
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

  const showNotification = useCallback((msg: string, isError = false) => {
    // Schedule asynchronous update to avoid React setState in child render phase
    setTimeout(() => {
      if (isError) {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(null), 5000);
      } else {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    }, 0);
  }, []);

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

  // 2. Fetch Approvals Queue
  const loadApprovals = useCallback(async () => {
    try {
      setIsLoadingApprovals(true);
      const res = await api.get<{
        pendingLeaves: PendingLeave[];
        pendingCorrections: PendingCorrection[];
        pendingRefunds?: PendingRefund[];
      }>("/approvals");
      if (res.data) {
        setPendingLeaves(res.data.pendingLeaves || []);
        setPendingCorrections(res.data.pendingCorrections || []);
        setPendingRefunds(res.data.pendingRefunds || []);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load approvals", true);
    } finally {
      setIsLoadingApprovals(false);
    }
  }, []);

  // 3. Fetch Invoices & Revenue
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
      setAdminReceiptModal(null);

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
    const token = getToken();
    const apiUrl = getBaseUrl();
    const endpoint = inv.status === "paid" ? `/receipts/by-invoice/${inv._id}/pdf` : `/invoices/${inv._id}/pdf`;
    window.open(`${apiUrl}${endpoint}${token ? `?token=${encodeURIComponent(token)}` : ""}`, "_blank");
  };

  // 4. Fetch Audit Logs
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

  // Initial mount: load approvals count for dynamic sidebar badge
  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

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

    try {
      setIsSubmitting(true);
      await api.post(`/users/${selectedUser._id}/reset-password`, {
        newPassword: tempPassword.trim(),
      });
      showNotification(`Password successfully updated for ${selectedUser.name}!`);
      setIsResetPwdModalOpen(false);
      setSelectedUser(null);
      setTempPassword("");
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to reset password", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Provision New User Handler
  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionForm.name || !provisionForm.phone || !provisionForm.password) {
      showNotification("Please provide full name, phone number, and password", true);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/users", provisionForm);
      showNotification(`Staff user account created for ${provisionForm.name}!`);
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
      showNotification(err instanceof Error ? err.message : "Failed to provision user", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approvals Actions
  const handleReviewLeave = async (leaveId: string, status: "approved" | "rejected") => {
    try {
      await api.patch(`/approvals/leaves/${leaveId}/review`, { status, notes: `Reviewed by Admin` });
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

  const handleApproveRefund = async (refundId: string) => {
    try {
      await api.post(`/approvals/refunds/${refundId}/approve`, { reviewNotes: "Approved by Admin" });
      showNotification("Refund request approved and processed successfully");
      loadApprovals();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Refund approval failed", true);
    }
  };

  const handleRejectRefund = async (refundId: string) => {
    const reason = window.prompt("Please enter rejection reason for this refund request:");
    if (!reason || !reason.trim()) return;
    try {
      await api.post(`/approvals/refunds/${refundId}/reject`, { rejectionReason: reason.trim() });
      showNotification("Refund request rejected");
      loadApprovals();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Refund rejection failed", true);
    }
  };

  return (
    <RoleGuard allowedRoles={["owner", "admin"]}>
      <AdminDashboardShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateRange={dateRange}
        setDateRange={setDateRange}
        pendingApprovalsCount={pendingLeaves.length + pendingCorrections.length + pendingRefunds.length}
        onQuickAction={(action) => {
          if (action === "provision_user") setIsProvisionModalOpen(true);
          else if (action === "add_lead") handleTabChange("crm");
          else if (action === "register_patient") handleTabChange("patients");
          else if (action === "book_appointment") handleTabChange("appointments");
          else if (action === "billing") handleTabChange("billing");
        }}
        onRefreshData={() => {
          if (activeTab === "users") loadUsers();
          else if (activeTab === "approvals") loadApprovals();
          else if (activeTab === "billing") loadInvoices();
          else if (activeTab === "audit") loadAuditLogs();
        }}
      >
        {/* Banner Alerts */}
        {successMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#15803D] flex items-center gap-2.5 text-xs font-semibold animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] flex items-center gap-2.5 text-xs font-semibold animate-fade-in shadow-2xs">
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className={adminReceiptModal ? "print:hidden" : ""}>
          {/* TAB 1: OVERVIEW & KPIS (SALES DASHBOARD UI & REAL METRICS) */}
          {activeTab === "overview" && (
            <AdminOverviewExact
              dateRange={dateRange}
              onTabChange={handleTabChange}
              showNotification={showNotification}
              onOpenAddLead={() => handleTabChange("crm")}
              onOpenRegisterPatient={() => handleTabChange("patients")}
              onOpenBookAppointment={() => handleTabChange("appointments")}
              onOpenAddEmployee={() => handleTabChange("hrms")}
              onOpenCreateTask={() => handleTabChange("tasks")}
              onOpenRecordPayment={() => handleTabChange("billing")}
            />
          )}

          {/* TAB 2: USER DIRECTORY & RBAC */}
          {activeTab === "users" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by name, phone, or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#087A50]"
                  >
                    <option value="">All Roles</option>
                    <option value="owner">Owner / SuperAdmin</option>
                    <option value="admin">Administrator</option>
                    <option value="doctor">Doctor</option>
                    <option value="reception">Reception</option>
                    <option value="patient">Patient</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-xs text-[#64748B] font-medium">
                    {users.length} accounts found
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsProvisionModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Provision User</span>
                  </button>
                </div>
              </div>

              {isLoadingUsers ? (
                <div className="py-12 text-center text-[#64748B] flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#087A50] mb-2" />
                  <span className="text-xs">Loading user directory...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center text-[#64748B] text-xs">
                  No user accounts match current search criteria.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E5EAF0]">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3.5 whitespace-nowrap">Name &amp; Contact</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Role</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                        <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]/70 font-sans">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-3.5">
                            <p className="font-semibold text-[#111827] truncate max-w-[200px]">{u.name}</p>
                            <p className="text-[#64748B] text-[11px] font-mono truncate max-w-[220px]">
                              {u.phone} {u.email ? `• ${u.email}` : ""}
                            </p>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border shrink-0 ${
                                u.role === "owner"
                                  ? "bg-purple-100 text-purple-800 border-purple-200"
                                  : u.role === "admin"
                                  ? "bg-[#E9F8F0] text-[#087A50] border-[#D1F2E0]"
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
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ${
                                u.status === "active"
                                  ? "bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setIsResetPwdModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold border border-[#E5EAF0] rounded-xl bg-white hover:bg-[#F8FAFC] text-[#087A50] cursor-pointer"
                            >
                              Reset Password
                            </button>
                            {u.role !== "owner" && (
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl border cursor-pointer ${
                                  u.status === "active"
                                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                    : "bg-[#E9F8F0] text-[#087A50] border-[#D1F2E0] hover:bg-[#D1F2E0]"
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
            <div className="space-y-6 font-sans">
              {/* Leave Requests */}
              <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between min-w-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-sans text-base font-bold text-[#111827] truncate">Staff Leave Requests</h3>
                    <p className="font-sans text-xs text-[#64748B] truncate">Review, authorize, or decline pending clinic employee leaves.</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0 ml-2">
                    {pendingLeaves.length} Pending
                  </span>
                </div>

                {isLoadingApprovals ? (
                  <div className="py-8 text-center text-xs text-[#64748B]">Loading approvals...</div>
                ) : pendingLeaves.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#64748B]">No pending leave requests requiring review.</div>
                ) : (
                  <div className="space-y-3">
                    {pendingLeaves.map((leave) => (
                      <div
                        key={leave._id}
                        className="p-4 bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="font-bold text-[#111827] truncate">
                              {leave.employeeId?.userId?.name || "Staff Member"}
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                              ({leave.employeeId?.employeeCode || "EMP"})
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-semibold capitalize shrink-0">
                              {leave.leaveType}
                            </span>
                          </div>
                          <p className="text-[#64748B] mt-1 font-mono text-[11px]">
                            {leave.startDate} to {leave.endDate} ({leave.totalDays} day{leave.totalDays > 1 ? "s" : ""})
                          </p>
                          <p className="text-[11px] text-[#111827] mt-0.5 italic line-clamp-2 break-words">&ldquo;{leave.reason}&rdquo;</p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleReviewLeave(leave._id, "approved")}
                            className="px-3.5 py-1.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewLeave(leave._id, "rejected")}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
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
              <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between min-w-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-sans text-base font-bold text-[#111827] truncate">Attendance Time-Card Corrections</h3>
                    <p className="font-sans text-xs text-[#64748B] truncate">Review clock-in/out dispute requests from staff.</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shrink-0 ml-2">
                    {pendingCorrections.length} Pending
                  </span>
                </div>

                {pendingCorrections.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#64748B]">No pending attendance corrections.</div>
                ) : (
                  <div className="space-y-3">
                    {pendingCorrections.map((corr) => (
                      <div
                        key={corr._id}
                        className="p-4 bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="font-bold text-[#111827] truncate">
                              {corr.employeeId?.userId?.name || "Staff Member"}
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                              Date: {corr.attendanceDate}
                            </span>
                          </div>
                          <p className="text-[#64748B] mt-1 text-[11px]">
                            Requested In: <span className="font-mono font-semibold text-[#111827]">{corr.requestedCheckIn || "N/A"}</span> | Requested Out: <span className="font-mono font-semibold text-[#111827]">{corr.requestedCheckOut || "N/A"}</span>
                          </p>
                          <p className="text-[11px] text-[#111827] mt-0.5 italic line-clamp-2 break-words">&ldquo;{corr.reason}&rdquo;</p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleReviewCorrection(corr._id, "approved")}
                            className="px-3.5 py-1.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewCorrection(corr._id, "rejected")}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
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

              {/* Patient Refund Requests */}
              <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between min-w-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-sans text-base font-bold text-[#111827] truncate">Patient Refund Requests</h3>
                    <p className="font-sans text-xs text-[#64748B] truncate">Authorize or reject payment refund claims submitted by patients or staff.</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 shrink-0 ml-2">
                    {pendingRefunds.length} Pending
                  </span>
                </div>

                {pendingRefunds.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#64748B]">No pending refund requests requiring review.</div>
                ) : (
                  <div className="space-y-3">
                    {pendingRefunds.map((refund) => (
                      <div
                        key={refund._id}
                        className="p-4 bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="font-bold text-[#111827] truncate">
                              {refund.patientId?.fullName || "Patient"}
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                              ({refund.patientId?.patientCode || "PAT"})
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-semibold font-mono shrink-0">
                              ₹{refund.requestedAmount?.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                              Ref: {refund.refundNumber}
                            </span>
                          </div>
                          <p className="text-[#64748B] mt-1 text-[11px]">
                            {refund.orderId?.orderNumber && (
                              <span className="font-mono">Order: {refund.orderId.orderNumber} </span>
                            )}
                            {refund.invoiceId?.invoiceNumber && (
                              <span className="font-mono">| Invoice: {refund.invoiceId.invoiceNumber}</span>
                            )}
                          </p>
                          <p className="text-[11px] text-[#111827] mt-0.5 italic line-clamp-2 break-words">&ldquo;{refund.reason}&rdquo;</p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveRefund(refund._id)}
                            className="px-3.5 py-1.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Authorize</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRefund(refund._id)}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
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
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 sm:p-6 shadow-xs space-y-4 font-sans">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter audit records by action or entity..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                  />
                </div>
                <span className="text-xs text-[#64748B] font-medium self-end sm:self-center shrink-0">
                  {auditLogs.length} immutable records
                </span>
              </div>

              {isLoadingAudit ? (
                <div className="py-12 text-center text-xs text-[#64748B]">Loading security logs...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B]">No audit trail entries found.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E5EAF0]">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3.5 whitespace-nowrap">Timestamp</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Action</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Entity &amp; Target</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Role</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Details / IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]/70 font-mono text-[11px]">
                      {auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-3.5 text-[#64748B] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#E9F8F0] text-[#087A50] font-semibold border border-[#D1F2E0]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-[#111827] whitespace-nowrap">
                            {log.targetEntity} {log.targetId ? `(${log.targetId.slice(-6)})` : ""}
                          </td>
                          <td className="py-2.5 px-3.5 capitalize text-[#64748B] whitespace-nowrap">{log.actorRole || "system"}</td>
                          <td className="py-2.5 px-3.5 text-[#64748B] truncate max-w-xs">
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

          {/* TAB 5: CRM EXACT WORKSPACE */}
          {activeTab === "crm" && (
            <CrmExactTab showNotification={showNotification} onTabChange={handleTabChange} />
          )}

          {/* TAB 6: HRMS SUITE */}
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

          {/* TAB 8: CLINIC BRANCHES & FACILITIES */}
          {activeTab === "organization" && (
            <ClinicBranchesTab showNotification={showNotification} />
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
          {activeTab === "appointments" && <AppointmentsTab showNotification={showNotification} onTabChange={handleTabChange} />}

          {/* TAB 14: CLINICAL ENCOUNTERS & PRESCRIPTIONS */}
          {activeTab === "consultations" && <ConsultationsTab showNotification={showNotification} />}

          {/* TAB 15: PATIENT CARE FOLLOW-UPS */}
          {activeTab === "followups" && <FollowUpsTab showNotification={showNotification} />}

          {/* TAB 16: SERVICES & PROGRAMMES CATALOGUE */}
          {activeTab === "services" && (
            <ServicesTab
              showNotification={showNotification}
              onQuickBook={() => handleTabChange("appointments")}
            />
          )}

          {/* TAB 17: MASTER SHARED CALENDAR */}
          {activeTab === "calendar" && <CalendarTab showNotification={showNotification} onNavigateToTab={handleTabChange} />}

          {/* TAB 18: OPERATIONAL TASKS & TICKETS */}
          {activeTab === "tasks" && <TasksTab showNotification={showNotification} />}

          {/* TAB 19: INSTITUTIONAL REPORTS & ANALYTICS */}
          {activeTab === "reports" && <ReportsTab showNotification={showNotification} />}

          {/* TAB 20: INTEGRATIONS HUB */}
          {activeTab === "integrations" && <IntegrationsTab showNotification={showNotification} />}

          {/* TAB 21: SALES TEAM DIRECTORY & PERFORMANCE */}
          {activeTab === "sales" && <SalesTeamTab showNotification={showNotification} />}

          {/* MODAL: PROVISION NEW USER */}
          {isProvisionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsProvisionModalOpen(false)} />
              <div className="relative bg-white border border-[#E5EAF0] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl z-10 animate-fade-in font-sans">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5EAF0]">
                  <h3 className="font-sans text-base font-bold text-[#111827]">Provision New Staff Account</h3>
                  <button
                    type="button"
                    onClick={() => setIsProvisionModalOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleProvisionUser} className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={provisionForm.name}
                      onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                      placeholder="e.g. Dr. Rajesh Mehta"
                      className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={provisionForm.phone}
                      onChange={(e) => setProvisionForm({ ...provisionForm, phone: e.target.value })}
                      placeholder="e.g. 9000000010"
                      className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={provisionForm.email}
                      onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                      placeholder="staff@trigyna.com"
                      className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Role Assignment</label>
                    <select
                      value={provisionForm.role}
                      onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value as StaffUser["role"] })}
                      className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#087A50]"
                    >
                      <option value="doctor">Doctor</option>
                      <option value="reception">Reception / Front Desk</option>
                      <option value="admin">Administrator</option>
                      <option value="sales">Sales &amp; CRM Executive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Initial Password *</label>
                    <input
                      type="password"
                      required
                      value={provisionForm.password}
                      onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                      placeholder="Temporary password..."
                      className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-[#E5EAF0]">
                    <button
                      type="button"
                      onClick={() => setIsProvisionModalOpen(false)}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-60 shadow-xs"
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
              <div className="relative bg-white border border-[#E5EAF0] rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl z-10 animate-fade-in font-sans">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5EAF0]">
                  <h3 className="font-sans text-base font-bold text-[#111827]">Reset User Password</h3>
                  <button
                    type="button"
                    onClick={() => setIsResetPwdModalOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                  <p className="text-[#64748B]">
                    Enter a new temporary password for <span className="font-bold text-[#111827]">{selectedUser.name}</span> ({selectedUser.phone}).
                  </p>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">New Temporary Password *</label>
                    <input
                      type="text"
                      required
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="e.g. TriGyna@2026"
                      className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl font-mono focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-[#E5EAF0]">
                    <button
                      type="button"
                      onClick={() => setIsResetPwdModalOpen(false)}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-60 shadow-xs"
                    >
                      {isSubmitting ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ADMIN BILLING RECEIPT MODAL */}
        {adminReceiptModal && (
          <BillingReceiptModal
            receipt={adminReceiptModal}
            showActions={true}
            onClose={() => setAdminReceiptModal(null)}
          />
        )}
      </AdminDashboardShell>
    </RoleGuard>
  );
}