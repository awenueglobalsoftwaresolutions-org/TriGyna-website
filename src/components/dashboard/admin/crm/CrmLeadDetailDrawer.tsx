"use client";

import React, { useState } from "react";
import {
  X,
  Phone,
  MessageCircle,
  Mail,
  UserCheck,
  Ban,
  Clock,
  Calendar,
  FileText,
  Send,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  User,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { CrmLead } from "./crmTypes";

interface CrmLeadDetailDrawerProps {
  lead: CrmLead | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshLead: () => void;
  onCall: (lead: CrmLead) => void;
  onWhatsApp: (lead: CrmLead) => void;
  onConvert: (lead: CrmLead) => void;
  onMarkLost: (lead: CrmLead) => void;
  showNotification: (msg: string, isError?: boolean) => void;
}

export function CrmLeadDetailDrawer({
  lead,
  isOpen,
  onClose,
  onRefreshLead,
  onCall,
  onWhatsApp,
  onConvert,
  onMarkLost,
  showNotification,
}: CrmLeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "activities" | "followups" | "communication" | "notes" | "conversion"
  >("overview");

  // New Note State
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // New Communication State
  const [commChannel, setCommChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [commMessage, setCommMessage] = useState("");
  const [isSendingComm, setIsSendingComm] = useState(false);

  // Quick Followup State
  const [quickFollowupDate, setQuickFollowupDate] = useState("");
  const [quickFollowupTitle, setQuickFollowupTitle] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  if (!isOpen || !lead) return null;

  const getInitials = (name: string) => {
    if (!name) return "LD";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await api.post(`/crm/leads/${lead._id}/notes`, { body: newNote.trim() });
      if (res.success) {
        showNotification("Note added to lead record");
        setNewNote("");
        onRefreshLead();
      } else {
        showNotification(res.message || "Failed to add note", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Failed to add note", true);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleSendCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commMessage.trim()) return;
    setIsSendingComm(true);
    try {
      // 1. Log activity on lead
      await api.post(`/crm/leads/${lead._id}/activities`, {
        action: commChannel === "whatsapp" ? "WHATSAPP_SENT" : "EMAIL_SENT",
        details: `${commChannel.toUpperCase()} dispatched: "${commMessage.trim()}"`,
      });

      // 2. Dispatch via integration route if whatsapp
      if (commChannel === "whatsapp") {
        await api.post("/integrations/whatsapp/messages", {
          recipientPhone: lead.phone,
          messageText: commMessage.trim(),
          leadId: lead._id,
        }).catch(() => {
          // If integration credentials not configured on demo, activity is already saved in MongoDB
        });
      }

      showNotification(`${commChannel === "whatsapp" ? "WhatsApp" : "Email"} message logged successfully`);
      setCommMessage("");
      onRefreshLead();
    } catch (err: any) {
      showNotification(err?.message || "Failed to log communication", true);
    } finally {
      setIsSendingComm(false);
    }
  };

  const handleScheduleFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFollowupDate) return;
    setIsScheduling(true);
    try {
      const res = await api.post("/crm/follow-ups", {
        leadId: lead._id,
        title: quickFollowupTitle || `Follow up with ${lead.fullName}`,
        dueDate: quickFollowupDate,
        priority: "medium",
      });
      if (res.success) {
        showNotification("Follow-up scheduled successfully");
        setQuickFollowupDate("");
        setQuickFollowupTitle("");
        onRefreshLead();
      } else {
        showNotification(res.message || "Failed to schedule", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Failed to schedule follow-up", true);
    } finally {
      setIsScheduling(false);
    }
  };

  const isConverted = lead.status === "converted" || !!lead.convertedPatientId;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#E5EAF0] bg-[#F7F9FC]/70 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#E9F8F0] border border-[#D1F2E0] text-[#087A50] font-bold text-base flex items-center justify-center shrink-0">
                {getInitials(lead.fullName)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-[#111827] truncate">
                    {lead.fullName}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white border border-[#E5EAF0] text-[#087A50]">
                    {lead.leadCode || `LD-${lead._id.slice(-5).toUpperCase()}`}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] truncate mt-0.5 font-medium">
                  {lead.serviceInterest} &bull; {lead.phone}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="w-8 h-8 rounded-full hover:bg-white text-[#64748B] flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#E5EAF0]">
            <button
              type="button"
              onClick={() => onCall(lead)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-[#E5EAF0] text-xs font-semibold text-[#111827] shadow-2xs transition cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-[#087A50]" />
              <span>Call</span>
            </button>

            <button
              type="button"
              onClick={() => onWhatsApp(lead)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-[#E5EAF0] text-xs font-semibold text-[#111827] shadow-2xs transition cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#087A50]" />
              <span>WhatsApp</span>
            </button>

            {!isConverted ? (
              <button
                type="button"
                onClick={() => onConvert(lead)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Convert to Patient</span>
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E9F8F0] text-[#087A50] text-xs font-semibold border border-[#D1F2E0]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Converted Patient</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => onMarkLost(lead)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-[#E5EAF0] text-xs font-semibold text-red-600 shadow-2xs transition cursor-pointer ml-auto"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Mark Lost</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#E5EAF0] px-4 bg-white overflow-x-auto text-xs font-semibold text-[#64748B] shrink-0">
          {[
            { id: "overview", label: "Overview" },
            { id: "activities", label: `Timeline (${lead.activities?.length || 0})` },
            { id: "followups", label: `Follow-ups (${lead.tasks?.length || 0})` },
            { id: "communication", label: "Communication" },
            { id: "notes", label: `Notes (${lead.notes?.length || 0})` },
            { id: "conversion", label: "Conversion" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? "border-[#087A50] text-[#087A50] font-bold"
                  : "border-transparent hover:text-[#111827]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* 1. OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Contact Card */}
              <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-3">
                <h4 className="font-bold text-[#111827] text-xs uppercase tracking-wider text-[#087A50]">
                  Contact &amp; Enquiry Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#64748B] block">Full Name:</span>
                    <span className="font-semibold text-[#111827]">{lead.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Phone:</span>
                    <span className="font-mono font-semibold text-[#111827]">{lead.phone}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Email:</span>
                    <span className="font-semibold text-[#111827]">{lead.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Service Interest:</span>
                    <span className="font-semibold text-[#111827]">{lead.serviceInterest}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Consultation Mode:</span>
                    <span className="font-semibold text-[#111827]">{lead.consultationMode || "Online"}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Lead Source:</span>
                    <span className="font-semibold text-[#111827] capitalize">{lead.source}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Current Stage:</span>
                    <span className="font-semibold text-[#087A50] uppercase">{lead.status}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Priority:</span>
                    <span className="font-semibold text-[#111827] uppercase">{lead.priority || "Medium"}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Assigned Owner:</span>
                    <span className="font-semibold text-[#111827]">
                      {lead.assignedTo?.name || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Created On:</span>
                    <span className="font-semibold text-[#111827]">
                      {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {lead.message && (
                  <div className="pt-2 border-t border-[#E5EAF0]">
                    <span className="text-[#64748B] block mb-1">Enquiry Message:</span>
                    <p className="bg-white p-2.5 rounded-xl border border-[#E5EAF0] text-[#111827] leading-relaxed">
                      {lead.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. ACTIVITIES TIMELINE */}
          {activeTab === "activities" && (
            <div className="space-y-3 animate-in fade-in duration-100">
              <h4 className="font-bold text-[#111827] text-xs uppercase tracking-wider text-[#087A50]">
                Chronological Activity History
              </h4>
              {(!lead.activities || lead.activities.length === 0) ? (
                <div className="py-8 text-center text-[#64748B]">No activity events logged yet.</div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5EAF0]">
                  {lead.activities.map((a, idx) => (
                    <div key={a._id || idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#087A50] ring-4 ring-white" />
                      <div className="bg-[#F7F9FC] p-3 rounded-xl border border-[#E5EAF0]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#111827]">{a.action}</span>
                          <span className="text-[10px] text-[#64748B]">
                            {new Date(a.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {a.details && <p className="text-xs text-[#475569] mt-1">{a.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. FOLLOW-UPS */}
          {activeTab === "followups" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Quick schedule form */}
              <form onSubmit={handleScheduleFollowup} className="p-3.5 rounded-2xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-2.5">
                <h4 className="font-bold text-[#111827]">Schedule Next Follow-up</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    required
                    value={quickFollowupDate}
                    onChange={(e) => setQuickFollowupDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-[#E5EAF0] rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    placeholder="e.g. Call to discuss diagnostic reports"
                    value={quickFollowupTitle}
                    onChange={(e) => setQuickFollowupTitle(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-[#E5EAF0] rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isScheduling}
                  className="px-3.5 py-1.5 rounded-xl bg-[#087A50] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs hover:bg-[#075B3D] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isScheduling ? "Scheduling..." : "Schedule Follow-up"}</span>
                </button>
              </form>

              {/* Tasks List */}
              <div className="space-y-2">
                {(!lead.tasks || lead.tasks.length === 0) ? (
                  <div className="py-6 text-center text-[#64748B]">No follow-ups recorded.</div>
                ) : (
                  lead.tasks.map((t) => (
                    <div
                      key={t._id}
                      className="p-3 rounded-xl border border-[#E5EAF0] bg-white flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="font-semibold text-[#111827]">{t.title}</div>
                        <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-[#087A50]" />
                          <span>
                            Due: {new Date(t.dueDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        t.status === "completed" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 4. COMMUNICATION */}
          {activeTab === "communication" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Send message box */}
              <form onSubmit={handleSendCommunication} className="p-3.5 rounded-2xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCommChannel("whatsapp")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                      commChannel === "whatsapp" ? "bg-[#087A50] text-white" : "bg-white border text-[#64748B]"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommChannel("email")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                      commChannel === "email" ? "bg-[#087A50] text-white" : "bg-white border text-[#64748B]"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>
                </div>

                <textarea
                  rows={3}
                  required
                  placeholder={`Type message to send to ${lead.fullName} (${lead.phone})...`}
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />

                <button
                  type="submit"
                  disabled={isSendingComm}
                  className="px-4 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingComm ? "Sending..." : "Dispatch Message"}</span>
                </button>
              </form>

              {/* Message log */}
              <div className="space-y-2">
                {(!lead.communications || lead.communications.length === 0) ? (
                  <div className="py-6 text-center text-[#64748B]">No communication logs recorded yet.</div>
                ) : (
                  lead.communications.map((c, i) => (
                    <div key={c._id || i} className="p-3 rounded-xl bg-white border border-[#E5EAF0] space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#111827] uppercase">{c.channel}</span>
                        <span className="text-[#64748B]">{new Date(c.timestamp).toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-xs text-[#334155]">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={2}
                  required
                  placeholder="Add confidential clinical or operational note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />
                <button
                  type="submit"
                  disabled={isAddingNote}
                  className="px-4 py-1.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingNote ? "Saving..." : "Add Note"}</span>
                </button>
              </form>

              {/* Notes List */}
              <div className="space-y-2.5">
                {(!lead.notes || lead.notes.length === 0) ? (
                  <div className="py-6 text-center text-[#64748B]">No notes added yet.</div>
                ) : (
                  lead.notes.map((n) => (
                    <div key={n._id} className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                        <span className="font-semibold text-[#111827]">
                          {n.createdBy?.name || "Staff Member"}
                        </span>
                        <span>{new Date(n.createdAt).toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-xs text-[#111827] leading-relaxed whitespace-pre-wrap">{n.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 6. CONVERSION */}
          {activeTab === "conversion" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {lead.convertedPatientId ? (
                <div className="p-4 rounded-2xl bg-[#E9F8F0] border border-[#D1F2E0] space-y-3">
                  <div className="flex items-center gap-2 text-[#087A50] font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Lead Converted to Registered Patient</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-[#111827]">
                    <div>
                      <span className="text-[#64748B]">Patient Code:</span>{" "}
                      <span className="font-mono font-bold">{lead.convertedPatientId.patientCode}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Patient Name:</span>{" "}
                      <span className="font-bold">{lead.convertedPatientId.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Phone:</span>{" "}
                      <span className="font-mono font-semibold">{lead.convertedPatientId.phone}</span>
                    </div>
                    {lead.convertedAppointmentId && (
                      <div className="pt-2 border-t border-[#D1F2E0]">
                        <span className="text-[#64748B]">Linked Appointment:</span>{" "}
                        <span className="font-mono font-bold text-[#087A50]">
                          {lead.convertedAppointmentId.appointmentCode}
                        </span>{" "}
                        ({lead.convertedAppointmentId.appointmentDate} at{" "}
                        {lead.convertedAppointmentId.startTime})
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-3 text-center py-8">
                  <User className="w-10 h-10 text-[#64748B] mx-auto opacity-40" />
                  <div>
                    <h4 className="font-bold text-[#111827]">Patient Record Not Linked Yet</h4>
                    <p className="text-xs text-[#64748B] mt-1">
                      Convert this qualified lead to a patient in the TriGyna Patient Directory with automated invoice and doctor slot booking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onConvert(lead)}
                    className="px-4 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-xs transition cursor-pointer mx-auto"
                  >
                    Convert to Patient Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
