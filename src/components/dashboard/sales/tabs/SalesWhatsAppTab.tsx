"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  User,
  CheckCheck,
  Clock,
  Sparkles,
  Paperclip,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Plus,
  StickyNote,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface WhatsAppMessage {
  _id?: string;
  messageId?: string;
  sender: "customer" | "staff" | "system";
  senderName?: string;
  text: string;
  templateName?: string;
  status: "queued" | "accepted" | "sent" | "delivered" | "read" | "failed";
  timestamp: string;
}

interface InternalNote {
  _id?: string;
  note: string;
  author: string;
  createdAt: string;
}

interface WhatsAppConversation {
  _id: string;
  conversationId: string;
  customerPhone: string;
  customerName: string;
  leadId?: {
    _id: string;
    fullName: string;
    phone: string;
    status: string;
    serviceInterest?: string;
  };
  patientId?: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone: string;
  };
  status: "active" | "waiting" | "closed";
  isEscalated?: boolean;
  escalationReason?: string;
  unreadCount: number;
  lastMessage?: {
    text: string;
    sender: "customer" | "staff" | "system";
    timestamp: string;
  };
  messages: WhatsAppMessage[];
  internalNotes?: InternalNote[];
  createdAt: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  header?: string;
  body: string;
  footer?: string;
  variables: string[];
}

interface SalesWhatsAppTabProps {
  onOpenLead?: (lead: any) => void;
}

const CANNED_TEMPLATES = [
  {
    name: "consultation_reminder_link",
    label: "📅 Consultation Link",
    text: "Dear {name}, your video consultation with TriGyna specialist is confirmed for today. Please click here to join: https://meet.google.com/tg-care-meet",
  },
  {
    name: "payment_link_package",
    label: "💳 Package Checkout",
    text: "Hello {name}, your customized TriGyna care plan is ready. Complete your payment securely here: https://www.trigyna.in/checkout?assisted=true",
  },
  {
    name: "welcome_consultation_offer",
    label: "👋 Welcome & Diet Intake",
    text: "Namaste {name}! Thank you for reaching out to TriGyna Health & Wellness. We're here to support your holistic healing journey.",
  },
  {
    name: "followup_checkin",
    label: "🩺 Health Check-in",
    text: "Hi {name}, hope you are doing well! Following up regarding your symptoms and next scheduled check-in.",
  },
];

export const SalesWhatsAppTab: React.FC<SalesWhatsAppTabProps> = ({ onOpenLead }) => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTabRight, setActiveTabRight] = useState<"chat" | "notes">("chat");
  const [noteText, setNoteText] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newInitialMsg, setNewInitialMsg] = useState("");

  // AI Assistant States
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // Template Modal States
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ conversations: WhatsAppConversation[] }>("/integrations/whatsapp/conversations");
      if (res.success && res.data?.conversations) {
        setConversations(res.data.conversations);
        if (!selectedConvId && res.data.conversations.length > 0) {
          setSelectedConvId(res.data.conversations[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load WhatsApp conversations", err);
    } finally {
      setLoading(false);
    }
  }, [selectedConvId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get<{ templates: MessageTemplate[] }>("/integrations/whatsapp/templates");
      if (res.success && res.data?.templates) {
        setTemplates(res.data.templates);
      }
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchTemplates();
  }, [fetchConversations, fetchTemplates]);

  const activeConversation = conversations.find((c) => c._id === selectedConvId) || conversations[0];

  const handleSendMessage = async (textToSend?: string, templateName?: string, variables?: string[]) => {
    const content = textToSend || messageText;
    if (!content.trim() && !templateName) return;
    if (!activeConversation) return;

    setSending(true);
    try {
      const res = await api.post<{ message: WhatsAppMessage; conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${activeConversation._id}/messages`,
        {
          text: content,
          templateName,
          variables,
          customerPhone: activeConversation.customerPhone,
        }
      );

      if (res.success && res.data?.message) {
        setMessageText("");
        setAiSuggestion(null);
        const newMsg = res.data.message;

        setConversations((prev) =>
          prev.map((c) => {
            if (c._id === activeConversation._id) {
              return {
                ...c,
                messages: [...c.messages, newMsg],
                lastMessage: {
                  text: newMsg.text,
                  sender: "staff",
                  timestamp: newMsg.timestamp,
                },
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error("Error sending message", err);
    } finally {
      setSending(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !activeConversation) return;
    try {
      const res = await api.post<{ conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${activeConversation._id}/notes`,
        { note: noteText.trim() }
      );

      if (res.success && res.data?.conversation) {
        setNoteText("");
        setConversations((prev) =>
          prev.map((c) => (c._id === activeConversation._id ? res.data!.conversation : c))
        );
      }
    } catch (err) {
      console.error("Error adding internal note", err);
    }
  };

  const handleResolveEscalation = async () => {
    if (!activeConversation) return;
    try {
      const res = await api.patch<{ conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${activeConversation._id}/status`,
        { isEscalated: false, status: "active" }
      );

      if (res.success && res.data?.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c._id === activeConversation._id ? res.data!.conversation : c))
        );
      }
    } catch (err) {
      console.error("Error resolving escalation", err);
    }
  };

  const handleRequestAiSuggestion = async () => {
    if (!activeConversation) return;
    setIsGeneratingAi(true);
    try {
      const res = await api.post<{
        suggestion: {
          suggestedReply: string;
          suggestedTemplate?: string;
          intent: string;
          serviceInterest: string;
        };
      }>("/ai/whatsapp/suggest-reply", { conversationId: activeConversation._id });

      if (res.success && res.data?.suggestion) {
        setAiSuggestion(res.data.suggestion.suggestedReply);
        setMessageText(res.data.suggestion.suggestedReply);
      }
    } catch (err) {
      console.error("AI reply generation error", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSendMetaTemplate = async () => {
    if (!selectedTemplate || !activeConversation) return;
    const varValues = selectedTemplate.variables.map((v) => templateVars[v] || `[${v}]`);
    await handleSendMessage(undefined, selectedTemplate.id, varValues);
    setIsTemplateModalOpen(false);
    setSelectedTemplate(null);
    setTemplateVars({});
  };

  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || !newInitialMsg.trim()) return;

    try {
      const res = await api.post<{ conversation: WhatsAppConversation }>("/integrations/whatsapp/messages", {
        customerPhone: newPhone.trim(),
        customerName: newName.trim() || "Prospective Patient",
        text: newInitialMsg.trim(),
      });

      if (res.success) {
        setIsNewModalOpen(false);
        setNewPhone("");
        setNewName("");
        setNewInitialMsg("");
        fetchConversations();
      }
    } catch (err) {
      console.error("Error creating new WhatsApp thread", err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.customerPhone?.includes(search) ||
      (c.lastMessage?.text || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatTime = (ts?: string) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0C2925] to-[#164e45] rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">WhatsApp Business CRM Desk</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Meta Cloud API
              </span>
            </div>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Direct patient communication, AI-assisted triage, approved WhatsApp templates, and CRM pipeline synchronization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Message
          </button>
          <button
            onClick={fetchConversations}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition cursor-pointer"
            title="Refresh Conversations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Split Chat Layout */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Thread List */}
        <div className="lg:col-span-5 border-r border-gray-200 flex flex-col bg-gray-50/50">
          <div className="p-4 border-b border-gray-200 space-y-3 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient, phone, message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {["all", "active", "waiting", "closed"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-medium capitalize whitespace-nowrap transition cursor-pointer ${
                    statusFilter === st ? "bg-[#0C2925] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
                <span>Loading conversation threads...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">No WhatsApp conversations found.</div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?._id === conv._id;
                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConvId(conv._id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition cursor-pointer ${
                      isSelected ? "bg-emerald-50/70 border-l-4 border-[#0C2925]" : "hover:bg-gray-100/60"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shrink-0">
                      {conv.customerName ? conv.customerName.charAt(0).toUpperCase() : "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs text-gray-900 truncate">
                          {conv.customerName}
                        </span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {formatTime(conv.lastMessage?.timestamp || conv.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">+91 {conv.customerPhone}</p>
                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {conv.lastMessage?.text || "No message history"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        {conv.isEscalated && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Escalated
                          </span>
                        )}
                        {conv.leadId?.serviceInterest && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 truncate max-w-[130px]">
                            {conv.leadId.serviceInterest}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize bg-gray-100 text-gray-600">
                          {conv.status}
                        </span>
                      </div>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Box & Details */}
        <div className="lg:col-span-7 flex flex-col bg-white">
          {activeConversation ? (
            <>
              {/* Active Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                    {activeConversation.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-gray-900">{activeConversation.customerName}</h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">+91 {activeConversation.customerPhone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConversation.leadId && onOpenLead && (
                    <button
                      onClick={() => onOpenLead(activeConversation.leadId)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-gray-500" /> View Lead
                    </button>
                  )}
                  <div className="flex border border-gray-200 rounded-lg p-0.5 text-xs bg-gray-50">
                    <button
                      onClick={() => setActiveTabRight("chat")}
                      className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                        activeTabRight === "chat" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setActiveTabRight("notes")}
                      className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                        activeTabRight === "notes" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
                      }`}
                    >
                      Notes ({activeConversation.internalNotes?.length || 0})
                    </button>
                  </div>
                </div>
              </div>

              {/* Escalation Alert Banner */}
              {activeConversation.isEscalated && (
                <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between text-xs text-rose-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      <strong>Human Handoff Triggered:</strong> {activeConversation.escalationReason || "Customer requested assistance"}
                    </span>
                  </div>
                  <button
                    onClick={handleResolveEscalation}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-xs"
                  >
                    Take Over &amp; Resolve
                  </button>
                </div>
              )}

              {/* Chat View Tab */}
              {activeTabRight === "chat" ? (
                <>
                  {/* Messages Scroll Area */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8faf9] min-h-[350px] max-h-[460px]">
                    <div className="text-center my-2">
                      <span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-500 shadow-xs">
                        🔒 Meta WhatsApp Business Cloud API • Real-Time Synchronization
                      </span>
                    </div>

                    {activeConversation.messages && activeConversation.messages.length > 0 ? (
                      activeConversation.messages.map((msg, idx) => {
                        const isStaff = msg.sender === "staff";
                        return (
                          <div
                            key={msg._id || msg.messageId || idx}
                            className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                                isStaff
                                  ? "bg-[#0C2925] text-white rounded-br-xs"
                                  : "bg-white text-gray-800 border border-gray-200 rounded-bl-xs"
                              }`}
                            >
                              {msg.templateName && (
                                <div className="text-[10px] font-semibold text-emerald-300 mb-1">
                                  Template: {msg.templateName}
                                </div>
                              )}
                              <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                  isStaff ? "text-emerald-200/70" : "text-gray-400"
                                }`}
                              >
                                <span>{formatTime(msg.timestamp)}</span>
                                {isStaff && (
                                  <span className="flex items-center gap-0.5">
                                    <CheckCheck
                                      className={`w-3.5 h-3.5 ${
                                        msg.status === "read"
                                          ? "text-blue-400"
                                          : msg.status === "delivered"
                                          ? "text-emerald-300"
                                          : "text-gray-300"
                                      }`}
                                    />
                                    <span className="capitalize text-[9px]">{msg.status || "sent"}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-xs text-gray-400">
                        No messages yet in this conversation thread.
                      </div>
                    )}
                  </div>

                  {/* AI Suggestion & Quick Templates Bar */}
                  <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                      <button
                        onClick={handleRequestAiSuggestion}
                        disabled={isGeneratingAi}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold hover:bg-emerald-200 transition cursor-pointer"
                      >
                        {isGeneratingAi ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                        <span>AI Suggest Reply</span>
                      </button>

                      <button
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="px-2.5 py-1 bg-white border border-gray-200 hover:border-emerald-500 rounded-lg text-[11px] font-medium text-gray-700 transition cursor-pointer"
                      >
                        Official Templates
                      </button>

                      {CANNED_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.name}
                          onClick={() => {
                            const personalized = tmpl.text.replace("{name}", activeConversation.customerName);
                            setMessageText(personalized);
                          }}
                          className="px-2.5 py-1 bg-white border border-gray-200 hover:border-emerald-500 rounded-lg text-[11px] font-medium text-gray-700 transition cursor-pointer"
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input Box */}
                  <div className="p-3 border-t border-gray-200 bg-white flex items-end gap-2">
                    <textarea
                      rows={2}
                      placeholder="Type a message or click 'AI Suggest Reply'..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={sending || !messageText.trim()}
                      className="p-3 bg-[#0C2925] hover:bg-[#164e45] text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              ) : (
                /* Internal Notes View */
                <div className="flex-1 flex flex-col p-4 bg-gray-50">
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {activeConversation.internalNotes && activeConversation.internalNotes.length > 0 ? (
                      activeConversation.internalNotes.map((n, idx) => (
                        <div key={n._id || idx} className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs">
                          <div className="flex items-center justify-between font-semibold text-amber-900 mb-1">
                            <span>{n.author}</span>
                            <span className="text-[10px] text-amber-700">{formatTime(n.createdAt)}</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{n.note}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-xs text-gray-400">
                        No internal notes recorded yet for this patient.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add an internal staff note (patient cannot see this)..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddNote();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!noteText.trim()}
                      className="px-4 py-2 bg-[#0C2925] text-white text-xs font-bold rounded-xl hover:bg-[#164e45] transition disabled:opacity-50 cursor-pointer"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-600">Select a conversation thread</p>
              <p className="text-xs text-gray-400">Choose from the list on the left to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Official Meta Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-bold text-sm text-gray-900">Approved Meta WhatsApp Templates</h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Template</label>
              <select
                value={selectedTemplate?.id || ""}
                onChange={(e) => {
                  const t = templates.find((tpl) => tpl.id === e.target.value) || null;
                  setSelectedTemplate(t);
                  setTemplateVars({});
                }}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Choose official template --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.category})
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <div className="space-y-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs">
                {selectedTemplate.header && <p className="font-bold text-emerald-800">{selectedTemplate.header}</p>}
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTemplate.body}</p>
                {selectedTemplate.variables.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-900 block text-[11px]">Fill Parameters:</span>
                    {selectedTemplate.variables.map((v) => (
                      <div key={v} className="flex items-center gap-2">
                        <span className="w-28 text-[11px] text-gray-500 shrink-0">{v}:</span>
                        <input
                          type="text"
                          placeholder={`Value for ${v}...`}
                          value={templateVars[v] || ""}
                          onChange={(e) => setTemplateVars({ ...templateVars, [v]: e.target.value })}
                          className="flex-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg bg-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-xs font-semibold rounded-xl text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMetaTemplate}
                disabled={!selectedTemplate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer"
              >
                Send Approved Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-gray-900">Start New WhatsApp Conversation</h3>
            <p className="text-xs text-gray-500">
              Initiate a verified WhatsApp Business thread with a prospective lead or patient.
            </p>

            <form onSubmit={handleStartNewChat} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Shalini Roy"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  WhatsApp Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Initial Message or Offer <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Type initial outreach message..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-xs font-semibold rounded-xl text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Send &amp; Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
