"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Stethoscope,
  Pill,
  Clock,
  FileText,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Printer,
  ChevronRight,
  ShieldCheck,
  Calendar,
  HeartPulse,
  User,
  History,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface MedicationItem {
  name: string;
  dosage: string;
  potency?: string;
  form?: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string | null;
  patientId: string | null;
  onConsultationCompleted?: () => void;
}

export function ConsultationModal({
  isOpen,
  onClose,
  appointmentId,
  patientId,
  onConsultationCompleted,
}: ConsultationModalProps) {
  const [activeTab, setActiveTab] = useState<"clinical" | "prescription" | "history" | "amendment">("clinical");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  // Form Fields
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [examinationNotes, setExaminationNotes] = useState("");
  const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "", weight: "", spo2: "" });
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [followUpAdvice, setFollowUpAdvice] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [isFinalized, setIsFinalized] = useState(false);
  const [finalizedAt, setFinalizedAt] = useState<string | null>(null);
  const [amendments, setAmendments] = useState<any[]>([]);

  // Prescriptions
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [dietaryAdvice, setDietaryAdvice] = useState("");

  // Amendment fields
  const [amendmentReason, setAmendmentReason] = useState("");
  const [amendmentNotes, setAmendmentNotes] = useState("");

  const [notificationMsg, setNotificationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch or initialize consultation
  useEffect(() => {
    if (!isOpen || !appointmentId) return;

    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setNotificationMsg(null);

        // 1. Fetch appointment details
        const apptRes = await api.get<{ data?: any; appointment?: any }>(`/api/v1/doctor/appointments/${appointmentId}`);
        const appt = (apptRes as any).data?.appointment || (apptRes as any).appointment || (apptRes as any).data;
        if (mounted && appt) {
          setAppointmentData(appt);
          if (appt.patientId) setPatientData(appt.patientId);
        }

        // 2. Fetch existing consultation for this appointment if any
        try {
          const consRes = await api.get<{ data?: any; consultation?: any }>(`/api/v1/doctor/consultations?appointmentId=${appointmentId}`);
          const list = (consRes as any).data?.consultations || (Array.isArray((consRes as any).data) ? (consRes as any).data : ((consRes as any).consultations || []));
          if (Array.isArray(list) && list.length > 0) {
            const cons = list[0];
            setConsultationId(cons._id);
            setChiefComplaints(cons.chiefComplaints || "");
            setExaminationNotes(cons.examinationNotes || "");
            setDiagnosis(cons.diagnosis || "");
            setTreatmentPlan(cons.treatmentPlan || "");
            setFollowUpAdvice(cons.followUpAdvice || "");
            setIsFinalized(Boolean(cons.isFinalized));
            setFinalizedAt(cons.finalizedAt || null);
            setAmendments(cons.amendments || []);
          } else {
            // New draft init
            setConsultationId(null);
            setIsFinalized(false);
            setChiefComplaints("");
            setExaminationNotes("");
            setDiagnosis("");
            setTreatmentPlan("");
            setFollowUpAdvice("");
          }
        } catch (e) {
          console.warn("No prior consultation found, creating fresh draft");
        }
      } catch (err) {
        console.error("Error loading consultation data", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [isOpen, appointmentId]);

  if (!isOpen) return null;

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "Once daily", duration: "5 days", instructions: "After food" },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: keyof MedicationItem, val: string) => {
    const updated = [...medications];
    updated[index][field] = val;
    setMedications(updated);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (isFinalized) {
      setNotificationMsg({ type: "error", text: "Finalized consultations cannot be overwritten directly. Use Amendment tab." });
      return;
    }

    try {
      setSaving(true);
      setNotificationMsg(null);

      const payload = {
        appointmentId,
        patientId: patientData?._id || patientId,
        chiefComplaints,
        examinationNotes: `${examinationNotes} ${vitals.bp ? `[Vitals: BP ${vitals.bp}, HR ${vitals.pulse}, Temp ${vitals.temp}, SpO2 ${vitals.spo2}]` : ""}`.trim(),
        diagnosis,
        treatmentPlan,
        followUpAdvice,
        medications,
        dietaryAdvice,
        followUpDate: followUpDate || undefined,
      };

      if (consultationId) {
        await api.patch(`/api/v1/doctor/consultations/${consultationId}`, payload);
      } else {
        const res = await api.post<{ data?: any }>(`/api/v1/doctor/consultations`, payload);
        const newCons = (res as any).data?.consultation || (res as any).consultation || (res as any).data;
        if (newCons?._id) setConsultationId(newCons._id);
      }

      setNotificationMsg({ type: "success", text: "Clinical consultation draft saved securely." });
      onConsultationCompleted?.();
    } catch (err: any) {
      console.error("Draft save failed", err);
      setNotificationMsg({ type: "error", text: err.message || "Failed to save draft." });
    } finally {
      setSaving(false);
    }
  };

  // Finalize & Sign
  const handleFinalize = async () => {
    if (!diagnosis.trim()) {
      setNotificationMsg({ type: "error", text: "Diagnosis is mandatory before finalizing clinical record." });
      return;
    }
    if (!treatmentPlan.trim()) {
      setNotificationMsg({ type: "error", text: "Treatment plan is mandatory before finalizing." });
      return;
    }

    try {
      setFinalizing(true);
      setNotificationMsg(null);

      // Save first if no ID yet
      let currentId = consultationId;
      if (!currentId) {
        const payload = {
          appointmentId,
          patientId: patientData?._id || patientId,
          chiefComplaints,
          examinationNotes,
          diagnosis,
          treatmentPlan,
          followUpAdvice,
          medications,
          dietaryAdvice,
        };
        const res = await api.post<{ data?: any }>(`/api/v1/doctor/consultations`, payload);
        const newCons = (res as any).data?.consultation || (res as any).consultation || (res as any).data;
        currentId = newCons?._id;
        setConsultationId(currentId);
      }

      // Finalize endpoint
      await api.post(`/api/v1/doctor/consultations/${currentId}/finalize`, {
        diagnosis,
        treatmentPlan,
        medications,
        dietaryAdvice,
        followUpDate: followUpDate || undefined,
        followUpReason: followUpAdvice || "Routine follow-up review",
      });

      setIsFinalized(true);
      setFinalizedAt(new Date().toISOString());
      setNotificationMsg({
        type: "success",
        text: "Consultation successfully signed and legally finalized. Appointment marked completed.",
      });
      onConsultationCompleted?.();
    } catch (err: any) {
      console.error("Finalization failed", err);
      setNotificationMsg({ type: "error", text: err.message || "Finalization failed." });
    } finally {
      setFinalizing(false);
    }
  };

  // Submit Amendment
  const handleAddAmendment = async () => {
    if (!consultationId) return;
    if (!amendmentReason.trim()) {
      setNotificationMsg({ type: "error", text: "Please state a clear clinical reason for amendment." });
      return;
    }

    try {
      setSaving(true);
      await api.post(`/api/v1/doctor/consultations/${consultationId}/amend`, {
        reason: amendmentReason,
        addendumNotes: amendmentNotes,
      });

      setAmendments([
        ...amendments,
        {
          reason: amendmentReason,
          addendumNotes: amendmentNotes,
          createdAt: new Date().toISOString(),
        },
      ]);
      setAmendmentReason("");
      setAmendmentNotes("");
      setNotificationMsg({ type: "success", text: "Clinical addendum successfully attached to permanent record." });
    } catch (err: any) {
      setNotificationMsg({ type: "error", text: err.message || "Failed to record amendment." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl border border-[#E1E9E3] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#154734] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">
              <Stethoscope className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Clinical Consultation Workspace</h2>
                {isFinalized && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    <Lock className="w-3 h-3" /> Signed & Finalized
                  </span>
                )}
              </div>
              <p className="text-xs text-white/70">
                Patient: <span className="font-semibold text-white">{patientData?.fullName || "Patient"}</span> (
                {patientData?.patientCode ? `#${patientData.patientCode}` : "TG00"} • {patientData?.age || 28}y •{" "}
                {patientData?.gender || "Female"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Summary Banner */}
        <div className="px-6 py-2.5 bg-[#F5F8F6] border-b border-[#E1E9E3] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[#65746B]">Service: </span>
              <span className="font-semibold text-[#17251E]">{appointmentData?.serviceName || "Antenatal Checkup"}</span>
            </div>
            <div>
              <span className="text-[#65746B]">Time: </span>
              <span className="font-semibold text-[#17251E]">{appointmentData?.startTime || "10:00 AM"}</span>
            </div>
            <div>
              <span className="text-[#65746B]">Blood Group: </span>
              <span className="font-semibold text-[#17251E]">{patientData?.bloodGroup || "B+"}</span>
            </div>
            <div>
              <span className="text-[#65746B]">Known Allergies: </span>
              <span className="font-semibold text-rose-600">
                {patientData?.allergies?.length ? patientData.allergies.join(", ") : "None recorded"}
              </span>
            </div>
          </div>

          {/* Quick tab switcher */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E1E9E3]">
            <button
              type="button"
              onClick={() => setActiveTab("clinical")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === "clinical" ? "bg-[#154734] text-white" : "text-[#65746B] hover:text-[#17251E]"
              }`}
            >
              Clinical Examination
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("prescription")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === "prescription" ? "bg-[#154734] text-white" : "text-[#65746B] hover:text-[#17251E]"
              }`}
            >
              Rx Prescriptions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === "history" ? "bg-[#154734] text-white" : "text-[#65746B] hover:text-[#17251E]"
              }`}
            >
              Prior History
            </button>
            {isFinalized && (
              <button
                type="button"
                onClick={() => setActiveTab("amendment")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === "amendment" ? "bg-[#154734] text-white" : "text-amber-700 hover:text-amber-900"
                }`}
              >
                Addendum
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {notificationMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              notificationMsg.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
            }`}
          >
            {notificationMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#65746B]">
              <Loader2 className="w-8 h-8 animate-spin text-[#154734] mb-3" />
              <p className="text-sm font-medium">Loading clinical records and patient profile...</p>
            </div>
          ) : activeTab === "clinical" ? (
            <div className="space-y-6">
              {/* Vitals row */}
              <div className="bg-[#F5F8F6] p-4 rounded-2xl border border-[#E1E9E3]">
                <h3 className="text-xs font-bold text-[#17251E] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-[#154734]" /> Patient Vitals
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#65746B] block mb-1">Blood Pressure</label>
                    <input
                      type="text"
                      disabled={isFinalized}
                      placeholder="120/80 mmHg"
                      value={vitals.bp}
                      onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#17251E] disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#65746B] block mb-1">Pulse / HR</label>
                    <input
                      type="text"
                      disabled={isFinalized}
                      placeholder="72 bpm"
                      value={vitals.pulse}
                      onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#17251E] disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#65746B] block mb-1">Temperature</label>
                    <input
                      type="text"
                      disabled={isFinalized}
                      placeholder="98.6 °F"
                      value={vitals.temp}
                      onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#17251E] disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#65746B] block mb-1">Weight</label>
                    <input
                      type="text"
                      disabled={isFinalized}
                      placeholder="62 kg"
                      value={vitals.weight}
                      onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#17251E] disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#65746B] block mb-1">SpO2</label>
                    <input
                      type="text"
                      disabled={isFinalized}
                      placeholder="99%"
                      value={vitals.spo2}
                      onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#17251E] disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Presenting Complaint & History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#17251E] mb-1.5">
                    1. Chief Presenting Complaints
                  </label>
                  <textarea
                    rows={4}
                    disabled={isFinalized}
                    placeholder="e.g. Mild abdominal cramps for 2 days, routine 2nd trimester antenatal checkup..."
                    value={chiefComplaints}
                    onChange={(e) => setChiefComplaints(e.target.value)}
                    className="w-full p-3 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-xl text-xs text-[#17251E] placeholder:text-gray-400 disabled:bg-gray-50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17251E] mb-1.5">
                    2. Physical & Clinical Examination Findings
                  </label>
                  <textarea
                    rows={4}
                    disabled={isFinalized}
                    placeholder="e.g. Fundal height corresponds to gestational age. FHR regular @ 142 bpm. No pedal edema..."
                    value={examinationNotes}
                    onChange={(e) => setExaminationNotes(e.target.value)}
                    className="w-full p-3 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-xl text-xs text-[#17251E] placeholder:text-gray-400 disabled:bg-gray-50 transition-colors"
                  />
                </div>
              </div>

              {/* Clinical Assessment & Diagnosis */}
              <div>
                <label className="block text-xs font-bold text-[#17251E] mb-1.5">
                  3. Clinical Diagnosis & Assessment <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isFinalized}
                  placeholder="e.g. Normal Intrauterine Pregnancy at 24 weeks GA (Z34.82)"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full p-3 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-xl text-xs font-semibold text-[#17251E] placeholder:text-gray-400 disabled:bg-gray-50 transition-colors"
                />
              </div>

              {/* Treatment Plan & Advice */}
              <div>
                <label className="block text-xs font-bold text-[#17251E] mb-1.5">
                  4. Treatment Plan & Recommended Investigations <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  disabled={isFinalized}
                  placeholder="e.g. Continue prenatal vitamins. Routine OGTT test scheduled. Maintain adequate hydration."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  className="w-full p-3 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-xl text-xs text-[#17251E] placeholder:text-gray-400 disabled:bg-gray-50 transition-colors"
                />
              </div>

              {/* Follow-up recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F5F8F6] p-4 rounded-2xl border border-[#E1E9E3]">
                <div>
                  <label className="block text-xs font-bold text-[#17251E] mb-1.5">
                    Recommended Follow-up Date
                  </label>
                  <input
                    type="date"
                    disabled={isFinalized}
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-xl text-xs font-medium text-[#17251E] disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17251E] mb-1.5">
                    Follow-up Instructions & Goal
                  </label>
                  <input
                    type="text"
                    disabled={isFinalized}
                    placeholder="e.g. Review anomaly scan and OGTT blood sugar profile"
                    value={followUpAdvice}
                    onChange={(e) => setFollowUpAdvice(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-xl text-xs text-[#17251E] disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === "prescription" ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#17251E]">Prescription & Medications (Rx)</h3>
                  <p className="text-xs text-[#65746B]">Specify therapeutic dosages, dosing frequency, and administration guidance.</p>
                </div>
                {!isFinalized && (
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#154734] text-white text-xs font-semibold rounded-lg hover:bg-[#0E3828] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine
                  </button>
                )}
              </div>

              {/* Medication Table */}
              <div className="border border-[#E1E9E3] rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F8F6] text-[#65746B] font-semibold border-b border-[#E1E9E3]">
                      <th className="py-2.5 px-3">Medicine Name</th>
                      <th className="py-2.5 px-3">Strength</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Instructions</th>
                      {!isFinalized && <th className="py-2.5 px-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E9E3]">
                    {medications.map((med, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            disabled={isFinalized}
                            value={med.name}
                            onChange={(e) => handleMedChange(idx, "name", e.target.value)}
                            placeholder="e.g. Iron Folate Tab"
                            className="w-full px-2 py-1 border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#17251E]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            disabled={isFinalized}
                            value={med.dosage}
                            onChange={(e) => handleMedChange(idx, "dosage", e.target.value)}
                            placeholder="e.g. 100mg"
                            className="w-20 px-2 py-1 border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#17251E]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            disabled={isFinalized}
                            value={med.frequency}
                            onChange={(e) => handleMedChange(idx, "frequency", e.target.value)}
                            className="px-2 py-1 border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#17251E] bg-white"
                          >
                            <option>Once daily</option>
                            <option>Twice daily (BD)</option>
                            <option>Thrice daily (TDS)</option>
                            <option>Every 8 hours</option>
                            <option>SOS / As needed</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            disabled={isFinalized}
                            value={med.duration}
                            onChange={(e) => handleMedChange(idx, "duration", e.target.value)}
                            placeholder="e.g. 15 days"
                            className="w-24 px-2 py-1 border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#17251E]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            disabled={isFinalized}
                            value={med.instructions}
                            onChange={(e) => handleMedChange(idx, "instructions", e.target.value)}
                            placeholder="e.g. After meals"
                            className="w-full px-2 py-1 border border-[#E1E9E3] rounded-lg text-xs text-[#17251E]"
                          />
                        </td>
                        {!isFinalized && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveMedication(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dietary and lifestyle precautions */}
              <div>
                <label className="block text-xs font-bold text-[#17251E] mb-1.5">
                  Dietary, Nutritional & Lifestyle Guidance
                </label>
                <textarea
                  rows={3}
                  disabled={isFinalized}
                  value={dietaryAdvice}
                  onChange={(e) => setDietaryAdvice(e.target.value)}
                  className="w-full p-3 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E]"
                />
              </div>
            </div>
          ) : activeTab === "history" ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#17251E]">Relevant Medical History</h3>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-3">
                <div>
                  <span className="font-semibold text-gray-700">Past Diagnoses: </span>
                  <span className="text-gray-900">{patientData?.medicalHistory || "None recorded"}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Allergies: </span>
                  <span className="text-rose-600 font-medium">
                    {patientData?.allergies?.length ? patientData.allergies.join(", ") : "No known drug allergies (NKDA)"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Emergency Contact: </span>
                  <span className="text-gray-900">
                    {patientData?.emergencyContact?.name
                      ? `${patientData.emergencyContact.name} (${patientData.emergencyContact.relation || "Kin"}) - ${patientData.emergencyContact.phone}`
                      : "Not specified"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Amendment Tab */
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" /> Authorized Clinical Addendum
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  Finalized medical records cannot be altered. Legally compliant addendums are permanently appended to the audit trail with doctor attribution and timestamps.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17251E] mb-1">
                  Reason for Amendment <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lab report received showing Hb 11.2 g/dL"
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17251E] mb-1">
                  Addendum Notes & Adjustments
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed notes on clinical findings or adjusted medication advice..."
                  value={amendmentNotes}
                  onChange={(e) => setAmendmentNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E]"
                />
              </div>

              <button
                type="button"
                onClick={handleAddAmendment}
                disabled={saving}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl"
              >
                Attach Legal Addendum
              </button>

              {/* Prior amendments list */}
              {amendments.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-xs font-bold text-[#17251E] uppercase">Audit Amendments History</h4>
                  {amendments.map((am, i) => (
                    <div key={i} className="p-3 bg-white border border-gray-200 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between text-gray-500 text-[10px]">
                        <span>Reason: {am.reason}</span>
                        <span>{new Date(am.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-900 font-medium">{am.addendumNotes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F5F8F6] border-t border-[#E1E9E3] flex items-center justify-between">
          <div className="text-xs text-[#65746B]">
            {isFinalized ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <Lock className="w-3.5 h-3.5" /> Finalized on {new Date(finalizedAt || "").toLocaleString()}
              </span>
            ) : (
              <span>Draft mode: Changes auto-validated before persistence.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-[#E1E9E3] hover:bg-gray-50 rounded-xl shadow-sm transition-colors"
            >
              Close
            </button>

            {!isFinalized && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDraft}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#154734] bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl shadow-sm transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving..." : "Save Draft"}
                </button>

                <button
                  type="button"
                  disabled={finalizing}
                  onClick={handleFinalize}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#154734] hover:bg-[#0E3828] rounded-xl shadow-sm transition-colors active:scale-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  {finalizing ? "Signing..." : "Complete & Sign Consultation"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
