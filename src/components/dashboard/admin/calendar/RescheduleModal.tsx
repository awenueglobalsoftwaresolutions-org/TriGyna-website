"use client";

import React, { useState } from "react";
import { X, Clock, Loader2 } from "lucide-react";
import { CalendarEvent } from "./types";
import { api } from "@/lib/api/client";

interface RescheduleModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function RescheduleModal({
  event,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: RescheduleModalProps) {
  const [newDate, setNewDate] = useState(event?.date || "2026-11-29");
  const [newStartTime, setNewStartTime] = useState(event?.startTime || "11:00 AM");
  const [newEndTime, setNewEndTime] = useState(event?.endTime || "11:30 AM");
  const [reason, setReason] = useState("Patient requested slot change");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !event) return null;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await api.post(`/calendar/events/${event.id}/reschedule`, {
        newDate,
        newStartTime,
        newEndTime,
        reason,
      });

      showNotification("Event rescheduled successfully in source module!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to reschedule event";
      showNotification(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#087A50]" />
            <h3 className="font-bold text-base text-[#111827]">Reschedule Event</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5EAF0] text-xs space-y-1">
          <p className="font-bold text-[#111827]">{event.title}</p>
          <p className="text-[#64748B]">Currently: {event.date} at {event.startTime}</p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-[#111827]">New Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#111827]">New Start Time</label>
              <input
                type="text"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                placeholder="11:00 AM"
                className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs font-mono focus:outline-[#087A50]"
              />
            </div>
            <div>
              <label className="font-bold text-[#111827]">New End Time</label>
              <input
                type="text"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                placeholder="11:30 AM"
                className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs font-mono focus:outline-[#087A50]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#111827]">Reason for Rescheduling</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g. Doctor emergency / Patient conflict"
              className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50]"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E5EAF0] text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
