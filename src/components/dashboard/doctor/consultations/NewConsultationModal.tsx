"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  Video,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface EligibleAppointment {
  _id: string;
  appointmentCode: string;
  appointmentDate: string;
  startTime: string;
  serviceName: string;
  mode: string;
  meetingUrl?: string;
  meetingProvider: string;
  status: string;
  patient: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone: string;
    age?: number;
    gender?: string;
    allergies?: string[];
    bloodGroup?: string;
    medicalHistory?: string[];
  };
  existingConsultation?: {
    _id: string;
    consultationCode?: string;
    isFinalized: boolean;
    status: string;
  } | null;
}

interface NewConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartConsultation: (appointmentId: string, patientId: string, consultationId?: string) => void;
}

export function NewConsultationModal({
  isOpen,
  onClose,
  onStartConsultation,
}: NewConsultationModalProps) {
  const [appointments, setAppointments] = useState<EligibleAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppt, setSelectedAppt] = useState<EligibleAppointment | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAppt(null);
      setStep(1);
      setErrorMsg(null);
      return;
    }

    async function fetchEligible() {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        const res = await api.get<{ data?: { appointments?: EligibleAppointment[] } }>(
          "/api/v1/doctor/consultations/eligible-appointments"
        );
        const list = (res as any).data?.appointments || [];
        setAppointments(list);
      } catch (err: any) {
        setErrorMsg(err?.message || "Failed to load eligible appointments.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEligible();
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = appointments.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const pName = a.patient?.fullName?.toLowerCase() || "";
    const pCode = a.patient?.patientCode?.toLowerCase() || "";
    const aCode = a.appointmentCode?.toLowerCase() || "";
    const sName = a.serviceName?.toLowerCase() || "";
    return pName.includes(q) || pCode.includes(q) || aCode.includes(q) || sName.includes(q);
  });

  const handleProceedToVerify = (appt: EligibleAppointment) => {
    setSelectedAppt(appt);
    setStep(2);
  };

  const handleConfirmAndStart = async () => {
    if (!selectedAppt) return;
    try {
      setIsStarting(true);
      setErrorMsg(null);

      // If draft already exists, directly open it
      if (selectedAppt.existingConsultation?._id) {
        onStartConsultation(
          selectedAppt._id,
          selectedAppt.patient._id,
          selectedAppt.existingConsultation._id
        );
        onClose();
        return;
      }

      // Create new draft consultation via backend
      const res = await api.post<{ data?: { consultation?: any } }>("/api/v1/doctor/consultations", {
        appointmentId: selectedAppt._id,
        patientId: selectedAppt.patient._id,
        mode: selectedAppt.mode || "Video Consultation",
        chiefComplaints: "",
        diagnosis: "",
        treatmentPlan: "",
      });

      const newCons = (res as any).data?.consultation;
      const newConsId = newCons?._id;

      onStartConsultation(selectedAppt._id, selectedAppt.patient._id, newConsId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not initialize consultation draft. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E1EAE4] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E1EAE4] flex items-center justify-between bg-[#F2F7F4]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#064B38] text-white flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17251F]">
                {step === 1 ? "Start New Consultation" : "Verify Patient & Encounter"}
              </h3>
              <p className="text-xs text-[#718078]">
                {step === 1
                  ? "Select an authorized scheduled online appointment to begin"
                  : "Review verified clinical demographics before opening workspace"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="m-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Select Appointment */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments by patient name, patient ID, or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F2F7F4] border border-[#E1EAE4] focus:border-[#064B38] rounded-xl text-xs text-[#17251F] placeholder:text-gray-400 outline-none transition-colors"
              />
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-[#718078]">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#064B38] mb-2" />
                  Loading eligible clinical appointments...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#718078] bg-[#F2F7F4]/40 rounded-2xl border border-dashed border-[#E1EAE4]">
                  No eligible appointments found. All assigned patients have active or finalized consultations.
                </div>
              ) : (
                filtered.map((appt) => {
                  const p = appt.patient || {};
                  const hasDraft = appt.existingConsultation && !appt.existingConsultation.isFinalized;

                  return (
                    <div
                      key={appt._id}
                      onClick={() => handleProceedToVerify(appt)}
                      className="p-4 rounded-2xl border border-[#E1EAE4] hover:border-[#064B38] bg-white hover:bg-[#F2F7F4]/40 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#17251F] group-hover:text-[#064B38] transition-colors">
                            {p.fullName || "Unknown Patient"}
                          </span>
                          <span className="text-[11px] font-semibold text-[#718078]">
                            #{p.patientCode || "TG-PT"}
                          </span>
                          {hasDraft && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                              Draft in Progress
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#718078]">
                          {appt.serviceName || "Clinical Consultation"} • {appt.mode}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#064B38]" /> {appt.appointmentDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#064B38]" /> {appt.startTime || "Scheduled"}
                          </span>
                          {appt.meetingUrl ? (
                            <span className="flex items-center gap-1 text-[#16A34A] font-medium">
                              <Video className="w-3 h-3" /> Meeting Ready
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[#F59E0B] font-medium">
                              <Video className="w-3 h-3" /> Telehealth Link Pending
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-[#064B38] text-white text-xs font-semibold group-hover:bg-[#0B4F3A] transition-colors flex items-center gap-1 shadow-sm"
                        >
                          Select <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Step 2: Patient Verification */}
        {step === 2 && selectedAppt && (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-[#F2F7F4] border border-[#E1EAE4] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E1EAE4] pb-2.5">
                <div>
                  <h4 className="text-sm font-bold text-[#17251F]">
                    {selectedAppt.patient?.fullName}
                  </h4>
                  <p className="text-xs text-[#718078]">
                    Patient ID: #{selectedAppt.patient?.patientCode} • Phone: {selectedAppt.patient?.phone}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E6F7F2] text-[#07543D]">
                  Identity Scoped
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-[11px] text-[#718078]">Age / Gender</p>
                  <p className="font-semibold text-[#17251F]">
                    {selectedAppt.patient?.age ? `${selectedAppt.patient.age} yrs` : "N/A"} /{" "}
                    {selectedAppt.patient?.gender || "Female"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718078]">Blood Group</p>
                  <p className="font-semibold text-[#17251F]">
                    {selectedAppt.patient?.bloodGroup || "Not recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718078]">Service</p>
                  <p className="font-semibold text-[#17251F] truncate">
                    {selectedAppt.serviceName}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718078]">Appointment Code</p>
                  <p className="font-semibold text-[#064B38]">
                    {selectedAppt.appointmentCode}
                  </p>
                </div>
              </div>

              {selectedAppt.patient?.allergies && selectedAppt.patient.allergies.length > 0 && (
                <div className="pt-2 border-t border-[#E1EAE4]">
                  <p className="text-[11px] font-semibold text-red-600 mb-1">Documented Allergies:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAppt.patient.allergies.map((allergy, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-semibold"
                      >
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Video Telehealth Verification */}
            <div className="p-4 rounded-2xl border border-[#E1EAE4] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2F7F4] flex items-center justify-center text-[#064B38]">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#17251F]">
                    {selectedAppt.mode || "Online Video Consultation"}
                  </p>
                  <p className="text-[11px] text-[#718078]">
                    Provider: {selectedAppt.meetingProvider || "Google Meet"}
                  </p>
                </div>
              </div>
              {selectedAppt.meetingUrl ? (
                <a
                  href={selectedAppt.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-[#064B38] text-[#064B38] text-xs font-semibold hover:bg-[#F2F7F4] transition-colors flex items-center gap-1.5"
                >
                  Join Meeting <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-xs text-[#F59E0B] font-medium">Link configured at start</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#718078] hover:text-[#17251F] hover:bg-gray-100 transition-colors"
              >
                Back to Appointments
              </button>
              <button
                type="button"
                disabled={isStarting}
                onClick={handleConfirmAndStart}
                className="px-6 py-2.5 rounded-full bg-[#064B38] hover:bg-[#0B4F3A] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Initializing Workspace...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Start Clinical Workspace
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

