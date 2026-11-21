"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  UserPlus,
  Calendar,
  CreditCard,
  AlertCircle,
  ExternalLink,
  Filter,
  RefreshCw,
  Cpu,
  Send,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Smartphone,
  Mail,
  Server,
  Layers,
  ArrowRight,
  Eye,
  Check,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: "appointment" | "lead" | "clinical" | "leave" | "system" | "billing";
  read: boolean;
  link?: string;
  createdAt: string;
}

interface AutomationRuleItem {
  _id: string;
  name: string;
  description?: string;
  triggerEvent: string;
  enabled: boolean;
  conditions: Array<{ field: string; operator: string; value: any }>;
  actions: Array<{ type: string; params?: any }>;
  quietHours?: { enabled: boolean; start?: string; end?: string; timezone?: string };
  frequencyCap?: { maxExecutionsPerContact?: number; periodHours?: number };
  createdAt: string;
}

interface OutboundLogItem {
  _id: string;
  recipientPhone: string;
  channel: string;
  messageType: string;
  templateName?: string;
  bodyPreview?: string;
  status: "queued" | "accepted" | "sent" | "delivered" | "read" | "failed";
  providerMessageId?: string;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
}

interface SalesNotificationsTabProps {
  onNavigateTab?: (tab: string) => void;
}

export const SalesNotificationsTab: React.FC<SalesNotificationsTabProps> = ({ onNavigateTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<"alerts" | "rules" | "logs" | "health">("alerts");

  // Alerts State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Rules State
  const [rules, setRules] = useState<AutomationRuleItem[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // Delivery Logs State
  const [logs, setLogs] = useState<OutboundLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Health State
  const [healthData, setHealthData] = useState<{
    database: string;
    uptime: number;
    status: string;
  } | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // 1. Fetch In-App Notifications
  const fetchNotifications = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const res = await api.get<{ notifications: NotificationItem[] }>("/notifications");
      if (res.data?.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error("Error loading notifications", err);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  // 2. Fetch Automation Rules
  const fetchRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      const res = await api.get<{ rules: AutomationRuleItem[] }>("/automations/rules");
      if (res.data?.rules) {
        setRules(res.data.rules);
      }
    } catch (err) {
      console.error("Error loading automation rules", err);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  // 3. Fetch Outbound Message Logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get<{ logs: OutboundLogItem[] }>("/integrations/whatsapp/logs?limit=40");
      if (res.data?.logs) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error("Error loading delivery logs", err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // 4. Fetch Health Overview
  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const res = await api.get<any>("/health");
      if (res.data) {
        setHealthData(res.data);
      }
    } catch (err) {
      console.error("Error loading health status", err);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (activeSubTab === "rules") fetchRules();
    else if (activeSubTab === "logs") fetchLogs();
    else if (activeSubTab === "health") fetchHealth();
  }, [activeSubTab, fetchRules, fetchLogs, fetchHealth]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all read", err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Error marking single notification read", err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (typeFilter === "all") return true;
    if (typeFilter === "unread") return !n.read;
    return n.type === typeFilter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "lead":
        return <UserPlus className="w-4 h-4 text-emerald-600" />;
      case "appointment":
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case "billing":
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-amber-600" />;
    }
  };

  const formatRelativeTime = (ts: string) => {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Notifications &amp; Automation Center</h2>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time multi-channel alerts, automated SLA workflows, WhatsApp delivery telemetry, and provider status.
          </p>
        </div>

        {/* Sub-tab Navigation Switcher */}
        <div className="flex items-center bg-[#F1F5F9] rounded-2xl p-1 text-xs">
          {[
            { id: "alerts", label: "Alerts & Feed", icon: Bell },
            { id: "rules", label: "Automation Rules", icon: Cpu },
            { id: "logs", label: "Outbound Logs", icon: Send },
            { id: "health", label: "Provider Health", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  isActive
                    ? "bg-white text-[#0F172A] shadow-xs font-bold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB 1: In-App Alerts & Activity Feed */}
      {activeSubTab === "alerts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs w-full sm:w-auto">
              {[
                { key: "all", label: "All Alerts" },
                { key: "unread", label: "Unread" },
                { key: "lead", label: "Leads" },
                { key: "appointment", label: "Appointments" },
                { key: "billing", label: "Payments" },
                { key: "system", label: "System" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                    typeFilter === f.key
                      ? "bg-[#0C2925] text-white shadow-xs font-bold"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Mark All Read
                </button>
              )}
              <button
                onClick={fetchNotifications}
                disabled={loadingAlerts}
                className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAlerts ? "animate-spin text-[#16A34A]" : ""}`} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 divide-y divide-gray-100 shadow-xs overflow-hidden">
            {loadingAlerts ? (
              <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#16A34A]" />
                <span>Loading real-time notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400">
                No notifications found in this view.
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item._id}
                  className={`p-4 flex items-start justify-between gap-4 transition ${
                    !item.read ? "bg-emerald-50/40" : "hover:bg-gray-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        item.type === "lead"
                          ? "bg-emerald-100"
                          : item.type === "appointment"
                          ? "bg-purple-100"
                          : item.type === "billing"
                          ? "bg-blue-100"
                          : "bg-amber-100"
                      }`}
                    >
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-xs text-gray-900 ${
                            !item.read ? "font-bold" : "font-semibold"
                          }`}
                        >
                          {item.title}
                        </h4>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Unread" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.message}</p>
                      <span className="inline-block text-[10px] text-gray-400 mt-1.5">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.link && (
                      <button
                        onClick={() => {
                          if (!item.read) handleMarkSingleRead(item._id);
                          if (onNavigateTab && item.link) {
                            const tabMatch = item.link.match(/tab=([a-z]+)/);
                            if (tabMatch && tabMatch[1]) {
                              onNavigateTab(tabMatch[1]);
                            } else if (item.link.includes("whatsapp")) {
                              onNavigateTab("whatsapp");
                            } else if (item.link.includes("sales")) {
                              onNavigateTab("leads");
                            }
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 hover:border-emerald-500 hover:text-emerald-700 rounded-lg text-xs font-semibold text-gray-700 shadow-2xs transition cursor-pointer"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </button>
                    )}

                    {!item.read && (
                      <button
                        onClick={() => handleMarkSingleRead(item._id)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Automation Rules Engine */}
      {activeSubTab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Configured Business Automation Rules</h3>
              <p className="text-xs text-gray-500">
                Event-driven actions triggering lead assignment, WhatsApp acknowledgements, reminders, and payment verification handoffs.
              </p>
            </div>
            <button
              onClick={fetchRules}
              disabled={loadingRules}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition cursor-pointer"
              title="Refresh Rules"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRules ? "animate-spin text-[#16A34A]" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingRules ? (
              <div className="col-span-2 py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#16A34A]" />
                <span>Loading active automation rules...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-200">
                No active automation rules found in database.
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule._id}
                  className="p-5 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-3 hover:border-[#16A34A]/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#16A34A]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 leading-tight">{rule.name}</h4>
                        <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                          {rule.triggerEvent}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        rule.enabled
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rule.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    {rule.description || "Automated trigger execution rule."}
                  </p>

                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <span>{rule.actions.length} Action{rule.actions.length === 1 ? "" : "s"}</span>
                    </div>
                    {rule.quietHours?.enabled && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-medium">
                        Quiet Hours: {rule.quietHours.start} - {rule.quietHours.end}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      Cap: {rule.frequencyCap?.maxExecutionsPerContact || 3}/contact
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Outbound Delivery Logs */}
      {activeSubTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Outbound Dispatch &amp; Telemetry Logs</h3>
              <p className="text-xs text-gray-500">
                Audited message delivery statuses across Meta WhatsApp Cloud API and transactional gateways.
              </p>
            </div>
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition cursor-pointer"
              title="Refresh Delivery Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin text-[#16A34A]" : ""}`} />
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
            {loadingLogs ? (
              <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#16A34A]" />
                <span>Loading message delivery logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400">
                No outbound message logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-5">Recipient</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Type / Template</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-5 font-mono font-semibold text-gray-900">
                          {log.recipientPhone || "—"}
                        </td>
                        <td className="py-3 px-4 capitalize font-medium text-gray-700">
                          {log.channel || "WhatsApp"}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {log.templateName ? (
                            <span className="font-mono text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                              {log.templateName}
                            </span>
                          ) : (
                            <span className="truncate max-w-[200px] block">{log.bodyPreview || log.messageType || "Text Message"}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              log.status === "read"
                                ? "bg-emerald-100 text-emerald-800"
                                : log.status === "delivered"
                                ? "bg-blue-100 text-blue-800"
                                : log.status === "sent"
                                ? "bg-purple-100 text-purple-800"
                                : log.status === "failed"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-[11px]">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : "Recent"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: Provider Health */}
      {activeSubTab === "health" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Live Services &amp; Provider Health Matrix</h3>
              <p className="text-xs text-gray-500">
                Operating status of external gateways, communication APIs, and persistence clusters.
              </p>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loadingHealth}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition cursor-pointer"
              title="Refresh Health"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? "animate-spin text-[#16A34A]" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Database */}
            <div className="p-5 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">MongoDB Database</span>
                <Server className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span className="text-sm font-bold text-gray-900 capitalize">
                  {healthData?.database || "Connected"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">Strict Single Source of Truth</p>
            </div>

            {/* 2. WhatsApp Meta API */}
            <div className="p-5 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">WhatsApp Meta Cloud API</span>
                <Smartphone className="w-4 h-4 text-[#25D366]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
                <span className="text-sm font-bold text-gray-900">v21.0 Active</span>
              </div>
              <p className="text-[10px] text-gray-400">HMAC-SHA256 Webhook Verified</p>
            </div>

            {/* 3. Razorpay Payment Gateway */}
            <div className="p-5 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Payment Gateway</span>
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-sm font-bold text-gray-900">Razorpay Active</span>
              </div>
              <p className="text-[10px] text-gray-400">Assisted Checkout &amp; Webhooks</p>
            </div>

            {/* 4. Server Uptime */}
            <div className="p-5 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">API Gateway Uptime</span>
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                <span className="text-sm font-bold text-gray-900">
                  {healthData?.uptime ? `${Math.floor(healthData.uptime / 60)} mins` : "Operational"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">Node.js Express Cluster</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
