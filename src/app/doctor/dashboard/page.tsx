"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Stethoscope,
  FileText,
  Lock,
  Plus,
  Trash2,
  Clock,
  History,
  AlertTriangle,
  User,
  HeartPulse,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Info,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { api } from "@/lib/api/client";

interface Patient {
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
  patientId: Patient;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  mode: string;
  status: "scheduled" | "checked_in" | "in_consultation" | "completed" | "cancelled";
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

interface Amendment {
  reason: string;
  newDiagnosis?: string;
  addendumNotes?: string;
  createdAt: string;
  amendedBy?: { fullName?: string };
}

interface Consultation {
  _id: string;
  appointmentId: string;
  chiefComplaints: string;
  examinationNotes: string;
  diagnosis: string;
  treatmentPlan: string;
  followUpAdvice: string;
  isFinalized: boolean;
  finalizedAt?: string;
  amendments: Amendment[];
}

interface PrescriptionRecord {
  _id: string;
  medications: Medication[];
  dietaryAdvice?: string;
  createdAt: string;
}

export default function DoctorDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [, setPastPrescription] = useState<PrescriptionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  // Clinical Encounter State
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [examinationNotes, setExaminationNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [followUpAdvice, setFollowUpAdvice] = useState("");

  // Homoeopathic Posology Prescription State
  const [medications, setMedications] = useState<Medication[]>([
    {
      name: "Sepia Officinalis",
      dosage: "4 pills",
      potency: "200C",
      form: "Sugar Globules",
      frequency: "Twice daily before meals",
      duration: "14 days",
      instructions: "Keep on clean tongue, allow to dissolve. Avoid strong perfumes & mint 30 min before/after.",
    },
  ]);
  const [dietaryAdvice, setDietaryAdvice] = useState(
    "Avoid raw onions, strong garlic, camphorated balms, and black coffee 30 mins before or after remedy. Maintain warm hydration."
  );

  // Legal Amendment State
  const [amendmentReason, setAmendmentReason] = useState("");
  const [amendmentNotes, setAmendmentNotes] = useState("");
  const [isAmending, setIsAmending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ appointments: Appointment[] }>("/appointments");
      if (res.data?.appointments) {
        setAppointments(res.data.appointments);
        if (res.data.appointments.length > 0 && !selectedAppt) {
          handleSelectAppointment(res.data.appointments[0]);
        }
      }
    } catch {
      // Handled silently
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectAppointment = async (appt: Appointment) => {
    setSelectedAppt(appt);
    setConsultation(null);
    setPastPrescription(null);
    setChiefComplaints("");
    setExaminationNotes("");
    setDiagnosis("");
    setTreatmentPlan("");
    setFollowUpAdvice("");

    try {
      const res = await api.get<{ consultation: Consultation }>(
        `/clinical/consultations/appointment/${appt._id}`
      );
      if (res.data?.consultation) {
        const c = res.data.consultation;
        setConsultation(c);
        setChiefComplaints(c.chiefComplaints || "");
        setExaminationNotes(c.examinationNotes || "");
        setDiagnosis(c.diagnosis || "");
        setTreatmentPlan(c.treatmentPlan || "");
        setFollowUpAdvice(c.followUpAdvice || "");
      }
    } catch {
      // Consultation draft not started yet
    }

    // Try loading existing prescription
    try {
      const pRes = await api.get<{ prescriptions: PrescriptionRecord[] }>(
        `/clinical/prescriptions/patient/${appt.patientId?._id || ""}`
      );
      if (pRes.data?.prescriptions && pRes.data.prescriptions.length > 0) {
        setPastPrescription(pRes.data.prescriptions[0]);
      }
    } catch {
      // No past prescription
    }
  };

  const handleUpdateStatus = async (newStatus: Appointment["status"]) => {
    if (!selectedAppt) return;
    try {
      await api.patch(`/appointments/${selectedAppt._id}/status`, { status: newStatus });
      selectedAppt.status = newStatus;
      setAppointments([...appointments]);
      showToast(`Appointment status changed to: ${newStatus.replace("_", " ")}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update encounter status";
      alert(msg);
    }
  };

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      {
        name: "",
        dosage: "4 pills",
        potency: "30C",
        form: "Sugar Globules",
        frequency: "Twice daily",
        duration: "7 days",
        instructions: "Dissolve under tongue. Take on an empty stomach.",
      },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSaveDraft = async () => {
    if (!selectedAppt) return;
    setIsSaving(true);
    try {
      const res = await api.post<{ consultation: Consultation }>("/clinical/consultations", {
        appointmentId: selectedAppt._id,
        chiefComplaints,
        examinationNotes,
        diagnosis,
        treatmentPlan,
        followUpAdvice,
      });

      if (res.data?.consultation) {
        setConsultation(res.data.consultation);

        const validMeds = medications.filter((m) => m.name.trim());
        if (validMeds.length > 0) {
          await api.post("/clinical/prescriptions", {
            consultationId: res.data.consultation._id,
            medications: validMeds,
            dietaryAdvice,
          });
        }
        showToast("Consultation clinical draft & posology prescription saved successfully.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save consultation draft";
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!consultation) {
      alert("Please save draft before finalizing.");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to finalize this clinical encounter? Finalized records are legally locked and can only be modified via documented legal amendments."
      )
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post<{ consultation: Consultation }>(
        `/clinical/consultations/${consultation._id}/finalize`,
        {}
      );
      if (res.data?.consultation) {
        setConsultation(res.data.consultation);
        handleUpdateStatus("completed");
        showToast("Clinical encounter finalized, stamped, and legally locked.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to finalize consultation";
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAmendment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultation || !amendmentReason.trim()) return;

    setIsAmending(true);
    try {
      const res = await api.post<{ consultation: Consultation }>(
        `/clinical/consultations/${consultation._id}/amendments`,
        {
          reason: amendmentReason.trim(),
          addendumNotes: amendmentNotes.trim(),
        }
      );
      if (res.data?.consultation) {
        setConsultation(res.data.consultation);
        setAmendmentReason("");
        setAmendmentNotes("");
        showToast("Legal clinical amendment appended with immutable audit stamp.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to append amendment";
      alert(msg);
    } finally {
      setIsAmending(false);
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === "all" || appt.status === statusFilter;
    const patientName = appt.patientId?.fullName?.toLowerCase() || "";
    const code = appt.appointmentCode?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    const matchesSearch = patientName.includes(query) || code.includes(query);
    return matchesStatus && matchesSearch;
  });

  const isFinalized = consultation?.isFinalized ?? false;
  const patient = selectedAppt?.patientId;

  return (
    <RoleGuard allowedRoles={["owner", "admin", "doctor"]}>
      <DashboardShell role="doctor">
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 bg-[#154734] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#D1E2D8] animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#154734] to-[#1E5C45] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-medium mb-3 backdrop-blur-sm border border-white/10">
                  <Stethoscope className="w-3.5 h-3.5" />
                  Clinical Practice Portal • Dr. Harshali Sutar
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold">
                  Doctor Clinical Encounters &amp; Posology
                </h1>
                <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
                  Manage patient consultation queues, review past medical history, draft homeopathic remedies with individualized potencies, and produce legally locked clinical records.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => startTransition(() => { loadAppointments(); })}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all border border-white/20 backdrop-blur-sm shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Queue
                </button>
              </div>
            </div>
          </div>

          {/* Main Grid: Queue on Left, Clinical Canvas on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Appointments Encounter Queue */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-3xl border border-[#E8E2D6] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-serif font-bold text-[#154734]">
                      Encounter Queue
                    </h2>
                    <p className="text-xs text-[#758277]">
                      {filteredAppointments.length} appointment(s) found
                    </p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Filter and Search */}
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#758277]" />
                    <input
                      type="text"
                      placeholder="Search patient or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 focus:border-[#154734] bg-[#FAF8F5]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "all", label: "All" },
                      { key: "scheduled", label: "Scheduled" },
                      { key: "checked_in", label: "Checked In" },
                      { key: "in_consultation", label: "In Consult" },
                      { key: "completed", label: "Done" },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                          statusFilter === f.key
                            ? "bg-[#154734] text-white shadow-sm"
                            : "bg-[#FAF8F5] text-[#758277] hover:bg-[#F3EFEA]"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Encounters List */}
                <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                  {isLoading ? (
                    <div className="p-8 text-center text-xs text-[#758277]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#154734]" />
                      Loading encounters...
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#758277] bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E8E2D6]">
                      No appointments matching filter
                    </div>
                  ) : (
                    filteredAppointments.map((appt) => {
                      const isSelected = selectedAppt?._id === appt._id;
                      const statusColors: Record<string, string> = {
                        scheduled: "bg-blue-50 text-blue-700 border-blue-200",
                        checked_in: "bg-amber-50 text-amber-700 border-amber-200 font-bold animate-pulse",
                        in_consultation: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
                        completed: "bg-gray-100 text-gray-700 border-gray-200",
                        cancelled: "bg-red-50 text-red-700 border-red-200",
                      };

                      return (
                        <div
                          key={appt._id}
                          onClick={() => handleSelectAppointment(appt)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-[#154734] text-white border-[#154734] shadow-md shadow-[#154734]/10"
                              : "bg-[#FAF8F5] text-[#2C3E30] border-[#E8E2D6] hover:bg-white hover:border-[#D1E2D8]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`text-xs font-bold ${isSelected ? "text-white" : "text-[#154734]"}`}>
                                  {appt.patientId?.fullName || "Walk-in Patient"}
                                </p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                  isSelected ? "bg-white/20 text-white border-white/30" : statusColors[appt.status]
                                }`}>
                                  {appt.status.replace("_", " ")}
                                </span>
                              </div>
                              <p className={`text-[11px] mt-0.5 ${isSelected ? "text-emerald-100" : "text-[#758277]"}`}>
                                Code: {appt.appointmentCode} • {appt.serviceName || "Clinical Consultation"}
                              </p>
                            </div>
                            <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? "text-white" : "text-[#758277]"}`} />
                          </div>

                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-black/5 text-[10px]">
                            <span className={`flex items-center gap-1 ${isSelected ? "text-emerald-200" : "text-[#758277]"}`}>
                              <Calendar className="w-3 h-3" />
                              {appt.appointmentDate}
                            </span>
                            <span className={`flex items-center gap-1 font-semibold ${isSelected ? "text-white" : "text-[#154734]"}`}>
                              <Clock className="w-3 h-3" />
                              {appt.startTime} ({appt.mode})
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Selected Patient Snapshot & Clinical Documentation Canvas */}
            <div className="lg:col-span-8 space-y-6">
              {selectedAppt ? (
                <>
                  {/* Patient Snapshot Header Card */}
                  <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D6]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#E8EFEA] text-[#154734] flex items-center justify-center font-serif font-bold text-lg border border-[#D1E2D8]">
                          {patient?.fullName ? patient.fullName.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-serif font-bold text-[#154734]">
                              {patient?.fullName || "Unregistered Patient"}
                            </h2>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#758277] border border-[#E8E2D6]">
                              {patient?.patientCode || "PAT-TEMP"}
                            </span>
                          </div>
                          <p className="text-xs text-[#758277] mt-0.5">
                            {patient?.age || "—"} yrs • {patient?.gender || "Female"} • Phone: {patient?.phone || "—"} • Blood Group: {patient?.bloodGroup || "O+"}
                          </p>
                        </div>
                      </div>

                      {/* Status Toggle Actions */}
                      <div className="flex items-center gap-2">
                        {selectedAppt.status === "scheduled" && (
                          <button
                            onClick={() => handleUpdateStatus("checked_in")}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-sm"
                          >
                            Mark Checked-In
                          </button>
                        )}
                        {selectedAppt.status === "checked_in" && (
                          <button
                            onClick={() => handleUpdateStatus("in_consultation")}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
                          >
                            Start Consultation
                          </button>
                        )}
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize border ${
                          selectedAppt.status === "in_consultation"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : selectedAppt.status === "completed"
                            ? "bg-gray-100 text-gray-800 border-gray-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {selectedAppt.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Clinical Alert Flags: Allergies & Medical History */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
                      <div className={`p-3 rounded-2xl border ${
                        patient?.allergies && patient.allergies.length > 0
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : "bg-[#FAF8F5] border-[#E8E2D6] text-[#758277]"
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <AlertTriangle className={`w-3.5 h-3.5 ${
                            patient?.allergies && patient.allergies.length > 0 ? "text-rose-600" : "text-[#758277]"
                          }`} />
                          Allergies &amp; Hypersensitivities:
                        </div>
                        <p className="text-[11px]">
                          {patient?.allergies && patient.allergies.length > 0
                            ? patient.allergies.join(", ")
                            : "No known clinical allergies reported."}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#2C3E30]">
                        <div className="flex items-center gap-1.5 font-bold mb-1 text-[#154734]">
                          <HeartPulse className="w-3.5 h-3.5 text-[#154734]" />
                          Past Medical History:
                        </div>
                        <p className="text-[11px] text-[#758277] line-clamp-2">
                          {patient?.medicalHistory || "PCOD remission protocol, mild dysmenorrhea, constitutional Pulsatilla type."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Encounter Canvas */}
                  <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#154734]" />
                        <h3 className="text-base font-serif font-bold text-[#154734]">
                          Clinical Consultation Notes
                        </h3>
                      </div>
                      {isFinalized ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                          <Lock className="w-3.5 h-3.5" />
                          Finalized &amp; Legally Locked
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-medium">
                          Active Draft
                        </span>
                      )}
                    </div>

                    {/* Input Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#154734] mb-1">
                          Chief Complaints (Duration, Modalities, Onset) *
                        </label>
                        <textarea
                          rows={3}
                          disabled={isFinalized}
                          value={chiefComplaints}
                          onChange={(e) => setChiefComplaints(e.target.value)}
                          placeholder="E.g., Irregular menses since 4 months, pelvic discomfort aggravated before cycle, severe fatigue, weight resistance..."
                          className="w-full text-xs p-3 rounded-2xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 focus:border-[#154734] disabled:bg-[#FAF8F5] disabled:text-[#758277]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#154734] mb-1">
                            Physical Examination &amp; Vitals
                          </label>
                          <textarea
                            rows={3}
                            disabled={isFinalized}
                            value={examinationNotes}
                            onChange={(e) => setExaminationNotes(e.target.value)}
                            placeholder="BP: 120/80 mmHg, Pulse: 74 bpm, Weight: 62 kg, BMI: 22.4, Mild pallor..."
                            className="w-full text-xs p-3 rounded-2xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 focus:border-[#154734] disabled:bg-[#FAF8F5] disabled:text-[#758277]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#154734] mb-1">
                            Clinical Diagnosis (ICD/Homoeopathic Assessment) *
                          </label>
                          <textarea
                            rows={3}
                            disabled={isFinalized}
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="PCOD (Polycystic Ovarian Syndrome), Anovulatory Cycles, Constitutional Thuja/Sepia dyscrasia..."
                            className="w-full text-xs p-3 rounded-2xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 focus:border-[#154734] disabled:bg-[#FAF8F5] disabled:text-[#758277]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#154734] mb-1">
                            Treatment Plan &amp; Therapeutics
                          </label>
                          <textarea
                            rows={2}
                            disabled={isFinalized}
                            value={treatmentPlan}
                            onChange={(e) => setTreatmentPlan(e.target.value)}
                            placeholder="Holistic constitutional homoeopathy alongside insulin-sensitizing nutritional guidance..."
                            className="w-full text-xs p-3 rounded-2xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 focus:border-[#154734] disabled:bg-[#FAF8F5] disabled:text-[#758277]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#154734] mb-1">
                            Follow-Up Advice &amp; Prognosis
                          </label>
                          <textarea
                            rows={2}
                            disabled={isFinalized}
                            value={followUpAdvice}
                            onChange={(e) => setFollowUpAdvice(e.target.value)}
                            placeholder="Review in 3 weeks with ultrasound pelvis and fasting insulin reports. Maintain daily symptom diary."
                            className="w-full text-xs p-3 rounded-2xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 focus:border-[#154734] disabled:bg-[#FAF8F5] disabled:text-[#758277]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Prescription Section: Homeopathic Posology Builder */}
                    <div className="pt-6 border-t border-[#E8E2D6] space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-serif font-bold text-[#154734] flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#154734]" />
                            Digital Homoeopathic Prescription &amp; Posology
                          </h4>
                          <p className="text-[11px] text-[#758277]">
                            Configure remedy, individualized potency, dosage form, and posology rules.
                          </p>
                        </div>
                        {!isFinalized && (
                          <button
                            type="button"
                            onClick={handleAddMedication}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#E8EFEA] hover:bg-[#D1E2D8] text-[#154734] flex items-center gap-1.5 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Remedy
                          </button>
                        )}
                      </div>

                      {/* Remedy Cards */}
                      <div className="space-y-3">
                        {medications.map((med, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D6] space-y-3 relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#154734]">
                                Remedy #{idx + 1}
                              </span>
                              {!isFinalized && medications.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMedication(idx)}
                                  className="text-rose-600 hover:text-rose-700 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] text-[#758277] mb-0.5">
                                  Homoeopathic Remedy Name *
                                </label>
                                <input
                                  type="text"
                                  disabled={isFinalized}
                                  value={med.name}
                                  onChange={(e) => handleMedicationChange(idx, "name", e.target.value)}
                                  placeholder="E.g., Sepia Officinalis, Pulsatilla Nigricans"
                                  className="w-full p-2 text-xs rounded-xl border border-[#E8E2D6] bg-white focus:outline-none focus:border-[#154734]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] text-[#758277] mb-0.5">
                                  Potency
                                </label>
                                <select
                                  disabled={isFinalized}
                                  value={med.potency || "200C"}
                                  onChange={(e) => handleMedicationChange(idx, "potency", e.target.value)}
                                  className="w-full p-2 text-xs rounded-xl border border-[#E8E2D6] bg-white focus:outline-none focus:border-[#154734]"
                                >
                                  <option value="6C">6C</option>
                                  <option value="30C">30C</option>
                                  <option value="200C">200C</option>
                                  <option value="1M">1M</option>
                                  <option value="10M">10M</option>
                                  <option value="Q (LM)">LM Potency (Q)</option>
                                  <option value="Mother Tincture (Q)">Mother Tincture (Q)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] text-[#758277] mb-0.5">
                                  Form &amp; Dosage
                                </label>
                                <input
                                  type="text"
                                  disabled={isFinalized}
                                  value={med.dosage}
                                  onChange={(e) => handleMedicationChange(idx, "dosage", e.target.value)}
                                  placeholder="E.g., 4 pills / 10 drops"
                                  className="w-full p-2 text-xs rounded-xl border border-[#E8E2D6] bg-white focus:outline-none focus:border-[#154734]"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div>
                                <label className="block text-[11px] text-[#758277] mb-0.5">
                                  Frequency
                                </label>
                                <input
                                  type="text"
                                  disabled={isFinalized}
                                  value={med.frequency}
                                  onChange={(e) => handleMedicationChange(idx, "frequency", e.target.value)}
                                  placeholder="E.g., Twice daily, Once a week"
                                  className="w-full p-2 text-xs rounded-xl border border-[#E8E2D6] bg-white focus:outline-none focus:border-[#154734]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] text-[#758277] mb-0.5">
                                  Duration
                                </label>
                                <input
                                  type="text"
                                  disabled={isFinalized}
                                  value={med.duration}
                                  onChange={(e) => handleMedicationChange(idx, "duration", e.target.value)}
                                  placeholder="E.g., 14 days, 1 month"
                                  className="w-full p-2 text-xs rounded-xl border border-[#E8E2D6] bg-white focus:outline-none focus:border-[#154734]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] text-[#758277] mb-0.5">
                                  Specific Instructions
                                </label>
                                <input
                                  type="text"
                                  disabled={isFinalized}
                                  value={med.instructions}
                                  onChange={(e) => handleMedicationChange(idx, "instructions", e.target.value)}
                                  placeholder="E.g., Dissolve dry on clean tongue"
                                  className="w-full p-2 text-xs rounded-xl border border-[#E8E2D6] bg-white focus:outline-none focus:border-[#154734]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Dietary Rules for Homoeopathic Efficacy */}
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                          <Info className="w-4 h-4 text-amber-700" />
                          Dietary &amp; Antidote Restrictions (Homeopathic Compliance)
                        </div>
                        <textarea
                          rows={2}
                          disabled={isFinalized}
                          value={dietaryAdvice}
                          onChange={(e) => setDietaryAdvice(e.target.value)}
                          placeholder="Dietary guidance..."
                          className="w-full text-xs p-2.5 rounded-xl border border-amber-200 bg-white focus:outline-none focus:border-[#154734]"
                        />
                      </div>
                    </div>

                    {/* Action Buttons: Save Draft & Finalize Lock */}
                    {!isFinalized ? (
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E8E2D6]">
                        <p className="text-[11px] text-[#758277]">
                          Saving updates your draft in real-time. Finalizing permanently seals the record for medico-legal integrity.
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSaveDraft}
                            className="px-5 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] text-[#154734] border border-[#E8E2D6] text-xs font-bold transition-all"
                          >
                            {isSaving ? "Saving..." : "Save Clinical Draft"}
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleFinalize}
                            className="px-5 py-2.5 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Finalize &amp; Lock Record
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Legal Amendment History & Addendum Form */
                      <div className="pt-6 border-t border-[#E8E2D6] space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-serif font-bold text-[#154734] flex items-center gap-2">
                            <History className="w-4 h-4 text-[#154734]" />
                            Legal Amendments &amp; Addendums
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            Tamper-Evident Trail
                          </span>
                        </div>

                        {consultation?.amendments && consultation.amendments.length > 0 ? (
                          <div className="space-y-2">
                            {consultation.amendments.map((am, aIdx) => (
                              <div
                                key={aIdx}
                                className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D6] text-xs"
                              >
                                <div className="flex items-center justify-between text-[11px] text-[#758277] mb-1">
                                  <span className="font-bold text-[#154734]">
                                    Amendment #{aIdx + 1}
                                  </span>
                                  <span>{new Date(am.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="font-semibold text-[#2C3E30]">
                                  Reason: {am.reason}
                                </p>
                                {am.addendumNotes && (
                                  <p className="text-[#758277] mt-1 text-[11px]">
                                    Notes: {am.addendumNotes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#758277] bg-[#FAF8F5] p-3 rounded-2xl border border-dashed border-[#E8E2D6]">
                            No amendments recorded. This record stands as originally finalized.
                          </p>
                        )}

                        {/* Addendum Submission Form */}
                        <form onSubmit={handleAddAmendment} className="space-y-3 pt-2">
                          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-3">
                            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                              <ShieldAlert className="w-4 h-4 text-amber-700" />
                              Append Legal Addendum
                            </div>
                            <input
                              type="text"
                              required
                              value={amendmentReason}
                              onChange={(e) => setAmendmentReason(e.target.value)}
                              placeholder="Clinical rationale for amendment (e.g., patient reported sensitivity, revised ultrasound findings)..."
                              className="w-full text-xs p-2.5 rounded-xl border border-amber-200 bg-white focus:outline-none focus:border-[#154734]"
                            />
                            <textarea
                              rows={2}
                              value={amendmentNotes}
                              onChange={(e) => setAmendmentNotes(e.target.value)}
                              placeholder="Detailed addendum notes..."
                              className="w-full text-xs p-2.5 rounded-xl border border-amber-200 bg-white focus:outline-none focus:border-[#154734]"
                            />
                            <button
                              type="submit"
                              disabled={isAmending}
                              className="px-4 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {isAmending ? "Submitting..." : "Append Legal Amendment"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-3xl border border-[#E8E2D6] p-12 text-center shadow-sm">
                  <Stethoscope className="w-12 h-12 text-[#154734]/30 mx-auto mb-3" />
                  <h3 className="text-base font-serif font-bold text-[#154734]">
                    Select an Encounter from Queue
                  </h3>
                  <p className="text-xs text-[#758277] max-w-sm mx-auto mt-1">
                    Choose a patient from the encounter list on the left to review their clinical summary, start the consultation, and prescribe homeopathic remedies.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
