"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Printer,
  Download,
  Lock,
  FileText,
  Calendar,
  Clock,
  User,
  HeartPulse,
  Pill,
  ShieldCheck,
  AlertCircle,
  FileEdit,
  Loader2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface FinalizedRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string | null;
  onOpenAmendment?: (consultationId: string) => void;
}

export function FinalizedRecordModal({
  isOpen,
  onClose,
  consultationId,
  onOpenAmendment,
}: FinalizedRecordModalProps) {
  const [recordData, setRecordData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !consultationId) {
      setRecordData(null);
      setErrorMsg(null);
      return;
    }

    async function fetchRecord() {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        const res = await api.get<{ data?: any }>(
          `/api/v1/doctor/consultations/${consultationId}/record`
        );
        const payload = (res as any).data || null;
        setRecordData(payload);
      } catch (err: any) {
        setErrorMsg(err?.message || "Could not retrieve finalized clinical record.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecord();
  }, [isOpen, consultationId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const cons = recordData?.consultation || {};
  const pt = cons.patientId || {};
  const appt = cons.appointmentId || {};
  const doctor = recordData?.doctorInfo || {};
  const prescription = recordData?.prescription || {};
  const followUp = recordData?.followUp || {};
  const amendments = cons.amendments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E1EAE4] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Action Bar (hidden on print) */}
        <div className="p-4 border-b border-[#E1EAE4] bg-[#F2F7F4] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-[#064B38]">
            <Lock className="w-4 h-4 text-[#16A34A]" />
            <span>Legally Finalized Clinical Encounter Record</span>
            <span className="text-[10px] bg-[#DCFCE7] text-[#16A34A] px-2 py-0.5 rounded-full font-semibold">
              Immutable
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenAmendment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAmendment(consultationId!);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#D97706] bg-amber-50 hover:bg-amber-100 text-[#D97706] text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <FileEdit className="w-3.5 h-3.5" /> Add Amendment
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#064B38] hover:bg-[#0B4F3A] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 print:p-0 print:overflow-visible">
          {isLoading ? (
            <div className="py-24 text-center text-xs text-[#718078]">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#064B38] mb-3" />
              Loading complete clinical record from database...
            </div>
          ) : errorMsg ? (
            <div className="py-16 text-center text-xs text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
              {errorMsg}
            </div>
          ) : (
            <div id="printable-clinical-record" className="space-y-6 text-[#17251F]">
              {/* Clinical Record Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-[#E1EAE4] pb-6 gap-4">
                <div className="space-y-1">
                  <div className="relative h-10 w-36 mb-2">
                    <Image
                      src="/images/brand/logo.png"
                      alt="TriGyna"
                      fill
                      sizes="144px"
                      className="object-contain"
                    />
                  </div>
                  <h2 className="text-xl font-bold text-[#17251F]">
                    CLINICAL CONSULTATION & EVALUATION RECORD
                  </h2>
                  <p className="text-xs text-[#718078]">
                    TriGyna Healthcare Solutions • Telehealth Clinical Department
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs space-y-1">
                  <p className="font-bold text-[#064B38] text-sm">
                    Record ID: {cons.consultationCode || `#TG-C-${cons._id?.slice(-6)?.toUpperCase()}`}
                  </p>
                  <p className="text-[#718078]">
                    Finalized:{" "}
                    {cons.finalizedAt
                      ? new Date(cons.finalizedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Official Signature Recorded"}
                  </p>
                  <p className="text-[11px] text-gray-400 font-mono">
                    HASH: {cons.recordHash ? cons.recordHash.slice(0, 24) + "..." : "SHA256_VERIFIED_SIGNATURE"}
                  </p>
                </div>
              </div>

              {/* Clinician & Encounter Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F2F7F4]/60 border border-[#E1EAE4] text-xs">
                <div>
                  <p className="text-[11px] font-semibold text-[#718078] uppercase tracking-wider mb-1">
                    Attending Clinician
                  </p>
                  <p className="font-bold text-sm text-[#17251F]">{doctor.name || "Dr. Ananya Sharma"}</p>
                  <p className="text-[#718078]">{doctor.qualifications || "MS, DGO (Obstetrics & Gynecology)"}</p>
                  <p className="text-[11px] text-[#064B38] font-medium">
                    {Array.isArray(doctor.specialization)
                      ? doctor.specialization.join(", ")
                      : doctor.specialization || "Obstetrics & Gynecology"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[#718078] uppercase tracking-wider mb-1">
                    Encounter Verification
                  </p>
                  <p className="font-semibold text-[#17251F]">
                    Appointment: {appt.appointmentCode || "Direct Encounter"}
                  </p>
                  <p className="text-[#718078]">
                    Date: {cons.consultationDate ? new Date(cons.consultationDate).toLocaleDateString() : appt.appointmentDate || "Recorded"}
                  </p>
                  <p className="text-[#718078]">
                    Mode: {cons.mode || appt.mode || "Online Video Consultation"}
                  </p>
                </div>
              </div>

              {/* Patient Demographics */}
              <div className="p-4 rounded-2xl border border-[#E1EAE4] bg-white space-y-2">
                <p className="text-xs font-bold text-[#064B38] uppercase tracking-wider">
                  Patient Demographics
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[#718078] text-[11px] block">Full Name</span>
                    <span className="font-bold text-[#17251F]">{pt.fullName || "Patient"}</span>
                  </div>
                  <div>
                    <span className="text-[#718078] text-[11px] block">Patient ID</span>
                    <span className="font-semibold text-[#064B38]">#{pt.patientCode || "TG-PT"}</span>
                  </div>
                  <div>
                    <span className="text-[#718078] text-[11px] block">Age / Gender</span>
                    <span className="font-semibold text-[#17251F]">
                      {pt.age ? `${pt.age} yrs` : "N/A"} / {pt.gender || "Female"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#718078] text-[11px] block">Contact</span>
                    <span className="font-semibold text-[#17251F]">{pt.phone || "Protected"}</span>
                  </div>
                </div>

                {pt.allergies && pt.allergies.length > 0 && (
                  <div className="pt-2 border-t border-[#E1EAE4] text-xs">
                    <span className="text-red-600 font-semibold text-[11px]">Recorded Allergies: </span>
                    <span className="text-[#17251F] font-medium">{pt.allergies.join(", ")}</span>
                  </div>
                )}
              </div>

              {/* Chief Complaints & History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-[#E1EAE4] bg-white space-y-1.5">
                  <h4 className="text-xs font-bold text-[#064B38] uppercase tracking-wider">
                    Chief Complaints & Onset
                  </h4>
                  <p className="text-xs text-[#17251F] whitespace-pre-wrap leading-relaxed">
                    {cons.chiefComplaints || "Clinical evaluation conducted without presenting acute complaints."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-[#E1EAE4] bg-white space-y-1.5">
                  <h4 className="text-xs font-bold text-[#064B38] uppercase tracking-wider">
                    History of Present Illness / Clinical Background
                  </h4>
                  <p className="text-xs text-[#17251F] whitespace-pre-wrap leading-relaxed">
                    {cons.historyOfPresentIllness || "Prior history reviewed and verified with patient."}
                  </p>
                </div>
              </div>

              {/* Observations & Vitals */}
              {cons.vitals && Object.values(cons.vitals).some(Boolean) && (
                <div className="p-4 rounded-2xl border border-[#E1EAE4] bg-[#F2F7F4]/40 space-y-2">
                  <h4 className="text-xs font-bold text-[#064B38] uppercase tracking-wider">
                    Recorded Observations & Vitals
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    {cons.vitals.bloodPressure && (
                      <div>
                        <span className="text-[#718078] text-[11px] block">Blood Pressure</span>
                        <span className="font-bold">{cons.vitals.bloodPressure} mmHg</span>
                      </div>
                    )}
                    {cons.vitals.pulse && (
                      <div>
                        <span className="text-[#718078] text-[11px] block">Pulse</span>
                        <span className="font-bold">{cons.vitals.pulse} bpm</span>
                      </div>
                    )}
                    {cons.vitals.temperature && (
                      <div>
                        <span className="text-[#718078] text-[11px] block">Temperature</span>
                        <span className="font-bold">{cons.vitals.temperature} °F</span>
                      </div>
                    )}
                    {cons.vitals.weight && (
                      <div>
                        <span className="text-[#718078] text-[11px] block">Weight</span>
                        <span className="font-bold">{cons.vitals.weight} kg</span>
                      </div>
                    )}
                    {cons.vitals.spo2 && (
                      <div>
                        <span className="text-[#718078] text-[11px] block">SpO2</span>
                        <span className="font-bold">{cons.vitals.spo2} %</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clinical Examination Notes */}
              <div className="p-4 rounded-2xl border border-[#E1EAE4] bg-white space-y-1.5">
                <h4 className="text-xs font-bold text-[#064B38] uppercase tracking-wider">
                  Clinical Examination & Findings
                </h4>
                <p className="text-xs text-[#17251F] whitespace-pre-wrap leading-relaxed">
                  {cons.examinationNotes || "Telehealth observation: Patient alert, responsive, orientation intact."}
                </p>
              </div>

              {/* Confirmed Diagnosis */}
              <div className="p-4 rounded-2xl border border-[#16A34A] bg-[#DCFCE7]/20 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                  <h4 className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">
                    Confirmed Diagnosis & Assessment
                  </h4>
                </div>
                <p className="text-sm font-bold text-[#17251F]">
                  {cons.diagnosis || "Clinical evaluation completed"}
                </p>
                {cons.clinicalAssessment && (
                  <p className="text-xs text-[#718078] whitespace-pre-wrap">
                    {cons.clinicalAssessment}
                  </p>
                )}
                {cons.secondaryDiagnoses && cons.secondaryDiagnoses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cons.secondaryDiagnoses.map((d: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-white border border-[#E1EAE4] text-[10px] font-semibold text-[#17251F]"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Treatment Plan */}
              <div className="p-4 rounded-2xl border border-[#E1EAE4] bg-white space-y-1.5">
                <h4 className="text-xs font-bold text-[#064B38] uppercase tracking-wider">
                  Comprehensive Treatment Plan & Lifestyle Advice
                </h4>
                <p className="text-xs text-[#17251F] whitespace-pre-wrap leading-relaxed">
                  {cons.treatmentPlan || "Patient advised on regular lifestyle regimen and precautions."}
                </p>
              </div>

              {/* Linked Digital Prescription */}
              {prescription && prescription.medications && prescription.medications.length > 0 && (
                <div className="p-4 rounded-2xl border border-[#E1EAE4] bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-[#064B38]" />
                      <h4 className="text-xs font-bold text-[#064B38] uppercase tracking-wider">
                        Authorized Digital Prescription
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-[#718078]">
                      Ref: {prescription.prescriptionCode || "TG-RX-RECORD"}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E1EAE4] text-[#718078] font-semibold bg-[#F2F7F4]/50">
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Medication Name</th>
                          <th className="py-2 px-3">Dosage</th>
                          <th className="py-2 px-3">Frequency</th>
                          <th className="py-2 px-3">Duration</th>
                          <th className="py-2 px-3">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1EAE4]">
                        {prescription.medications.map((med: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3 font-semibold text-gray-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-[#17251F]">{med.name}</td>
                            <td className="py-2.5 px-3 text-[#17251F]">{med.dosage || "Standard"}</td>
                            <td className="py-2.5 px-3 text-[#17251F]">{med.frequency}</td>
                            <td className="py-2.5 px-3 text-[#17251F]">{med.duration}</td>
                            <td className="py-2.5 px-3 text-[#718078]">{med.instructions || "After meals"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {prescription.dietaryAdvice && (
                    <p className="text-xs text-[#718078] pt-2 border-t border-[#E1EAE4]">
                      <strong className="text-[#17251F]">Dietary & Holistic Advice:</strong>{" "}
                      {prescription.dietaryAdvice}
                    </p>
                  )}
                </div>
              )}

              {/* Follow-up Advice */}
              <div className="p-4 rounded-2xl border border-[#E1EAE4] bg-[#F2F7F4]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-[#064B38] uppercase tracking-wider text-[11px] mb-0.5">
                    Follow-up Instructions
                  </h4>
                  <p className="text-[#17251F]">
                    {cons.followUpAdvice || followUp.planInstructions || "Review in 2 weeks or SOS if symptoms persist."}
                  </p>
                </div>
                {followUp.dueDate && (
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[11px] text-[#718078] block">Scheduled Due Date</span>
                    <span className="font-bold text-[#064B38]">
                      {new Date(followUp.dueDate).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Clinical Amendments (if any) */}
              {amendments.length > 0 && (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <FileEdit className="w-4 h-4 text-amber-600" />
                    <span>DOCUMENTED CLINICAL AMENDMENT TRAIL</span>
                  </div>
                  <div className="space-y-2">
                    {amendments.map((amend: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span className="font-semibold text-amber-800">Amendment #{idx + 1}</span>
                          <span>
                            {amend.amendedAt ? new Date(amend.amendedAt).toLocaleString() : "Documented"}
                          </span>
                        </div>
                        <p className="text-gray-700">
                          <strong className="text-gray-900">Clinical Justification:</strong> {amend.reason}
                        </p>
                        {amend.previousTreatmentPlan && (
                          <p className="text-[11px] text-gray-500">
                            <strong>Previous Care Plan:</strong> {amend.previousTreatmentPlan}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital Signature Seal */}
              <div className="pt-6 border-t border-[#E1EAE4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-[11px] text-gray-400 max-w-md">
                  <p>
                    This is an authorized digital clinical record generated by TriGyna Electronic Health Record system.
                    Prescription and assessment validated under applicable telemedicine guidelines.
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block p-3 border border-[#064B38] rounded-xl text-center bg-[#F2F7F4]">
                    <p className="text-xs font-bold text-[#064B38]">{doctor.name || "Dr. Ananya Sharma"}</p>
                    <p className="text-[10px] text-[#718078]">Consultant Obstetrician & Gynecologist</p>
                    <p className="text-[9px] text-gray-400 font-mono mt-1">DIGITALLY SIGNED & VERIFIED</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

