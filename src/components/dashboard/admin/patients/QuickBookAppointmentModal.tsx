"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { PatientRecord } from "./PatientDetailPanel";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface QuickBookAppointmentModalProps {
  patient: PatientRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function QuickBookAppointmentModal({
  patient,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: QuickBookAppointmentModalProps) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [serviceName, setServiceName] = useState("General Consultation");
  const [appointmentDate, setAppointmentDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState("10:30");
  const [mode, setMode] = useState<"Online Video Consultation">("Online Video Consultation");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingDoctors(true);
      api.get<{ doctors: any[] }>("/doctors?limit=20")
        .then((res) => {
          if (res.data?.doctors && res.data.doctors.length > 0) {
            setDoctors(res.data.doctors);
            setSelectedDoctorId(res.data.doctors[0]._id);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingDoctors(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      showNotification("Please select a consulting doctor", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/appointments", {
        patientId: patient._id,
        doctorId: selectedDoctorId,
        serviceName,
        appointmentDate,
        startTime,
        endTime: "11:00",
        mode,
        notes: notes.trim() || undefined,
        bookingSource: "portal",
      });

      if (res.success) {
        showNotification(`Appointment scheduled successfully for ${patient.fullName}!`);
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to book appointment", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAF0] px-6 py-4 bg-[#F8FAFC] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#087A50] uppercase tracking-wider block font-mono">
                {patient.patientCode}
              </span>
              <h3 className="font-sans font-bold text-base text-[#111827] mt-0.5">
                Book Appointment for {patient.fullName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#111827] hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          <div>
            <label className="block font-semibold text-[#111827] mb-1">Consulting Doctor *</label>
            {isLoadingDoctors ? (
              <div className="py-2 text-center text-[#64748B]">Loading doctors...</div>
            ) : (
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none focus:border-[#087A50]"
              >
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.userId?.name || d.name || "Specialist Doctor"} ({d.specialization || "Clinical Practice"})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Service *</label>
              <select
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none focus:border-[#087A50]"
              >
                <option value="General Consultation">General Consultation</option>
                <option value="PCOS Care">PCOS Care</option>
                <option value="Fertility Care">Fertility Care</option>
                <option value="Menopause Care">Menopause Care</option>
                <option value="Skin & Hair">Skin &amp; Hair</option>
                <option value="Diet & Nutrition">Diet &amp; Nutrition</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Consultation Mode *</label>
              <div className="w-full px-3 py-2 border border-[#C5DDBB] bg-[#EBF3E8] rounded-xl font-semibold text-[#154734]">
                Online Video Consultation (Online Only)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Appointment Date *</label>
              <input
                type="date"
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Time Slot *</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none font-mono"
              >
                <option value="09:30">09:30 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="10:30">10:30 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="11:30">11:30 AM</option>
                <option value="15:00">03:00 PM</option>
                <option value="15:30">03:30 PM</option>
                <option value="16:00">04:00 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">Consultation Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Follow-up review or specific symptom complaints..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none"
            />
          </div>

          </div>

          <div className="px-6 py-3.5 flex items-center justify-end gap-2 border-t border-[#E5EAF0] bg-[#F8FAFC] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-[#64748B] hover:bg-gray-50 cursor-pointer font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Confirm Appointment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}

