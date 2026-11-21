"use client";

import React, { useState } from "react";
import { X, Calendar, Clock, Loader2, RefreshCw } from "lucide-react";
import { FollowUpItem } from "./types";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface RescheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: FollowUpItem | null;
  onReschedule: (newDate: string, newTime: string, reason: string, mode?: string) => Promise<void>;
}

export function RescheduleFollowUpModal({
  isOpen,
  onClose,
  followUp,
  onReschedule,
}: RescheduleFollowUpModalProps) {
  const [newDate, setNewDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]
  );
  const [newTime, setNewTime] = useState(followUp?.scheduledTime || "11:30 AM - 12:00 PM");
  const [mode, setMode] = useState(followUp?.mode === "In-Clinic Consultation" ? "Online Video Consultation" : (followUp?.mode || "Online Video Consultation"));
  const [reason, setReason] = useState("Patient requested adjustment of schedule");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    try {
      setIsSubmitting(true);
      await onReschedule(newDate, newTime, reason, mode);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen && !!followUp} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5EAF0] flex items-center justify-between bg-[#F8FAF9] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <RefreshCw className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Reschedule Follow-up</h3>
              <p className="text-[11px] text-[#64748B]">
                {followUp.followUpCode} • {followUp.patientId?.fullName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900">
            <span className="font-semibold block">Current Schedule:</span>
            <span>
              {new Date(followUp.dueDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              at {followUp.scheduledTime || "11:30 AM"} ({followUp.mode})
            </span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              New Date *
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              New Time Slot
            </label>
            <input
              type="text"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Consultation Mode
            </label>
            <div className="w-full px-3 py-2 text-xs border border-[#C5DDBB] bg-[#EBF3E8] rounded-xl font-semibold text-[#154734]">
              Online Video Consultation
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Reason for Rescheduling *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              required
            />
          </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-[#E5EAF0] flex items-center justify-end gap-2.5 bg-[#F8FAF9] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Confirm Reschedule</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
