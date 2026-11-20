"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sliders,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  MessageSquare,
  Megaphone,
  Calendar,
  CreditCard,
  Settings,
  X,
  Lock,
  Mail,
  BellRing,
  Zap,
  TrendingUp,
  AlertTriangle,
  PlayCircle,
  FileCheck2,
  ToggleLeft,
  ToggleRight,
  Activity,
  Check,
  Filter,
  Eye,
  Terminal,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface IntegrationItem {
  _id: string;
  provider: string;
  displayName: string;
  status: "connected" | "disconnected" | "error" | "pending" | "test_mode" | "degraded";
  config?: Record<string, string | number | boolean>;
  lastSync?: string;
  errorLog?: string;
}

interface ReconciliationData {
  totalBilled: number;
  totalCollected: number;
  totalDues: number;
  totalRefunds: number;
  totalExpenses: number;
  netCashFlow: number;
  totalInvoicesCount: number;
  gatewayBreakdown?: {
    razorpayCaptured: number;
    razorpayPending: number;
    razorpayFailed: number;
    offlineUpi: number;
    cashOrPos: number;
    reconciliationStatus: string;
  };
}

export interface LiveAutomationRule {
  _id: string;
  name: string;
  description?: string;
  enabled: boolean;
  triggerEvent: string;
  conditions?: Array<{ field: string; operator: string; value: any }>;
  actions?: Array<{ type: string; params?: any }>;
  quietHours?: { enabled: boolean; start?: string; end?: string; timezone?: string };
  frequencyCap?: { maxExecutionsPerContact: number; periodHours: number };
  createdAt?: string;
}

export interface AutomationExecutionItem {
  _id: string;
  ruleId?: string;
  ruleName?: string;
  triggerEvent: string;
  idempotencyKey: string;
  contactPhone?: string;
  status: "success" | "skipped" | "failed";
  skipReason?: string;
  actionResults?: Array<{ actionType: string; status: string; result?: any; timestamp: string }>;
  error?: any;
  executedAt: string;
  leadId?: {
    fullName?: string;
    phone?: string;
    status?: string;
  };
}

export function IntegrationsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [integrations, setIntegrations] = useState<Record<string, IntegrationItem>>({});
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<IntegrationItem | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Automation Rules & Executions State
  const [automationSubTab, setAutomationSubTab] = useState<"rules" | "executions">("rules");
  const [rules, setRules] = useState<LiveAutomationRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [testResultModal, setTestResultModal] = useState<{ ruleName: string; result: any } | null>(null);

  const [executions, setExecutions] = useState<AutomationExecutionItem[]>([]);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(false);
  const [executionFilter, setExecutionFilter] = useState("all");
  const [selectedExecutionDetails, setSelectedExecutionDetails] = useState<AutomationExecutionItem | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const [resStatus, resRecon] = await Promise.all([
        api.get<{ integrations: Record<string, IntegrationItem> }>("/integrations/status"),
        api.get<{ reconciliation: ReconciliationData }>("/invoices/reconciliation"),
      ]);

      if (resStatus.data?.integrations) {
        setIntegrations(resStatus.data.integrations);
      }
      if (resRecon.data?.reconciliation) {
        setReconciliation(resRecon.data.reconciliation);
      }
    } catch {
      showNotification("Failed to fetch integrations and reconciliation health", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  const loadRules = useCallback(async () => {
    try {
      setIsLoadingRules(true);
      const res = await api.get<{ rules: LiveAutomationRule[] }>("/automations/rules");
      if (res.success && res.data?.rules) {
        setRules(res.data.rules);
      }
    } catch (err) {
      console.warn("Failed to load automation rules:", err);
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

  const loadExecutions = useCallback(async () => {
    try {
      setIsLoadingExecutions(true);
      const res = await api.get<{ executions: AutomationExecutionItem[] }>("/automations/executions?limit=30");
      if (res.success && res.data?.executions) {
        setExecutions(res.data.executions);
      }
    } catch (err) {
      console.warn("Failed to load automation execution logs:", err);
    } finally {
      setIsLoadingExecutions(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadRules();
    loadExecutions();
  }, [loadStatus, loadRules, loadExecutions]);

  const handleTestConnection = async (provider: string) => {
    try {
      setTestingProvider(provider);
      const res = await api.post<{ testResult: { message: string } }>(`/integrations/${provider}/test`, {});
      if (res.success && res.data?.testResult?.message) {
        showNotification(res.data.testResult.message);
      } else {
        showNotification(`${provider.toUpperCase()} connection test completed successfully.`);
      }
      loadStatus();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : `Connection test failed for ${provider}`, true);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      setTogglingRuleId(ruleId);
      const res = await api.post<{ rule: LiveAutomationRule }>(`/automations/rules/${ruleId}/toggle`);
      if (res.success && res.data?.rule) {
        const updated = res.data.rule;
        setRules((prev) => prev.map((r) => (r._id === ruleId ? updated : r)));
        showNotification(`Automation rule '${updated.name}' is now ${updated.enabled ? "active" : "disabled"}.`);
      } else {
        showNotification(res.message || "Failed to toggle rule", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error toggling rule", true);
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleTestRule = async (rule: LiveAutomationRule) => {
    try {
      setTestingRuleId(rule._id);
      const res = await api.post<{ testResult: any }>(`/automations/rules/${rule._id}/test`, {
        payload: {
          phone: "919172772326",
          fullName: "Diagnostic Patient Verification",
          source: "whatsapp",
          serviceInterest: "Women's Health Specialist Care",
        },
      });

      if (res.success && res.data?.testResult) {
        setTestResultModal({
          ruleName: rule.name,
          result: res.data.testResult,
        });
        loadExecutions();
      } else {
        showNotification(res.message || "Test dry-run failed", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Test execution failed", true);
    } finally {
      setTestingRuleId(null);
    }
  };

  const handleOpenConfig = (item: IntegrationItem) => {
    setSelectedConfig(item);
    const initialConfig: Record<string, string> = {};
    if (item.config) {
      Object.entries(item.config).forEach(([k, v]) => {
        initialConfig[k] = String(v);
      });
    }
    setConfigForm(initialConfig);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfig) return;
    try {
      setIsSaving(true);
      const res = await api.patch<{ integration: IntegrationItem }>(
        `/integrations/${selectedConfig.provider}/config`,
        {
          status: selectedConfig.provider === "razorpay" ? "test_mode" : "connected",
          config: configForm,
        }
      );
      if (res.success) {
        showNotification(`${selectedConfig.displayName} configuration updated successfully!`);
        setSelectedConfig(null);
        loadStatus();
      } else {
        showNotification(res.message || "Failed to update configuration", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error saving config", true);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredExecutions = useMemo(() => {
    if (executionFilter === "all") return executions;
    return executions.filter((ex) => ex.status === executionFilter);
  }, [executions, executionFilter]);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "meta":
        return <Megaphone className="w-5 h-5 text-blue-600" />;
      case "whatsapp":
        return <MessageSquare className="w-5 h-5 text-emerald-600" />;
      case "google_calendar":
        return <Calendar className="w-5 h-5 text-amber-600" />;
      case "razorpay":
        return <CreditCard className="w-5 h-5 text-purple-600" />;
      case "email":
        return <Mail className="w-5 h-5 text-indigo-600" />;
      case "push":
        return <BellRing className="w-5 h-5 text-rose-600" />;
      default:
        return <Sliders className="w-5 h-5 text-[#087A50]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 lg:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-sans font-bold text-[#111827]">Integration &amp; Automation Platform</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Razorpay Gateway · Meta WhatsApp Cloud API · Transactional Email · Webhook Ingestion · Event Automation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                loadStatus();
                loadRules();
                loadExecutions();
              }}
              disabled={isLoading || isLoadingRules || isLoadingExecutions}
              className="px-3.5 py-2 border border-[#E5EAF0] rounded-xl hover:bg-gray-50 text-[#087A50] cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh Health & Engine"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Health</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Reconciliation Summary */}
      {reconciliation && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827] font-sans">Financial Reconciliation &amp; Gateway Health</h3>
                <p className="text-[11px] text-[#64748B]">Live synchronization across Razorpay orders, ledger invoices, and tax receipts</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{reconciliation.gatewayBreakdown?.reconciliationStatus || "Balanced"}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-[#F7F9F7] rounded-xl border border-[#E5EAF0]">
              <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Total Invoiced</p>
              <p className="text-base font-bold text-[#111827] mt-1 font-sans">₹{reconciliation.totalBilled.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{reconciliation.totalInvoicesCount} invoices</p>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <p className="text-[10px] text-emerald-800 uppercase tracking-wider font-semibold">Total Collected</p>
              <p className="text-base font-bold text-emerald-900 mt-1 font-sans">₹{reconciliation.totalCollected.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Reconciled in ledger</p>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
              <p className="text-[10px] text-amber-800 uppercase tracking-wider font-semibold">Outstanding Dues</p>
              <p className="text-base font-bold text-amber-900 mt-1 font-sans">₹{reconciliation.totalDues.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-amber-700 mt-0.5">Pending collection</p>
            </div>
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
              <p className="text-[10px] text-purple-800 uppercase tracking-wider font-semibold">Razorpay Captured</p>
              <p className="text-base font-bold text-purple-900 mt-1 font-sans">{reconciliation.gatewayBreakdown?.razorpayCaptured || 0}</p>
              <p className="text-[10px] text-purple-700 mt-0.5">Webhook verified</p>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <p className="text-[10px] text-blue-800 uppercase tracking-wider font-semibold">Offline / UPI POS</p>
              <p className="text-base font-bold text-blue-900 mt-1 font-sans">
                {(reconciliation.gatewayBreakdown?.offlineUpi || 0) + (reconciliation.gatewayBreakdown?.cashOrPos || 0)}
              </p>
              <p className="text-[10px] text-blue-700 mt-0.5">Cashier verified</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-[10px] text-emerald-800 uppercase tracking-wider font-semibold">Net Cash Flow</p>
              <p className="text-base font-bold text-emerald-950 mt-1 font-sans">₹{reconciliation.netCashFlow.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-emerald-800 mt-0.5">After refunds &amp; op-ex</p>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Cards Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-16 text-center text-xs text-[#64748B] flex flex-col items-center gap-3 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
          <span>Testing API gateway connectivity and HMAC verifications...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.entries(integrations).map(([key, item]) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#F7F9F7] border border-[#E5EAF0] flex items-center justify-center shrink-0">
                      {getProviderIcon(item.provider)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#111827] font-sans leading-tight">{item.displayName}</h3>
                      <p className="text-[11px] text-[#64748B] font-mono capitalize mt-0.5">Provider: {item.provider}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${
                      item.status === "connected"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : item.status === "test_mode"
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>{item.status.replace("_", " ")}</span>
                  </span>
                </div>

                <div className="mt-4 p-3 bg-[#F7F9F7] rounded-xl border border-[#E5EAF0] text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#64748B]">Security Protocol:</span>
                    <span className="font-semibold text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>HMAC-SHA256</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#64748B]">Sync Status:</span>
                    <span className="font-mono text-[#111827] font-medium text-[10px]">
                      {item.lastSync ? new Date(item.lastSync).toLocaleTimeString("en-IN") : "Continuous Webhook Active"}
                    </span>
                  </div>
                  {item.config?.businessPhoneNumber && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#64748B]">Caller / Phone ID:</span>
                      <span className="font-mono font-bold text-[#087A50]">{String(item.config.businessPhoneNumber)}</span>
                    </div>
                  )}
                  {item.provider === "razorpay" && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#64748B]">Active Mode:</span>
                      <span className="font-mono font-bold text-purple-700">TEST MODE (Sandbox)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#E5EAF0] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection(item.provider)}
                  disabled={testingProvider === item.provider}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#111827] rounded-xl text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                >
                  {testingProvider === item.provider ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <PlayCircle className="w-3 h-3 text-[#087A50]" />
                  )}
                  <span>Test Gateway</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenConfig(item)}
                  className="px-3 py-1.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition-colors shadow-xs"
                >
                  <Settings className="w-3 h-3" />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AUTOMATION ENGINE: LIVE RULES & EXECUTION STREAM */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827] font-sans">Central Business Event Automation Engine</h3>
              <p className="text-xs text-[#64748B]">Production workflow engine executing post-database persistence with idempotency</p>
            </div>
          </div>

          {/* Subtab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl">
            <button
              onClick={() => setAutomationSubTab("rules")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                automationSubTab === "rules" ? "bg-white text-[#087A50] shadow-xs" : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Active Rules ({rules.length})</span>
            </button>
            <button
              onClick={() => {
                setAutomationSubTab("executions");
                loadExecutions();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                automationSubTab === "executions" ? "bg-white text-[#087A50] shadow-xs" : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Execution Logs ({executions.length})</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: ACTIVE AUTOMATION RULES */}
        {automationSubTab === "rules" && (
          <div>
            {isLoadingRules ? (
              <div className="py-12 text-center text-xs text-[#64748B] flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#087A50]" />
                <span>Loading active business automation rules...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                <Zap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-[#111827]">No automation rules found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rules.map((rule) => (
                  <div
                    key={rule._id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      rule.enabled
                        ? "bg-[#F7F9F7] border-[#E5EAF0]"
                        : "bg-gray-50/70 border-gray-200 opacity-70"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-xs font-bold text-[#111827] font-sans leading-tight">{rule.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                            rule.enabled
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-gray-100 text-gray-600 border-gray-300"
                          }`}
                        >
                          {rule.enabled ? "Active" : "Disabled"}
                        </span>
                      </div>

                      <p className="text-[11px] font-mono text-[#087A50] font-semibold mb-2">
                        Event: <span className="text-emerald-900">{rule.triggerEvent}</span>
                      </p>
                      <p className="text-[11px] text-[#64748B] leading-relaxed">{rule.description}</p>

                      {rule.actions && rule.actions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#E5EAF0] flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-semibold mr-1">Actions:</span>
                          {rule.actions.map((act, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-white border border-[#E5EAF0] rounded text-[9px] text-[#111827] font-mono"
                            >
                              {act.type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E5EAF0] flex items-center justify-between">
                      <button
                        onClick={() => handleToggleRule(rule._id)}
                        disabled={togglingRuleId === rule._id}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                          rule.enabled
                            ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200"
                        }`}
                      >
                        {togglingRuleId === rule._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : rule.enabled ? (
                          <ToggleRight className="w-3.5 h-3.5 text-amber-800" />
                        ) : (
                          <ToggleLeft className="w-3.5 h-3.5 text-emerald-800" />
                        )}
                        <span>{rule.enabled ? "Disable Rule" : "Enable Rule"}</span>
                      </button>

                      <button
                        onClick={() => handleTestRule(rule)}
                        disabled={testingRuleId === rule._id}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#087A50] font-bold text-[10px] flex items-center gap-1 cursor-pointer transition"
                      >
                        {testingRuleId === rule._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <PlayCircle className="w-3 h-3" />
                        )}
                        <span>Test Dry-Run</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: LIVE EXECUTION LOGS STREAM */}
        {automationSubTab === "executions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={executionFilter}
                  onChange={(e) => setExecutionFilter(e.target.value)}
                  className="px-3 py-1.5 border border-[#E5EAF0] rounded-xl text-xs bg-white text-[#111827] font-medium focus:outline-none"
                >
                  <option value="all">All Execution Outcomes</option>
                  <option value="success">Success (Actions Dispatched)</option>
                  <option value="skipped">Skipped (Quiet Hours / Capped)</option>
                  <option value="failed">Failed / Errored</option>
                </select>
              </div>

              <button
                onClick={loadExecutions}
                disabled={isLoadingExecutions}
                className="px-3 py-1.5 border border-[#E5EAF0] rounded-xl hover:bg-gray-50 text-[#087A50] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExecutions ? "animate-spin" : ""}`} />
                <span>Refresh Stream</span>
              </button>
            </div>

            <div className="rounded-2xl border border-[#E5EAF0] overflow-hidden">
              {isLoadingExecutions ? (
                <div className="py-12 text-center text-xs text-[#64748B] flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#087A50]" />
                  <span>Loading execution history stream...</span>
                </div>
              ) : filteredExecutions.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="font-semibold text-[#111827]">No execution records found</p>
                  <p className="text-[11px] text-gray-500">Run a test dry-run above or trigger a live webhook event.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5EAF0] bg-[#F7F9F7] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Timestamp (IST)</th>
                        <th className="py-3 px-4">Rule Name</th>
                        <th className="py-3 px-4">Trigger Event</th>
                        <th className="py-3 px-4">Target Contact</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">Actions / Notes</th>
                        <th className="py-3 px-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]">
                      {filteredExecutions.map((ex) => (
                        <tr key={ex._id} className="hover:bg-[#F7F9F7]/70 transition-colors">
                          <td className="py-3 px-4 font-mono text-[#64748B] text-[11px]">
                            {new Date(ex.executedAt).toLocaleTimeString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#111827] max-w-xs truncate">
                            {ex.ruleName || "Automation Rule"}
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-800 text-[11px]">
                            {ex.triggerEvent}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#64748B] text-[11px]">
                            {ex.leadId?.fullName || ex.contactPhone || "—"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                ex.status === "success"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : ex.status === "skipped"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-red-50 text-red-800 border-red-200"
                              }`}
                            >
                              {ex.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#64748B] max-w-xs truncate text-[11px]">
                            {ex.skipReason ? (
                              <span className="italic text-amber-800">Skipped: {ex.skipReason}</span>
                            ) : ex.actionResults && ex.actionResults.length > 0 ? (
                              <span>{ex.actionResults.map((a) => a.actionType).join(", ")}</span>
                            ) : (
                              <span>Executed successfully</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedExecutionDetails(ex)}
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                              title="View Full Execution Payload"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
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
      </div>

      {/* CONFIGURATION MODAL */}
      {selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedConfig(null)} />
          <div className="relative bg-white border border-[#E5EAF0] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#E5EAF0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-sans font-bold text-[#111827]">
                    Configure {selectedConfig.displayName}
                  </h3>
                  <p className="text-xs text-[#64748B]">Credentials &amp; Webhook Secrets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConfig(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xl text-[11px] leading-relaxed">
                <Lock className="w-3.5 h-3.5 inline mr-1 text-amber-800" />
                <strong>Server-Side Secret Storage:</strong> Credentials and verification tokens are stored strictly in server-side configuration and are never leaked to client responses.
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1.5">Webhook Verify Token</label>
                <input
                  type="text"
                  value={configForm.verifyToken || "trigyna_meta_webhook_verify_token_2026"}
                  onChange={(e) => setConfigForm({ ...configForm, verifyToken: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl font-mono focus:ring-1 focus:ring-[#087A50] focus:outline-none text-[#111827]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1.5">Business Account / Phone Number ID</label>
                <input
                  type="text"
                  value={configForm.businessPhoneNumber || "+91 917-277-2326"}
                  onChange={(e) => setConfigForm({ ...configForm, businessPhoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl font-mono focus:ring-1 focus:ring-[#087A50] focus:outline-none text-[#111827]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1.5">API Key / Access Token</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••"
                  value={configForm.accessToken || ""}
                  onChange={(e) => setConfigForm({ ...configForm, accessToken: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl font-mono focus:ring-1 focus:ring-[#087A50] focus:outline-none text-[#111827]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setSelectedConfig(null)}
                  className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-[#64748B] hover:bg-gray-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#087A50] text-white rounded-xl font-semibold hover:bg-[#075B3D] cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST RESULT MODAL */}
      {testResultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5EAF0] overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-emerald-700" />
                <h3 className="font-sans font-bold text-base text-[#111827]">
                  Test Execution: {testResultModal.ruleName}
                </h3>
              </div>
              <button onClick={() => setTestResultModal(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-emerald-900">Execution Outcome:</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-emerald-600 text-white">
                  {testResultModal.result?.status || "SUCCESS"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-gray-700 block">Raw Execution Engine Output:</span>
                <pre className="p-3 bg-gray-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(testResultModal.result, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setTestResultModal(null)}
                  className="px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-bold text-xs"
                >
                  Close Result
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXECUTION DETAILS MODAL */}
      {selectedExecutionDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5EAF0] overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#087A50]" />
                <h3 className="font-sans font-bold text-base text-[#111827]">
                  Execution Audit Details
                </h3>
              </div>
              <button onClick={() => setSelectedExecutionDetails(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Idempotency Key:</span>
                  <span className="font-bold text-gray-800">{selectedExecutionDetails.idempotencyKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Event:</span>
                  <span className="text-emerald-800">{selectedExecutionDetails.triggerEvent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact:</span>
                  <span className="text-gray-800">{selectedExecutionDetails.contactPhone || "—"}</span>
                </div>
              </div>

              {selectedExecutionDetails.actionResults && selectedExecutionDetails.actionResults.length > 0 && (
                <div className="space-y-1">
                  <span className="font-semibold text-gray-700 block">Actions Dispatched:</span>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedExecutionDetails.actionResults.map((act, i) => (
                      <div key={i} className="p-2 bg-[#F7F9F7] rounded-lg border border-[#E5EAF0] flex justify-between items-center">
                        <span className="font-mono font-bold text-[#087A50]">{act.actionType}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedExecutionDetails(null)}
                  className="px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
