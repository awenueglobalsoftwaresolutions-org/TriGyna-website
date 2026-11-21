"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Send,
  User,
  Clock,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Calendar,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface WhatsAppMessage {
  messageId: string;
  sender: "customer" | "staff" | "system";
  senderName?: string;
  text: string;
  status: "queued" | "accepted" | "sent" | "delivered" | "read" | "failed";
  timestamp: string;
}

interface WhatsAppConversation {
  _id: string;
  conversationId: string;
  customerPhone: string;
  customerName: string;
  patientId?: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone: string;
  };
  isEscalated?: boolean;
  escalationReason?: string;
  unreadCount: number;
  lastMessage?: {
    text: string;
    sender: string;
    timestamp: string;
  };
  messages: WhatsAppMessage[];
  internalNotes?: Array<{
    note: string;
    author: string;
    createdAt: string;
  }>;
}

export function DoctorCommunicationsTab({
  showNotification,
}: {
  showNotification?: (msg: string, isErr?: boolean) => void;
}) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const notify = (msg: string, isErr = false) => {
    if (showNotification) showNotification(msg, isErr);
  };

  const loadDoctorConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ conversations: WhatsAppConversation[] }>("/integrations/whatsapp/conversations");
      if (res.success && res.data?.conversations) {
        setConversations(res.data.conversations);
        if (res.data.conversations.length > 0 && !selectedConv) {
          setSelectedConv(res.data.conversations[0]);
        }
      }
    } catch {
      notify("Failed to load patient communications", true);
    } finally {
      setLoading(false);
    }
  }, [selectedConv]);

  useEffect(() => {
    loadDoctorConversations();
  }, [loadDoctorConversations]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConv) return;
    setIsSending(true);
    try {
      const res = await api.post<{ message: WhatsAppMessage; conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${selectedConv._id}/messages`,
        {
          text: replyText.trim(),
          customerPhone: selectedConv.customerPhone,
        }
      );

      if (res.success && res.data?.message) {
        const updatedMsg = res.data.message;
        setReplyText("");
        setSelectedConv((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, updatedMsg],
                lastMessage: {
                  text: updatedMsg.text,
                  sender: "staff",
                  timestamp: updatedMsg.timestamp,
                },
              }
            : null
        );
        notify("Clinical reply sent to patient via WhatsApp");
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to dispatch message", true);
    } finally {
      setIsSending(false);
    }
  };

  const filtered = conversations.filter(
    (c) =>
      c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.customerPhone?.includes(search) ||
      c.patientId?.patientCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E2E9E3] shadow-xs overflow-hidden flex flex-col md:flex-row h-[720px] animate-fade-in">
      {/* Left List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-[#E2E9E3] flex flex-col h-full bg-[#F7F9F7]">
        <div className="p-4 border-b border-[#E2E9E3] bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#154734] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-[#18231D]">Patient Communications</h3>
                <p className="text-[11px] text-[#68756D]">Direct Clinical WhatsApp Inquiries</p>
              </div>
            </div>
            <button
              onClick={loadDoctorConversations}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#154734] transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by patient name, phone, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] bg-white text-[#18231D]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#E2E9E3]">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#68756D] flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#154734]" />
              <span>Loading assigned patient messages...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#68756D]">
              No active communication threads found for your assigned patients.
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = selectedConv?._id === conv._id;
              return (
                <button
                  key={conv._id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full text-left p-3.5 transition flex items-start gap-3 cursor-pointer ${
                    isSelected ? "bg-[#154734]/10 border-l-4 border-l-[#154734]" : "hover:bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-[#154734] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {conv.customerName?.charAt(0) || "P"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-[#18231D] truncate">{conv.customerName}</h4>
                      {conv.isEscalated && (
                        <span className="text-[9px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                          Handoff
                        </span>
                      )}
                    </div>
                    {conv.patientId && (
                      <span className="text-[10px] text-emerald-800 font-mono font-medium">
                        {conv.patientId.patientCode}
                      </span>
                    )}
                    <p className="text-[11px] text-[#68756D] truncate mt-1">
                      {conv.lastMessage?.text || "Started conversation"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Center Thread */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col h-full bg-[#F7F9F7]">
          {/* Header */}
          <div className="p-4 border-b border-[#E2E9E3] bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#154734] text-white flex items-center justify-center font-bold text-xs">
                {selectedConv.customerName?.charAt(0) || "P"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#18231D]">{selectedConv.customerName}</h4>
                  {selectedConv.patientId && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-semibold">
                      {selectedConv.patientId.patientCode}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#68756D] font-mono">+91 {selectedConv.customerPhone}</p>
              </div>
            </div>

            {selectedConv.isEscalated && (
              <div className="flex items-center gap-1.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-semibold text-[11px]">Direct Clinical Handoff</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedConv.messages.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#68756D]">No message history.</div>
            ) : (
              selectedConv.messages.map((m, idx) => {
                const isDoctorStaff = m.sender === "staff";
                return (
                  <div key={idx} className={`flex flex-col ${isDoctorStaff ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                        isDoctorStaff
                          ? "bg-[#154734] text-white rounded-br-xs"
                          : "bg-white text-[#18231D] border border-[#E2E9E3] rounded-bl-xs"
                      }`}
                    >
                      <p>{m.text}</p>
                      <div
                        className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                          isDoctorStaff ? "text-emerald-200" : "text-[#68756D]"
                        }`}
                      >
                        <span>
                          {m.timestamp
                            ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </span>
                        {isDoctorStaff && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Internal Clinical Notes */}
            {selectedConv.internalNotes && selectedConv.internalNotes.length > 0 && (
              <div className="my-4 pt-3 border-t border-dashed border-[#E2E9E3]">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Lock className="w-3 h-3" />
                  <span>Clinical Case Notes</span>
                </span>
                <div className="space-y-1.5 mt-2">
                  {selectedConv.internalNotes.map((n, i) => (
                    <div key={i} className="bg-amber-50/70 border border-amber-200 p-2 rounded-xl text-xs text-amber-950">
                      <p>{n.note}</p>
                      <p className="text-[10px] text-amber-700 mt-1">
                        By {n.author} • {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reply Box */}
          <div className="p-3 bg-white border-t border-[#E2E9E3] flex items-center gap-2">
            <input
              type="text"
              placeholder="Type clinical advice or follow-up note to patient..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              className="flex-1 px-3.5 py-2 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] bg-white text-[#18231D]"
            />
            <button
              onClick={handleSendReply}
              disabled={isSending || !replyText.trim()}
              className="px-4 py-2 bg-[#154734] text-white rounded-xl text-xs font-semibold hover:bg-[#0E3828] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Reply</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#68756D]">
          <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
          <h4 className="font-semibold text-sm text-[#18231D]">Select a patient communication thread</h4>
          <p className="text-xs text-[#68756D] max-w-sm mt-1">
            Review inquiries and doctor-patient messages for your assigned consultations.
          </p>
        </div>
      )}
    </div>
  );
}

