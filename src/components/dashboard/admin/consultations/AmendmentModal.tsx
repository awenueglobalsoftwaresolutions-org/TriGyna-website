"use client";

import React, { useState } from "react";
import { X, ShieldCheck, AlertCircle, Loader2, Lock } from "lucide-react";
import { api } from "@/lib/api/client";
import { ConsultationDetailItem } from "./ConsultationDetailPanel";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface AmendmentModalProps {
  consultation: ConsultationDetailItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function AmendmentModal({
  consultation,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: AmendmentModalProps) {
  const [reason, setReason] = useState("");
  const [newDiagnosis, setNewDiagnosis] = useState(consultation?.diagnosis || "");
  const [newTreatmentPlan, setNewTreatmentPlan] = useState(consultation?.treatmentPlan || "");
  const [newExaminationNotes, setNewExaminationNotes] = useState(consultation?.examinationNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !consultation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showNotification("A documented clinical reason is mandatory for record amendments", true);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/clinical/consultations/${consultation._id}/amendments`, {
        reason: reason.trim(),
        newDiagnosis: newDiagnosis.trim() || undefined,
        newTreatmentPlan: newTreatmentPlan.trim() || undefined,
        newExaminationNotes: newExaminationNotes.trim() || undefined,
      });

      showNotification("Clinical amendment appended with full audit history!");
      onSuccess();
      onClose();
    } catch (err: any) {
      showNotification(err.message || "Failed to append amendment", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white border border-[#E5EAF0] rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="p-5 border-b border-[#E5EAF0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111827]">
                Clinical Amendment Workflow — {consultation.consultationCode || "Encounter"}
              </h3>
              <p className="text-xs text-[#64748B]">
                Legally locked EHR records preserve original evaluations and append traceable corrections.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-bold block">Immutable EHR Safety Notice</span>
                <span className="text-[11px] leading-tight block mt-0.5">
                  The original diagnosis and treatment plan will remain permanently in the audit history. Your amendment reason and identity will be digitally recorded.
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Documented Amendment Reason * <span className="font-normal text-gray-500">(Mandatory)</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Patient provided additional family medical history regarding maternal thyroid disease during follow-up call."
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Amended Diagnosis (Optional)</label>
              <input
                type="text"
                value={newDiagnosis}
                onChange={(e) => setNewDiagnosis(e.target.value)}
                placeholder="Updated diagnosis if changed..."
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Amended Treatment Plan (Optional)</label>
              <textarea
                rows={2}
                value={newTreatmentPlan}
                onChange={(e) => setNewTreatmentPlan(e.target.value)}
                placeholder="Updated treatment plan instructions..."
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
              />
            </div>
          </div>

          <div className="px-6 py-3.5 border-t border-[#E5EAF0] flex items-center justify-end gap-2.5 bg-[#F8FAFC] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E5EAF0] bg-white hover:bg-gray-50 text-[#64748B] rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>Record Signed Amendment</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}

