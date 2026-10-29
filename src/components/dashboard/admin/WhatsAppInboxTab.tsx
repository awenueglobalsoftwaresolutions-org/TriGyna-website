"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Send,
  CheckCheck,
  RefreshCw,
  Loader2,
  Sparkles,
  ArrowLeft,
  X,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface WhatsAppMessage {
  messageId: string;
  sender: "customer" | "staff";
  senderName?: string;
  text: string;
  status?: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
}

interface WhatsAppConversation {
  _id: string;
  conversationId: string;
  customerPhone: string;
  customerName: string;
  status: "active" | "archived" | "closed";
  unreadCount: number;
  lastMessage?: {
    text: string;
    sender: "customer" | "staff";
    timestamp: string;
  };
  messages: WhatsAppMessage[];
  internalNotes: Array<{
    note: string;
    author: string;
    createdAt: string;
  }>;
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

export function WhatsAppInboxTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [replyText, setReplyText] = useState("");
  const [internalNoteText, setInternalNoteText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ conversations: WhatsAppConversation[] }>("/integrations/whatsapp/conversations");
      if (res.data?.conversations) {
        setConversations(res.data.conversations);
        if (res.data.conversations.length > 0 && !selectedConv) {
          setSelectedConv(res.data.conversations[0]);
        }
      }
    } catch {
      showNotification("Could not load WhatsApp conversations", true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedConv, showNotification]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await api.get<{ templates: MessageTemplate[] }>("/integrations/whatsapp/templates");
      if (res.data?.templates) {
        setTemplates(res.data.templates);
      }
    } catch {
      // Non-blocking fallback
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadTemplates();
  }, [loadConversations, loadTemplates]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || replyText;
    if (!text.trim() || !selectedConv) return;
    setIsSending(true);
    try {
      const res = await api.post<{ conversation: WhatsAppConversation }>("/integrations/whatsapp/send", {
        customerPhone: selectedConv.customerPhone,
        customerName: selectedConv.customerName,
        text: text.trim(),
      });
      if (res.success && res.data?.conversation) {
        setSelectedConv(res.data.conversation);
        setConversations((prev) =>
          prev.map((c) => (c._id === res.data!.conversation._id ? res.data!.conversation : c))
        );
        setReplyText("");
        showNotification("WhatsApp message dispatched via Cloud API");
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to send message", true);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !selectedConv) return;
    let filledBody = selectedTemplate.body;
    selectedTemplate.variables.forEach((v, idx) => {
      const val = templateVars[v] || `[${v}]`;
      filledBody = filledBody.replace(`{{${idx + 1}}}`, val);
    });

    const fullMessage = `${selectedTemplate.header ? `${selectedTemplate.header}\n\n` : ""}${filledBody}${
      selectedTemplate.footer ? `\n\n_${selectedTemplate.footer}_` : ""
    }`;

    await handleSendMessage(fullMessage);
    setIsTemplateModalOpen(false);
    setSelectedTemplate(null);
    setTemplateVars({});
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim() || !selectedConv) return;
    try {
      const res = await api.post<{ conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${selectedConv._id}/notes`,
        { note: internalNoteText.trim() }
      );
      if (res.success && res.data?.conversation) {
        setSelectedConv(res.data.conversation);
        setInternalNoteText("");
        showNotification("Internal clinical note added to thread");
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to append note", true);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerPhone.includes(searchTerm)
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E2E9E3] shadow-sm overflow-hidden flex flex-col md:flex-row h-[740px] animate-fade-in">
      {/* Left Sidebar: Threads List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-[#E2E9E3] flex flex-col h-full bg-[#F7F9F7] ${
          mobileThreadOpen ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-[#E2E9E3] space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-[#18231D]">WhatsApp Business</h3>
                <p className="text-[11px] text-[#68756D]">Patient &amp; Lead Inquiries</p>
              </div>
            </div>
            <button
              onClick={loadConversations}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-gray-500 hover:text-[#154734] hover:bg-gray-100 transition cursor-pointer"
              title="Refresh inbox"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by phone or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none bg-white text-[#18231D]"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E2E9E3]/70">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[#68756D] flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#154734]" />
              <span>Loading messaging threads...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#68756D]">
              No active WhatsApp conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConv?._id === conv._id;
              return (
                <button
                  key={conv._id}
                  onClick={() => {
                    setSelectedConv(conv);
                    setMobileThreadOpen(true);
                  }}
                  className={`w-full text-left p-3.5 transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected ? "bg-[#154734]/10 border-l-4 border-l-[#154734]" : "hover:bg-white"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#154734] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {conv.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-[#18231D] truncate">{conv.customerName}</h4>
                      {conv.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#68756D] font-mono">+91 {conv.customerPhone}</p>
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

      {/* Right Area: Selected Conversation Thread */}
      {selectedConv ? (
        <div
          className={`flex-1 flex flex-col h-full bg-[#F7F9F7] ${
            mobileThreadOpen ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-[#E2E9E3] bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileThreadOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
                title="Back to inbox"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-[#154734] text-white flex items-center justify-center font-bold text-sm">
                {selectedConv.customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#18231D]">{selectedConv.customerName}</h4>
                <p className="text-xs text-[#68756D] font-mono flex items-center gap-2">
                  <span>+91 {selectedConv.customerPhone}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Verified Contact
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Use Approved Template</span>
              <span className="sm:hidden">Template</span>
            </button>
          </div>

          {/* Messages Timeline */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedConv.messages.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#68756D]">
                No messages recorded in this conversation yet.
              </div>
            ) : (
              selectedConv.messages.map((m, idx) => {
                const isStaff = m.sender === "staff";
                return (
                  <div
                    key={m.messageId || idx}
                    className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl p-3 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                        isStaff
                          ? "bg-[#154734] text-white rounded-br-xs"
                          : "bg-white text-[#18231D] border border-[#E2E9E3] rounded-bl-xs"
                      }`}
                    >
                      <p>{m.text}</p>
                      <div
                        className={`flex items-center justify-end gap-1 text-[9px] mt-1.5 ${
                          isStaff ? "text-emerald-200" : "text-[#68756D]"
                        }`}
                      >
                        <span>
                          {m.timestamp
                            ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </span>
                        {isStaff && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Internal Notes Section */}
            {selectedConv.internalNotes && selectedConv.internalNotes.length > 0 && (
              <div className="my-4 pt-3 border-t border-dashed border-[#E2E9E3]">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Lock className="w-3 h-3" />
                  <span>Internal Staff Notes (Invisible to Patient)</span>
                </span>
                <div className="space-y-1.5 mt-2">
                  {selectedConv.internalNotes.map((n, i) => (
                    <div key={i} className="bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl text-xs text-amber-950">
                      <p>{n.note}</p>
                      <p className="text-[10px] text-amber-700 mt-1">
                        By {n.author} • {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reply Composer & Internal Note Input */}
          <div className="p-3 bg-white border-t border-[#E2E9E3] space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type WhatsApp reply to patient..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 px-3.5 py-2 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none bg-white text-[#18231D]"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isSending || !replyText.trim()}
                className="px-4 py-2 bg-[#154734] text-white rounded-xl text-xs font-semibold hover:bg-[#0E3828] transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send</span>
              </button>
            </div>

            <form onSubmit={handleAddInternalNote} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add confidential internal note for clinicians / CRM staff..."
                value={internalNoteText}
                onChange={(e) => setInternalNoteText(e.target.value)}
                className="flex-1 px-3 py-1.5 text-[11px] bg-amber-50/30 border border-amber-200 rounded-lg focus:outline-none text-[#18231D]"
              />
              <button
                type="submit"
                className="px-3 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition cursor-pointer"
              >
                + Note
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#68756D]">
          <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
          <h4 className="font-semibold text-sm text-[#18231D]">Select a conversation thread</h4>
          <p className="text-xs text-[#68756D] max-w-sm mt-1">
            Choose a patient or lead from the left list to review their messaging history and dispatch approved templates.
          </p>
        </div>
      )}

      {/* Template Selection Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2E9E3] p-6 max-w-lg w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E2E9E3] pb-3">
              <h3 className="font-serif font-bold text-base text-[#18231D]">
                Approved WhatsApp Templates
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18231D] mb-1.5">Select Template</label>
              <select
                onChange={(e) => {
                  const t = templates.find((tpl) => tpl.id === e.target.value) || null;
                  setSelectedTemplate(t);
                  setTemplateVars({});
                }}
                value={selectedTemplate?.id || ""}
                className="w-full text-xs border border-[#E2E9E3] rounded-xl px-3 py-2 bg-white text-[#18231D] focus:ring-1 focus:ring-[#154734] focus:outline-none"
              >
                <option value="">-- Choose pre-approved template --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.category})
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <div className="space-y-3 bg-[#F7F9F7] p-4 rounded-xl border border-[#E2E9E3] text-xs">
                {selectedTemplate.header && (
                  <p className="font-bold text-[#154734]">{selectedTemplate.header}</p>
                )}
                <p className="text-[#18231D] leading-relaxed whitespace-pre-wrap">{selectedTemplate.body}</p>
                {selectedTemplate.footer && (
                  <p className="text-[10px] text-[#68756D] italic">{selectedTemplate.footer}</p>
                )}

                {selectedTemplate.variables.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E2E9E3]">
                    <span className="font-bold text-[#18231D] block text-[11px]">Template Variables:</span>
                    {selectedTemplate.variables.map((v) => (
                      <div key={v} className="flex items-center gap-2">
                        <span className="w-28 text-[11px] text-[#68756D] shrink-0">{v}:</span>
                        <input
                          type="text"
                          placeholder={`Enter ${v}...`}
                          value={templateVars[v] || ""}
                          onChange={(e) => setTemplateVars({ ...templateVars, [v]: e.target.value })}
                          className="flex-1 px-2.5 py-1 text-xs border border-[#E2E9E3] rounded-lg bg-white focus:outline-none text-[#18231D]"
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
                className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-xs text-[#68756D] hover:bg-gray-50 cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTemplate}
                disabled={!selectedTemplate}
                className="px-4 py-2 bg-[#154734] text-white rounded-xl text-xs font-semibold hover:bg-[#0E3828] cursor-pointer disabled:opacity-50 shadow-xs transition-colors"
              >
                Send Template Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
