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

export function EmailTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const limit = 20;

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

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
    fetchLogs();
  };

  const handleRetry = async (logId: string) => {
    try {
      setRetryingId(logId);
      const res = await api.post<{ success: boolean; status: string }>(`/email/${logId}/retry`, {});
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
              <h2 className="text-xl font-bold text-[#17211B]">Resend Email Notification Platform</h2>
              <p className="text-xs text-[#68756D]">
                Production transactional email dispatch &bull; Webhook delivery verification &bull; Recipient tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F4F7F5] border border-[#E2E9E3] text-xs">
            <Server className="w-3.5 h-3.5 text-[#154734]" />
            <span className="text-[#68756D]">Provider:</span>
            <span className="font-semibold text-[#17211B] capitalize">
              {analytics?.providerHealth?.configuredProvider || "Resend"}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
          </div>

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

      {/* Analytics KPI Grid */}
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
            <option value="payments">Payments &amp; Billing</option>
            <option value="patients">Patient Care</option>
            <option value="doctors">Doctor Alerts</option>
            <option value="sales">Sales &amp; Leads</option>
            <option value="admin">Admin System</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-[#E4EAE5] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E4EAE5] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#17211B] flex items-center gap-2">
            <span>Email Activity &amp; Audit Trail</span>
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
                          <span className="text-[10px] text-[#68756D]">{log.recipientId.name} ({log.recipientId.role})</span>
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
                            {log.providerEmailId.length > 16 ? `${log.providerEmailId.substring(0, 16)}...` : log.providerEmailId}
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
    </div>
  );
}
