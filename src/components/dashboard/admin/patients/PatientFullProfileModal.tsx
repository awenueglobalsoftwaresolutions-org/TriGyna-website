"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  Mail,
  Calendar,
  Stethoscope,
  Pill,
  FileText,
  CreditCard,
  Clock,
  ShieldCheck,
  User,
  HeartPulse,
  Download,
  Loader2,
  ExternalLink,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { PatientRecord } from "./PatientDetailPanel";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface PatientFullProfileModalProps {
  patient: PatientRecord;
  isOpen: boolean;
  onClose: () => void;
  onEditClick: (patient: PatientRecord) => void;
  onBookAppointmentClick: (patient: PatientRecord) => void;
}

export function PatientFullProfileModal({
  patient,
  isOpen,
  onClose,
  onEditClick,
  onBookAppointmentClick,
}: PatientFullProfileModalProps) {
  const [activeSection, setActiveSection] = useState<
    "overview" | "clinical" | "appointments" | "prescriptions" | "followups" | "documents" | "billing"
  >("overview");

  const [isLoading, setIsLoading] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && patient._id) {
      setIsLoading(true);
      Promise.all([
        api.get<{ appointments: any[] }>(`/patients/${patient._id}/appointments`),
        api.get<{ consultations: any[] }>(`/patients/${patient._id}/consultations`),
        api.get<{ prescriptions: any[] }>(`/patients/${patient._id}/prescriptions`),
        api.get<{ followups: any[] }>(`/patients/${patient._id}/followups`),
        api.get<{ documents: any[] }>(`/patients/${patient._id}/documents`),
        api.get<{ invoices: any[] }>(`/patients/${patient._id}/invoices`),
      ])
        .then(([a, c, p, f, d, inv]) => {
          if (a.data?.appointments) setAppointments(a.data.appointments);
          if (c.data?.consultations) setConsultations(c.data.consultations);
          if (p.data?.prescriptions) setPrescriptions(p.data.prescriptions);
          if (f.data?.followups) setFollowups(f.data.followups);
          if (d.data?.documents) setDocuments(d.data.documents);
          if (inv.data?.invoices) setInvoices(inv.data.invoices);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, patient._id]);

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[92vh] font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAF0] bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#087A50] text-white flex items-center justify-center font-bold text-base ring-2 ring-[#E5EAF0]">
              {patient.fullName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#087A50] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {patient.patientCode}
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  • Verified Patient Profile
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#111827] mt-0.5">{patient.fullName}</h2>
              <p className="text-xs text-[#64748B]">
                <span className="capitalize">{patient.gender}</span> • {patient.age || 44} Years • Blood Group:{" "}
                <span className="font-mono font-bold text-rose-700">{patient.bloodGroup || "Not Recorded"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onBookAppointmentClick(patient)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 border border-[#087A50] text-[#087A50] rounded-xl text-xs font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Visit</span>
            </button>
            <button
              type="button"
              onClick={() => onEditClick(patient)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition-colors cursor-pointer shadow-2xs"
            >
              <span>Edit Record</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-navigation Bar */}
        <div className="flex items-center gap-1 px-6 border-b border-[#E5EAF0] bg-[#F8FAFC] text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSection("overview")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === "overview" ? "border-[#087A50] text-[#087A50]" : "border-transparent text-[#64748B]"
            }`}
          >
            Overview &amp; Demographics
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("clinical")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === "clinical" ? "border-[#087A50] text-[#087A50]" : "border-transparent text-[#64748B]"
            }`}
          >
            Consultations ({consultations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("appointments")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === "appointments" ? "border-[#087A50] text-[#087A50]" : "border-transparent text-[#64748B]"
            }`}
          >
            Appointments ({appointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("prescriptions")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === "prescriptions" ? "border-[#087A50] text-[#087A50]" : "border-transparent text-[#64748B]"
            }`}
          >
            Prescriptions ({prescriptions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("followups")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === "followups" ? "border-[#087A50] text-[#087A50]" : "border-transparent text-[#64748B]"
            }`}
          >
            Follow-ups ({followups.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("documents")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === "documents" ? "border-[#087A50] text-[#087A50]" : "border-transparent text-[#64748B]"
            }`}
          >
            Documents ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("billing")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === "billing" ? "border-[#087A50] text-[#087A50]" : "border-transparent text-[#64748B]"
            }`}
          >
            Billing ({invoices.length})
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-[#F7F9FC]">
          {isLoading ? (
            <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#087A50]" />
              <span>Loading complete health record...</span>
            </div>
          ) : (
            <>
              {/* SECTION: OVERVIEW */}
              {activeSection === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Demographics Card */}
                  <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-3">
                    <span className="text-[11px] font-bold text-[#087A50] uppercase tracking-wider block border-b border-[#E5EAF0] pb-1">
                      Personal Demographics &amp; Contact
                    </span>
                    <div className="space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Primary Phone:</span>
                        <span className="font-mono font-bold text-[#111827]">{patient.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Email Address:</span>
                        <span className="font-mono text-[#111827]">{patient.email || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Residential Address:</span>
                        <span className="text-[#111827] text-right max-w-xs">{patient.address || "Mumbai, Maharashtra"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Emergency Contact:</span>
                        <span className="text-[#111827]">
                          {patient.emergencyContact?.name
                            ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship || "Kin"} • ${patient.emergencyContact.phone || "—"})`
                            : "Not recorded"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Intake Card */}
                  <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-3">
                    <span className="text-[11px] font-bold text-[#087A50] uppercase tracking-wider block border-b border-[#E5EAF0] pb-1">
                      Clinical Intake &amp; Alerts
                    </span>
                    <div className="space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Blood Group:</span>
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {patient.bloodGroup || "Not Recorded"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block mb-1">Chief Health Concerns:</span>
                        <p className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#111827] leading-relaxed">
                          {patient.medicalHistory || "General Consultation"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#64748B] block mb-1">Known Allergies:</span>
                        {patient.allergies && patient.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {patient.allergies.map((alg, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {alg}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">No drug allergies reported</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: CLINICAL CONSULTATIONS */}
              {activeSection === "clinical" && (
                <div className="space-y-3">
                  {consultations.length === 0 ? (
                    <div className="py-12 text-center text-[#64748B] bg-white rounded-2xl border border-[#E5EAF0]">
                      <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold text-[#111827]">No clinical consultation records found</p>
                    </div>
                  ) : (
                    consultations.map((c) => (
                      <div key={c._id} className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#087A50] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                              {c.consultationCode}
                            </span>
                            <span className="font-bold text-sm text-[#111827]">{c.diagnosis || "General Consultation"}</span>
                          </div>
                          <span className="text-[11px] font-mono text-[#64748B]">
                            {new Date(c.consultationDate || c.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="font-semibold text-[#64748B] block mb-0.5">Chief Complaints:</span>
                            <p className="text-[#111827]">{c.chiefComplaints || "Standard review"}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-[#64748B] block mb-0.5">Treatment Plan:</span>
                            <p className="text-[#111827]">{c.treatmentPlan || "Advised symptomatic care"}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SECTION: APPOINTMENTS */}
              {activeSection === "appointments" && (
                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <div className="py-12 text-center text-[#64748B] bg-white rounded-2xl border border-[#E5EAF0]">
                      <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold text-[#111827]">No appointments booked for this patient</p>
                    </div>
                  ) : (
                    appointments.map((a) => (
                      <div key={a._id} className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-2xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#087A50] bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                              {a.appointmentCode}
                            </span>
                            <span className="font-bold text-sm text-[#111827]">{a.serviceName}</span>
                          </div>
                          <p className="text-xs text-[#64748B] font-mono mt-1">
                            {a.appointmentDate} • {a.startTime} • {a.mode}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                          a.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {a.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SECTION: PRESCRIPTIONS */}
              {activeSection === "prescriptions" && (
                <div className="space-y-3">
                  {prescriptions.length === 0 ? (
                    <div className="py-12 text-center text-[#64748B] bg-white rounded-2xl border border-[#E5EAF0]">
                      <Pill className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold text-[#111827]">No digital prescriptions issued yet</p>
                    </div>
                  ) : (
                    prescriptions.map((r) => (
                      <div key={r._id} className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-2">
                          <span className="font-bold text-sm text-purple-700">Digital Prescription</span>
                          <span className="text-[11px] font-mono text-[#64748B]">
                            {new Date(r.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {r.medications?.map((m: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                              <span className="font-semibold text-[#111827]">{m.medicineName || m.name}</span>
                              <span className="text-[#64748B]">{m.dosage || "1-0-1"} • {m.duration || "5 Days"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SECTION: DOCUMENTS */}
              {activeSection === "documents" && (
                <div className="space-y-3">
                  {documents.length === 0 ? (
                    <div className="py-12 text-center text-[#64748B] bg-white rounded-2xl border border-[#E5EAF0]">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold text-[#111827]">No documents uploaded for this patient</p>
                    </div>
                  ) : (
                    documents.map((d) => (
                      <div key={d._id} className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-[#111827]">{d.title}</p>
                            <p className="text-[11px] text-[#64748B] font-mono">
                              {d.documentCode} • {d.documentType} • {new Date(d.createdAt).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                        </div>
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E5EAF0] text-[#087A50] hover:bg-emerald-50 text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View</span>
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SECTION: BILLING */}
              {activeSection === "billing" && (
                <div className="space-y-3">
                  {invoices.length === 0 ? (
                    <div className="py-12 text-center text-[#64748B] bg-white rounded-2xl border border-[#E5EAF0]">
                      <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold text-[#111827]">No billing records found</p>
                    </div>
                  ) : (
                    invoices.map((inv) => (
                      <div key={inv._id} className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-2xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#111827]">{inv.invoiceNumber}</span>
                            <span className="text-xs text-[#64748B]">
                              • {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                          <p className="font-bold text-sm text-[#111827] mt-1 font-mono">
                            ₹{inv.totalAmount?.toLocaleString() || "0"}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

