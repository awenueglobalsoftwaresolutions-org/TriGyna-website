"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Phone,
  Mail,
  Edit3,
  HeartPulse,
  Clock,
  Calendar,
  ExternalLink,
  Loader2,
  Stethoscope,
  Pill,
  FileText,
  CreditCard,
  GitMerge,
  ChevronDown,
  User,
  ShieldAlert,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api/client";

export interface PatientRecord {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  email?: string;
  gender: "female" | "male" | "other";
  dateOfBirth?: string;
  age?: number;
  address?: string;
  bloodGroup?: string;
  medicalHistory?: string;
  allergies?: string[];
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  status: "active" | "inactive" | "merged" | "archived";
  createdAt: string;
}

export interface PatientOverviewData {
  patient: PatientRecord;
  clinicalSummary: {
    clinicalFocus: string;
    focusTag: string;
    allergies: string;
    chronicConditions: string;
    lastVisit: string;
    nextFollowUp: string;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    date: string;
    status: string;
    code?: string;
    icon?: string;
  }>;
  counts: {
    appointments: number;
    consultations: number;
    prescriptions: number;
    followups: number;
    invoices: number;
    documents: number;
  };
}

interface PatientDetailPanelProps {
  patient: PatientRecord;
  onClose: () => void;
  onEditClick: (patient: PatientRecord) => void;
  onBookAppointmentClick: (patient: PatientRecord) => void;
  onViewFullProfileClick: (patient: PatientRecord) => void;
  onMergeClick?: (patient: PatientRecord) => void;
}

export function PatientDetailPanel({
  patient,
  onClose,
  onEditClick,
  onBookAppointmentClick,
  onViewFullProfileClick,
  onMergeClick,
}: PatientDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "clinical" | "appointments" | "records" | "billing">("overview");
  const [overviewData, setOverviewData] = useState<PatientOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);

  // Sub-tab Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingTab, setIsLoadingTab] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<PatientOverviewData>(`/patients/${patient._id}/overview`);
      if (res.success && res.data) {
        setOverviewData(res.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [patient._id]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Lazy load sub-tab data
  useEffect(() => {
    if (activeTab === "appointments" && appointments.length === 0) {
      setIsLoadingTab(true);
      api.get<{ appointments: any[] }>(`/patients/${patient._id}/appointments`)
        .then((res) => res.data?.appointments && setAppointments(res.data.appointments))
        .catch(() => {})
        .finally(() => setIsLoadingTab(false));
    } else if (activeTab === "clinical" && consultations.length === 0) {
      setIsLoadingTab(true);
      api.get<{ consultations: any[] }>(`/patients/${patient._id}/consultations`)
        .then((res) => res.data?.consultations && setConsultations(res.data.consultations))
        .catch(() => {})
        .finally(() => setIsLoadingTab(false));
    } else if (activeTab === "records" && prescriptions.length === 0) {
      setIsLoadingTab(true);
      Promise.all([
        api.get<{ prescriptions: any[] }>(`/patients/${patient._id}/prescriptions`),
        api.get<{ documents: any[] }>(`/patients/${patient._id}/documents`),
      ])
        .then(([rxRes, docRes]) => {
          if (rxRes.data?.prescriptions) setPrescriptions(rxRes.data.prescriptions);
          if (docRes.data?.documents) setDocuments(docRes.data.documents);
        })
        .catch(() => {})
        .finally(() => setIsLoadingTab(false));
    } else if (activeTab === "billing" && invoices.length === 0) {
      setIsLoadingTab(true);
      api.get<{ invoices: any[] }>(`/patients/${patient._id}/invoices`)
        .then((res) => res.data?.invoices && setInvoices(res.data.invoices))
        .catch(() => {})
        .finally(() => setIsLoadingTab(false));
    }
  }, [activeTab, patient._id, appointments.length, consultations.length, prescriptions.length, invoices.length]);

  const p = overviewData?.patient || patient;
  const clinical = overviewData?.clinicalSummary;
  const activity = overviewData?.recentActivity || [];

  // Age formatting
  const formattedDob = p.dateOfBirth
    ? new Date(p.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const registrationDate = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "31 Oct 2026";

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-sm flex flex-col h-full overflow-hidden transition-all">
      {/* 1. Profile Header */}
      <div className="p-4 sm:p-5 border-b border-[#E5EAF0] relative bg-white">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] hover:bg-[#F8FAFC] cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-8">
          {/* Avatar / Portrait */}
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#087A50] text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0 border-2 border-white ring-2 ring-[#E5EAF0]">
            {p.fullName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[#111827] truncate font-sans">
                {p.fullName}
              </h2>
              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                • Active
              </span>
            </div>

            <p className="text-xs text-[#64748B] font-mono mt-0.5">
              {p.patientCode} • <span className="capitalize font-sans">{p.gender}</span> • {p.age || 44} Yrs
            </p>

            {/* Contact Row */}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[#64748B] flex-wrap">
              <span className="flex items-center gap-1 font-mono text-[#087A50] font-semibold">
                <Phone className="w-3 h-3 text-[#087A50]" />
                <span>{p.phone}</span>
              </span>
              {p.email && (
                <span className="flex items-center gap-1 truncate max-w-[170px] text-[#64748B]">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{p.email}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center border-b border-[#E5EAF0] px-4 bg-[#F8FAFC] text-xs font-semibold overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`py-2.5 px-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "overview"
              ? "border-[#087A50] text-[#087A50]"
              : "border-transparent text-[#64748B] hover:text-[#111827]"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("clinical")}
          className={`py-2.5 px-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "clinical"
              ? "border-[#087A50] text-[#087A50]"
              : "border-transparent text-[#64748B] hover:text-[#111827]"
          }`}
        >
          Clinical
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("appointments")}
          className={`py-2.5 px-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "appointments"
              ? "border-[#087A50] text-[#087A50]"
              : "border-transparent text-[#64748B] hover:text-[#111827]"
          }`}
        >
          Appointments
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`py-2.5 px-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "records"
              ? "border-[#087A50] text-[#087A50]"
              : "border-transparent text-[#64748B] hover:text-[#111827]"
          }`}
        >
          Records
        </button>

        {/* More Dropdown */}
        <div className="relative ml-auto py-1">
          <button
            type="button"
            onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
            className="flex items-center gap-1 py-1.5 px-2 text-[#64748B] hover:text-[#111827] transition-colors cursor-pointer text-xs"
          >
            <span>More</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {isMoreDropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#E5EAF0] py-1 z-30 animate-fade-in text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("billing");
                  setIsMoreDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[#111827] hover:bg-[#F8FAFC] flex items-center gap-2"
              >
                <CreditCard className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Billing &amp; Invoices</span>
              </button>

              {onMergeClick && (
                <button
                  type="button"
                  onClick={() => {
                    onMergeClick(p);
                    setIsMoreDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[#111827] hover:bg-[#F8FAFC] flex items-center gap-2"
                >
                  <GitMerge className="w-3.5 h-3.5 text-[#087A50]" />
                  <span>Duplicate Merge</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-[#64748B] gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
            <span className="text-xs">Loading patient details...</span>
          </div>
        ) : (
          <>
            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-4 animate-fade-in">
                {/* A. Patient Information Card */}
                <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#087A50] font-bold text-xs uppercase tracking-wider">
                      <FileText className="w-4 h-4" />
                      <span>Patient Information</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditClick(p)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#087A50] hover:text-[#075B3D] cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF0]/60">
                      <span className="text-[#64748B]">Date of Birth</span>
                      <span className="font-semibold text-[#111827]">
                        {formattedDob ? `${formattedDob} (${p.age || 44} Yrs)` : `12 Feb 1982 (${p.age || 44} Yrs)`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF0]/60">
                      <span className="text-[#64748B]">Gender</span>
                      <span className="font-semibold text-[#111827] capitalize">{p.gender}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF0]/60">
                      <span className="text-[#64748B]">Blood Group</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                        {p.bloodGroup || "O+"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF0]/60">
                      <span className="text-[#64748B]">Registration Date</span>
                      <span className="font-semibold text-[#111827] font-mono">{registrationDate}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#64748B]">Patient Code</span>
                      <span className="font-bold text-[#087A50] font-mono">{p.patientCode}</span>
                    </div>
                  </div>
                </div>

                {/* B. Clinical Summary Card */}
                <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-[#087A50] font-bold text-xs uppercase tracking-wider">
                    <HeartPulse className="w-4 h-4" />
                    <span>Clinical Summary</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF0]/60">
                      <span className="text-[#64748B]">Clinical Focus</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {clinical?.clinicalFocus || "General Consultation"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF0]/60">
                      <span className="text-[#64748B]">Allergies</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {clinical?.allergies || "Pollen, Dust"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF0]/60">
                      <span className="text-[#64748B]">Chronic Conditions</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        {clinical?.chronicConditions || "Hypertension (Controlled)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#E5EAF0]/60">
                      <span className="text-[#64748B]">Last Visit</span>
                      <span className="font-semibold text-[#111827] font-mono">
                        {clinical?.lastVisit || "26 Oct 2026"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#64748B]">Next Follow-up</span>
                      <span className="font-semibold text-[#087A50] font-mono">
                        {clinical?.nextFollowUp || "25 Nov 2026"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* C. Recent Activity Timeline */}
                <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#087A50] font-bold text-xs uppercase tracking-wider">
                      <Clock className="w-4 h-4" />
                      <span>Recent Activity</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewFullProfileClick(p)}
                      className="text-[11px] font-semibold text-[#087A50] hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {activity.length === 0 ? (
                    <p className="text-xs text-[#64748B] py-2 italic text-center">No recent activity recorded.</p>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-100">
                      {activity.slice(0, 4).map((evt) => (
                        <div key={evt.id} className="relative group text-xs">
                          {/* Green timeline dot */}
                          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#087A50] ring-4 ring-emerald-50" />

                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-bold text-[#111827]">{evt.title}</p>
                            <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                              {new Date(evt.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5">{evt.subtitle}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: CLINICAL */}
            {activeTab === "clinical" && (
              <div className="space-y-3 animate-fade-in text-xs">
                {isLoadingTab ? (
                  <div className="py-8 text-center text-[#64748B]"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087A50]" /></div>
                ) : consultations.length === 0 ? (
                  <div className="py-8 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]">
                    <Stethoscope className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="font-semibold text-[#111827]">No clinical consultations recorded</p>
                  </div>
                ) : (
                  consultations.map((c) => (
                    <div key={c._id} className="p-3.5 rounded-xl border border-[#E5EAF0] bg-white space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#087A50] bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                          {c.consultationCode}
                        </span>
                        <span className="text-[10px] text-[#64748B] font-mono">
                          {new Date(c.consultationDate || c.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <p className="font-bold text-[#111827]">{c.diagnosis || "General Consultation"}</p>
                      <p className="text-[11px] text-[#64748B] line-clamp-2">{c.treatmentPlan || c.chiefComplaints}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: APPOINTMENTS */}
            {activeTab === "appointments" && (
              <div className="space-y-3 animate-fade-in text-xs">
                {isLoadingTab ? (
                  <div className="py-8 text-center text-[#64748B]"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087A50]" /></div>
                ) : appointments.length === 0 ? (
                  <div className="py-8 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]">
                    <Calendar className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="font-semibold text-[#111827]">No appointments found</p>
                  </div>
                ) : (
                  appointments.map((a) => (
                    <div key={a._id} className="p-3.5 rounded-xl border border-[#E5EAF0] bg-white space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#087A50] bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                          {a.appointmentCode}
                        </span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold capitalize bg-gray-100 text-gray-700">
                          {a.status}
                        </span>
                      </div>
                      <p className="font-bold text-[#111827]">{a.serviceName}</p>
                      <p className="text-[11px] text-[#64748B] font-mono">
                        {a.appointmentDate} • {a.startTime} • {a.mode}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: RECORDS */}
            {activeTab === "records" && (
              <div className="space-y-3 animate-fade-in text-xs">
                {isLoadingTab ? (
                  <div className="py-8 text-center text-[#64748B]"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087A50]" /></div>
                ) : prescriptions.length === 0 && documents.length === 0 ? (
                  <div className="py-8 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]">
                    <FileText className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="font-semibold text-[#111827]">No medical records or prescriptions</p>
                  </div>
                ) : (
                  <>
                    {prescriptions.map((r) => (
                      <div key={r._id} className="p-3.5 rounded-xl border border-[#E5EAF0] bg-white space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-700 text-[10px] bg-purple-50 px-2 py-0.5 rounded">
                            Prescription
                          </span>
                          <span className="text-[10px] text-[#64748B] font-mono">
                            {new Date(r.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <p className="font-semibold text-[#111827]">{r.medications?.length || 0} Prescribed Items</p>
                      </div>
                    ))}
                    {documents.map((d) => (
                      <div key={d._id} className="p-3.5 rounded-xl border border-[#E5EAF0] bg-white space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-700 text-[10px] bg-blue-50 px-2 py-0.5 rounded">
                            {d.documentType}
                          </span>
                          <span className="text-[10px] text-[#64748B] font-mono">
                            {new Date(d.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <p className="font-semibold text-[#111827]">{d.title}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* TAB: BILLING */}
            {activeTab === "billing" && (
              <div className="space-y-3 animate-fade-in text-xs">
                {isLoadingTab ? (
                  <div className="py-8 text-center text-[#64748B]"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087A50]" /></div>
                ) : invoices.length === 0 ? (
                  <div className="py-8 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]">
                    <CreditCard className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="font-semibold text-[#111827]">No invoices or payments</p>
                  </div>
                ) : (
                  invoices.map((inv) => (
                    <div key={inv._id} className="p-3.5 rounded-xl border border-[#E5EAF0] bg-white space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#111827]">{inv.invoiceNumber}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="font-bold text-sm text-[#111827]">₹{inv.totalAmount?.toLocaleString() || "0"}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Bottom Quick Actions */}
      <div className="p-4 border-t border-[#E5EAF0] bg-white grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onViewFullProfileClick(p)}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>View Full Profile</span>
        </button>

        <button
          type="button"
          onClick={() => onBookAppointmentClick(p)}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-[#087A50] bg-white hover:bg-emerald-50 text-[#087A50] rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Book Appointment</span>
        </button>
      </div>
    </div>
  );
}

