"use client";

import React, { useState } from "react";
import { X, FileEdit, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api/client";

interface ConsultationAmendmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string | null;
  onAmendmentSuccess: () => void;
}

export function ConsultationAmendmentModal({
  isOpen,
  onClose,
  consultationId,
  onAmendmentSuccess,
}: ConsultationAmendmentModalProps) {
  const [reason, setReason] = useState("");
  const [newDiagnosis, setNewDiagnosis] = useState("");
  const [newTreatmentPlan, setNewTreatmentPlan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !consultationId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("A clinical justification is legally mandatory to amend a finalized record.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await api.post(`/api/v1/doctor/consultations/${consultationId}/amendments`, {
        reason: reason.trim(),
        newDiagnosis: newDiagnosis.trim() || undefined,
        newTreatmentPlan: newTreatmentPlan.trim() || undefined,
      });

      onAmendmentSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not register clinical amendment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-amber-200 bg-amber-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Add Clinical Amendment</h3>
              <p className="text-[11px] text-amber-700">Attach an auditable addendum without altering original record</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#17251F]">
              Clinical Justification / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the clinical rationale (e.g. Patient contacted regarding allergic reaction; added supplementary advice)..."
              className="w-full p-3 bg-[#F2F7F4] border border-[#E1EAE4] focus:border-[#064B38] rounded-xl text-xs text-[#17251F] placeholder:text-gray-400 outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#17251F]">
              Revised / Addendum Diagnosis (Optional)
            </label>
            <input
              type="text"
              value={newDiagnosis}
              onChange={(e) => setNewDiagnosis(e.target.value)}
              placeholder="Leave blank to preserve original diagnosis..."
              className="w-full p-2.5 bg-[#F2F7F4] border border-[#E1EAE4] focus:border-[#064B38] rounded-xl text-xs text-[#17251F] outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#17251F]">
              Revised / Supplementary Treatment Plan (Optional)
            </label>
            <textarea
              rows={3}
              value={newTreatmentPlan}
              onChange={(e) => setNewTreatmentPlan(e.target.value)}
              placeholder="Document updated instructions, discontinued medicines, or dietary adjustments..."
              className="w-full p-3 bg-[#F2F7F4] border border-[#E1EAE4] focus:border-[#064B38] rounded-xl text-xs text-[#17251F] outline-none transition-colors"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#718078] hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Committing Amendment...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Save Amendment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

