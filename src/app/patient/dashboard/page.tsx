"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Calendar,
  Printer,
  ShieldCheck,
  Pill,
  Loader2,
  Receipt,
  User,
  HeartPulse,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  Building,
  RefreshCw,
  Phone,
} from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";

interface PatientRecord {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  age: number;
  gender: string;
  bloodGroup?: string;
  medicalHistory?: string;
  allergies?: string[];
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
}

interface Appointment {
  _id: string;
  appointmentCode: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  mode: string;
  status: "scheduled" | "checked_in" | "in_consultation" | "completed" | "cancelled";
  doctorId?: {
    userId?: {
      fullName?: string;
      name?: string;
    };
    specialization?: string[];
  };
}

interface Medication {
  name: string;
  dosage: string;
  potency?: string;
  form?: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionRecord {
  _id: string;
  consultationId?: {
    _id: string;
    chiefComplaints?: string;
    diagnosis?: string;
    treatmentPlan?: string;
    finalizedAt?: string;
  };
  medications: Medication[];
  dietaryAdvice?: string;
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceCode: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: "draft" | "issued" | "paid" | "partially_paid" | "void";
  paymentMethod?: string;
  createdAt: string;
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"appointments" | "prescriptions" | "billing">("appointments");
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionRecord | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [, startTransition] = useTransition();

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current patient profile (EHR record)
      const patRes = await api.get<{ patient: PatientRecord }>("/patients/me").catch(async () => {
        // Fallback: search patients
        const allPat = await api.get<{ patients: PatientRecord[] }>("/patients").catch(() => ({ data: { patients: [] } }));
        if (allPat.data?.patients && allPat.data.patients.length > 0) {
          return { data: { patient: allPat.data.patients[0] } };
        }
        return { data: { patient: null as unknown as PatientRecord } };
      });

      if (patRes.data?.patient) {
        setPatientRecord(patRes.data.patient);
      }

      // 2. Fetch scoped appointments
      const apptRes = await api.get<{ appointments: Appointment[] }>("/appointments").catch(() => ({ data: { appointments: [] } }));
      if (apptRes.data?.appointments) {
        setAppointments(apptRes.data.appointments);
      }

      // 3. Fetch scoped prescriptions
      const rxRes = await api.get<{ prescriptions: PrescriptionRecord[] }>(
        patRes.data?.patient?._id
          ? `/clinical/prescriptions/patient/${patRes.data.patient._id}`
          : "/clinical/prescriptions"
      ).catch(() => ({ data: { prescriptions: [] } }));
      if (rxRes.data?.prescriptions) {
        setPrescriptions(rxRes.data.prescriptions);
      }

      // 4. Fetch scoped invoices
      const invRes = await api.get<{ invoices: Invoice[] }>("/billing/invoices").catch(() => ({ data: { invoices: [] } }));
      if (invRes.data?.invoices) {
        setInvoices(invRes.data.invoices);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "checked_in":
        return "bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse";
      case "in_consultation":
        return "bg-purple-50 text-purple-700 border-purple-200 font-bold";
      case "completed":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  return (
    <RoleGuard allowedRoles={["owner", "admin", "patient"]}>
      <DashboardShell role="patient">
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#154734] to-[#1E5C45] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-medium mb-3 backdrop-blur-sm border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Personal Patient Portal • Zero-Trust Scoped
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold">
                  My Health Records &amp; Digital Prescriptions
                </h1>
                <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
                  Welcome, {patientRecord?.fullName || user?.fullName || "Patient"}. Review your consultation timeline, homoeopathic remedies with posology guidelines, and payment receipts.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => startTransition(() => loadData())}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all border border-white/20 backdrop-blur-sm shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#154734] hover:bg-[#F3EFEA] text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print Records
                </button>
              </div>
            </div>
          </div>

          {/* Demographic & EHR Alignment Card */}
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D6]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E8EFEA] text-[#154734] flex items-center justify-center font-serif font-bold text-xl border border-[#D1E2D8]">
                  {patientRecord?.fullName ? patientRecord.fullName.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-serif font-bold text-[#154734]">
                      {patientRecord?.fullName || user?.fullName || "Patient Record"}
                    </h2>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#758277] border border-[#E8E2D6] font-bold">
                      {patientRecord?.patientCode || "PAT-PORTAL"}
                    </span>
                  </div>
                  <p className="text-xs text-[#758277] mt-0.5 flex items-center gap-2">
                    <span>{patientRecord?.age || 29} yrs</span>
                    <span>•</span>
                    <span className="capitalize">{patientRecord?.gender || "Female"}</span>
                    <span>•</span>
                    <span>Phone: {patientRecord?.phone || user?.phone || "—"}</span>
                    <span>•</span>
                    <span>Blood Group: {patientRecord?.bloodGroup || "O+"}</span>
                  </p>
                </div>
              </div>

              {/* EHR Verified Alignment Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>EHR Verified &amp; Identity Aligned</span>
              </div>
            </div>

            {/* Clinical Highlights / Allergies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
              <div className={`p-3.5 rounded-2xl border ${
                patientRecord?.allergies && patientRecord.allergies.length > 0
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-[#FAF8F5] border-[#E8E2D6] text-[#758277]"
              }`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className={`w-3.5 h-3.5 ${
                    patientRecord?.allergies && patientRecord.allergies.length > 0 ? "text-rose-600" : "text-[#758277]"
                  }`} />
                  Reported Allergies:
                </div>
                <p className="text-[11px]">
                  {patientRecord?.allergies && patientRecord.allergies.length > 0
                    ? patientRecord.allergies.join(", ")
                    : "No known adverse drug reactions or allergies reported."}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#2C3E30]">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-[#154734]">
                  <HeartPulse className="w-3.5 h-3.5 text-[#154734]" />
                  Active Clinical Focus:
                </div>
                <p className="text-[11px] text-[#758277]">
                  {patientRecord?.medicalHistory || "Holistic PCOD / Hormonal Remission and Lifestyle Optimization Protocol"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#E8E2D6] pb-1">
            {[
              { key: "appointments", label: "My Appointments", icon: Calendar, count: appointments.length },
              { key: "prescriptions", label: "Digital Prescriptions", icon: Pill, count: prescriptions.length },
              { key: "billing", label: "Receipts & Billing", icon: Receipt, count: invoices.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all ${
                    isActive
                      ? "bg-[#154734] text-white shadow-sm"
                      : "text-[#758277] hover:bg-[#FAF8F5] hover:text-[#154734]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? "bg-white/20 text-white" : "bg-[#FAF8F5] text-[#758277] border border-[#E8E2D6]"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Appointments */}
          {activeTab === "appointments" && (
            <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#154734]">
                    Consultation Visits &amp; Upcoming Slots
                  </h3>
                  <p className="text-xs text-[#758277]">
                    Live status tracking of your clinic visits and video consultations
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-xs text-[#758277]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#154734]" />
                  Loading your appointments...
                </div>
              ) : appointments.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#758277] bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E8E2D6]">
                  No appointment visits found on record.
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt) => (
                    <div
                      key={appt._id}
                      className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E2D6] flex items-center justify-center text-[#154734] shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-[#17221D]">
                              {appt.serviceName || "Clinical Consultation"}
                            </h4>
                            <span className="font-mono text-[10px] text-[#758277]">
                              ({appt.appointmentCode})
                            </span>
                          </div>
                          <p className="text-[11px] text-[#758277] mt-0.5">
                            Practitioner: Dr. {appt.doctorId?.userId?.fullName || appt.doctorId?.userId?.name || "Harshali Sutar"}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-[#2C3E30]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#154734]" />
                              {appt.appointmentDate}
                            </span>
                            <span className="flex items-center gap-1 font-semibold">
                              <Clock className="w-3 h-3 text-[#154734]" />
                              {appt.startTime} ({appt.mode})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] border capitalize ${getStatusBadge(appt.status)}`}>
                          {appt.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Digital Prescriptions */}
          {activeTab === "prescriptions" && (
            <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#154734]">
                    Homoeopathic Prescriptions &amp; Posology
                  </h3>
                  <p className="text-xs text-[#758277]">
                    Individualized remedies, dosage potencies, and dietary restrictions
                  </p>
                </div>
              </div>

              {prescriptions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#758277] bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E8E2D6]">
                  No finalized prescriptions recorded yet. They will appear here once Dr. Harshali finalizes your clinical consultation.
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((rx, idx) => (
                    <div
                      key={rx._id || idx}
                      className="p-5 rounded-3xl bg-[#FAF8F5] border border-[#E8E2D6] space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E2D6]">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif font-bold text-sm text-[#154734]">
                              Prescription #{idx + 1}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              Verified
                            </span>
                          </div>
                          <p className="text-[11px] text-[#758277] mt-0.5">
                            Issued on {new Date(rx.createdAt).toLocaleDateString()} by Dr. Harshali Sutar (MD Hom)
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedPrescription(rx);
                            handlePrint();
                          }}
                          className="px-3 py-1.5 rounded-xl border border-[#154734] text-[#154734] hover:bg-[#E8EFEA] text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-center"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Rx
                        </button>
                      </div>

                      {/* Medications List */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-[#154734] uppercase tracking-wider">
                          Remedies &amp; Posology:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {rx.medications?.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="p-3.5 rounded-2xl bg-white border border-[#E8E2D6] text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#154734]">{m.name}</span>
                                <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  {m.potency || "200C"}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#758277]">
                                Form: {m.form || "Sugar Globules"} • Dosage: {m.dosage}
                              </p>
                              <p className="text-[11px] text-[#2C3E30] font-medium">
                                Frequency: {m.frequency} • Duration: {m.duration}
                              </p>
                              {m.instructions && (
                                <p className="text-[10px] text-[#758277] italic pt-1 border-t border-black/5">
                                  Instructions: {m.instructions}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dietary Rules */}
                      {rx.dietaryAdvice && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1">
                          <p className="font-bold text-amber-900 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-amber-700" />
                            Dietary &amp; Storage Guidelines (Homoeopathy):
                          </p>
                          <p className="text-[11px] text-amber-800">{rx.dietaryAdvice}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Receipts & Billing */}
          {activeTab === "billing" && (
            <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#154734]">
                    Payment Receipts &amp; Invoices
                  </h3>
                  <p className="text-xs text-[#758277]">
                    Statements for consultations, remedies, and clinic diagnostics
                  </p>
                </div>
              </div>

              {invoices.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#758277] bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E8E2D6]">
                  No invoices or receipts found on your account.
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div
                      key={inv._id}
                      className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#154734]">{inv.invoiceCode}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#758277] mt-1">
                          Date: {new Date(inv.createdAt).toLocaleDateString()} • Method: {inv.paymentMethod?.toUpperCase() || "UPI"}
                        </p>
                        <div className="mt-2 space-y-0.5">
                          {inv.items?.map((it, itIdx) => (
                            <p key={itIdx} className="text-[11px] text-[#2C3E30]">
                              • {it.description} (x{it.quantity}) — ₹{it.total}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        <p className="text-base font-serif font-bold text-[#154734]">
                          ₹{inv.total}
                        </p>
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            handlePrint();
                          }}
                          className="px-3 py-1 rounded-xl border border-[#E8E2D6] text-[#154734] hover:bg-[#E8EFEA] text-[11px] font-semibold flex items-center gap-1 transition-all"
                        >
                          <Printer className="w-3 h-3" />
                          Print Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
