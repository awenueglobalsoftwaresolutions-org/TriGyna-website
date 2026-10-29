"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  DollarSign,
  Building2,
  Video,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface ServiceItem {
  code: string;
  name: string;
  department: string;
  durationMinutes: number;
  baseFee: number;
  consultationType: "in_person" | "online" | "both";
  status: "active" | "inactive";
}

interface DepartmentItem {
  code: string;
  name: string;
  description?: string;
}

interface OrgData {
  _id: string;
  name: string;
  services: ServiceItem[];
  departments: DepartmentItem[];
}

export function ServicesTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: `SRV-WELL-${Math.floor(10 + Math.random() * 90)}`,
    name: "Comprehensive PCOS Homoeopathic Care",
    department: "Reproductive & Hormonal Wellness",
    durationMinutes: 45,
    baseFee: 1500,
    consultationType: "both" as ServiceItem["consultationType"],
  });

  const loadServices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ organization: OrgData }>("/organization");
      if (res.data?.organization?.services) {
        setServices(res.data.organization.services);
        setDepartments(res.data.organization.departments || []);
      }
    } catch {
      showNotification("Failed to load clinical services catalog", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.department) {
      showNotification("Please provide service code, name, and department", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ services: ServiceItem[] }>("/organization/services", {
        code: form.code,
        name: form.name,
        department: form.department,
        durationMinutes: Number(form.durationMinutes),
        baseFee: Number(form.baseFee),
        consultationType: form.consultationType,
      });

      if (res.success) {
        showNotification(`Service '${form.name}' added to clinical catalog!`);
        setIsAddModalOpen(false);
        setForm({
          code: `SRV-WELL-${Math.floor(10 + Math.random() * 90)}`,
          name: "",
          department: departments[0]?.name || "Reproductive & Hormonal Wellness",
          durationMinutes: 30,
          baseFee: 1200,
          consultationType: "both",
        });
        loadServices();
      } else {
        showNotification(res.message || "Failed to create service", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error adding service", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = services.filter((srv) => {
    const nameMatch = srv.name?.toLowerCase().includes(search.toLowerCase());
    const codeMatch = srv.code?.toLowerCase().includes(search.toLowerCase());
    const deptMatch = deptFilter === "all" || srv.department === deptFilter;
    return (nameMatch || codeMatch) && deptMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-[#18231D]">Services &amp; Programmes Catalog</h2>
            </div>
            <p className="text-xs text-[#68756D] mt-1">
              Configure clinic consultation packages, holistic wellness programmes, base pricing, and duration slots.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Service</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[#E2E9E3]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search service name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadServices}
              className="p-2 border border-[#E2E9E3] rounded-xl hover:bg-gray-50 text-[#154734] cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-12 text-center text-xs text-[#68756D] flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
          <span>Loading clinical service catalogue...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-12 text-center text-xs text-[#68756D]">
          No clinical services found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((srv) => (
            <div
              key={srv.code}
              className="bg-white rounded-2xl border border-[#E2E9E3] p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#154734] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {srv.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {srv.status}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-[#18231D] mt-3 line-clamp-2">
                  {srv.name}
                </h3>
                <p className="text-[11px] text-[#68756D] mt-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#154734]" />
                  <span>{srv.department}</span>
                </p>

                <div className="mt-4 pt-3 border-t border-[#E2E9E3]/70 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[#68756D]">
                    <Clock className="w-3.5 h-3.5 text-[#154734]" />
                    <span>{srv.durationMinutes} mins slot</span>
                  </span>

                  <span className="flex items-center gap-1 font-semibold text-[#154734] font-mono text-sm">
                    ₹{srv.baseFee.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E9E3] flex items-center justify-between text-[11px]">
                <span className="capitalize text-[#68756D] flex items-center gap-1">
                  {srv.consultationType === "online" && <Video className="w-3.5 h-3.5 text-blue-600" />}
                  {srv.consultationType === "in_person" && <Building2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {srv.consultationType === "both" && <Sparkles className="w-3.5 h-3.5 text-purple-600" />}
                  <span>{srv.consultationType.replace("_", " ")}</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Active Booking
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD SERVICE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E9E3]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-[#154734]">Add Clinical Service</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#18231D] mb-1">Service Code *</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. SRV-PCOS-02"
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-[#18231D] mb-1">Service / Programme Title *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Postpartum Holistic Recovery"
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#18231D] mb-1">Department *</label>
                <select
                  required
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none"
                >
                  {departments.length > 0 ? (
                    departments.map((d) => (
                      <option key={d.code} value={d.name}>
                        {d.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Gynecology & Obstetrics">Gynecology & Obstetrics</option>
                      <option value="Reproductive & Hormonal Wellness">Reproductive & Hormonal Wellness</option>
                      <option value="Dermatology & Cosmetology">Dermatology & Cosmetology</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#18231D] mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    step="5"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#18231D] mb-1">Base Fee (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.baseFee}
                    onChange={(e) => setForm({ ...form, baseFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none font-mono font-semibold text-[#154734]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#18231D] mb-1">Consultation Delivery Mode</label>
                <select
                  value={form.consultationType}
                  onChange={(e) => setForm({ ...form, consultationType: e.target.value as ServiceItem["consultationType"] })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none"
                >
                  <option value="both">Both (In-Clinic &amp; Online Video)</option>
                  <option value="in_person">In-Clinic Consultation Only</option>
                  <option value="online">Online Video Consultation Only</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E2E9E3]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-[#68756D] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{isSubmitting ? "Saving..." : "Add to Catalog"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
