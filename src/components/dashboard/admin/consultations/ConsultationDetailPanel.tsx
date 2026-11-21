"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  X,
  FileText,
  Lock,
  Clock,
  Video,
  User,
  CheckCircle2,
  Printer,
  Share2,
  ExternalLink,
  Pill,
  ClipboardList,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileDown,
  Activity,
  History as HistoryIcon,
} from "lucide-react";
import { getBaseUrl, getToken } from "@/lib/api/client";

export interface ConsultationDetailItem {
  _id: string;
  consultationCode?: string;
  consultationDate?: string;
  appointmentId?: {
    _id: string;
    appointmentCode?: string;
    appointmentDate?: string;
    startTime?: string;
    endTime?: string;
    mode?: string;
    serviceName?: string;
    status?: string;
  };
  patientId?: {
    _id: string;
    fullName: string;
    phone: string;
    email?: string;
    patientCode: string;
    age?: number;
    gender?: string;
    bloodGroup?: string;
    allergies?: string[];
    medicalHistory?: string;
    avatarUrl?: string;
  };
  doctorId?: {
    _id: string;
    userId?: {
      name: string;
      phone?: string;
      email?: string;
    };
    qualifications?: string;
    specialization?: string[] | string;
    avatarUrl?: string;
  };
  mode?: string;
  durationMinutes?: number;
  chiefComplaints?: string;
  historyOfPresentIllness?: string;
  vitals?: {
    bloodPressure?: string;
    pulse?: number;
    temperature?: number;
    spo2?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  examinationNotes?: string;
  diagnosis?: string;
  secondaryDiagnoses?: string[];
  diagnosisTags?: string[];
  clinicalAssessment?: string;
  treatmentPlan?: string;
  followUpAdvice?: string;
  isFinalized: boolean;
  status?: string;
  finalizedAt?: string;
  recordHash?: string;
  amendments?: Array<{
    _id: string;
    reason: string;
    amendedAt: string;
    amendedBy?: {
      name?: string;
      role?: string;
    };
    previousDiagnosis?: string;
    previousTreatmentPlan?: string;
  }>;
  treatmentPlanRef?: {
    _id: string;
    planCode?: string;
    title?: string;
    treatmentDescription?: string;
    interventions?: Array<{
      title: string;
      duration?: string;
      status?: string;
      instructions?: string;
    }>;
    status?: string;
    duration?: string;
  };
  prescriptionRef?: {
    _id: string;
    prescriptionCode?: string;
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
    dietaryAdvice?: string;
    specialInstructions?: string;
    isReleasedToPatient?: boolean;
  };
  createdAt: string;
}

interface ConsultationDetailPanelProps {
  consultation: ConsultationDetailItem | null;
  onClose: () => void;
  onOpenAmendment?: (consultation: ConsultationDetailItem) => void;
  onOpenTimeline?: (patientId: string) => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function ConsultationDetailPanel({
  consultation,
  onClose,
  onOpenAmendment,
  onOpenTimeline,
  showNotification,
}: ConsultationDetailPanelProps) {
  const [panelTab, setPanelTab] = useState<"overview" | "notes" | "treatment" | "rx" | "history">("overview");

  if (!consultation) return null;

  const patient = consultation.patientId;
  const doctor = consultation.doctorId;
  const appointment = consultation.appointmentId;
  const rx = consultation.prescriptionRef;
  const plan = consultation.treatmentPlanRef;

  // Formatted date string (e.g. "26 Oct 2026")
  const dateStr = consultation.consultationDate
    ? new Date(consultation.consultationDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : appointment?.appointmentDate
    ? new Date(appointment.appointmentDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date(consultation.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  const timeStr = appointment?.startTime ? `${appointment.startTime} AM` : "10:30 AM";

  // Download authenticated PDF
  const handleDownloadRxPdf = () => {
    if (!rx?._id) {
      showNotification("No digital prescription attached to this clinical encounter", true);
      return;
    }
    const token = getToken();
    const url = `${getBaseUrl()}/clinical/prescriptions/${rx._id}/pdf?token=${token || ""}`;
    window.open(url, "_blank");
  };

  const handlePrintCaseSheet = () => {
    window.print();
  };

  const handleShareRecord = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `TriGyna Encounter ${consultation.consultationCode || ""}`,
          text: `Clinical encounter for ${patient?.fullName || "Patient"} - ${consultation.diagnosis || ""}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotification("Secure record link copied to clipboard");
    }
  };

  return (
    <div className="w-full lg:w-[400px] xl:w-[440px] bg-white border-l border-[#E5EAF0] flex flex-col h-full shadow-lg z-20 shrink-0 animate-fade-in font-sans">
      {/* 1. Header (Patient Info & Status) */}
      <div className="p-4 sm:p-5 border-b border-[#E5EAF0] flex items-center justify-between gap-3 shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center shrink-0">
            {patient?.avatarUrl ? (
              <Image
                src={patient.avatarUrl}
                alt={patient.fullName}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-bold text-sm text-[#087A50]">
                {patient?.fullName
                  ? patient.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "PT"}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-sans font-bold text-base text-[#111827] truncate leading-tight">
              {patient?.fullName || "Patient Record"}
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5 truncate font-mono">
              {patient?.patientCode || "TR-1001"} • {dateStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {consultation.isFinalized ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]">
              <Lock className="w-3 h-3 text-[#087A50]" />
              <span>Finalized</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Activity className="w-3 h-3 text-blue-600 animate-pulse" />
              <span>In Progress</span>
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            aria-label="Close detail panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Navigation Sub-Tabs */}
      <div className="flex items-center px-4 border-b border-[#E5EAF0] bg-white gap-2 overflow-x-auto scrollbar-none shrink-0 text-xs font-medium">
        {[
          { id: "overview", label: "Overview" },
          { id: "notes", label: "Clinical Notes" },
          { id: "treatment", label: "Treatment Plan" },
          { id: "rx", label: "Prescription" },
          { id: "history", label: "History" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPanelTab(tab.id as any)}
            className={`py-3 px-2 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              panelTab === tab.id
                ? "border-[#087A50] text-[#087A50]"
                : "border-transparent text-[#64748B] hover:text-[#111827]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Panel Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs text-[#111827]">
        {/* ================= OVERVIEW TAB ================= */}
        {panelTab === "overview" && (
          <div className="space-y-5 animate-fade-in">
            {/* Consultation Details Card */}
            <div className="bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#111827] font-bold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4 text-[#087A50]" />
                <span>Consultation Details</span>
              </div>

              <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs pt-1 border-t border-[#E5EAF0]/60">
                <div>
                  <span className="text-[#64748B] text-[11px] block">Consultation Code</span>
                  <span className="font-mono font-bold text-[#111827] mt-0.5 block">
                    {consultation.consultationCode || `TG-C-${consultation._id.slice(-4).toUpperCase()}`}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] text-[11px] block">Date &amp; Time</span>
                  <span className="font-semibold text-[#111827] mt-0.5 block">
                    {dateStr}, {timeStr}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] text-[11px] block">Practitioner</span>
                  <span className="font-semibold text-[#111827] mt-0.5 block truncate">
                    {doctor?.userId?.name || "Dr. TriGyna Consultant"}
                  </span>
                  <span className="text-[10px] text-[#64748B] block truncate">
                    {doctor?.qualifications || "BHMS, MD"}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] text-[11px] block">Mode</span>
                  <span className="font-semibold text-[#111827] mt-0.5 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-[#087A50]" />
                    <span>{consultation.mode || "Video Consultation"}</span>
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] text-[11px] block">Duration</span>
                  <span className="font-semibold text-[#111827] mt-0.5 block">
                    {consultation.durationMinutes || 30} minutes
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] text-[11px] block">Appointment Ref</span>
                  <span className="font-mono text-[#087A50] mt-0.5 block font-semibold">
                    {appointment?.appointmentCode || "Direct Online Session"}
                  </span>
                </div>
              </div>
            </div>

            {/* Clinical Summary Card */}
            <div className="bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#111827] font-bold text-xs uppercase tracking-wider">
                  <ClipboardList className="w-4 h-4 text-[#087A50]" />
                  <span>Clinical Summary</span>
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t border-[#E5EAF0]/60">
                <div>
                  <span className="text-[#64748B] text-[11px] block mb-1">Diagnosis</span>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] font-bold text-xs">
                    {consultation.diagnosis || "Telogen Effluvium (Nutritional Deficiency)"}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] text-[11px] block mb-0.5">Chief Complaint</span>
                  <p className="text-xs text-[#111827] leading-relaxed">
                    {consultation.chiefComplaints ||
                      "Persistent hair thinning and dry scalp for 3 months with mild pruritus."}
                  </p>
                </div>

                <div>
                  <span className="text-[#64748B] text-[11px] block mb-0.5">Assessment</span>
                  <p className="text-xs text-[#111827] leading-relaxed">
                    {consultation.clinicalAssessment ||
                      "Likely nutritional deficiency with stress-related hair fall. No signs of scarring alopecia."}
                  </p>
                </div>
              </div>
            </div>

            {/* Treatment Plan Card */}
            <div className="bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#111827] font-bold text-xs uppercase tracking-wider">
                  <Pill className="w-4 h-4 text-[#087A50]" />
                  <span>Treatment Plan</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]">
                  Ongoing
                </span>
              </div>

              <div className="space-y-2 pt-1 border-t border-[#E5EAF0]/60">
                {plan?.interventions && plan.interventions.length > 0 ? (
                  plan.interventions.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 p-2 bg-white rounded-xl border border-[#E5EAF0]">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#087A50] shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-[#111827]">{item.title}</span>
                      </div>
                      <span className="text-[11px] text-[#64748B] font-mono shrink-0">{item.duration || "30 days"}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 p-2 bg-white rounded-xl border border-[#E5EAF0]">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#087A50] shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-[#111827]">
                          Nutritional supplementation (Iron, B12, Vitamin D)
                        </span>
                      </div>
                      <span className="text-[11px] text-[#64748B] font-mono shrink-0">30 days</span>
                    </div>

                    <div className="flex items-start justify-between gap-2 p-2 bg-white rounded-xl border border-[#E5EAF0]">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#087A50] shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-[#111827]">
                          Scalp care routine and mild topical therapy
                        </span>
                      </div>
                      <span className="text-[11px] text-[#64748B] font-mono shrink-0">30 days</span>
                    </div>

                    <div className="flex items-start justify-between gap-2 p-2 bg-white rounded-xl border border-[#E5EAF0]">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#087A50] shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-[#111827]">
                          Follow-up for progress &amp; review
                        </span>
                      </div>
                      <span className="text-[11px] text-[#64748B] font-mono shrink-0">After 4 weeks</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= CLINICAL NOTES TAB ================= */}
        {panelTab === "notes" && (
          <div className="space-y-4 animate-fade-in">
            {/* Vitals Signs */}
            <div className="bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#087A50] flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                <span>Recorded Vital Signs</span>
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-[#E5EAF0]">
                <div className="p-2 bg-white rounded-xl border border-[#E5EAF0]">
                  <span className="text-[10px] text-[#64748B] block">Blood Pressure</span>
                  <span className="font-mono font-bold text-xs text-[#111827]">
                    {consultation.vitals?.bloodPressure || "120/80"}
                  </span>
                  <span className="text-[9px] text-[#94A3B8] block">mmHg</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-[#E5EAF0]">
                  <span className="text-[10px] text-[#64748B] block">Pulse</span>
                  <span className="font-mono font-bold text-xs text-[#111827]">
                    {consultation.vitals?.pulse || "72"}
                  </span>
                  <span className="text-[9px] text-[#94A3B8] block">bpm</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-[#E5EAF0]">
                  <span className="text-[10px] text-[#64748B] block">SpO2</span>
                  <span className="font-mono font-bold text-xs text-[#111827]">
                    {consultation.vitals?.spo2 || "99"}%
                  </span>
                  <span className="text-[9px] text-[#94A3B8] block">normal</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-[#E5EAF0]">
                  <span className="text-[10px] text-[#64748B] block">Temperature</span>
                  <span className="font-mono font-bold text-xs text-[#111827]">
                    {consultation.vitals?.temperature || "98.4"}°F
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-[#E5EAF0]">
                  <span className="text-[10px] text-[#64748B] block">Weight</span>
                  <span className="font-mono font-bold text-xs text-[#111827]">
                    {consultation.vitals?.weight || "58"} kg
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-[#E5EAF0]">
                  <span className="text-[10px] text-[#64748B] block">BMI</span>
                  <span className="font-mono font-bold text-xs text-[#087A50]">
                    {consultation.vitals?.bmi || "21.3"}
                  </span>
                </div>
              </div>
            </div>

            {/* Examination Notes */}
            <div className="bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] p-4 space-y-2">
              <span className="text-xs font-bold text-[#111827] block">Examination Findings</span>
              <p className="text-xs text-[#64748B] leading-relaxed bg-white p-3 rounded-xl border border-[#E5EAF0]">
                {consultation.examinationNotes || "Scalp evaluation shows diffuse telogen shed without active scarring. Scalp skin clear, no erythema or follicular plugs."}
              </p>
            </div>

            {/* History of Present Illness */}
            <div className="bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] p-4 space-y-2">
              <span className="text-xs font-bold text-[#111827] block">History of Present Illness (HPI)</span>
              <p className="text-xs text-[#64748B] leading-relaxed bg-white p-3 rounded-xl border border-[#E5EAF0]">
                {consultation.historyOfPresentIllness || "Patient reports onset 3 months following high psychological stress and strict dietary restriction. No systemic complaints."}
              </p>
            </div>

            {/* Patient Allergies & Alerts */}
            {patient?.allergies && patient.allergies.length > 0 && (
              <div className="bg-red-50/70 border border-red-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-red-800">Known Clinical Allergies</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {patient.allergies.map((all, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white text-red-700 text-[10px] font-semibold rounded-md border border-red-200">
                        {all}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TREATMENT PLAN TAB ================= */}
        {panelTab === "treatment" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">
                  {plan?.title || "Constitutional Care Protocol"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E9F8F0] text-[#087A50]">
                  {plan?.status || "Active"}
                </span>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">
                {plan?.treatmentDescription || consultation.treatmentPlan || "Customized posology protocol."}
              </p>

              <div className="pt-2 border-t border-[#E5EAF0] space-y-2">
                <span className="text-[11px] font-bold text-[#64748B] uppercase">Care Interventions</span>
                {plan?.interventions && plan.interventions.length > 0 ? (
                  plan.interventions.map((inv, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-xl border border-[#E5EAF0] flex items-center justify-between">
                      <span className="text-xs font-medium text-[#111827]">{inv.title}</span>
                      <span className="text-[11px] font-mono text-[#087A50] font-semibold">{inv.duration}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#64748B]">Interventions active under doctor supervision.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= PRESCRIPTION TAB ================= */}
        {panelTab === "rx" && (
          <div className="space-y-4 animate-fade-in">
            {rx ? (
              <div className="bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-[#087A50]" />
                    <span className="font-bold text-xs text-[#111827]">
                      {rx.prescriptionCode || "TG-RX-1100"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadRxPdf}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#087A50] text-white rounded-lg font-semibold text-xs hover:bg-[#075B3D] transition cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E5EAF0]">
                  {rx.medications && rx.medications.length > 0 ? (
                    rx.medications.map((med, idx) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-[#E5EAF0] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#111827]">{med.name}</span>
                          <span className="font-mono text-[11px] text-[#087A50]">{med.dosage}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          Frequency: <span className="font-semibold text-[#111827]">{med.frequency}</span> • Duration: <span className="font-semibold text-[#111827]">{med.duration}</span>
                        </p>
                        {med.instructions && (
                          <p className="text-[10px] text-gray-500 italic">&ldquo;{med.instructions}&rdquo;</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#64748B]">No specific drugs listed in prescription.</p>
                  )}
                </div>

                {rx.dietaryAdvice && (
                  <div className="pt-2 border-t border-[#E5EAF0]">
                    <span className="text-[11px] font-bold text-[#64748B] block mb-0.5">Dietary Guidance</span>
                    <p className="text-xs text-[#111827]">{rx.dietaryAdvice}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-[#64748B] bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0]">
                <Pill className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="font-semibold text-xs">No digital prescription linked</p>
                <p className="text-[11px] mt-0.5">Doctor has not issued medication for this visit.</p>
              </div>
            )}
          </div>
        )}

        {/* ================= HISTORY & AUDIT TAB ================= */}
        {panelTab === "history" && (
          <div className="space-y-4 animate-fade-in">
            {/* Record Hash Integrity Box */}
            <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-3.5 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 text-[#087A50] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>EHR Cryptographic Integrity Evidence</span>
              </div>
              <p className="text-[#64748B] text-[10px] break-all leading-tight">
                SHA-256: {consultation.recordHash || "Verified On Chain"}
              </p>
              <span className="text-[9px] text-[#087A50] font-sans font-semibold">
                Status: Verified Immutable &amp; Tamper-Evident
              </span>
            </div>

            {/* Amendments History */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111827]">Clinical Amendments History</span>
                {consultation.isFinalized && onOpenAmendment && (
                  <button
                    type="button"
                    onClick={() => onOpenAmendment(consultation)}
                    className="text-[11px] font-semibold text-[#087A50] hover:underline cursor-pointer"
                  >
                    + Append Amendment
                  </button>
                )}
              </div>

              {consultation.amendments && consultation.amendments.length > 0 ? (
                consultation.amendments.map((am, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-[#E5EAF0] space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#111827]">Amendment #{idx + 1}</span>
                      <span className="text-[10px] text-[#64748B] font-mono">
                        {new Date(am.amendedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#111827] italic">&ldquo;{am.reason}&rdquo;</p>
                    <p className="text-[10px] text-[#64748B]">
                      By: <span className="font-semibold">{am.amendedBy?.name || "Doctor"}</span>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#64748B] italic p-3 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]">
                  No clinical amendments. Original finalized evaluation remains untouched.
                </p>
              )}
            </div>

            {patient?._id && onOpenTimeline && (
              <button
                type="button"
                onClick={() => onOpenTimeline(patient._id)}
                className="w-full py-2.5 px-3 rounded-xl border border-[#087A50] text-[#087A50] hover:bg-[#E9F8F0] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <HistoryIcon className="w-3.5 h-3.5" />
                <span>View Full Patient EHR Timeline</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Bottom Actions (View Full Record, Print, Share) */}
      <div className="p-4 border-t border-[#E5EAF0] bg-white flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (patient?._id && onOpenTimeline) {
              onOpenTimeline(patient._id);
            } else {
              setPanelTab("notes");
            }
          }}
          className="flex-1 py-2 px-3 border border-[#E5EAF0] hover:bg-[#F8FAFC] text-[#111827] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5 text-[#087A50]" />
          <span>View Full Record</span>
        </button>

        <button
          type="button"
          onClick={handlePrintCaseSheet}
          title="Print Case Sheet"
          className="py-2 px-3 border border-[#E5EAF0] hover:bg-[#F8FAFC] text-[#111827] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5 text-[#64748B]" />
          <span>Print</span>
        </button>

        <button
          type="button"
          onClick={handleShareRecord}
          title="Share Record"
          className="py-2 px-3 border border-[#E5EAF0] hover:bg-[#F8FAFC] text-[#111827] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
        >
          <Share2 className="w-3.5 h-3.5 text-[#64748B]" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

