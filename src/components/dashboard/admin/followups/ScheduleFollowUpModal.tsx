"use client";

import React, { useState } from "react";
import {
  X,
  Calendar,
  Clock,
  Video,
  Building,
  Phone,
  User,
  Stethoscope,
  Send,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { OptionItem } from "./types";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ScheduleFormData) => Promise<void>;
  patients: OptionItem[];
  doctors: OptionItem[];
}

export interface ScheduleFormData {
  patientId: string;
  doctorId: string;
  serviceName: string;
  dueDate: string;
  scheduledTime: string;
  mode: string;
  interval: string;
  planInstructions: string;
  sendWhatsAppReminder: boolean;
  sendEmailReminder: boolean;
}

export function ScheduleFollowUpModal({
  isOpen,
  onClose,
  onSubmit,
  patients,
  doctors,
}: ScheduleFollowUpModalProps) {
  const [patientId, setPatientId] = useState(patients[0]?._id || "");
  const [doctorId, setDoctorId] = useState(doctors[0]?._id || "");
  const [serviceName, setServiceName] = useState("Homoeopathic Care Review");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [scheduledTime, setScheduledTime] = useState("11:30 AM - 12:00 PM");
  const [mode, setMode] = useState("Online Video Consultation");
  const [interval, setInterval] = useState("Day 14");
  const [planInstructions, setPlanInstructions] = useState(
    "Evaluate symptom progression, cycle response, and adjust constitutional remedy potency."
  );
  const [sendWhatsAppReminder, setSendWhatsAppReminder] = useState(true);
  const [sendEmailReminder, setSendEmailReminder] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleIntervalSelect = (days: number, label: string) => {
    setInterval(label);
    const target = new Date(Date.now() + days * 86400000);
    setDueDate(target.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !dueDate) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        patientId,
        doctorId: doctorId || doctors[0]?._id,
        serviceName,
        dueDate,
        scheduledTime,
        mode,
        interval,
        planInstructions,
        sendWhatsAppReminder,
        sendEmailReminder,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E5EAF0] flex items-center justify-between bg-[#F8FAF9] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Schedule Follow-up</h3>
              <p className="text-[11px] text-[#64748B]">
                Configure care review date, clinical protocol, and automated reminders
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Patient Selection */}
            <div>
              <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Patient *
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              required
            >
              <option value="" disabled>Select patient...</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.fullName || p.name} ({p.patientCode || "No code"}) • {p.phone || ""}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Assigned Consultant *
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              required
            >
              <option value="" disabled>Select doctor...</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.userId?.name || d.name || "Doctor"} — {d.specialization || "Clinical Specialist"}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Consultation Mode *
            </label>
            <div className="w-full px-3 py-2 border border-[#C5DDBB] bg-[#EBF3E8] rounded-xl text-xs font-semibold text-[#154734] flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" />
              <span>Online Video Consultation (Online Only)</span>
            </div>
          </div>

          {/* Interval Shortcuts */}
          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Follow-up Interval Shortcut
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { days: 1, label: "Day 1" },
                { days: 3, label: "Day 3" },
                { days: 7, label: "Day 7" },
                { days: 14, label: "Day 14" },
                { days: 21, label: "Day 21" },
                { days: 30, label: "Day 30" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleIntervalSelect(item.days, item.label)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    interval === item.label
                      ? "bg-[#087A50] text-white border-[#087A50]"
                      : "bg-gray-50 border-gray-200 text-[#475569] hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
                Time Slot
              </label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="e.g. 11:30 AM - 12:00 PM"
                className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              />
            </div>
          </div>

          {/* Plan Instructions */}
          <div>
            <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
              Care Plan &amp; Symptom Focus
            </label>
            <textarea
              rows={3}
              value={planInstructions}
              onChange={(e) => setPlanInstructions(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              placeholder="Instructions for the review session..."
            />
          </div>

          {/* Automated Reminders Toggles */}
          <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
            <span className="text-[11px] font-bold text-[#475569] block uppercase tracking-wider">
              Automated Reminders
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-[#111827] cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsAppReminder}
                  onChange={(e) => setSendWhatsAppReminder(e.target.checked)}
                  className="rounded text-[#087A50] focus:ring-[#087A50]"
                />
                <span>WhatsApp Notification</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[#111827] cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmailReminder}
                  onChange={(e) => setSendEmailReminder(e.target.checked)}
                  className="rounded text-[#087A50] focus:ring-[#087A50]"
                />
                <span>Email Reminder</span>
              </label>
            </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-3.5 border-t border-[#E5EAF0] flex items-center justify-end gap-2.5 bg-[#F8FAF9] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              <span>Confirm &amp; Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
