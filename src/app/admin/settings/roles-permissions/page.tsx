"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Search,
  Key,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sliders,
  History,
  Check,
  X,
  FileText,
  UserCheck,
} from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";

interface UserAccount {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  role: "owner" | "super_admin" | "admin" | "doctor" | "reception" | "patient" | "crm" | "sales" | "hrms";
  status: "active" | "inactive" | "suspended" | "invited";
  authVersion?: number;
  customPermissions?: string[];
  deniedPermissions?: string[];
  effectivePermissions?: string[];
  lastLogin?: string;
  createdAt: string;
}

interface PermissionsCatalog {
  permissions: Record<string, string>;
  rolePermissions: Record<string, string[]>;
}

interface SecurityHistoryEntry {
  action: string;
  performedBy?: { name?: string; email?: string } | string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export default function RolesAndPermissionsPage() {
  const { user: currentAuthUser, isOwner } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [catalog, setCatalog] = useState<PermissionsCatalog | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected User for Granular Permission Editing
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [selectedCustomPerms, setSelectedCustomPerms] = useState<string[]>([]);
  const [selectedDeniedPerms, setSelectedDeniedPerms] = useState<string[]>([]);
  const [isSavingPerms, setIsSavingPerms] = useState<boolean>(false);

  // Security History Modal
  const [historyUser, setHistoryUser] = useState<UserAccount | null>(null);
  const [securityHistory, setSecurityHistory] = useState<SecurityHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Status Notification
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Users & Permissions Catalog
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, catalogRes] = await Promise.all([
        api.get<any>("/api/v1/users"),
        api.get<any>("/api/v1/users/permissions/catalog").catch(() => null),
      ]);

      if (usersRes.data?.users) {
        setUsers(usersRes.data.users);
      } else if (Array.isArray(usersRes.data)) {
        setUsers(usersRes.data);
      }

      if (catalogRes?.data?.permissions) {
        setCatalog(catalogRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load security directory";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Account Status Change (Suspend / Activate)
  const handleToggleStatus = async (user: UserAccount) => {
    if (user.role === "owner" && !isOwner) {
      showToast("Only an Owner can modify an Owner's account status.", "error");
      return;
    }

    const newStatus = user.status === "active" ? "suspended" : "active";
    const confirmPrompt =
      newStatus === "suspended"
        ? `Are you sure you want to SUSPEND ${user.name}? All active bearer tokens and sessions will be immediately invalidated.`
        : `Re-activate ${user.name}'s account?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      await api.patch(`/api/v1/users/${user._id}/status`, {
        status: newStatus,
        reason: `Administrative ${newStatus} by ${currentAuthUser?.name || "admin"}`,
      });

      showToast(`User status updated to ${newStatus}. Sessions revoked.`, "success");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Status update failed";
      showToast(msg, "error");
    }
  };

  // Handle Session Revocation
  const handleRevokeSessions = async (user: UserAccount) => {
    if (!window.confirm(`Force terminate all active login sessions for ${user.name}? The user must log in again.`)) {
      return;
    }

    try {
      await api.post(`/api/v1/users/${user._id}/revoke-sessions`, {});
      showToast(`Active sessions for ${user.name} have been revoked.`, "success");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke sessions";
      showToast(msg, "error");
    }
  };

  // Open Permission Editor
  const openPermissionEditor = (user: UserAccount) => {
    setEditingUser(user);
    setSelectedCustomPerms(user.customPermissions || []);
    setSelectedDeniedPerms(user.deniedPermissions || []);
  };

  // Save Granular Permissions
  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setIsSavingPerms(true);
    try {
      await api.patch(`/api/v1/users/${editingUser._id}/permissions`, {
        customPermissions: selectedCustomPerms,
        deniedPermissions: selectedDeniedPerms,
      });

      showToast(`Granular permissions updated for ${editingUser.name}.`, "success");
      setEditingUser(null);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update permissions";
      showToast(msg, "error");
    } finally {
      setIsSavingPerms(false);
    }
  };

  // View Security History
  const openSecurityHistory = async (user: UserAccount) => {
    setHistoryUser(user);
    setIsLoadingHistory(true);
    try {
      const res = await api.get<any>(`/api/v1/users/${user._id}/security-history`);
      if (res.data?.securityHistory) {
        setSecurityHistory(res.data.securityHistory);
      } else {
        setSecurityHistory([]);
      }
    } catch {
      setSecurityHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.phone.includes(searchQuery);

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Grouped permissions for UI
  const permissionCategories: Record<string, string[]> = {
    "User & Access Control": [
      "users.view",
      "users.create",
      "users.edit",
      "users.status",
      "users.roles",
      "users.permissions",
      "users.sessions.revoke",
      "audit.view",
    ],
    "Doctor Management": [
      "doctors.view",
      "doctors.create",
      "doctors.verify",
      "doctors.status",
      "doctors.schedule",
    ],
    "Sales & CRM Operations": [
      "sales.view",
      "leads.view_all",
      "leads.view_assigned",
      "leads.create",
      "leads.assign",
      "leads.reassign",
      "discounts.approve",
      "crm.manage",
      "crm.followups.manage",
    ],
    "Patient Directory": [
      "patients.view_all",
      "patients.view_assigned",
      "patients.create",
      "patients.edit",
      "patients.duplicates",
      "patients.merge",
      "clinical.audit.view",
    ],
    "Clinical Practice & EHR": [
      "clinical.consultations.read_assigned",
      "clinical.consultations.write_assigned",
      "clinical.consultations.finalize",
      "clinical.consultations.amend",
      "clinical.prescriptions.create",
      "clinical.prescriptions.sign",
      "clinical.prescriptions.read_assigned",
      "clinical.treatment_plans.manage",
      "clinical.oversight.view",
    ],
    "Finance & Billing": [
      "billing.view_all",
      "billing.view_assigned",
      "billing.invoices.create",
      "billing.payment_links.create",
      "billing.refund.approve",
      "billing.credit_notes.approve",
      "billing.pricing.manage",
      "financial.audit",
    ],
    "System & Integrations": [
      "integrations.manage",
      "system.logs.view",
      "system.settings.manage",
    ],
  };

  return (
    <RoleGuard allowedRoles={["owner", "admin"]}>
      <div className="min-h-screen bg-[#F9F7F1] text-[#17221D] font-sans pb-16">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold animate-fade-in ${
              toast.type === "success"
                ? "bg-[#E9F8F0] border-[#087A50] text-[#087A50]"
                : toast.type === "error"
                ? "bg-red-50 border-red-300 text-red-700"
                : "bg-blue-50 border-blue-300 text-blue-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Top Header Banner */}
        <header className="bg-white border-b border-[#E8E2D6] sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="p-2 rounded-xl bg-[#F9F7F1] border border-[#E8E2D6] text-[#626B63] hover:text-[#154734] hover:bg-white transition-colors"
                title="Return to Admin Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#154734]">
                    Roles &amp; Granular Permissions
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]">
                    Zero-Trust RBAC + ABAC
                  </span>
                </div>
                <p className="text-xs text-[#626B63] mt-0.5">
                  Configure role scopes, explicit overrides, session revocation, and account security policies
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={fetchData}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl border border-[#E8E2D6] bg-white hover:bg-[#F9F7F1] text-xs font-semibold text-[#154734] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Hub</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Key Security Principles Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#626B63]">
                  Admin Oversight
                </span>
                <ShieldCheck className="w-4 h-4 text-[#154734]" />
              </div>
              <p className="text-xl font-bold text-[#17221D]">
                {users.filter((u) => u.role === "admin" || u.role === "owner").length}
              </p>
              <p className="text-[11px] text-[#626B63] mt-1">Full governance &amp; operational oversight</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#626B63]">
                  Doctor Scope
                </span>
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xl font-bold text-[#17221D]">
                {users.filter((u) => u.role === "doctor").length}
              </p>
              <p className="text-[11px] text-[#626B63] mt-1">Assigned patients, notes &amp; prescriptions only</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#626B63]">
                  Sales Team Scope
                </span>
                <Key className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl font-bold text-[#17221D]">
                {users.filter((u) => u.role === "sales" || u.role === "crm").length}
              </p>
              <p className="text-[11px] text-[#626B63] mt-1">Assigned leads only; Zero clinical record access</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#626B63]">
                  Active Sessions Security
                </span>
                <Lock className="w-4 h-4 text-[#087A50]" />
              </div>
              <p className="text-xl font-bold text-[#087A50]">AuthVersion Active</p>
              <p className="text-[11px] text-[#626B63] mt-1">Instant invalidation on status/role/permission changes</p>
            </div>
          </div>

          {/* User Directory & Permission Controls */}
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search accounts by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E8E2D6] rounded-xl focus:ring-2 focus:ring-[#154734] focus:outline-none bg-[#F9F7F1]/30"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-xs border border-[#E8E2D6] rounded-xl px-3 py-2 bg-white text-[#17221D] focus:outline-none focus:ring-2 focus:ring-[#154734]"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner / SuperAdmin</option>
                  <option value="admin">Administrator</option>
                  <option value="doctor">Doctor</option>
                  <option value="sales">Sales Team</option>
                  <option value="crm">CRM Representative</option>
                  <option value="reception">Reception</option>
                  <option value="patient">Patient</option>
                  <option value="hrms">HRMS</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-[#E8E2D6] rounded-xl px-3 py-2 bg-white text-[#17221D] focus:outline-none focus:ring-2 focus:ring-[#154734]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="text-xs text-[#626B63] font-medium self-end sm:self-center">
                Showing <span className="font-bold text-[#17221D]">{filteredUsers.length}</span> of {users.length} accounts
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="py-16 text-center text-[#626B63] flex flex-col items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-[#154734] mb-3" />
                <span className="text-xs font-semibold">Loading security identity directory...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-[#626B63] text-xs">
                No user accounts match current search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E8E2D6]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F9F7F1] border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3.5 whitespace-nowrap">Identity</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Primary Role</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Auth Version</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Granular Overrides</th>
                      <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D6]/80">
                    {filteredUsers.map((u) => {
                      const hasCustom = (u.customPermissions && u.customPermissions.length > 0) || (u.deniedPermissions && u.deniedPermissions.length > 0);
                      return (
                        <tr key={u._id} className="hover:bg-[#F9F7F1]/50 transition-colors">
                          <td className="py-3 px-3.5">
                            <p className="font-bold text-[#17221D]">{u.name}</p>
                            <p className="text-[#626B63] text-[11px] font-mono">
                              {u.phone} {u.email ? `• ${u.email}` : ""}
                            </p>
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                u.role === "owner"
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : u.role === "admin"
                                  ? "bg-[#E9F8F0] text-[#087A50] border-[#D1F2E0]"
                                  : u.role === "doctor"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : u.role === "sales" || u.role === "crm"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${
                                u.status === "active"
                                  ? "bg-[#E9F8F0] text-[#087A50] border-[#D1F2E0]"
                                  : u.status === "suspended"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 font-mono text-[11px] text-[#626B63] whitespace-nowrap">
                            v{u.authVersion || 1}
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {hasCustom ? (
                              <div className="flex items-center gap-1.5">
                                {u.customPermissions && u.customPermissions.length > 0 && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                                    +{u.customPermissions.length} Grants
                                  </span>
                                )}
                                {u.deniedPermissions && u.deniedPermissions.length > 0 && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                    -{u.deniedPermissions.length} Denials
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#94A3B8]">Default Role Policy</span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-right whitespace-nowrap space-x-1.5">
                            {/* Granular Permissions Button */}
                            <button
                              type="button"
                              onClick={() => openPermissionEditor(u)}
                              className="px-2.5 py-1 text-[11px] font-semibold border border-[#E8E2D6] rounded-xl bg-white hover:bg-[#F9F7F1] text-[#154734] transition-colors cursor-pointer"
                              title="Edit custom permissions"
                            >
                              <Sliders className="w-3 h-3 inline mr-1" />
                              Permissions
                            </button>

                            {/* Revoke Sessions Button */}
                            <button
                              type="button"
                              onClick={() => handleRevokeSessions(u)}
                              className="px-2.5 py-1 text-[11px] font-semibold border border-[#E8E2D6] rounded-xl bg-white hover:bg-amber-50 text-amber-700 hover:border-amber-300 transition-colors cursor-pointer"
                              title="Force invalidate all active JWT tokens"
                            >
                              <RotateCcw className="w-3 h-3 inline mr-1" />
                              Revoke
                            </button>

                            {/* Suspend / Activate Button */}
                            {u.role !== "owner" && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl border transition-colors cursor-pointer ${
                                  u.status === "active"
                                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                    : "bg-[#E9F8F0] text-[#087A50] border-[#D1F2E0] hover:bg-[#D1F2E0]"
                                }`}
                              >
                                {u.status === "active" ? "Suspend" : "Activate"}
                              </button>
                            )}

                            {/* Security History Button */}
                            <button
                              type="button"
                              onClick={() => openSecurityHistory(u)}
                              className="px-2 py-1 text-[11px] font-semibold text-[#626B63] hover:text-[#17221D] cursor-pointer"
                              title="View security log"
                            >
                              <History className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Modal: Granular Permissions Editor */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-[#E8E2D6] flex items-center justify-between bg-[#F9F7F1]/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#17221D]">
                      Granular Permissions: {editingUser.name}
                    </h3>
                    <p className="text-xs text-[#626B63]">
                      Base Role: <span className="font-semibold uppercase">{editingUser.role}</span> • AuthVersion: v{editingUser.authVersion || 1}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-[#626B63] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-800 text-[11px] leading-relaxed">
                  <strong>Notice:</strong> Modifying permissions increments the user&apos;s authorization version. Any active JWT session will immediately reflect new access boundaries or be prompted to re-authenticate.
                </div>

                {Object.entries(permissionCategories).map(([categoryName, perms]) => (
                  <div key={categoryName} className="border border-[#E8E2D6] rounded-2xl p-4 bg-[#F9F7F1]/20">
                    <h4 className="font-bold text-[#154734] mb-3 text-xs uppercase tracking-wider flex items-center justify-between">
                      <span>{categoryName}</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((p) => {
                        const isGranted = selectedCustomPerms.includes(p);
                        const isDenied = selectedDeniedPerms.includes(p);

                        return (
                          <div
                            key={p}
                            className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                              isGranted
                                ? "bg-green-50 border-green-300"
                                : isDenied
                                ? "bg-red-50 border-red-300"
                                : "bg-white border-[#E8E2D6]"
                            }`}
                          >
                            <span className="font-mono text-[11px] text-[#17221D] truncate max-w-[180px]" title={p}>
                              {p}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isGranted) {
                                    setSelectedCustomPerms(selectedCustomPerms.filter((x) => x !== p));
                                  } else {
                                    setSelectedCustomPerms([...selectedCustomPerms, p]);
                                    setSelectedDeniedPerms(selectedDeniedPerms.filter((x) => x !== p));
                                  }
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                  isGranted ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-green-100"
                                }`}
                                title="Explicit Grant"
                              >
                                Grant
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isDenied) {
                                    setSelectedDeniedPerms(selectedDeniedPerms.filter((x) => x !== p));
                                  } else {
                                    setSelectedDeniedPerms([...selectedDeniedPerms, p]);
                                    setSelectedCustomPerms(selectedCustomPerms.filter((x) => x !== p));
                                  }
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                  isDenied ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-red-100"
                                }`}
                                title="Explicit Deny"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-[#E8E2D6] bg-[#F9F7F1]/50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D6] bg-white text-xs font-semibold text-[#626B63] hover:text-[#17221D] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={isSavingPerms}
                  className="px-5 py-2 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSavingPerms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Permissions &amp; Revoke Old Token</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Security History Log */}
        {historyUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-[#E8E2D6] flex items-center justify-between bg-[#F9F7F1]/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#17221D]">
                      Security History: {historyUser.name}
                    </h3>
                    <p className="text-xs text-[#626B63]">Audit trail of session revocations and permission modifications</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryUser(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-[#626B63] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
                {isLoadingHistory ? (
                  <div className="py-12 text-center text-[#626B63] flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#154734] mb-2" />
                    <span>Loading security events...</span>
                  </div>
                ) : securityHistory.length === 0 ? (
                  <div className="py-8 text-center text-[#626B63] text-xs">
                    No special security events recorded for this account.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {securityHistory.map((entry, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-[#E8E2D6] bg-[#F9F7F1]/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#154734] uppercase tracking-wide text-[10px]">
                            {entry.action}
                          </span>
                          <span className="text-[10px] text-[#94A3B8]">
                            {new Date(entry.timestamp).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {entry.details && (
                          <pre className="text-[10px] font-mono bg-white p-2 rounded border border-[#E8E2D6] overflow-x-auto text-[#626B63]">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-[#E8E2D6] bg-[#F9F7F1]/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setHistoryUser(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E8E2D6] text-xs font-semibold text-[#17221D] hover:bg-[#F9F7F1]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
