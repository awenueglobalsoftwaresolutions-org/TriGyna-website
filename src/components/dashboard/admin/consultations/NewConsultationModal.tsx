"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Stethoscope,
  User,
  Calendar,
  Pill,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
  Loader2,
  Activity,
  Video,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface PatientOption {
  _id: string;
  fullName: string;
  phone: string;
  patientCode: string;
  age?: number;
  gender?: string;
  allergies?: string[];
}

interface DoctorOption {
  _id: string;
  userId?: {
    name: string;
  };
  qualifications?: string;
  specialization?: string[];
}

interface AppointmentOption {
  _id: string;
  appointmentCode: string;
  appointmentDate: string;
  startTime: string;
  serviceName: string;
  status: string;
  patientId?: { _id: string; fullName: string };
}

interface NewConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function NewConsultationModal({
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: NewConsultationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data lookups
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentOption[]>([]);
  const [diagnosesCatalog, setDiagnosesCatalog] = useState<string[]>([]);
  const [isLoadingLookups, setIsLoadingLookups] = useState(false);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [mode, setMode] = useState("Online Video Consultation");
  const [durationMinutes, setDurationMinutes] = useState(30);

  // Clinical Notes
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState("");
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    pulse: "",
    temperature: "",
    spo2: "",
    weight: "",
    height: "",
    bmi: "",
  });
  const [examinationNotes, setExaminationNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisTagInput, setDiagnosisTagInput] = useState("");
  const [diagnosisTags, setDiagnosisTags] = useState<string[]>([]);
  const [clinicalAssessment, setClinicalAssessment] = useState("");

  // Treatment Plan
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [interventions, setInterventions] = useState<Array<{ title: string; duration: string }>>([
    { title: "Constitutional posology & clinical monitoring", duration: "30 days" },
  ]);

  // Digital Prescription
  const [medications, setMedications] = useState<
    Array<{ name: string; dosage: string; frequency: string; duration: string; instructions: string }>
  >([]);

  // Follow-up
  const [followUpAdvice, setFollowUpAdvice] = useState("Review in 4 weeks with symptom diary");

  // Load live lookups
  useEffect(() => {
    if (!isOpen) return;

    const loadLookups = async () => {
      try {
        setIsLoadingLookups(true);
        const [patRes, docRes, apptRes, diagRes] = await Promise.all([
          api.get<{ patients?: PatientOption[]; data?: PatientOption[] }>("/patients?limit=50"),
          api.get<{ doctors?: DoctorOption[]; data?: DoctorOption[] }>("/doctors"),
          api.get<{ appointments?: AppointmentOption[]; data?: AppointmentOption[] }>("/appointments?status=scheduled&limit=30"),
          api.get<{ diagnoses?: Array<{ name: string }> }>("/clinical/diagnoses"),
        ]);

        const pList = (patRes as any).data?.patients || (patRes as any).patients || (patRes as any).data || [];
        const dList = (docRes as any).data?.doctors || (docRes as any).doctors || (docRes as any).data || [];
        const aList = (apptRes as any).data?.appointments || (apptRes as any).appointments || (apptRes as any).data || [];
        const diagList = (diagRes as any).data?.diagnoses || [];

        setPatients(pList);
        setDoctors(dList);
        setAppointments(aList);
        setDiagnosesCatalog(diagList.map((d: any) => d.name));

        if (pList.length > 0 && !selectedPatientId) setSelectedPatientId(pList[0]._id);
        if (dList.length > 0 && !selectedDoctorId) setSelectedDoctorId(dList[0]._id);
      } catch (err) {
        console.warn("Failed to load clinical lookups", err);
      } finally {
        setIsLoadingLookups(false);
      }
    };

    loadLookups();
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-calculate BMI
  const handleWeightHeightChange = (field: "weight" | "height", val: string) => {
    const updated = { ...vitals, [field]: val };
    const w = parseFloat(field === "weight" ? val : vitals.weight);
    const h = parseFloat(field === "height" ? val : vitals.height) / 100; // in meters
    if (w > 0 && h > 0) {
      updated.bmi = (w / (h * h)).toFixed(1);
    }
    setVitals(updated);
  };

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "30C", frequency: "Twice daily", duration: "14 days", instructions: "Before food" },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: string, val: string) => {
    const copy = [...medications];
    (copy[index] as any)[field] = val;
    setMedications(copy);
  };

  const handleAddTag = () => {
    if (diagnosisTagInput.trim() && !diagnosisTags.includes(diagnosisTagInput.trim())) {
      setDiagnosisTags([...diagnosisTags, diagnosisTagInput.trim()]);
      setDiagnosisTagInput("");
    }
  };

  const handleSave = async (finalize = false) => {
    if (!selectedPatientId) {
      showNotification("Please select a patient for this clinical encounter", true);
      return;
    }
    if (!chiefComplaints.trim()) {
      showNotification("Chief complaints are mandatory", true);
      return;
    }

    try {
      setIsSubmitting(true);

      const parsedVitals = {
        bloodPressure: vitals.bloodPressure || undefined,
        pulse: vitals.pulse ? Number(vitals.pulse) : undefined,
        temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
        spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
        weight: vitals.weight ? Number(vitals.weight) : undefined,
        height: vitals.height ? Number(vitals.height) : undefined,
        bmi: vitals.bmi ? Number(vitals.bmi) : undefined,
      };

      const payload = {
        patientId: selectedPatientId,
        doctorId: selectedDoctorId || undefined,
        appointmentId: selectedAppointmentId || undefined,
        chiefComplaints,
        historyOfPresentIllness,
        vitals: parsedVitals,
        examinationNotes,
        diagnosis,
        diagnosisTags,
        clinicalAssessment,
        treatmentPlan,
        followUpAdvice,
        mode,
        durationMinutes,
      };

      const res = await api.post<{ consultation?: any }>("/clinical/consultations", payload);
      const consultId = res.data?.consultation?._id;

      // Save prescription if medications added
      if (consultId && medications.length > 0) {
        await api.post("/clinical/prescriptions", {
          consultationId: consultId,
          medications,
          specialInstructions: followUpAdvice,
          isReleasedToPatient: true,
        });
      }

      // Finalize if requested
      if (consultId && finalize) {
        await api.post(`/clinical/consultations/${consultId}/finalize`);
        showNotification("Clinical encounter finalized and locked successfully!");
      } else {
        showNotification("Clinical encounter saved as draft successfully!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showNotification(err.message || "Failed to record clinical encounter", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white border border-[#E5EAF0] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAF0] px-6 py-4 bg-[#F8FAFC] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#087A50] text-white flex items-center justify-center shadow-xs shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[#087A50] text-[10px] font-bold uppercase border border-emerald-100">
                <ShieldCheck className="w-3 h-3" />
                <span>Step {step} of 4</span>
              </div>
              <h2 className="font-sans font-bold text-base text-[#111827] mt-0.5">New Clinical Encounter &amp; EHR</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#111827] rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress Tabs */}
        <div className="flex items-center px-6 py-2.5 bg-[#F8FAFC] border-b border-[#E5EAF0] text-xs font-semibold gap-2 shrink-0 overflow-x-auto">
          {[
            { num: 1, label: "1. Patient & Encounter" },
            { num: 2, label: "2. Clinical Evaluation" },
            { num: 3, label: "3. Treatment & Care Plan" },
            { num: 4, label: "4. Prescription & Finalize" },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                step === s.num
                  ? "bg-[#087A50] text-white shadow-xs"
                  : "bg-white border border-[#E5EAF0] text-[#64748B] hover:text-[#111827] hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {isLoadingLookups ? (
            <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
              <span>Loading clinical directory...</span>
            </div>
          ) : (
            <>
              {/* STEP 1: PATIENT & ENCOUNTER */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Select Patient *</label>
                      <select
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                      >
                        {patients.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.fullName} ({p.patientCode || "PAT"}) • {p.phone}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Attending Practitioner *</label>
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                      >
                        {doctors.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.userId?.name || "Dr. TriGyna"} ({d.qualifications || "Consultant"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Link Scheduled Appointment (Optional)</label>
                      <select
                        value={selectedAppointmentId}
                        onChange={(e) => setSelectedAppointmentId(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                      >
                        <option value="">Direct Online Session (No prior appointment)</option>
                        {appointments.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.appointmentCode} — {a.appointmentDate} {a.startTime} ({a.serviceName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Consultation Mode</label>
                        <div className="w-full px-3 py-2 border border-[#C5DDBB] bg-[#EBF3E8] rounded-xl text-xs font-semibold text-[#154734]">
                          Online Video Consultation
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Duration (Min)</label>
                        <input
                          type="number"
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CLINICAL EVALUATION */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Chief Complaints *</label>
                    <textarea
                      rows={2}
                      value={chiefComplaints}
                      onChange={(e) => setChiefComplaints(e.target.value)}
                      placeholder="e.g. Persistent hair thinning and dry scalp for 3 months with mild pruritus."
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">History of Present Illness (HPI)</label>
                    <textarea
                      rows={2}
                      value={historyOfPresentIllness}
                      onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                      placeholder="Onset, duration, exacerbating factors, prior treatments tried..."
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>

                  {/* Vitals */}
                  <div className="bg-[#F8FAFC] border border-[#E5EAF0] p-4 rounded-xl space-y-3">
                    <span className="font-bold text-gray-700 block">Vital Signs &amp; Anthropometrics</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-[#64748B] block mb-0.5">BP (mmHg)</label>
                        <input
                          type="text"
                          placeholder="120/80"
                          value={vitals.bloodPressure}
                          onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#64748B] block mb-0.5">Pulse (bpm)</label>
                        <input
                          type="number"
                          placeholder="72"
                          value={vitals.pulse}
                          onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#64748B] block mb-0.5">SpO2 (%)</label>
                        <input
                          type="number"
                          placeholder="99"
                          value={vitals.spo2}
                          onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#64748B] block mb-0.5">Temp (°F)</label>
                        <input
                          type="number"
                          placeholder="98.4"
                          value={vitals.temperature}
                          onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#64748B] block mb-0.5">Weight (kg)</label>
                        <input
                          type="number"
                          placeholder="58"
                          value={vitals.weight}
                          onChange={(e) => handleWeightHeightChange("weight", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#64748B] block mb-0.5">Height (cm)</label>
                        <input
                          type="number"
                          placeholder="165"
                          value={vitals.height}
                          onChange={(e) => handleWeightHeightChange("height", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#64748B] block mb-0.5">BMI (Auto)</label>
                        <input
                          type="text"
                          readOnly
                          value={vitals.bmi}
                          className="w-full px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-gray-100 text-xs font-mono font-bold text-[#087A50]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Clinical Examination Findings</label>
                    <textarea
                      rows={2}
                      value={examinationNotes}
                      onChange={(e) => setExaminationNotes(e.target.value)}
                      placeholder="Target examination notes, physical observations, systemic evaluation..."
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: TREATMENT & CARE PLAN */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Clinical Diagnosis *</label>
                    <input
                      type="text"
                      list="diagnoses-list"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Telogen Effluvium (Nutritional Deficiency)"
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                    <datalist id="diagnoses-list">
                      {diagnosesCatalog.map((d, i) => (
                        <option key={i} value={d} />
                      ))}
                    </datalist>
                  </div>

                  {/* Diagnosis Tags */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Diagnosis Tags / Modifiers</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={diagnosisTagInput}
                        onChange={(e) => setDiagnosisTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="e.g. Nutritional Deficiency, Chronic..."
                        className="flex-1 px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs cursor-pointer"
                      >
                        Add Tag
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {diagnosisTags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] font-semibold text-[11px] flex items-center gap-1"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => setDiagnosisTags(diagnosisTags.filter((_, i) => i !== idx))}
                            className="hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Clinical Assessment</label>
                    <textarea
                      rows={2}
                      value={clinicalAssessment}
                      onChange={(e) => setClinicalAssessment(e.target.value)}
                      placeholder="Doctor's clinical assessment, severity analysis, prognosis..."
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Treatment / Care Protocol *</label>
                    <textarea
                      rows={2}
                      value={treatmentPlan}
                      onChange={(e) => setTreatmentPlan(e.target.value)}
                      placeholder="e.g. Nutritional supplementation alongside low-GI nutrition and scalp routine."
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: DIGITAL PRESCRIPTION & FINALIZE */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[#111827]">Digital Prescription Medications</h4>
                      <p className="text-[11px] text-[#64748B]">Add prescribed medicines with frequency and duration</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      className="px-3 py-1.5 bg-[#087A50] text-white rounded-xl font-semibold text-xs flex items-center gap-1 cursor-pointer hover:bg-[#075B3D]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Medication</span>
                    </button>
                  </div>

                  {medications.length === 0 ? (
                    <div className="p-4 text-center bg-[#F8FAFC] rounded-xl border border-[#E5EAF0] text-gray-500">
                      No medications added yet. Click &ldquo;Add Medication&rdquo; or proceed with non-drug protocol.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {medications.map((med, idx) => (
                        <div key={idx} className="p-3 bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Medicine name"
                            value={med.name}
                            onChange={(e) => handleMedChange(idx, "name", e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Dosage (e.g. 30C / 500mg)"
                            value={med.dosage}
                            onChange={(e) => handleMedChange(idx, "dosage", e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Frequency (Twice daily)"
                            value={med.frequency}
                            onChange={(e) => handleMedChange(idx, "frequency", e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Duration (14 days)"
                            value={med.duration}
                            onChange={(e) => handleMedChange(idx, "duration", e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="Instructions"
                              value={med.instructions}
                              onChange={(e) => handleMedChange(idx, "instructions", e.target.value)}
                              className="flex-1 px-2.5 py-1.5 border border-[#E5EAF0] rounded-lg bg-white text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveMedication(idx)}
                              className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Follow-Up Advice &amp; Instructions</label>
                    <input
                      type="text"
                      value={followUpAdvice}
                      onChange={(e) => setFollowUpAdvice(e.target.value)}
                      placeholder="e.g. Review in 4 weeks with symptom diary"
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 border-t border-[#E5EAF0] bg-[#F8FAFC] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-[#E5EAF0] bg-white hover:bg-gray-50 text-[#64748B] rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              Cancel
            </button>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 border border-[#E5EAF0] bg-white text-[#111827] hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as any)}
                className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition"
              >
                Next Step
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave(false)}
                  className="px-4 py-2.5 border border-[#E5EAF0] bg-white hover:bg-gray-50 text-[#111827] rounded-xl text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave(true)}
                  className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>Sign &amp; Finalize EHR</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

