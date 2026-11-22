"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Clock,
  RotateCcw,
  Send,
  ShieldCheck,
  Server,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sliders,
  FileText,
  Webhook,
  SendHorizonal,
  Check,
  X,
  FileCheck,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface EmailLogItem {
  _id: string;
  recipient: string;
  recipientId?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  notificationType: string;
  templateName: string;
  subject: string;
  provider: string;
  providerEmailId?: string;
  status: "queued" | "sending" | "sent" | "delivered" | "delivery_delayed" | "bounced" | "complained" | "failed";
  failureReason?: string;
  retryCount: number;
  sentAt?: string;
  deliveredAt?: string;
  bouncedAt?: string;
  complainedAt?: string;
  failedAt?: string;
  createdAt: string;
}

interface AnalyticsData {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  complained: number;
  deliveryDelayed: number;
  deliveryRate: number;
  failureRate: number;
  types: Array<{ _id: string; count: number }>;
  providerHealth?: {
    provider: string;
    configuredProvider?: string;
    status: string;
    fromAddress: string;
    fromName: string;
    queueRunning: boolean;
    details?: {
      resendApi?: { configured: boolean; status: string; domainsCount?: number };
      smtp?: { configured: boolean; host: string; port: number; status: string };
    };
  };
}

interface AutomationRule {
  eventType: string;
  category: "auth" | "appointments" | "reminders" | "followups" | "billing" | "clinical" | "admin";
  name: string;
  description: string;
  templateName: string;
  isEnabled: boolean;
  priority: "high" | "normal" | "low";
  cooldownMinutes?: number;
  updatedAt?: string;
}

interface TemplateItem {
  name: string;
  description: string;
  category: string;
}

interface WebhookEventItem {
  _id: string;
  eventId: string;
  eventType: string;
  provider: string;
  emailId?: string;
  recipient?: string;
  status: string;
  processed: boolean;
  signatureVerified: boolean;
  createdAt: string;
}

export function EmailTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  // Navigation Subtabs
  const [activeSubTab, setActiveSubTab] = useState<"logs" | "automations" | "webhooks">("logs");

  // State
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventItem[]>([]);

  // Loaders
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [togglingEvent, setTogglingEvent] = useState<string | null>(null);

  // Filters & Pagination for Logs
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const limit = 20;

  // Modals
  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState({
    to: "",
    templateName: "appointment_confirmed",
    customSubject: "",
    patientName: "Jane Doe",
    doctorName: "Dr. TriGyna Specialist",
    date: new Date().toLocaleDateString("en-IN"),
    time: "10:30 AM",
  });
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ emailId?: string; message?: string } | null>(null);

  // Resend Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceId: "",
    recipientEmail: "",
  });
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get<AnalyticsData>("/admin/email/analytics");
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("notificationType", typeFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await api.get<{ logs: EmailLogItem[]; total: number }>(`/admin/email/logs?${params.toString()}`);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setTotalLogs(res.data.total || 0);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load email logs", true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, typeFilter, searchQuery, page, showNotification]);

  // Fetch Automations
  const fetchAutomations = useCallback(async () => {
    try {
      const res = await api.get<AutomationRule[]>("/admin/email/automations");
      if (res.success && Array.isArray(res.data)) {
        setAutomations(res.data);
      }
    } catch {
      // Handled silently
    }
  }, []);

  // Fetch Templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get<TemplateItem[]>("/admin/email/templates");
      if (res.success && Array.isArray(res.data)) {
        setTemplates(res.data);
      }
    } catch {
      // Handled silently
    }
  }, []);

  // Fetch Webhook Events
  const fetchWebhookEvents = useCallback(async () => {
    try {
      const res = await api.get<WebhookEventItem[]>("/admin/email/webhook-events");
      if (res.success && Array.isArray(res.data)) {
        setWebhookEvents(res.data);
      }
    } catch {
      // Handled silently
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchAutomations();
    fetchTemplates();
  }, [fetchAnalytics, fetchAutomations, fetchTemplates]);

  useEffect(() => {
    if (activeSubTab === "logs") {
      fetchLogs();
    } else if (activeSubTab === "automations") {
      fetchAutomations();
    } else if (activeSubTab === "webhooks") {
      fetchWebhookEvents();
    }
  }, [activeSubTab, fetchLogs, fetchAutomations, fetchWebhookEvents]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
    if (activeSubTab === "logs") fetchLogs();
    if (activeSubTab === "automations") fetchAutomations();
    if (activeSubTab === "webhooks") fetchWebhookEvents();
  };

  const handleRetry = async (logId: string) => {
    try {
      setRetryingId(logId);
      const res = await api.post<{ success: boolean; status: string }>(`/admin/email/${logId}/retry`, {});
      if (res.success) {
        showNotification("Email queued for immediate retry.");
        fetchLogs();
        fetchAnalytics();
      } else {
        showNotification("Failed to retry email dispatch.", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to retry email", true);
    } finally {
      setRetryingId(null);
    }
  };

  const handleToggleAutomation = async (rule: AutomationRule) => {
    const updatedStatus = !rule.isEnabled;
    try {
      setTogglingEvent(rule.eventType);
      const res = await api.put<AutomationRule>(`/admin/email/automations/${rule.eventType}`, {
        isEnabled: updatedStatus,
      });
      if (res.success) {
        setAutomations((prev) =>
          prev.map((r) => (r.eventType === rule.eventType ? { ...r, isEnabled: updatedStatus } : r))
        );
        showNotification(`${rule.name} is now ${updatedStatus ? "Enabled" : "Disabled"}.`);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to update automation", true);
    } finally {
      setTogglingEvent(null);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.to || !testForm.to.includes("@")) {
      showNotification("Please provide a valid recipient email.", true);
      return;
    }
    try {
      setIsSendingTest(true);
      setTestResult(null);
      const res = await api.post<{ emailId: string; status: string; provider: string }>("/admin/email/test", {
        to: testForm.to.trim(),
        templateName: testForm.templateName,
        customSubject: testForm.customSubject || undefined,
        variables: {
          patientName: testForm.patientName,
          doctorName: testForm.doctorName,
          appointmentDate: testForm.date,
          appointmentTime: testForm.time,
          appointmentType: "In-Person Consultation",
          clinicName: "TriGyna Main Centre",
          consultationLink: "https://trigyna.in/patient-portal",
        },
      });

      if (res.success && res.data) {
        setTestResult({
          emailId: res.data.emailId,
          message: `Email dispatched successfully via Resend. Provider ID: ${res.data.emailId}`,
        });
        showNotification(`Test email delivered to ${testForm.to}`);
        fetchAnalytics();
        fetchLogs();
      } else {
        showNotification("Failed to send test email.", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to send test email", true);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.invoiceId.trim()) {
      showNotification("Please provide a valid Invoice ID or Number.", true);
      return;
    }
    try {
      setIsSendingInvoice(true);
      const res = await api.post<{ invoiceId: string; emailId: string; recipient: string }>(
        `/admin/email/resend-invoice/${invoiceForm.invoiceId.trim()}`,
        {
          recipientEmail: invoiceForm.recipientEmail.trim() || undefined,
        }
      );
      if (res.success && res.data) {
        showNotification(`Invoice PDF email dispatched to ${res.data.recipient}!`);
        setShowInvoiceModal(false);
        setInvoiceForm({ invoiceId: "", recipientEmail: "" });
        fetchAnalytics();
        fetchLogs();
      } else {
        showNotification("Failed to dispatch invoice PDF email.", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to dispatch invoice email", true);
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Send className="w-3 h-3" /> In Transit
          </span>
        );
      case "queued":
      case "sending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Queued
          </span>
        );
      case "bounced":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <AlertTriangle className="w-3 h-3" /> Bounced
          </span>
        );
      case "complained":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            <AlertTriangle className="w-3 h-3" /> Complaint
          </span>
        );
      case "failed":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
    }
  };

  const totalPages = Math.ceil(totalLogs / limit) || 1;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-[#E4EAE5] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EAF2ED] text-[#154734] flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#17211B]">TriGyna Resend Email Infrastructure</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> Verified Domain (trigyna.in)
                </span>
              </div>
              <p className="text-xs text-[#68756D] mt-0.5">
                Automated lifecycle notifications &bull; Scheduled 48h/24h/2h reminders &bull; Invoice PDF delivery &bull; Webhook tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setTestResult(null);
              setShowTestModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#154734] hover:bg-[#0f3426] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            <SendHorizonal className="w-3.5 h-3.5" />
            <span>Send Test Email</span>
          </button>

          <button
            onClick={() => setShowInvoiceModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E9E3] bg-white hover:bg-[#F8FAF9] text-xs font-semibold text-[#17211B] transition shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#154734]" />
            <span>Resend Invoice</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E9E3] bg-white hover:bg-[#F8FAF9] text-xs font-semibold text-[#154734] transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E4EAE5] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#68756D] text-xs font-medium">
            <span>Total Dispatched</span>
            <Activity className="w-4 h-4 text-[#154734]" />
          </div>
          <p className="text-2xl font-bold text-[#17211B] mt-2">
            {analytics?.total?.toLocaleString() ?? "0"}
          </p>
          <p className="text-[11px] text-[#68756D] mt-1">All transactional events</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4EAE5] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#68756D] text-xs font-medium">
            <span>Confirmed Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {analytics?.delivered?.toLocaleString() ?? "0"}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-semibold">
            <span>{analytics?.deliveryRate ?? 100}% delivery rate</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4EAE5] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#68756D] text-xs font-medium">
            <span>In-Transit / Sent</span>
            <Send className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">
            {analytics?.sent?.toLocaleString() ?? "0"}
          </p>
          <p className="text-[11px] text-[#68756D] mt-1">Accepted by Resend API</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4EAE5] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#68756D] text-xs font-medium">
            <span>Failures &amp; Bounces</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">
            {((analytics?.failed || 0) + (analytics?.bounced || 0) + (analytics?.complained || 0)).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-rose-600 font-semibold">
            <span>{analytics?.failureRate ?? 0}% failure rate</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E4EAE5] pb-2">
        <button
          onClick={() => setActiveSubTab("logs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "logs"
              ? "bg-[#154734] text-white shadow-2xs"
              : "text-[#68756D] hover:text-[#17211B] hover:bg-[#F4F7F5]"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Transmission Logs ({totalLogs})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("automations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "automations"
              ? "bg-[#154734] text-white shadow-2xs"
              : "text-[#68756D] hover:text-[#17211B] hover:bg-[#F4F7F5]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Automation Rules &amp; Triggers ({automations.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("webhooks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "webhooks"
              ? "bg-[#154734] text-white shadow-2xs"
              : "text-[#68756D] hover:text-[#17211B] hover:bg-[#F4F7F5]"
          }`}
        >
          <Webhook className="w-3.5 h-3.5" />
          <span>Resend Webhook Events</span>
        </button>
      </div>

      {/* TAB 1: AUTOMATIONS MANAGER */}
      {activeSubTab === "automations" && (
        <div className="bg-white rounded-2xl border border-[#E4EAE5] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E4EAE5] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#17211B]">Email Lifecycle Automation Rules</h3>
              <p className="text-xs text-[#68756D] mt-0.5">
                Toggle production triggers across patient booking, scheduled reminders, billing invoices, and onboarding.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EAF2ED] text-[#154734]">
              {automations.filter((a) => a.isEnabled).length} / {automations.length} Active
            </span>
          </div>

          <div className="divide-y divide-[#E4EAE5]">
            {automations.map((rule) => {
              const isUpdating = togglingEvent === rule.eventType;
              return (
                <div
                  key={rule.eventType}
                  className="p-4 sm:p-5 hover:bg-[#F9FBF9] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#17211B]">{rule.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-gray-100 text-gray-700">
                        {rule.category}
                      </span>
                      <span className="font-mono text-[10px] text-[#8C9892]">({rule.eventType})</span>
                    </div>
                    <p className="text-xs text-[#68756D]">{rule.description}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-[#8C9892]">
                      <span>Template: <strong className="text-[#17211B] font-mono">{rule.templateName}</strong></span>
                      <span>&bull;</span>
                      <span>Priority: <span className="capitalize text-[#17211B] font-medium">{rule.priority}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleToggleAutomation(rule)}
                      disabled={isUpdating}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                        rule.isEnabled ? "bg-[#154734]" : "bg-gray-200"
                      } ${isUpdating ? "opacity-50 cursor-wait" : ""}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          rule.isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-semibold w-16 text-right">
                      {rule.isEnabled ? (
                        <span className="text-emerald-700">Enabled</span>
                      ) : (
                        <span className="text-gray-400">Disabled</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: WEBHOOK EVENTS */}
      {activeSubTab === "webhooks" && (
        <div className="bg-white rounded-2xl border border-[#E4EAE5] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E4EAE5] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#17211B] flex items-center gap-2">
                <span>Resend Webhook Delivery Audit</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Svix Signature Verified
                </span>
              </h3>
              <p className="text-xs text-[#68756D] mt-0.5">
                Endpoint: <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">https://api.trigyna.in/api/v1/webhooks/resend</code>
              </p>
            </div>
            <button
              onClick={fetchWebhookEvents}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E9E3] bg-white hover:bg-[#F8FAF9] text-xs font-semibold text-[#154734] transition shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Events</span>
            </button>
          </div>

          {webhookEvents.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8C9892]">
              No webhook events recorded yet. Webhooks from Resend will stream here in real-time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#17211B]">
                <thead className="bg-[#F8FAF9] border-b border-[#E4EAE5] text-[#68756D] uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Resend Email ID</th>
                    <th className="py-3 px-4">Svix Signature</th>
                    <th className="py-3 px-4">Processed Status</th>
                    <th className="py-3 px-4 text-right">Received At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4EAE5]">
                  {webhookEvents.map((evt) => (
                    <tr key={evt._id} className="hover:bg-[#F9FBF9] transition">
                      <td className="py-3 px-4 font-mono font-medium text-[#154734]">
                        {evt.eventType}
                      </td>
                      <td className="py-3 px-4">{evt.recipient || <span className="text-gray-400">&mdash;</span>}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#68756D]">
                        {evt.emailId || <span className="text-gray-400">&mdash;</span>}
                      </td>
                      <td className="py-3 px-4">
                        {evt.signatureVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Unverified
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Processed
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-[#68756D]">
                        {new Date(evt.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOGS & AUDIT TRAIL */}
      {activeSubTab === "logs" && (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl border border-[#E4EAE5] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8C9892] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search recipient email..."
                className="w-full pl-9 pr-4 py-1.5 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 focus:border-[#154734]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="sent">In Transit (Sent)</option>
                <option value="queued">Queued</option>
                <option value="failed">Failed</option>
                <option value="bounced">Bounced</option>
                <option value="complained">Complained</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 cursor-pointer"
              >
                <option value="">All Notification Types</option>
                <option value="auth">Authentication</option>
                <option value="appointments">Appointments</option>
                <option value="reminders">Reminders (48h/24h/2h)</option>
                <option value="followups">Follow-ups (1d/3d/7d)</option>
                <option value="payments">Payments &amp; Billing</option>
                <option value="patients">Patient Care</option>
                <option value="admin">Admin System</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-[#E4EAE5] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E4EAE5] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#17211B] flex items-center gap-2">
                <span>Email Transmission Logs &amp; Audit Trail</span>
                <span className="text-xs font-normal text-[#68756D]">({totalLogs} total records)</span>
              </h3>
              <span className="text-xs text-[#68756D]">
                Page {page} of {totalPages}
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-[#68756D] flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#154734] animate-spin" />
                <span>Loading email transmission logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#8C9892]">
                No email notifications match the selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#17211B]">
                  <thead className="bg-[#F8FAF9] border-b border-[#E4EAE5] text-[#68756D] uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Subject &amp; Template</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Provider ID</th>
                      <th className="py-3 px-4">Dispatched At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EAE5]">
                    {logs.map((log) => {
                      const isEligibleRetry = log.status === "failed" || log.status === "queued";
                      return (
                        <tr key={log._id} className="hover:bg-[#F9FBF9] transition">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[#17211B]">{log.recipient}</p>
                            {log.recipientId && (
                              <span className="text-[10px] text-[#68756D]">
                                {log.recipientId.name} ({log.recipientId.role})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate">
                            <p className="font-medium text-[#17211B] truncate">{log.subject}</p>
                            <span className="text-[10px] text-[#8C9892] font-mono">{log.templateName}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-[#EBF3EE] text-[#154734] text-[10px] font-semibold uppercase">
                              {log.notificationType}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(log.status)}
                            {log.failureReason && (
                              <p className="text-[10px] text-rose-600 mt-1 max-w-xs truncate" title={log.failureReason}>
                                {log.failureReason}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#68756D]">
                            {log.providerEmailId ? (
                              <span title={log.providerEmailId}>
                                {log.providerEmailId.length > 16
                                  ? `${log.providerEmailId.substring(0, 16)}...`
                                  : log.providerEmailId}
                              </span>
                            ) : (
                              <span className="text-[#A2AEA7]">&mdash;</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#68756D] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isEligibleRetry ? (
                              <button
                                onClick={() => handleRetry(log._id)}
                                disabled={retryingId === log._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E2E9E3] hover:border-[#154734] hover:text-[#154734] text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-50"
                              >
                                <RotateCcw className={`w-3 h-3 ${retryingId === log._id ? "animate-spin" : ""}`} />
                                <span>Retry</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#A2AEA7]">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="p-4 border-t border-[#E4EAE5] bg-[#F8FAF9] flex items-center justify-between">
              <p className="text-xs text-[#68756D]">
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalLogs)} of {totalLogs} emails
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-[#E2E9E3] bg-white hover:bg-gray-50 text-[#17211B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2 text-[#17211B]">{page}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-[#E2E9E3] bg-white hover:bg-gray-50 text-[#17211B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: SEND TEST EMAIL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E4EAE5] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E4EAE5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF2ED] text-[#154734] flex items-center justify-center">
                  <SendHorizonal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17211B]">Send Live Test Email</h3>
                  <p className="text-xs text-[#68756D]">Trigger real Resend delivery with verified templates</p>
                </div>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. doctor@trigyna.in or patient@example.com"
                  value={testForm.to}
                  onChange={(e) => setTestForm({ ...testForm, to: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#154734]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Email Template *
                </label>
                <select
                  value={testForm.templateName}
                  onChange={(e) => setTestForm({ ...testForm, templateName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 cursor-pointer"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.name} value={tpl.name}>
                      {tpl.name} ({tpl.category})
                    </option>
                  ))}
                  {templates.length === 0 && (
                    <>
                      <option value="appointment_confirmed">appointment_confirmed (Appointments)</option>
                      <option value="appointment_scheduled">appointment_scheduled (Appointments)</option>
                      <option value="appointment_completed">appointment_completed (Appointments)</option>
                      <option value="welcome_email">welcome_email (Patient Care)</option>
                      <option value="staff_onboarding_invitation">staff_onboarding_invitation (Staff)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Custom Subject (Optional override)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to use standard template subject"
                  value={testForm.customSubject}
                  onChange={(e) => setTestForm({ ...testForm, customSubject: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#154734]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17211B] mb-1">
                    Sample Patient Name
                  </label>
                  <input
                    type="text"
                    value={testForm.patientName}
                    onChange={(e) => setTestForm({ ...testForm, patientName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17211B] mb-1">
                    Sample Doctor Name
                  </label>
                  <input
                    type="text"
                    value={testForm.doctorName}
                    onChange={(e) => setTestForm({ ...testForm, doctorName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B]"
                  />
                </div>
              </div>

              {testResult && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.emailId && (
                      <p className="text-[11px] font-mono text-emerald-700 mt-0.5">
                        ID: {testResult.emailId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-xs font-semibold text-[#68756D] hover:bg-gray-50 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#154734] hover:bg-[#0f3426] text-white text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingTest ? "animate-spin" : ""}`} />
                  <span>{isSendingTest ? "Transmitting..." : "Send via Resend"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESEND INVOICE */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E4EAE5] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E4EAE5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF2ED] text-[#154734] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17211B]">Resend Tax Invoice PDF</h3>
                  <p className="text-xs text-[#68756D]">Generates PDF buffer &amp; delivers via Resend</p>
                </div>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvoice} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Invoice ID or Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-2026-0001 or MongoDB ObjectId"
                  value={invoiceForm.invoiceId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#154734]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Recipient Email (Optional override)
                </label>
                <input
                  type="email"
                  placeholder="Leave empty to use patient's registered email"
                  value={invoiceForm.recipientEmail}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, recipientEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#154734]/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-xs font-semibold text-[#68756D] hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingInvoice}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#154734] hover:bg-[#0f3426] text-white text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingInvoice ? "animate-spin" : ""}`} />
                  <span>{isSendingInvoice ? "Generating PDF &amp; Sending..." : "Send Invoice PDF"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
