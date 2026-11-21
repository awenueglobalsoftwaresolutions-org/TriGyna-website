"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Calendar,
  Clock,
  Phone,
  Mail,
  FileText,
  Stethoscope,
  Pill,
  AlertTriangle,
  Download,
  Loader2,
  Play,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Activity,
  Heart,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface PatientProfileModalProps {
  isOpen: boolean;
  patientId: string | null;
  onClose: () => void;
  onOpenConsultation?: (appointmentId: string, patientId: string) => void;
}

export function PatientProfileModal({
  isOpen,
  patientId,
  onClose,
  onOpenConsultation,
}: PatientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "consultations" | "prescriptions" | "allergies" | "documents" | "followups"
  >("overview");

  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !patientId) return;

    let isMounted = true;
    setActiveTab("overview");
    setLoading(true);

    async function loadPatientDetails() {
      try {
        const [ptRes, ovRes, histRes, docsRes, flwRes] = await Promise.all([
          api.get<any>(`/api/v1/doctor/patients/${patientId}`).catch(() => null),
          api.get<any>(`/api/v1/doctor/patients/${patientId}/overview`).catch(() => null),
          api.get<any>(`/api/v1/doctor/patients/${patientId}/history`).catch(() => null),
          api.get<any>(`/api/v1/doctor/patients/${patientId}/documents`).catch(() => null),
          api.get<any>(`/api/v1/doctor/patients/${patientId}/follow-ups`).catch(() => null),
        ]);

        if (!isMounted) return;

        const ptData = (ptRes as any)?.data || (ptRes as any)?.patient || ptRes;
        const ovData = (ovRes as any)?.data || ovRes;
        const histData = (histRes as any)?.data || histRes;
        const docsData = (docsRes as any)?.data || docsRes;
        const flwData = (flwRes as any)?.data || flwRes;

        setPatient(ptData || null);
        setMetrics(ovData?.metrics || null);
        setConsultations(histData?.consultations || []);
        setPrescriptions(histData?.prescriptions || []);
        setDocuments(docsData?.documents || []);
        setFollowups(flwData?.followUps || []);
      } catch (err) {
        console.error("Failed to load patient profile data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPatientDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const fullName = patient?.fullName || "Patient Record";
  const patientCode = patient?.patientCode || (patientId ? `PT-${patientId.slice(-5).toUpperCase()}` : "TG-PT");
  const age = patient?.age ? `${patient.age} yrs` : "Age N/A";
  const gender =
    patient?.gender === "female"
      ? "Female"
      : patient?.gender === "male"
      ? "Male"
      : patient?.gender || "Female";
  const bloodGroup = patient?.bloodGroup || "B+";
  const phone = patient?.phone || "N/A";
  const email = patient?.email || "N/A";
  const allergies = Array.isArray(patient?.allergies)
    ? patient.allergies
    : patient?.allergies
    ? [patient.allergies]
    : [];

  const getInitials = (name: string) => {
    if (!name) return "PT";
    const parts = name.trim().replace(/^Dr\.\s*/i, "").split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "--";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in-50 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-[#E1E9E3] overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* 1. Drawer Top Header */}
        <div className="p-5 bg-[#064B38] text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base bg-white/10 text-emerald-300 shrink-0">
              {getInitials(fullName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold truncate">{fullName}</h3>
                <span className="px-2 py-0.5 rounded-md bg-white/15 text-[11px] font-mono shrink-0">
                  #{patientCode}
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5 truncate">
                {age} • {gender} • Blood Group: {bloodGroup} • Phone: {phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenConsultation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConsultation("", patient?._id || patientId || "");
                }}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start Video Consult</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close patient details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Clinical Safety Alert Banner (if allergies present) */}
        {allergies.length > 0 && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              CRITICAL CLINICAL SAFETY: Known Drug Allergies:{" "}
              <span className="font-bold underline">{allergies.join(", ")}</span>
            </span>
          </div>
        )}

        {/* 3. Navigation Tabs */}
        <div className="px-5 border-b border-[#E1E9E3] bg-[#FAFBF9] flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: "overview", label: "Overview", icon: FileText },
            { id: "consultations", label: `Consultations (${consultations.length})`, icon: Stethoscope },
            { id: "prescriptions", label: `Prescriptions (${prescriptions.length})`, icon: Pill },
            { id: "allergies", label: "Allergies & Meds", icon: AlertTriangle },
            { id: "documents", label: `Lab & Documents (${documents.length})`, icon: Download },
            { id: "followups", label: `Follow-ups (${followups.length})`, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-[#064B38] text-[#064B38] font-bold"
                    : "border-transparent text-[#65746B] hover:text-[#17251E]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Tab Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#17251E] flex-1">
          {loading ? (
            <div className="py-20 text-center text-xs text-[#65746B]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#064B38] mb-2" />
              Loading patient clinical profile...
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  {/* KPI Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center">
                      <p className="text-[11px] text-[#65746B]">Consultations</p>
                      <p className="text-lg font-bold text-[#17251E] mt-0.5">
                        {metrics?.totalConsultations ?? consultations.length}
                      </p>
                    </div>
                    <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center">
                      <p className="text-[11px] text-[#65746B]">Prescriptions</p>
                      <p className="text-lg font-bold text-purple-700 mt-0.5">
                        {metrics?.activePrescriptionsCount ?? prescriptions.length}
                      </p>
                    </div>
                    <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center">
                      <p className="text-[11px] text-[#65746B]">Lab Documents</p>
                      <p className="text-lg font-bold text-blue-700 mt-0.5">
                        {metrics?.documentsCount ?? documents.length}
                      </p>
                    </div>
                    <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center">
                      <p className="text-[11px] text-[#65746B]">Follow-ups</p>
                      <p className="text-lg font-bold text-amber-700 mt-0.5">
                        {metrics?.pendingFollowUpsCount ?? followups.length}
                      </p>
                    </div>
                    <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-[#65746B]">Service Assigned</p>
                      <p className="text-xs font-bold text-[#064B38] mt-1 truncate">
                        {patient?.service || "PCOS / PCOD"}
                      </p>
                    </div>
                  </div>

                  {/* Medical Background & Emergency Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-[#E1E9E3] rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs text-[#064B38] flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Medical Background & History
                      </h4>
                      <p className="text-[#65746B] leading-relaxed">
                        {patient?.medicalHistory ||
                          patient?.notes ||
                          "No chronic medical conditions documented for this patient record."}
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-[#E1E9E3] rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs text-[#064B38] flex items-center gap-1.5">
                        <Phone className="w-4 h-4" /> Contact & Communication
                      </h4>
                      <div className="space-y-1.5 text-[#65746B]">
                        <p>
                          <span className="font-semibold text-[#17251E]">Phone: </span>
                          {phone}
                        </p>
                        <p>
                          <span className="font-semibold text-[#17251E]">Email: </span>
                          {email}
                        </p>
                        <p>
                          <span className="font-semibold text-[#17251E]">Emergency Contact: </span>
                          {patient?.emergencyContact?.name || "Next of Kin"} ({patient?.emergencyContact?.phone || phone})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Bar inside Drawer */}
                  <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-[#065F46] uppercase tracking-wide">
                        Online Consultation Status
                      </span>
                      <p className="text-sm font-bold text-[#111827] mt-0.5">
                        Teleconsultation Room Ready
                      </p>
                    </div>

                    {onOpenConsultation && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenConsultation("", patient?._id || patientId || "");
                        }}
                        className="px-4 py-2 bg-[#065F46] hover:bg-[#064E3B] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch Consultation Room</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CONSULTATIONS */}
              {activeTab === "consultations" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[#17251E] mb-2">
                    Clinical Consultations History ({consultations.length})
                  </h4>
                  {consultations.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                      No previous consultations recorded for this patient.
                    </div>
                  ) : (
                    consultations.map((c) => (
                      <div
                        key={c._id}
                        className="p-4 bg-white border border-[#E1E9E3] rounded-2xl shadow-xs space-y-2 hover:border-[#064B38]/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#064B38]">
                              {formatDate(c.appointmentDate || c.createdAt)}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="font-semibold text-xs text-[#17251E]">
                              {c.serviceName || "Clinical Consultation"}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === "finalized"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {c.status === "finalized" ? "Finalized" : "Draft"}
                          </span>
                        </div>

                        {c.diagnosis && (
                          <p className="text-xs font-semibold text-[#17251E]">
                            Diagnosis:{" "}
                            <span className="text-[#064B38] font-bold">
                              {Array.isArray(c.diagnosis) ? c.diagnosis.join(", ") : c.diagnosis}
                            </span>
                          </p>
                        )}

                        {c.clinicalNotes?.plan && (
                          <p className="text-xs text-[#65746B] line-clamp-2">
                            Plan: {c.clinicalNotes.plan}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: PRESCRIPTIONS */}
              {activeTab === "prescriptions" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[#17251E] mb-2">
                    Prescriptions History ({prescriptions.length})
                  </h4>
                  {prescriptions.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                      No prescriptions generated for this patient yet.
                    </div>
                  ) : (
                    prescriptions.map((rx) => (
                      <div
                        key={rx._id}
                        className="p-4 bg-white border border-[#E1E9E3] rounded-2xl shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#064B38]">
                              {rx.code || "TG-RX"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs text-[#65746B]">
                              {formatDate(rx.createdAt)}
                            </span>
                          </div>
                          <a
                            href={`/api/v1/doctor/prescriptions/${rx._id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-white border border-[#064B38] text-[#064B38] hover:bg-[#F0FDF4] rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download PDF</span>
                          </a>
                        </div>

                        {rx.medications && rx.medications.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-[#E1E9E3]/70">
                            {rx.medications.map((m: any, mIdx: number) => (
                              <div
                                key={mIdx}
                                className="flex items-center justify-between text-xs py-0.5"
                              >
                                <span className="font-semibold text-[#17251E]">
                                  {m.medicineName} ({m.dosage || "1 tab"})
                                </span>
                                <span className="text-[#65746B]">
                                  {m.frequency} • {m.duration}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: ALLERGIES & MEDS */}
              {activeTab === "allergies" && (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-[#E1E9E3] rounded-2xl space-y-2">
                    <h4 className="font-bold text-xs text-[#064B38] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Known Allergies & Drug Reactions
                    </h4>
                    {allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {allergies.map((alg: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold"
                          >
                            {alg}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#65746B]">No known allergies reported for this patient.</p>
                    )}
                  </div>

                  <div className="p-4 bg-white border border-[#E1E9E3] rounded-2xl space-y-2">
                    <h4 className="font-bold text-xs text-[#064B38] flex items-center gap-1.5">
                      <Pill className="w-4 h-4" /> Chronic Conditions & Active Regimen
                    </h4>
                    <p className="text-[#65746B] leading-relaxed">
                      {patient?.medicalHistory || "No chronic active conditions documented."}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 5: LAB & DOCUMENTS */}
              {activeTab === "documents" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[#17251E] mb-2">
                    Uploaded Medical Documents & Scans ({documents.length})
                  </h4>
                  {documents.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                      No documents or lab reports uploaded for this patient.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {documents.map((doc) => (
                        <div
                          key={doc._id}
                          className="p-3.5 bg-white border border-[#E1E9E3] rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <FileText className="w-4 h-4 text-[#064B38] shrink-0" />
                            <div className="truncate">
                              <p className="font-bold text-xs text-[#17251E] truncate">
                                {doc.title || doc.fileName || "Medical Document"}
                              </p>
                              <p className="text-[10px] text-[#65746B]">
                                {formatDate(doc.createdAt)}
                              </p>
                            </div>
                          </div>
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-[#064B38] hover:bg-[#F0FDF4] rounded-lg shrink-0"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: FOLLOW-UPS */}
              {activeTab === "followups" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[#17251E] mb-2">
                    Follow-ups Care Continuity ({followups.length})
                  </h4>
                  {followups.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                      No pending follow-ups scheduled for this patient.
                    </div>
                  ) : (
                    followups.map((f) => (
                      <div
                        key={f._id}
                        className="p-4 bg-white border border-[#E1E9E3] rounded-2xl shadow-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <p className="font-bold text-xs text-[#17251E]">
                              Due: {formatDate(f.dueDate || f.recommendedDate)}
                            </p>
                            <p className="text-[11px] text-[#65746B]">
                              {f.notes || f.reason || "Routine review"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            f.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {f.status === "completed" ? "Completed" : "Scheduled"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 5. Drawer Bottom Bar */}
        <div className="p-4 bg-[#FAFBF9] border-t border-[#E1E9E3] flex items-center justify-between">
          <span className="text-[11px] text-[#65746B] font-mono">
            Patient ID: #{patientCode}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#064B38] hover:bg-[#053d2d] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Records
          </button>
        </div>
      </div>
    </div>
  );
}
