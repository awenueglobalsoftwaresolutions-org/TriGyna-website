"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Loader2,
  Stethoscope,
  HeartPulse,
  Pill,
  Lock,
  Calendar,
  CheckCircle2,
  X,
  Eye,
  RefreshCw,
  User,
  AlertCircle,
  Printer,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface PrescriptionMedication {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionData {
  _id: string;
  medications: PrescriptionMedication[];
  dietaryAdvice?: string;
  specialInstructions?: string;
  isReleasedToPatient: boolean;
  createdAt: string;
}

interface ConsultationItem {
  _id: string;
  appointmentId?: {
    _id: string;
    appointmentCode: string;
    appointmentDate: string;
    startTime: string;
    mode: string;
  };
  patientId?: {
    _id: string;
    fullName: string;
    phone: string;
    patientCode: string;
    age?: number;
    gender?: string;
    allergies?: string[];
  };
  doctorId?: {
    _id: string;
    userId?: {
      name: string;
    };
    qualifications?: string;
  };
  chiefComplaints?: string;
  examinationNotes?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  followUpAdvice?: string;
  isFinalized: boolean;
  finalizedAt?: string;
  amendments?: Array<{
    reason: string;
    amendedAt: string;
  }>;
  createdAt: string;
}

export function ConsultationsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationItem | null>(null);
  const [prescriptionModal, setPrescriptionModal] = useState<{
    consultation: ConsultationItem;
    prescription: PrescriptionData | null;
  } | null>(null);
  const [isLoadingPrescription, setIsLoadingPrescription] = useState(false);

  const loadConsultations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ consultations: ConsultationItem[] }>("/clinical/consultations");
      if (res.data?.consultations) {
        setConsultations(res.data.consultations);
      }
    } catch {
      showNotification("Failed to load clinical consultations", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  const handleViewPrescription = async (consultation: ConsultationItem) => {
    if (!consultation.patientId?._id) return;
    try {
      setIsLoadingPrescription(true);
      const res = await api.get<{ prescriptions: PrescriptionData[] }>(
        `/clinical/prescriptions/patient/${consultation.patientId._id}`
      );
      const rx = res.data?.prescriptions?.[0] || null;
      setPrescriptionModal({ consultation, prescription: rx });
    } catch {
      showNotification("Could not load digital prescription for patient", true);
    } finally {
      setIsLoadingPrescription(false);
    }
  };

  const filtered = consultations.filter((c) => {
    const pName = c.patientId?.fullName?.toLowerCase() || "";
    const pCode = c.patientId?.patientCode?.toLowerCase() || "";
    const diag = c.diagnosis?.toLowerCase() || "";
    const docName = c.doctorId?.userId?.name?.toLowerCase() || "";
    const q = search.toLowerCase();
    return pName.includes(q) || pCode.includes(q) || diag.includes(q) || docName.includes(q);
  });

  const finalizedCount = consultations.filter((c) => c.isFinalized).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#154734]/10 text-[#154734]">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#18231D]">Consultations &amp; Clinical Records</h1>
          </div>
          <p className="text-xs sm:text-sm text-[#68756D] mt-1">
            Electronic health encounters, clinical evaluations, constitutional treatment plans, and verified digital prescriptions.
          </p>
        </div>

        <button
          onClick={loadConsultations}
          className="flex items-center gap-2 px-3.5 py-2 border border-[#E2E9E3] hover:bg-[#F7F9F7] text-[#154734] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* 2. KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Total Clinical Encounters</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : consultations.length}
            </p>
            <span className="text-[11px] text-[#154734] font-medium mt-0.5 inline-block">Consultation History</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAF5ED] text-[#154734] flex items-center justify-center border border-[#D5E5DA]">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Finalized &amp; Locked</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : finalizedCount}
            </p>
            <span className="text-[11px] text-[#287A4B] font-medium mt-0.5 inline-block">Immutable EHR Records</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#287A4B] flex items-center justify-center border border-emerald-100">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Active Treatment Plans</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : consultations.length - finalizedCount}
            </p>
            <span className="text-[11px] text-amber-800 font-medium mt-0.5 inline-block">Drafts in Progress</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100">
            <Pill className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#68756D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search diagnosis, patient name, patient code, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] placeholder:text-[#68756D] focus:bg-white focus:outline-none focus:border-[#154734] transition-all"
          />
        </div>
        <span className="text-xs text-[#68756D] font-mono">{filtered.length} clinical records found</span>
      </div>

      {/* 4. Consultations Table */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#68756D] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
            <span>Loading medical encounters...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#68756D] flex flex-col items-center justify-center p-6">
            <FileText className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-[#18231D]">No clinical consultation records found</p>
            <p className="text-xs text-[#68756D] mt-0.5">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E9E3] bg-[#F7F9F7] text-[#68756D] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date &amp; Code</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Practitioner</th>
                  <th className="py-3 px-4">Clinical Diagnosis</th>
                  <th className="py-3 px-4">Complaints / Protocol</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E9E3]">
                {filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-[#F7F9F7]/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[#68756D]">
                      <div className="font-bold text-[#18231D]">
                        {item.appointmentId?.appointmentDate || new Date(item.createdAt).toISOString().split("T")[0]}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {item.appointmentId?.appointmentCode || "Direct Visit"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#18231D]">{item.patientId?.fullName || "Patient"}</div>
                      <div className="text-[10px] text-[#68756D] font-mono">
                        {item.patientId?.patientCode} • {item.patientId?.phone}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#18231D] flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-[#154734]" />
                        <span>{item.doctorId?.userId?.name || "Dr. TriGyna"}</span>
                      </div>
                      <div className="text-[10px] text-[#68756D]">{item.doctorId?.qualifications || "Consultant"}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#18231D]">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#154734] border border-emerald-100 font-semibold inline-block">
                        {item.diagnosis || "Under Evaluation"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#68756D] truncate max-w-xs" title={item.chiefComplaints}>
                      {item.chiefComplaints || item.treatmentPlan || "Standard Clinical Protocol"}
                    </td>
                    <td className="py-3 px-4">
                      {item.isFinalized ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Lock className="w-3 h-3" />
                          <span>Finalized</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <span>Draft</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedConsultation(item)}
                          className="px-2.5 py-1 rounded-lg text-[#154734] bg-[#EAF5ED] hover:bg-[#D5E5DA] border border-[#D5E5DA] transition font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                          title="View Case Sheet"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Case Sheet</span>
                        </button>
                        <button
                          onClick={() => handleViewPrescription(item)}
                          disabled={isLoadingPrescription}
                          className="px-2.5 py-1 rounded-lg text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                          title="View Digital Rx"
                        >
                          <Pill className="w-3.5 h-3.5" />
                          <span>Digital Rx</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Case Sheet Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 max-w-2xl w-full shadow-2xl z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E9E3]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#154734] bg-[#EAF5ED] px-2 py-0.5 rounded border border-[#D5E5DA]">
                  Clinical Case Record
                </span>
                <h3 className="text-base font-serif font-bold text-[#18231D] mt-1">
                  Patient: {selectedConsultation.patientId?.fullName} ({selectedConsultation.patientId?.patientCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConsultation(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#68756D] block">Consulting Doctor</span>
                  <p className="font-bold text-[#18231D] mt-0.5">{selectedConsultation.doctorId?.userId?.name || "Dr. TriGyna"}</p>
                  <p className="text-[11px] text-[#68756D]">{selectedConsultation.doctorId?.qualifications}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#68756D] block">Encounter Date &amp; Record Status</span>
                  <p className="font-mono font-bold text-[#18231D] mt-0.5">
                    {selectedConsultation.appointmentId?.appointmentDate || new Date(selectedConsultation.createdAt).toLocaleDateString()}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {selectedConsultation.isFinalized ? "Locked & Finalized" : "Draft Encounter"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#18231D] mb-1">Chief Complaints &amp; History</h4>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[#18231D] leading-relaxed">
                  {selectedConsultation.chiefComplaints || "No complaints recorded."}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#18231D] mb-1">Clinical Diagnosis &amp; Evaluation</h4>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[#154734] font-medium leading-relaxed">
                  {selectedConsultation.diagnosis || "Constitutional evaluation in progress."}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#18231D] mb-1">Treatment Plan &amp; Protocol</h4>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[#18231D] leading-relaxed">
                  {selectedConsultation.treatmentPlan || "Prescription protocol active."}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#18231D] mb-1">Follow-up Advice</h4>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-blue-900 leading-relaxed">
                  {selectedConsultation.followUpAdvice || "Review in 2 weeks or on symptom escalation."}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-[#E2E9E3]">
              <button
                type="button"
                onClick={() => setSelectedConsultation(null)}
                className="px-4 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Case Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Digital Prescription Modal (Printable Official Layout) */}
      {prescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl max-w-2xl w-full shadow-2xl z-10 animate-fade-in max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#F7F9F7] border-b border-[#E2E9E3]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Digital Prescription Slip
                </span>
                <h3 className="text-base font-serif font-bold text-[#18231D] mt-1">
                  Patient: {prescriptionModal.consultation.patientId?.fullName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrescriptionModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Prescription Header */}
              <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#E2E9E3] flex justify-between items-center">
                <div>
                  <h4 className="font-serif font-bold text-[#154734] text-sm">TriGyna Healthcare &amp; Wellness</h4>
                  <p className="text-[11px] text-[#68756D]">
                    Consultant: {prescriptionModal.consultation.doctorId?.userId?.name || "Dr. TriGyna"} (
                    {prescriptionModal.consultation.doctorId?.qualifications})
                  </p>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <p className="font-bold text-[#18231D]">
                    Code: {prescriptionModal.consultation.patientId?.patientCode}
                  </p>
                  <p className="text-[#68756D]">
                    Date: {new Date(prescriptionModal.consultation.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Medications Table */}
              <div>
                <h4 className="font-bold text-[#18231D] mb-2 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-purple-700" />
                  <span>Prescribed Remedies &amp; Formulations</span>
                </h4>
                {prescriptionModal.prescription?.medications && prescriptionModal.prescription.medications.length > 0 ? (
                  <div className="overflow-x-auto border border-[#E2E9E3] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F7F9F7] text-[#68756D] font-semibold">
                        <tr className="border-b border-[#E2E9E3]">
                          <th className="py-2.5 px-3">Remedy Name</th>
                          <th className="py-2.5 px-3">Dosage / Potency</th>
                          <th className="py-2.5 px-3">Frequency</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E9E3]">
                        {prescriptionModal.prescription.medications.map((m, idx) => (
                          <tr key={idx} className="hover:bg-[#F7F9F7]/50">
                            <td className="py-2.5 px-3 font-bold text-[#18231D]">{m.medicineName}</td>
                            <td className="py-2.5 px-3 font-mono">{m.dosage}</td>
                            <td className="py-2.5 px-3">{m.frequency}</td>
                            <td className="py-2.5 px-3">{m.duration}</td>
                            <td className="py-2.5 px-3 text-[#68756D]">{m.instructions || "After meals"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center text-[#68756D]">
                    Standard clinical formulation active under doctor supervision.
                  </div>
                )}
              </div>

              {/* Dietary Advice & Special Instructions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <span className="font-bold text-amber-900 block mb-1">Dietary &amp; Lifestyle Regimen</span>
                  <p className="text-[#18231D] leading-relaxed">
                    {prescriptionModal.prescription?.dietaryAdvice ||
                      "Avoid raw onions, garlic, and strong coffee 30 minutes before taking homoeopathic remedies."}
                  </p>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <span className="font-bold text-blue-900 block mb-1">Special Clinical Instructions</span>
                  <p className="text-[#18231D] leading-relaxed">
                    {prescriptionModal.prescription?.specialInstructions ||
                      "Keep medicines away from strong scents, camphor, and direct sunlight."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 bg-[#F7F9F7] border-t border-[#E2E9E3]">
              <button
                type="button"
                onClick={() => setPrescriptionModal(null)}
                className="px-4 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
