"use client";

import React, { useState } from "react";
import { Headphones, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api/client";

interface SalesSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  showNotification: (msg: string, isError?: boolean) => void;
}

export function SalesSupportModal({ isOpen, onClose, showNotification }: SalesSupportModalProps) {
  const [category, setCategory] = useState("Technical & App Support");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showNotification("Please provide both a subject and issue description", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/sales/support-tickets", {
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });

      const ticketNum = (res.data as { ticket?: { ticketNumber: string } })?.ticket?.ticketNumber || "TKT-NEW";
      showNotification(`Support request #${ticketNum} submitted to CRM Admin team!`);
      setSubject("");
      setDescription("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit support request";
      showNotification(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E5EBE8] space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EBE8] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E5F4E8] text-[#159447] flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#172033] leading-tight">Raise a CRM Support Request</h3>
              <p className="text-xs text-[#718096]">Direct escalation to Admin and CRM Technical team</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#172033] mb-1">Issue Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EBE8] bg-[#F7F9F8] text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#159447] font-medium"
            >
              <option value="Technical & App Support">Technical &amp; App Support</option>
              <option value="Billing & Payments">Billing, Invoices &amp; Razorpay</option>
              <option value="Appointment & Scheduling">Appointment &amp; Calendar Scheduling</option>
              <option value="WhatsApp & Meta Cloud API">WhatsApp &amp; Meta Cloud API</option>
              <option value="Lead Allocation & Targets">Lead Allocation &amp; Sales Targets</option>
              <option value="General Inquiry">General Operational Inquiry</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block font-bold text-[#172033] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high" | "urgent")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EBE8] bg-[#F7F9F8] text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#159447] font-medium"
              >
                <option value="low">Low (General Query)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="high">High (Lead Impacting)</option>
                <option value="urgent">Urgent (Payment / Blocker)</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block font-bold text-[#172033] mb-1">Assigned Team</label>
              <input
                type="text"
                readOnly
                value="Admin & CRM Core Desk"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EBE8] bg-gray-100 text-gray-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#172033] mb-1">Subject / Summary *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Lead WhatsApp status shows disconnected"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EBE8] bg-[#F7F9F8] text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#159447]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#172033] mb-1">Detailed Description *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what occurred, any lead IDs, or error messages encountered..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EBE8] bg-[#F7F9F8] text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#159447]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5EBE8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5EBE8] text-[#718096] hover:bg-gray-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#159447] hover:bg-[#073B2E] text-white font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
