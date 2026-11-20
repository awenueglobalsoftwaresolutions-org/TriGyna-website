"use client";

import React, { useState } from "react";
import { X, Send, MessageSquare, Mail, Loader2 } from "lucide-react";
import { FollowUpItem } from "./types";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: FollowUpItem | null;
  onSend: (channel: "whatsapp" | "email", message: string) => Promise<void>;
}

export function SendReminderModal({
  isOpen,
  onClose,
  followUp,
  onSend,
}: SendReminderModalProps) {
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !followUp) return null;

  const defaultMsg = `Dear ${followUp.patientId?.fullName || "Patient"}, reminder for your TriGyna follow-up with ${followUp.doctorId?.userId?.name || "your Consultant"} on ${new Date(followUp.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} at ${followUp.scheduledTime || "11:30 AM"}. Mode: ${followUp.mode}. Please reply to confirm.`;

  const currentMessage = customMessage || defaultMsg;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSend(channel, currentMessage);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen && !!followUp} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-md overflow-hidden flex flex-col font-sans max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5EAF0] flex items-center justify-between bg-[#F8FAF9] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold shrink-0">
              <Send className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Send Patient Reminder</h3>
              <p className="text-[11px] text-[#64748B]">
                {followUp.followUpCode} • {followUp.patientId?.fullName}
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Channel selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  channel === "whatsapp"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-white border-[#E5EAF0] text-[#64748B] hover:bg-gray-50"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Cloud</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  channel === "email"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-white border-[#E5EAF0] text-[#64748B] hover:bg-gray-50"
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Email Reminder</span>
              </button>
            </div>

            <div className="text-xs text-[#64748B]">
              Recipient:{" "}
              <span className="font-mono font-medium text-[#111827]">
                {channel === "whatsapp"
                  ? followUp.patientId?.phone || "No phone registered"
                  : followUp.patientId?.email || "No email registered"}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#475569] block mb-1 uppercase tracking-wider">
                Message Content
              </label>
              <textarea
                rows={4}
                value={customMessage || defaultMsg}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
              />
            </div>
          </div>

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
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Dispatch Reminder</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
