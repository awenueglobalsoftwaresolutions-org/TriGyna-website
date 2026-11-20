"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Video,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
  defaultDate?: string;
}

interface PatientOption {
  _id: string;
  fullName: string;
  patientCode: string;
}

interface DoctorOption {
  _id: string;
  name: string;
  specialization?: string[];
}

interface StaffOption {
  _id: string;
  name: string;
  role?: string;
}

export function CreateEventModal({
  isOpen,
  onClose,
  onSuccess,
  showNotification,
  defaultDate,
}: CreateEventModalProps) {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [conflictResult, setConflictResult] = useState<{
    hasConflict: boolean;
    hasCriticalConflict: boolean;
    conflicts: Array<{ type: string; message: string; severity: string }>;
  } | null>(null);

  // Form State
  const [eventType, setEventType] = useState<
    "appointment" | "followup" | "doctor_session" | "staff_leave" | "task" | "institutional"
  >("appointment");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate || "2026-11-01");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("10:30 AM");
  const [serviceName, setServiceName] = useState("Skin & Hair");
  const [mode, setMode] = useState("Online Video Consultation");
  const [priority, setPriority] = useState("medium");
  const [branchName, setBranchName] = useState("Main Clinic");
  const [overrideConflicts, setOverrideConflicts] = useState(false);

  // Participant IDs
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [staffId, setStaffId] = useState("");

  // Directory lists
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);

  const handleModalClose = () => {
    setStep(1);
    setConflictResult(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isSubscribed = true;

    // Load available participants
    const loadDirectory = async () => {
      try {
        const [patRes, docRes, staffRes] = await Promise.all([
          api.get<{ patients: Array<{ _id: string; fullName: string; patientCode: string }> }>("/patients?limit=30").catch(() => null),
          api.get<{ doctors: Array<{ _id: string; userId?: { name: string }; specialization?: string[] }> }>("/doctors?limit=30").catch(() => null),
          api.get<{ users: Array<{ _id: string; name: string; role?: string }> }>("/users?limit=30").catch(() => null),
        ]);

        if (!isSubscribed) return;

        if (patRes?.data?.patients) {
          setPatients(
            patRes.data.patients.map((p) => ({
              _id: p._id,
              fullName: p.fullName,
              patientCode: p.patientCode,
            }))
          );
          if (patRes.data.patients.length > 0 && !patientId) {
            setPatientId(patRes.data.patients[0]._id);
          }
        }

        if (docRes?.data?.doctors) {
          setDoctors(
            docRes.data.doctors.map((d) => ({
              _id: d._id,
              name: d.userId?.name || "Dr. TriGyna Consultant",
              specialization: d.specialization,
            }))
          );
          if (docRes.data.doctors.length > 0 && !doctorId) {
            setDoctorId(docRes.data.doctors[0]._id);
          }
        }

        if (staffRes?.data?.users) {
          setStaffList(
            staffRes.data.users.map((u) => ({
              _id: u._id,
              name: u.name,
              role: u.role,
            }))
          );
          if (staffRes.data.users.length > 0 && !staffId) {
            setStaffId(staffRes.data.users[0]._id);
          }
        }
      } catch {
        // Directory fallback
      }
    };

    void loadDirectory();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, patientId, doctorId, staffId]);

  // Run Conflict Validation
  const checkConflict = async () => {
    try {
      setIsValidating(true);
      const res = await api.post<{
        hasConflict: boolean;
        hasCriticalConflict: boolean;
        conflicts: Array<{ type: string; message: string; severity: string }>;
      }>("/calendar/validate-schedule", {
        doctorId: doctorId || undefined,
        staffId: staffId || undefined,
        date,
        startTime,
        endTime,
      });

      if (res.data) {
        setConflictResult(res.data);
      }
    } catch {
      // Allow proceeding if validator is offline
    } finally {
      setIsValidating(false);
    }
  };

  const handleNextStep = async () => {
    if (step === 4) {
      await checkConflict();
      setStep(5);
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await api.post("/calendar/events", {
        eventType,
        title: title || `${eventType.toUpperCase()} Event`,
        description,
        date,
        startTime,
        endTime,
        doctorId: doctorId || undefined,
        patientId: patientId || undefined,
        staffId: staffId || undefined,
        serviceName,
        mode,
        priority,
        branchName,
        overrideConflicts,
      });

      showNotification("Institutional event scheduled successfully!");
      onSuccess();
      handleModalClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to schedule event";
      showNotification(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* HEADER */}
        <div className="p-5 border-b border-[#E5EAF0] bg-[#FAFCFB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-sans text-[#111827]">Create Institutional Event</h2>
              <p className="text-xs text-[#64748B]">Step {step} of 5 — Multi-module scheduler</p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS INDICATOR */}
        <div className="grid grid-cols-5 h-1 bg-gray-100">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-full transition-colors ${
                s <= step ? "bg-[#087A50]" : "bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* BODY BY STEP */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: EVENT TYPE */}
          {step === 1 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#111827]">Select Operational Event Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {([
                  { id: "appointment", label: "Doctor Appointment", desc: "Book consultation with doctor & patient" },
                  { id: "followup", label: "Care Follow-up", desc: "Patient recovery & prescription follow-up" },
                  { id: "doctor_session", label: "Doctor Session", desc: "Specialist consulting roster session" },
                  { id: "staff_leave", label: "Staff Leave", desc: "Approved leave request for staff" },
                  { id: "task", label: "Clinical Task", desc: "Actionable internal task with due date" },
                  { id: "institutional", label: "Administrative Event", desc: "Camp, CME, audit or boardroom meeting" },
                ] as const).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setEventType(t.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      eventType === t.id
                        ? "border-[#087A50] bg-[#E9F8F0]/40 ring-1 ring-[#087A50]"
                        : "border-[#E5EAF0] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111827]">{t.label}</span>
                      {eventType === t.id && <Check className="w-4 h-4 text-[#087A50]" />}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#111827]">Event Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`E.g. ${eventType.toUpperCase()} Consultation / Meeting`}
                  className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50]"
                />
              </div>

              <div>
                <label className="font-bold text-[#111827]">Service Name</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Skin & Hair / PCOS / Clinical Review"
                  className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50]"
                />
              </div>

              <div>
                <label className="font-bold text-[#111827]">Consultation Mode</label>
                <div className="mt-1 w-full px-3 py-2 border border-[#C5DDBB] bg-[#EBF3E8] rounded-xl text-xs font-semibold text-[#154734] flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  <span>Online Video Consultation (Online Only)</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#111827]">Branch</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50]"
                />
              </div>

              <div>
                <label className="font-bold text-[#111827]">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50] bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#111827]">Description / Instructions</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional clinical notes or agenda details..."
                  className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50]"
                />
              </div>
            </div>
          )}

          {/* STEP 3: PARTICIPANTS */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              {(eventType === "appointment" || eventType === "followup") && (
                <div>
                  <label className="font-bold text-[#111827]">Select Patient</label>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50] bg-white font-medium"
                  >
                    {patients.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.fullName} ({p.patientCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(eventType === "appointment" || eventType === "followup" || eventType === "doctor_session") && (
                <div>
                  <label className="font-bold text-[#111827]">Select Doctor</label>
                  <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50] bg-white font-medium"
                  >
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.specialization?.join(", ") || "General"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(eventType === "staff_leave" || eventType === "task" || eventType === "institutional") && (
                <div>
                  <label className="font-bold text-[#111827]">Assigned Staff / Employee</label>
                  <select
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50] bg-white font-medium"
                  >
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: DATE & TIME */}
          {step === 4 && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#111827]">Event Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#111827]">Start Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs font-mono focus:outline-[#087A50]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#111827]">End Time</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs font-mono focus:outline-[#087A50]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONFLICT CHECK & REVIEW */}
          {step === 5 && (
            <div className="space-y-4 text-xs">
              {isValidating ? (
                <div className="py-6 text-center text-[#087A50] flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validating doctor roster availability and schedule conflicts...</span>
                </div>
              ) : conflictResult?.hasConflict ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Scheduling Notice Detected</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-amber-700">
                    {conflictResult.conflicts.map((c, i) => (
                      <li key={i}>{c.message}</li>
                    ))}
                  </ul>

                  <label className="flex items-center gap-2 pt-2 text-amber-900 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideConflicts}
                      onChange={(e) => setOverrideConflicts(e.target.checked)}
                      className="rounded border-amber-300 text-[#087A50]"
                    />
                    <span>Authorize override and proceed with booking</span>
                  </label>
                </div>
              ) : (
                <div className="bg-[#E9F8F0] border border-[#A7F3D0] rounded-xl p-4 flex items-center gap-3 text-[#087A50]">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-bold">No Scheduling Conflicts Detected</p>
                    <p className="text-[11px] mt-0.5">Doctor is available on roster with clear clinic capacity.</p>
                  </div>
                </div>
              )}

              {/* Event Summary Card */}
              <div className="border border-[#E5EAF0] rounded-xl p-4 space-y-2 bg-[#F8FAFC]">
                <h4 className="font-bold text-[#111827]">Summary Before Confirmation</h4>
                <div className="space-y-1 text-[#64748B]">
                  <p>Type: <span className="font-semibold text-[#111827] capitalize">{eventType.replace("_", " ")}</span></p>
                  <p>Date & Slot: <span className="font-mono font-semibold text-[#111827]">{date} ({startTime} - {endTime})</span></p>
                  <p>Service: <span className="font-semibold text-[#111827]">{serviceName}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER CONTROLS */}
        <div className="p-4 border-t border-[#E5EAF0] bg-[#FAFCFB] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handlePrevStep}
              className="px-3.5 py-2 border border-[#E5EAF0] text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={handleNextStep}
              className="px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (conflictResult?.hasCriticalConflict && !overrideConflicts)}
              className="px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scheduling Event...</span>
                </>
              ) : (
                <span>Confirm & Schedule</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
