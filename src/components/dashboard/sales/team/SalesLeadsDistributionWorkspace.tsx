"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart2,
  Users,
  Building2,
  CheckSquare,
  Square,
  ArrowRight,
  Shield,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { LeadDistributionData, SalesRepresentativeItem } from "./salesTeamTypes";

interface SalesLeadsDistributionWorkspaceProps {
  representatives: SalesRepresentativeItem[];
  showNotification?: (msg: string, isError?: boolean) => void;
}

export const SalesLeadsDistributionWorkspace: React.FC<SalesLeadsDistributionWorkspaceProps> = ({
  representatives,
  showNotification,
}) => {
  const [distribution, setDistribution] = useState<LeadDistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk assignment state
  const [targetUserId, setTargetUserId] = useState("");
  const [assignReason, setAssignReason] = useState("Direct batch distribution");

  const fetchDistribution = async () => {
    setLoading(true);
    try {
      const res = await api.get<LeadDistributionData>("/sales-team/leads/distribution");
      if (res.success && res.data) {
        setDistribution(res.data);
      }
    } catch (err: any) {
      console.error("Error loading lead distribution", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribution();
  }, []);

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllUnassigned = () => {
    if (!distribution) return;
    if (selectedLeadIds.length === distribution.unassignedLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(distribution.unassignedLeads.map((l) => l._id));
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      if (showNotification) showNotification("Please select a target representative", true);
      return;
    }
    if (selectedLeadIds.length === 0) {
      if (showNotification) showNotification("No leads selected for assignment", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/sales-team/leads/bulk-assign", {
        leadIds: selectedLeadIds,
        newAssigneeId: targetUserId,
        reason: assignReason,
      });

      if (res.success) {
        if (showNotification) {
          showNotification(`Successfully allocated ${selectedLeadIds.length} leads!`);
        }
        setIsBulkModalOpen(false);
        setSelectedLeadIds([]);
        fetchDistribution();
      }
    } catch (err: any) {
      console.error("Bulk assign error", err);
      if (showNotification) showNotification(err.message || "Failed to assign leads", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#64748B]">Assigned CRM Leads</span>
            <div className="text-2xl font-bold text-[#111827] mt-0.5">
              {distribution?.totalAssigned || 0}
            </div>
            <span className="text-[11px] text-[#087A50] font-semibold">Active in pipelines</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#64748B]">Unassigned Leads Pool</span>
            <div className="text-2xl font-bold text-[#111827] mt-0.5">
              {distribution?.unassignedCount || 0}
            </div>
            <span className="text-[11px] text-amber-600 font-semibold">Awaiting representative</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#64748B]">Active Branch Pods</span>
            <div className="text-2xl font-bold text-[#111827] mt-0.5">
              {distribution?.branches?.length || 3}
            </div>
            <span className="text-[11px] text-[#2563EB] font-semibold">Clinics covered</span>
          </div>
        </div>
      </div>

      {/* Allocation breakdown per representative */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs">
        <h3 className="text-sm font-bold text-[#111827] mb-4">
          Representative Workload Allocation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {distribution?.reps?.map((r) => {
            const maxLeads = 100;
            const pct = Math.min(Math.round((r.totalLeads / maxLeads) * 100), 100);
            return (
              <div
                key={r.memberId}
                className="p-3.5 rounded-xl border border-[#E5EAF0] bg-gray-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#111827] truncate">{r.name}</span>
                  <span className="text-[10px] text-[#64748B] font-medium">{r.branchName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">{r.totalLeads} leads</span>
                  <span className="font-semibold text-[#087A50]">{r.converted} converted</span>
                </div>
                <div className="w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#087A50] h-full rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned Leads Table & Bulk Actions */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAllUnassigned}
              className="text-xs font-semibold text-[#087A50] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              {selectedLeadIds.length === (distribution?.unassignedLeads?.length || 0) &&
              distribution?.unassignedLeads?.length ? (
                <CheckSquare className="w-4 h-4 text-[#087A50]" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              <span>Select All ({distribution?.unassignedLeads?.length || 0})</span>
            </button>
            {selectedLeadIds.length > 0 && (
              <span className="text-xs text-[#64748B]">
                ({selectedLeadIds.length} leads selected)
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={() => {
              if (representatives.length > 0 && !targetUserId) {
                setTargetUserId(representatives[0].userId);
              }
              setIsBulkModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-xs font-semibold text-white transition shadow-xs cursor-pointer disabled:opacity-40"
          >
            <span>Assign Selected to Representative</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/60 border-b border-[#E5EAF0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4 w-10">SELECT</th>
                <th className="py-3 px-4">LEAD NAME</th>
                <th className="py-3 px-4">PHONE NUMBER</th>
                <th className="py-3 px-4">SERVICE INTEREST</th>
                <th className="py-3 px-4">PRIORITY</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right pr-6">RECEIVED DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    Loading unassigned leads...
                  </td>
                </tr>
              ) : distribution?.unassignedLeads?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    All incoming CRM leads are currently assigned to sales representatives.
                  </td>
                </tr>
              ) : (
                distribution?.unassignedLeads?.map((l) => {
                  const isSelected = selectedLeadIds.includes(l._id);
                  return (
                    <tr
                      key={l._id}
                      onClick={() => toggleSelectLead(l._id)}
                      className={`hover:bg-gray-50/70 transition cursor-pointer ${
                        isSelected ? "bg-[#E9F8F0]/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#087A50]" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#111827]">{l.fullName}</td>
                      <td className="py-3 px-4 text-[#64748B] font-mono">{l.phone}</td>
                      <td className="py-3 px-4 text-gray-700">{l.serviceInterest}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            l.priority === "urgent" || l.priority === "high"
                              ? "bg-rose-50 text-[#DC2626]"
                              : "bg-gray-100 text-[#64748B]"
                          }`}
                        >
                          {l.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right pr-6 text-[#64748B]">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Assign Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsBulkModalOpen(false)} />
          <div className="relative bg-white border border-[#E5EAF0] rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 font-sans">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5EAF0]">
              <h3 className="font-bold text-sm text-[#111827]">
                Bulk Assign {selectedLeadIds.length} Leads
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAssign} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Target Sales Representative *
                </label>
                <select
                  required
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827]"
                >
                  {representatives.map((r) => (
                    <option key={r.userId} value={r.userId}>
                      {r.name} — {r.branchName} ({r.totalLeads} active leads)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Assignment Note / Reason
                </label>
                <input
                  type="text"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#E5EAF0] text-xs font-semibold text-[#64748B] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
