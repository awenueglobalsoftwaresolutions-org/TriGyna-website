"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  Loader2,
  CheckCircle2,
  Plus,
  Calendar,
  User,
  Filter,
  Check,
  XCircle,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface TreatmentPlanItem {
  _id: string;
  planCode: string;
  patientId?: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone: string;
  };
  doctorId?: {
    _id: string;
    userId?: {
      name: string;
    };
  };
  diagnosis?: string;
  title: string;
  treatmentDescription?: string;
  interventions?: Array<{
    title: string;
    duration?: string;
    status?: string;
  }>;
  duration?: string;
  startDate?: string;
  reviewDate?: string;
  status: "draft" | "active" | "ongoing" | "on_hold" | "completed" | "discontinued";
  discontinueReason?: string;
  createdAt: string;
}

interface TreatmentPlansViewProps {
  showNotification: (msg: string, isErr?: boolean) => void;
  onOpenConsultation?: (consultationId: string) => void;
}

export function TreatmentPlansView({ showNotification }: TreatmentPlansViewProps) {
  const [plans, setPlans] = useState<TreatmentPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlanItem | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await api.get<{ plans: TreatmentPlanItem[]; total: number }>(
        `/clinical/treatment-plans?${params.toString()}`
      );
      if (res.data?.plans) {
        setPlans(res.data.plans);
      }
    } catch {
      showNotification("Failed to load treatment plans", true);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, showNotification]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleComplete = async (planId: string) => {
    try {
      await api.post(`/clinical/treatment-plans/${planId}/complete`);
      showNotification("Treatment plan marked as completed!");
      loadPlans();
    } catch {
      showNotification("Failed to mark treatment plan as completed", true);
    }
  };

  const handleDiscontinue = async (planId: string) => {
    const reason = window.prompt("Please provide a clinical reason to discontinue this care plan:");
    if (!reason || !reason.trim()) return;

    try {
      await api.post(`/clinical/treatment-plans/${planId}/discontinue`, { reason });
      showNotification("Treatment plan discontinued");
      loadPlans();
    } catch {
      showNotification("Failed to discontinue treatment plan", true);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search plans by title, diagnosis, or plan code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
          >
            <option value="all">All Care Plan Statuses</option>
            <option value="active">Active Plans</option>
            <option value="completed">Completed Plans</option>
            <option value="discontinued">Discontinued Plans</option>
          </select>
          <span className="text-xs text-[#64748B] font-mono shrink-0">
            {plans.length} plans found
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
            <span className="text-xs">Loading active treatment plans...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center text-[#64748B] text-xs">
            No treatment plans match current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Plan Code &amp; Title</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Diagnosis</th>
                  <th className="py-3 px-4">Interventions</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {plans.map((p) => (
                  <tr key={p._id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#087A50] block">
                        {p.planCode || "TG-TP-1001"}
                      </span>
                      <span className="font-semibold text-[#111827] block mt-0.5 truncate max-w-[200px]">
                        {p.title}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#111827] block truncate max-w-[150px]">
                        {p.patientId?.fullName || "Patient"}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-mono block">
                        {p.patientId?.patientCode}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#111827] block truncate max-w-[150px]">
                        {p.doctorId?.userId?.name || "Dr. TriGyna"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] font-semibold inline-block truncate max-w-[180px]">
                        {p.diagnosis || "Constitutional Care"}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#64748B]">
                      {p.interventions?.length || 2} step(s)
                    </td>

                    <td className="py-3 px-4 font-mono text-[#111827]">
                      {p.duration || "30 days"}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          p.status === "completed"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : p.status === "discontinued"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === "active" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleComplete(p._id)}
                              title="Mark Complete"
                              className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-700 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDiscontinue(p._id)}
                              title="Discontinue Plan"
                              className="p-1 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPlan(p)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#E9F8F0] text-[#087A50] hover:bg-[#D5E5DA] cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPlan && (
        <ModalPortal isOpen={Boolean(selectedPlan)} onClose={() => setSelectedPlan(null)}>
          <div className="bg-white border border-[#E5EAF0] rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl flex flex-col overflow-hidden font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAF0] bg-[#F8FAFC] shrink-0">
              <div>
                <span className="font-mono text-xs text-[#087A50] font-bold block">{selectedPlan.planCode}</span>
                <h3 className="font-bold text-base text-[#111827] mt-0.5">{selectedPlan.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <span className="text-[#64748B] block mb-0.5 font-semibold">Diagnosis</span>
                <span className="px-2.5 py-1 rounded-lg bg-[#E9F8F0] text-[#087A50] font-bold">
                  {selectedPlan.diagnosis || "Care Protocol"}
                </span>
              </div>

              <div>
                <span className="text-[#64748B] block mb-0.5 font-semibold">Treatment Description</span>
                <p className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0] text-[#111827] leading-relaxed">
                  {selectedPlan.treatmentDescription || "Ongoing clinical care protocol."}
                </p>
              </div>

              <div>
                <span className="text-[#64748B] block mb-1 font-semibold">Interventions Checklist</span>
                <div className="space-y-1.5">
                  {selectedPlan.interventions?.map((inv, idx) => (
                    <div key={idx} className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#087A50]" />
                        <span className="font-medium text-[#111827]">{inv.title}</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#64748B]">{inv.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-[#E5EAF0] bg-[#F8FAFC] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

