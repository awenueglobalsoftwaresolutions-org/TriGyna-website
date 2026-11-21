"use client";

import React, { useState, useEffect } from "react";
import { Target, Plus, CheckCircle2, Clock, Award, Loader2, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { SalesTargetItem, SalesRepresentativeItem } from "./salesTeamTypes";

interface SalesTargetsWorkspaceProps {
  representatives: SalesRepresentativeItem[];
  showNotification?: (msg: string, isError?: boolean) => void;
}

export const SalesTargetsWorkspace: React.FC<SalesTargetsWorkspaceProps> = ({
  representatives,
  showNotification,
}) => {
  const [targets, setTargets] = useState<SalesTargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [targetType, setTargetType] = useState<"individual" | "team">("individual");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [targetValue, setTargetValue] = useState(30);
  const [periodMonth, setPeriodMonth] = useState(10);
  const [periodYear, setPeriodYear] = useState(2026);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ targets: SalesTargetItem[] }>("/sales-team/targets");
      if (res.success && res.data?.targets) {
        setTargets(res.data.targets);
      }
    } catch (err: any) {
      console.error("Error loading targets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post("/sales-team/targets", {
        title: title || `${targetType === "team" ? "Team" : "Individual"} Target (${periodMonth}/${periodYear})`,
        targetType,
        employeeId: targetType === "individual" ? selectedUserId : undefined,
        targetValue: Number(targetValue),
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
      });

      if (res.success) {
        if (showNotification) showNotification("Sales target established successfully!");
        setIsModalOpen(false);
        setTitle("");
        fetchTargets();
      }
    } catch (err: any) {
      console.error("Error creating target", err);
      if (showNotification) showNotification(err.message || "Failed to create target", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#111827]">Targets & Quotas Management</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure institutional monthly goals, individual rep quotas, and monitor live conversion achievement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (representatives.length > 0 && !selectedUserId) {
              setSelectedUserId(representatives[0].userId);
            }
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-xs font-semibold text-white transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Target</span>
        </button>
      </div>

      {/* Target Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#64748B]">
          <Loader2 className="w-5 h-5 animate-spin text-[#087A50] mx-auto mb-2" />
          <span>Loading target records from database...</span>
        </div>
      ) : targets.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E5EAF0]">
          No custom targets configured for this reporting period.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((t) => (
            <div
              key={t._id}
              className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#087A50] bg-[#E9F8F0] px-2 py-0.5 rounded-full">
                      {t.targetType}
                    </span>
                    <h3 className="text-sm font-bold text-[#111827] mt-1.5">{t.title}</h3>
                    <p className="text-[11px] text-[#64748B]">
                      {t.employeeId ? `Assignee: ${t.employeeId.name}` : "Entire Sales Team"} • {t.periodMonth}/{t.periodYear}
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-[#111827]">
                    {t.percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
                  <div
                    className="bg-[#087A50] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(t.percentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E5EAF0]/80 text-center">
                <div className="bg-gray-50/70 p-2 rounded-xl">
                  <div className="text-[10px] text-[#64748B]">Target</div>
                  <div className="text-xs font-bold text-[#111827] mt-0.5">{t.targetValue}</div>
                </div>
                <div className="bg-[#E9F8F0]/50 p-2 rounded-xl">
                  <div className="text-[10px] text-[#087A50] font-semibold">Achieved</div>
                  <div className="text-xs font-bold text-[#087A50] mt-0.5">{t.achievedValue}</div>
                </div>
                <div className="bg-rose-50/50 p-2 rounded-xl">
                  <div className="text-[10px] text-[#DC2626] font-semibold">Remaining</div>
                  <div className="text-xs font-bold text-[#DC2626] mt-0.5">{t.remainingValue}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Target Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white border border-[#E5EAF0] rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 animate-fade-in font-sans">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5EAF0]">
              <h3 className="font-bold text-sm text-[#111827]">Create Sales Target</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111827] mb-1">Target Name</label>
                <input
                  type="text"
                  placeholder="e.g. October Conversions Target"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Scope</label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs"
                  >
                    <option value="individual">Individual Rep</option>
                    <option value="team">Whole Team</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Target Conversions</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs"
                  />
                </div>
              </div>

              {targetType === "individual" && (
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Select Representative</label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs"
                  >
                    {representatives.map((r) => (
                      <option key={r.userId} value={r.userId}>
                        {r.name} ({r.branchName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>Save Target</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
