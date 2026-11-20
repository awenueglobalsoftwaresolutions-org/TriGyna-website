"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { CalendarEvent } from "./types";
import { api } from "@/lib/api/client";

interface CancelEventModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function CancelEventModal({
  event,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: CancelEventModalProps) {
  const [reason, setReason] = useState("Patient requested cancellation");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !event) return null;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await api.post(`/calendar/events/${event.id}/cancel`, {
        reason,
      });

      showNotification("Event cancelled successfully in source module!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to cancel event";
      showNotification(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2 text-[#DC2626]">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-base text-[#111827]">Cancel Scheduled Event</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#475569]">
          Are you sure you want to cancel <strong className="text-[#111827]">{event.title}</strong>? This action updates the original source record in MongoDB.
        </p>

        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-[#111827]">Cancellation Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for cancellation..."
            className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#DC2626]"
          />
        </div>

        <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E5EAF0] text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Go Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}
