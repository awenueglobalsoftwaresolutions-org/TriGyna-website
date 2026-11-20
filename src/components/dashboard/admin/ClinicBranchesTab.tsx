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
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Check,
  X,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { ModalPortal } from "@/components/ui/ModalPortal";

export interface BranchRecord {
  _id?: string;
  branchCode: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  operatingHours?: string;
  status: "active" | "inactive";
  createdAt?: string;
}

export interface OrganizationRecord {
  _id: string;
  name: string;
  tagline?: string;
  email?: string;
  phone?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  branches: BranchRecord[];
}

interface ClinicBranchesTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
}

export function ClinicBranchesTab({ showNotification }: ClinicBranchesTabProps) {
  const [organization, setOrganization] = useState<OrganizationRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Add Branch Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBranch, setNewBranch] = useState({
    branchCode: "",
    name: "",
    phone: "+91",
    email: "",
    address: "",
    operatingHours: "09:00 - 19:00 (Mon - Sat)",
    status: "active" as "active" | "inactive",
  });

  const loadOrganization = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const res = await api.get<{ organization: OrganizationRecord }>("/organization");
      if (res.data?.organization) {
        setOrganization(res.data.organization);
        setBranches(res.data.organization.branches || []);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load clinic branches", true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const handleRefresh = async () => {
    await loadOrganization(true);
    showNotification("Clinic facilities & branches refreshed");
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.branchCode.trim() || !newBranch.name.trim() || !newBranch.phone.trim() || !newBranch.address.trim()) {
      showNotification("Please fill in all required branch details", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ organization: OrganizationRecord }>("/organization/branches", {
        branchCode: newBranch.branchCode.trim(),
        name: newBranch.name.trim(),
        phone: newBranch.phone.trim(),
        email: newBranch.email.trim() || undefined,
        address: newBranch.address.trim(),
        operatingHours: newBranch.operatingHours.trim() || "09:00 - 19:00 (Mon - Sat)",
        status: newBranch.status,
      });

      if (res.success && res.data?.organization) {
        setOrganization(res.data.organization);
        setBranches(res.data.organization.branches || []);
        showNotification(`Facility '${newBranch.name}' registered successfully`);
        setIsAddModalOpen(false);
        setNewBranch({
          branchCode: "",
          name: "",
          phone: "+91",
          email: "",
          address: "",
          operatingHours: "09:00 - 19:00 (Mon - Sat)",
          status: "active",
        });
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to register branch facility", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.branchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.phone && b.phone.includes(searchQuery));
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = branches.filter((b) => b.status === "active").length;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#087A50] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#111827] truncate">
                {organization?.name || "TriGyna Healthcare & Wellness"}
              </h2>
              <p className="text-xs text-[#64748B] truncate">
                {organization?.tagline || "Women | Health | Wellness"} • Telehealth Hub &amp; Physical Facilities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 border border-[#E5EAF0] rounded-xl text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              title="Refresh branches"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#087A50]" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Facility</span>
            </button>
          </div>
        </div>

        {/* Facilities KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#E5EAF0]">
          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]/60">
            <span className="text-[11px] font-medium text-[#64748B]">Total Facilities</span>
            <p className="text-lg font-bold text-[#111827] mt-0.5">{branches.length}</p>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]/60">
            <span className="text-[11px] font-medium text-[#64748B]">Active Clinical Hubs</span>
            <p className="text-lg font-bold text-[#087A50] mt-0.5">{activeCount}</p>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]/60">
            <span className="text-[11px] font-medium text-[#64748B]">Telehealth Coverage</span>
            <p className="text-lg font-bold text-[#2563EB] mt-0.5">Pan-India Online</p>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]/60">
            <span className="text-[11px] font-medium text-[#64748B]">HQ Timezone</span>
            <p className="text-lg font-bold text-[#111827] mt-0.5">{organization?.timezone || "Asia/Kolkata"}</p>
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search facilities by name, code, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#64748B]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#087A50]"
          >
            <option value="all">All Statuses ({branches.length})</option>
            <option value="active">Active Only ({activeCount})</option>
            <option value="inactive">Inactive ({branches.length - activeCount})</option>
          </select>
        </div>
      </div>

      {/* 3. Facilities Grid / List */}
      {isLoading ? (
        <div className="py-20 text-center text-[#64748B] flex flex-col items-center justify-center bg-white rounded-2xl border border-[#E5EAF0]">
          <Loader2 className="w-7 h-7 animate-spin text-[#087A50] mb-2" />
          <span className="text-xs font-medium">Loading clinical facilities from database...</span>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="py-16 text-center text-[#64748B] bg-white rounded-2xl border border-[#E5EAF0] p-6">
          <Building2 className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          <p className="text-xs font-medium text-[#111827]">No clinical facilities match the current criteria.</p>
          <p className="text-[11px] text-[#64748B] mt-1">Try adjusting your search query or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBranches.map((branch) => (
            <div
              key={branch._id || branch.branchCode}
              className="p-5 bg-white border border-[#E5EAF0] rounded-2xl hover:border-[#087A50]/40 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide font-mono px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                    {branch.branchCode}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
                      branch.status === "active"
                        ? "bg-[#E9F8F0] text-[#087A50] border-[#D1F2E0]"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {branch.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#111827] mt-2.5 truncate">{branch.name}</h3>

                <div className="mt-3 space-y-2 text-xs text-[#64748B]">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                    <span className="font-mono">{branch.phone}</span>
                  </div>
                  {branch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                      <span className="truncate">{branch.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                    <span className="font-medium text-[#111827]">{branch.operatingHours || "08:00 - 20:00"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5EAF0]/60 flex items-center justify-between text-[11px]">
                <span className="text-[#64748B] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#087A50]" />
                  Verified Clinic Facility
                </span>
                <span className="text-[#087A50] font-semibold">100% Online Telehealth Synchronized</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Add Branch Modal */}
      <ModalPortal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <div className="bg-white rounded-2xl border border-[#E5EAF0] max-w-lg w-full p-6 shadow-xl relative animate-scale-in">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(false)}
            className="absolute right-4 top-4 text-[#94A3B8] hover:text-[#111827] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">Register New Facility</h3>
                  <p className="text-xs text-[#64748B]">Add a clinic facility or physical hub to TriGyna.</p>
                </div>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#374151] mb-1">
                      Branch Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BR-03"
                      value={newBranch.branchCode}
                      onChange={(e) => setNewBranch({ ...newBranch, branchCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl font-mono focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#374151] mb-1">
                      Operating Status
                    </label>
                    <select
                      value={newBranch.status}
                      onChange={(e) => setNewBranch({ ...newBranch, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#374151] mb-1">
                    Facility Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HSR Layout Specialty Clinic"
                    value={newBranch.name}
                    onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#374151] mb-1">
                      Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="+91..."
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl font-mono focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#374151] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="branch@trigyna.com"
                      value={newBranch.email}
                      onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#374151] mb-1">
                    Physical Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Full facility address, landmark, PIN code..."
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#374151] mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 - 19:00 (Mon - Sat)"
                    value={newBranch.operatingHours}
                    onChange={(e) => setNewBranch({ ...newBranch, operatingHours: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-2 rounded-xl border border-[#E5EAF0] text-[#64748B] hover:bg-[#F8FAFC] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Save Facility</span>
                  </button>
                </div>
              </form>
            </div>
        </ModalPortal>
    </div>
  );
}
