"use client";

import React, { useState, useEffect } from "react";
import { X, Settings, Shield, Target, Building2, Loader2, Check } from "lucide-react";
import { api } from "@/lib/api/client";
import { SalesTeamSettingsData } from "./salesTeamTypes";

interface SalesTeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showNotification?: (msg: string, isError?: boolean) => void;
  onSettingsSaved?: () => void;
}

export const SalesTeamSettingsModal: React.FC<SalesTeamSettingsModalProps> = ({
  isOpen,
  onClose,
  showNotification,
  onSettingsSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [teamName, setTeamName] = useState("TriGyna Sales & Growth Team");
  const [teamDescription, setTeamDescription] = useState(
    "Manage sales representatives, track performance, targets and conversions."
  );
  const [branch, setBranch] = useState("All Branches");
  const [monthlyTeamTarget, setMonthlyTeamTarget] = useState(100);
  const [defaultIndividualTarget, setDefaultIndividualTarget] = useState(30);
  const [assignmentRules, setAssignmentRules] = useState("manual");

  useEffect(() => {
    if (!isOpen) return;

    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ settings: SalesTeamSettingsData }>("/sales-team/settings");
        if (res.success && res.data?.settings) {
          const s = res.data.settings;
          setTeamName(s.teamName || "TriGyna Sales & Growth Team");
          setTeamDescription(s.teamDescription || "");
          setBranch(s.branch || "All Branches");
          setMonthlyTeamTarget(s.monthlyTeamTarget || 100);
          setDefaultIndividualTarget(s.defaultIndividualTarget || 30);
          setAssignmentRules(s.assignmentRules || "manual");
        }
      } catch (err: any) {
        console.error("Error loading team settings", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.patch("/sales-team/settings", {
        teamName,
        teamDescription,
        branch,
        monthlyTeamTarget: Number(monthlyTeamTarget),
        defaultIndividualTarget: Number(defaultIndividualTarget),
        assignmentRules,
      });

      if (res.success) {
        if (showNotification) {
          showNotification("Sales team settings updated successfully!");
        }
        if (onSettingsSaved) onSettingsSaved();
        onClose();
      }
    } catch (err: any) {
      console.error("Error saving settings", err);
      if (showNotification) {
        showNotification(err.message || "Failed to update team settings", true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-white border border-[#E5EAF0] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl z-10 animate-fade-in font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-[#111827] flex items-center justify-center">
              <Settings className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Sales Team Configuration</h3>
              <p className="text-[11px] text-[#64748B]">
                Configure team parameters, quota rules, and assignment policies
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-xs text-[#64748B]">
            <Loader2 className="w-5 h-5 animate-spin text-[#087A50] mr-2" />
            Loading settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Team Name</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111827] mb-1">Description / Subtitle</label>
              <input
                type="text"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Monthly Team Target (Quota)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={monthlyTeamTarget}
                  onChange={(e) => setMonthlyTeamTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Default Individual Target
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={defaultIndividualTarget}
                  onChange={(e) => setDefaultIndividualTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#111827] mb-1">Assigned Scope / Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
                >
                  <option value="All Branches">All Branches</option>
                  <option value="Main Clinic">Main Clinic</option>
                  <option value="South Branch">South Branch</option>
                  <option value="North Branch">North Branch</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Lead Distribution Method</label>
                <select
                  value={assignmentRules}
                  onChange={(e) => setAssignmentRules(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
                >
                  <option value="manual">Manual Assignment Only</option>
                  <option value="round_robin">Round-Robin Distribution</option>
                  <option value="branch_based">Branch-Restricted Assignment</option>
                  <option value="workload_balanced">Workload-Balanced Routing</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E5EAF0]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-[#E5EAF0] text-xs font-semibold text-[#64748B] hover:bg-gray-50 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
