"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  GitMerge,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { PatientRecord } from "./PatientDetailPanel";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface PatientMergeModalProps {
  canonicalPatient: PatientRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

interface MergePreviewData {
  canonical: {
    _id: string;
    patientCode: string;
    fullName: string;
    phone: string;
    email?: string;
  };
  duplicate: {
    _id: string;
    patientCode: string;
    fullName: string;
    phone: string;
    email?: string;
  };
  recordsToMigrate: {
    appointments: number;
    consultations: number;
    prescriptions: number;
    treatmentPlans: number;
    followups: number;
    documents: number;
    invoices: number;
    payments: number;
    receipts: number;
    crmLeads: number;
    totalRecords: number;
  };
  mergeAction: string;
}

export function PatientMergeModal({
  canonicalPatient,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: PatientMergeModalProps) {
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [selectedDuplicateId, setSelectedDuplicateId] = useState<string>("");
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(true);
  const [preview, setPreview] = useState<MergePreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [mergeReason, setMergeReason] = useState("Administrative duplicate patient profile resolution");

  // Load possible duplicates for canonical patient
  useEffect(() => {
    if (isOpen && canonicalPatient._id) {
      setIsLoadingDuplicates(true);
      setPreview(null);
      setSelectedDuplicateId("");
      api.get<{ duplicates: any[]; count: number }>(`/patients/${canonicalPatient._id}/possible-duplicates`)
        .then((res) => {
          if (res.data?.duplicates) {
            setDuplicates(res.data.duplicates);
            if (res.data.duplicates.length > 0) {
              setSelectedDuplicateId(res.data.duplicates[0]._id);
            }
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingDuplicates(false));
    }
  }, [isOpen, canonicalPatient._id]);

  // Request merge preview when duplicate is selected
  useEffect(() => {
    if (selectedDuplicateId) {
      setIsLoadingPreview(true);
      api.post<MergePreviewData>("/patients/merge/preview", {
        canonicalId: canonicalPatient._id,
        duplicateId: selectedDuplicateId,
      })
        .then((res) => {
          if (res.success && res.data) {
            setPreview(res.data);
          }
        })
        .catch((err) => {
          showNotification(err.message || "Failed to generate merge preview", true);
        })
        .finally(() => setIsLoadingPreview(false));
    }
  }, [selectedDuplicateId, canonicalPatient._id, showNotification]);

  if (!isOpen) return null;

  const handleExecuteMerge = async () => {
    if (!selectedDuplicateId) return;
    setIsExecuting(true);
    try {
      const res = await api.post("/patients/merge/execute", {
        canonicalId: canonicalPatient._id,
        duplicateId: selectedDuplicateId,
        reason: mergeReason,
      });

      if (res.success) {
        showNotification("Patient records merged successfully with zero broken references!");
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Merge execution failed", true);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAF0] px-6 py-4 bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-[#111827]">
                Duplicate Patient Merge &amp; Safety
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Re-link all clinical &amp; billing references to the canonical profile.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Canonical Profile Pill */}
          <div className="p-3.5 rounded-xl bg-[#EAF5ED] border border-[#D5E5DA]">
            <span className="text-[10px] font-bold text-[#087A50] uppercase tracking-wider block mb-1">
              Target Canonical Profile (Will be Preserved)
            </span>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-[#111827]">{canonicalPatient.fullName}</p>
                <p className="text-[11px] text-[#64748B] font-mono">
                  {canonicalPatient.patientCode} • {canonicalPatient.phone}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#087A50] text-white">
                CANONICAL
              </span>
            </div>
          </div>

          {/* Duplicate Selector */}
          <div>
            <label className="block font-semibold text-[#111827] mb-1.5">
              Select Duplicate Record to Merge &amp; Archive:
            </label>
            {isLoadingDuplicates ? (
              <div className="py-4 text-center text-[#64748B]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087A50]" />
              </div>
            ) : duplicates.length === 0 ? (
              <p className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[#64748B] italic">
                No potential duplicates found sharing phone, email, or exact name.
              </p>
            ) : (
              <select
                value={selectedDuplicateId}
                onChange={(e) => setSelectedDuplicateId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] font-mono focus:border-[#087A50] focus:outline-none"
              >
                {duplicates.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.fullName} ({d.patientCode}) • Phone: {d.phone} • Status: {d.status}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Merge Preview Reconciliation Report */}
          {isLoadingPreview ? (
            <div className="py-6 text-center text-[#64748B]">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087A50] mb-1" />
              <span>Auditing dependent records across 10 collections...</span>
            </div>
          ) : preview ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2">
                <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
                  Reconciliation Impact Preview
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-[#64748B] block">Appointments</span>
                    <span className="font-bold font-mono text-sm">{preview.recordsToMigrate.appointments}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-[#64748B] block">Consultations</span>
                    <span className="font-bold font-mono text-sm">{preview.recordsToMigrate.consultations}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-[#64748B] block">Prescriptions</span>
                    <span className="font-bold font-mono text-sm">{preview.recordsToMigrate.prescriptions}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-[#64748B] block">Follow-ups</span>
                    <span className="font-bold font-mono text-sm">{preview.recordsToMigrate.followups}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-[#64748B] block">Invoices &amp; Payments</span>
                    <span className="font-bold font-mono text-sm">
                      {preview.recordsToMigrate.invoices + preview.recordsToMigrate.payments}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-[#64748B] block">Documents</span>
                    <span className="font-bold font-mono text-sm">{preview.recordsToMigrate.documents}</span>
                  </div>
                </div>
                <p className="text-[10px] text-purple-800 pt-1 font-medium">
                  ✓ {preview.recordsToMigrate.totalRecords} dependent records will be atomically updated to point to {preview.canonical.patientCode}. The duplicate record will be archived.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Reason for Merge (Logged in Immutable Audit Trail):
                </label>
                <input
                  type="text"
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none"
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 bg-[#F8FAFC] border-t border-[#E5EAF0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-[#64748B] hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteMerge}
            disabled={isExecuting || !selectedDuplicateId || !preview}
            className="flex items-center gap-1.5 px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50 transition-colors"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Merge...</span>
              </>
            ) : (
              <>
                <GitMerge className="w-3.5 h-3.5" />
                <span>Commit Atomic Merge</span>
              </>
            )}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

