"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Users, Search, Building2, Target, Shield, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { CandidateStaffItem } from "./salesTeamTypes";

interface SalesAddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: () => void;
  showNotification?: (msg: string, isError?: boolean) => void;
}

export const SalesAddMemberModal: React.FC<SalesAddMemberModalProps> = ({
  isOpen,
  onClose,
  onMemberAdded,
  showNotification,
}) => {
  const [candidates, setCandidates] = useState<CandidateStaffItem[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [salesRole, setSalesRole] = useState("Sales Executive");
  const [branchName, setBranchName] = useState("Main Clinic");
  const [monthlyTarget, setMonthlyTarget] = useState<number>(30);
  const [isTeamLead, setIsTeamLead] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCandidates = async () => {
      setLoadingCandidates(true);
      try {
        const res = await api.get<{ candidates: CandidateStaffItem[] }>(
          "/sales-team/eligible-candidates"
        );
        if (res.success && res.data?.candidates) {
          setCandidates(res.data.candidates);
          if (res.data.candidates.length > 0) {
            setSelectedUserId(res.data.candidates[0].userId);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch staff candidates", err);
      } finally {
        setLoadingCandidates(false);
      }
    };

    fetchCandidates();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.designation.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      if (showNotification) showNotification("Please select an eligible staff member", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/sales-team/members", {
        userId: selectedUserId,
        salesRole,
        branchName,
        monthlyTarget: Number(monthlyTarget),
        isTeamLead,
      });

      if (res.success) {
        if (showNotification) {
          showNotification("Sales team member added successfully!");
        }
        onMemberAdded();
        onClose();
      }
    } catch (err: any) {
      console.error("Error adding sales member:", err);
      if (showNotification) {
        showNotification(err.message || "Failed to add sales member", true);
      }
    } finally {
      setIsSubmitting(false);
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
            <div className="w-9 h-9 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
              <UserPlus className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Add Sales Representative</h3>
              <p className="text-[11px] text-[#64748B]">
                Enrol an existing HRMS employee or staff user to the sales team
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Select Existing Employee */}
          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Select Authorized Staff / HRMS Employee *
            </label>
            {loadingCandidates ? (
              <div className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2 text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#087A50]" />
                <span>Loading eligible HRMS staff...</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                No available staff found. All eligible users are already enrolled in the sales team.
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Filter candidate staff..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50] font-medium"
                >
                  {filteredCandidates.map((c) => (
                    <option key={c.userId} value={c.userId}>
                      {c.name} — {c.designation} ({c.department}) [{c.employeeCode}]
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sales Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Sales Role *</label>
              <select
                value={salesRole}
                onChange={(e) => setSalesRole(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              >
                <option value="Sales Executive">Sales Executive</option>
                <option value="Senior Sales Executive">Senior Sales Executive</option>
                <option value="Team Lead">Sales Team Leader</option>
                <option value="Sales Manager">Sales Manager</option>
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Assigned Clinic Branch *</label>
              <select
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              >
                <option value="Main Clinic">Main Clinic</option>
                <option value="South Branch">South Branch</option>
                <option value="North Branch">North Branch</option>
                <option value="Flagship Indiranagar Centre">Flagship Indiranagar Centre</option>
                <option value="Koramangala Specialty Clinic">Koramangala Specialty Clinic</option>
              </select>
            </div>
          </div>

          {/* Monthly Target */}
          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Monthly Conversion Target (Quotas) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            />
          </div>

          {/* Team Lead Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isTeamLeadCheck"
              checked={isTeamLead}
              onChange={(e) => setIsTeamLead(e.target.checked)}
              className="w-4 h-4 rounded text-[#087A50] focus:ring-[#087A50] border-gray-300"
            />
            <label htmlFor="isTeamLeadCheck" className="text-xs font-semibold text-[#111827] cursor-pointer">
              Designate as Team Lead (awards leadership badge 👑)
            </label>
          </div>

          {/* Footer buttons */}
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
              disabled={isSubmitting || candidates.length === 0}
              className="px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Enrol Member</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
