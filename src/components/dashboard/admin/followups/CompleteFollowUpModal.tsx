"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { FollowUpItem } from "./types";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface CompleteFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: FollowUpItem | null;
  onComplete: (data: CompleteFormData) => Promise<void>;
}

export interface CompleteFormData {
  outcome: string;
  outcomeNotes: string;
  recoveryStatus: string;
  symptoms?: string;
  clinicalObservations?: string;
  scheduleNextFollowUp?: boolean;
  nextFollowUpDate?: string;
  nextFollowUpMode?: string;
  nextFollowUpInstructions?: string;
}

export function CompleteFollowUpModal({
  isOpen,
  onClose,
  followUp,
  onComplete,
}: CompleteFollowUpModalProps) {
  const [outcome, setOutcome] = useState("Patient reports positive symptomatic improvement and good adherence.");
  const [recoveryStatus, setRecoveryStatus] = useState("Improved");
  const [symptoms, setSymptoms] = useState("Pain/discomfort subsided; normal energy levels restored.");
  const [clinicalObservations, setClinicalObservations] = useState("Vitals stable. Response to constitutional remedy confirmed.");
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDate, setNextDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [nextMode, setNextMode] = useState("Online Video Consultation");
  const [nextInstructions, setNextInstructions] = useState("Maintenance review.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onComplete({
        outcome,
        outcomeNotes: outcome,
        recoveryStatus,
        symptoms,
        clinicalObservations,
        scheduleNextFollowUp: scheduleNext,
        nextFollowUpDate: scheduleNext ? nextDate : undefined,
        nextFollowUpMode: scheduleNext ? nextMode : undefined,
        nextFollowUpInstructions: scheduleNext ? nextInstructions : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen && !!followUp} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5EAF0] flex items-center justify-between bg-[#F8FAF9] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Complete Follow-up Review</h3>
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Recovery Status */}
          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Recovery Status *
            </label>
            <select
              value={recoveryStatus}
              onChange={(e) => setRecoveryStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none font-medium"
            >
              <option value="Significantly Improved">Significantly Improved</option>
              <option value="Improved">Improved</option>
              <option value="Stable">Stable</option>
              <option value="Requires Review">Requires Review</option>
              <option value="Treatment Adjusted">Treatment Adjusted</option>
              <option value="No Improvement">No Improvement</option>
              <option value="Referred">Referred</option>
            </select>
          </div>

          {/* Outcome Notes */}
          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Clinical Outcome &amp; Assessment *
            </label>
            <textarea
              rows={3}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              required
            />
          </div>

          {/* Patient Symptoms */}
          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Patient-Reported Symptoms
            </label>
            <input
              type="text"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
            />
          </div>

          {/* Observations */}
          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Clinical Observations / Vitals
            </label>
            <input
              type="text"
              value={clinicalObservations}
              onChange={(e) => setClinicalObservations(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
            />
          </div>

          {/* Next Follow-up Option */}
          <div className="pt-2 border-t border-[#F1F5F9] space-y-3">
            <label className="flex items-center gap-2 text-xs text-[#111827] font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
                className="rounded text-[#087A50] focus:ring-[#087A50]"
              />
              <span>Schedule Subsequent Follow-up</span>
            </label>

            {scheduleNext && (
              <div className="p-3 bg-gray-50 rounded-xl space-y-3 border border-[#E5EAF0] animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] block mb-1">
                      Next Due Date
                    </label>
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E5EAF0] rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] block mb-1">
                      Consultation Mode
                    </label>
                    <div className="w-full px-2.5 py-1.5 text-xs border border-[#C5DDBB] bg-[#EBF3E8] rounded-lg font-semibold text-[#154734]">
                      Online Video Consultation
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] block mb-1">
                    Instructions
                  </label>
                  <input
                    type="text"
                    value={nextInstructions}
                    onChange={(e) => setNextInstructions(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#E5EAF0] rounded-lg bg-white"
                  />
                </div>
              </div>
            )}
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
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Complete &amp; Save Outcome</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
