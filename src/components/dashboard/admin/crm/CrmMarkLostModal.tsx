"use client";

import React, { useState } from "react";
import { X, Ban, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { CrmLead } from "./crmTypes";

interface CrmMarkLostModalProps {
  lead: CrmLead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isError?: boolean) => void;
}

const LOST_REASONS = [
  "Price / Consultation Fee too high",
  "Consulted another clinic / provider",
  "No response after 3+ contact attempts",
  "Distance / Clinic location inconvenient",
  "Treatment not offered at TriGyna",
  "Invalid phone / contact details",
  "Personal / Financial reasons",
  "Other / Discontinued enquiry",
];

export function CrmMarkLostModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: CrmMarkLostModalProps) {
  const [selectedReason, setSelectedReason] = useState(LOST_REASONS[0]);
  const [customNotes, setCustomNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      showNotification("Please select a lost reason", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const fullReason = customNotes.trim()
        ? `${selectedReason}: ${customNotes.trim()}`
        : selectedReason;

      const res = await api.post(`/crm/leads/${lead._id}/mark-lost`, {
        lostReason: fullReason,
      });

      if (res.success) {
        showNotification(`Lead "${lead.fullName}" marked as Lost.`);
        onSuccess();
        onClose();
      } else {
        showNotification(res.message || "Failed to update lead", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Failed to update lead status", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl border border-[#E5EAF0] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Mark Lead as Lost</h3>
              <p className="text-xs text-red-700">Record reason for analytical reporting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white text-[#64748B] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0]">
              <span className="text-[#64748B] block">Candidate Lead:</span>
              <span className="font-bold text-[#111827] text-sm">{lead.fullName}</span>
              <span className="text-[#64748B] block text-[11px] mt-0.5">
                {lead.serviceInterest} &bull; {lead.phone}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Primary Reason for Drop-off <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {LOST_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Additional Notes / Feedback
              </label>
              <textarea
                rows={3}
                placeholder="Details of call conversation or customer feedback..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Marking this lead as Lost preserves all historical timeline entries and updates lost reasons analytics. The lead can be re-engaged at any time.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#F7F9FC] border-t border-[#E5EAF0] px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#111827] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Confirm Lost Status</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
