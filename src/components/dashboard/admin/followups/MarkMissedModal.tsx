"use client";

import React, { useState } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { FollowUpItem } from "./types";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface MarkMissedModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: FollowUpItem | null;
  onConfirm: (reason: string) => Promise<void>;
}

export function MarkMissedModal({
  isOpen,
  onClose,
  followUp,
  onConfirm,
}: MarkMissedModalProps) {
  const [reason, setReason] = useState("Patient did not join video session and was unreachable via phone.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onConfirm(reason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen && !!followUp} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-md overflow-hidden flex flex-col font-sans max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5EAF0] flex items-center justify-between bg-rose-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Mark Follow-up Missed</h3>
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
            <p className="text-xs text-[#64748B]">
              Marking this follow-up missed logs an audit event and moves the record out of the active scheduled queue.
            </p>

            <div>
              <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
                Reason / Attempt Notes *
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>
          </div>

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
              className="px-5 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>Confirm Missed</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
