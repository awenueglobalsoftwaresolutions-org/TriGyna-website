"use client";

import React, { useState } from "react";
import { X, Clock, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { CrmLead } from "./crmTypes";

interface CrmScheduleFollowupModalProps {
  lead: CrmLead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isError?: boolean) => void;
}

export function CrmScheduleFollowupModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: CrmScheduleFollowupModalProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("10:30");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) {
      showNotification("Please select a due date", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedDate = new Date(`${dueDate}T${dueTime || "10:30"}:00`).toISOString();
      const res = await api.post("/crm/follow-ups", {
        leadId: lead._id,
        title: title.trim() || `Follow up with ${lead.fullName}`,
        dueDate: combinedDate,
        priority,
        notes: notes.trim(),
      });

      if (res.success) {
        showNotification("Follow-up scheduled successfully!");
        onSuccess();
        onClose();
      } else {
        showNotification(res.message || "Failed to schedule follow-up", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Failed to schedule follow-up", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl border border-[#E5EAF0] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#E9F8F0] border-b border-[#D1F2E0] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#087A50] text-white flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Schedule Follow-up</h3>
              <p className="text-xs text-[#075B3D]">Set reminder and clinical follow-up task</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white text-[#64748B] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0]">
              <span className="text-[#64748B] block">Lead:</span>
              <span className="font-bold text-[#111827] text-sm">{lead.fullName}</span>
              <span className="text-[#64748B] block text-[11px] mt-0.5">
                {lead.serviceInterest} &bull; {lead.phone}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Follow-up Title / Reason
              </label>
              <input
                type="text"
                placeholder={`e.g. Call back regarding PCOD consultation slot`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Time Slot
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (Urgent Callback)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Notes / Discussion Points
              </label>
              <textarea
                rows={2}
                placeholder="Specific guidance for the callback conversation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#F7F9FC] border-t border-[#E5EAF0] px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#111827] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-xs transition disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Set Follow-up</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
