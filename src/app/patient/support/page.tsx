"use client";

import React, { useState, useEffect } from "react";
import {
  Headphones,
  Plus,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Loader2,
  X,
  FileQuestion,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface TicketReply {
  _id?: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface SupportTicketRecord {
  _id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: string;
  replies: TicketReply[];
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketRecord | null>(null);

  // New Ticket Form State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [category, setCategory] = useState("Prescriptions & Medicines");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ tickets: SupportTicketRecord[] }>("/patient/me/support-tickets");
      if (res.success && res.data?.tickets) {
        setTickets(res.data.tickets);
        if (res.data.tickets.length > 0 && !selectedTicket) {
          setSelectedTicket(res.data.tickets[0]);
        }
      }
    } catch (err) {
      console.error("Support tickets fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setFormError("Subject and message are required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await api.post<any>("/patient/me/support-tickets", {
        category,
        subject: subject.trim(),
        description: description.trim(),
      });

      if (res.success) {
        setCreateModalOpen(false);
        setSubject("");
        setDescription("");
        fetchTickets();
      }
    } catch (err: any) {
      setFormError(err?.message || "Failed to create support ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const res = await api.post<any>(`/patient/me/support-tickets/${selectedTicket._id}/replies`, {
        message: replyText.trim(),
      });

      if (res.success) {
        setReplyText("");
        // Refresh ticket
        const updatedRes = await api.get<{ ticket: SupportTicketRecord }>(`/patient/me/support-tickets/${selectedTicket._id}`);
        if (updatedRes.success && updatedRes.data?.ticket) {
          setSelectedTicket(updatedRes.data.ticket);
          fetchTickets();
        }
      }
    } catch (err: any) {
      alert(err?.message || "Failed to post reply.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4EEE7]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
            Help & Clinical Support Desk
          </h1>
          <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
            Submit medical posology queries, report technical issues, or request clinic assistance
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#68766F] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#075B35] animate-spin mb-2" />
          <p className="text-xs">Loading support requests...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E4EEE7] p-12 text-center">
          <Headphones className="w-12 h-12 text-[#68766F]/40 mx-auto mb-3" />
          <h3 className="text-base font-serif font-bold text-[#14251F]">No Open Support Requests</h3>
          <p className="text-xs text-[#68766F] mt-1 max-w-sm mx-auto">
            Need clarification on your medicine dosages or appointment timings? Our clinic care team is here to help.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Open Ticket</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Tickets List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#68766F] px-1">
              Your Requests ({tickets.length})
            </h3>

            <div className="space-y-2.5">
              {tickets.map((t) => {
                const isSelected = selectedTicket?._id === t._id;
                return (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#F3FAF5] border-[#075B35] shadow-xs"
                        : "bg-white border-[#E4EEE7] hover:border-[#C6E7D2]"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#E4EEE7]/60">
                      <span className="font-mono font-bold text-xs text-[#075B35]">
                        {t.ticketNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          t.status === "resolved"
                            ? "bg-[#EDF8F1] text-[#075B35]"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#14251F] mt-2 line-clamp-1">{t.subject}</h4>
                    <p className="text-[11px] text-[#68766F] mt-1 line-clamp-1">{t.description}</p>
                    <span className="text-[10px] text-[#8C9892] mt-2 block">
                      Category: {t.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Ticket Thread (7 cols) */}
          {selectedTicket && (
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E4EEE7] p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E4EEE7]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#075B35]">
                      {selectedTicket.ticketNumber}
                    </span>
                    <span className="text-[10px] font-semibold text-[#68766F]">
                      Category: {selectedTicket.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#14251F] mt-1">
                    {selectedTicket.subject}
                  </h3>
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                    selectedTicket.status === "resolved"
                      ? "bg-[#EDF8F1] text-[#075B35]"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {selectedTicket.status}
                </span>
              </div>

              {/* Initial Question */}
              <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E4EEE7] text-xs">
                <span className="font-bold text-[#14251F] block mb-1">Your Initial Query:</span>
                <p className="text-[#556960] leading-relaxed">{selectedTicket.description}</p>
              </div>

              {/* Conversation Thread */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#075B35] uppercase tracking-wider">
                  Conversation & Responses ({selectedTicket.replies?.length || 0})
                </h4>

                <div className="space-y-3">
                  {selectedTicket.replies?.map((rep, idx) => {
                    const isDoctor = rep.senderRole === "doctor";
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                          isDoctor
                            ? "bg-[#EDF8F1] border border-[#C6E7D2] ml-4"
                            : "bg-[#F8FAF9] border border-[#E4EEE7] mr-4"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className={isDoctor ? "text-[#075B35]" : "text-[#14251F]"}>
                            {rep.senderName} ({rep.senderRole.toUpperCase()})
                          </span>
                          <span className="text-[#8C9892] font-normal">
                            {new Date(rep.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-[#14251F] leading-relaxed">{rep.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="pt-4 border-t border-[#F0F5F2] flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your message reply..."
                  className="flex-1 h-10 px-3.5 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-xs focus:outline-none focus:ring-1 focus:ring-[#075B35]"
                  required
                />
                <button
                  type="submit"
                  disabled={sendingReply}
                  className="px-4 py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {sendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Reply</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Create Ticket Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F5F2]">
              <h3 className="text-base font-serif font-bold text-[#14251F]">
                Open Clinic Support Ticket
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="py-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="font-bold text-[#14251F] block mb-1">Issue Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                >
                  <option value="Prescriptions & Medicines">Prescriptions & Medicines Query</option>
                  <option value="Appointment & Scheduling">Appointment & Rescheduling Help</option>
                  <option value="Online Consultation">Video Call & Consultation Support</option>
                  <option value="Billing & Payments">Billing, Invoices & Refund Question</option>
                  <option value="Medical Records">Health Records & Correction Request</option>
                  <option value="General Inquiry">General Clinic Inquiry</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#14251F] block mb-1">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Question on taking morning dose"
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#14251F] block mb-1">Description / Details *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue or medical question in detail..."
                  className="w-full p-2.5 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Ticket...</span>
                    </>
                  ) : (
                    <span>Submit Support Ticket</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
