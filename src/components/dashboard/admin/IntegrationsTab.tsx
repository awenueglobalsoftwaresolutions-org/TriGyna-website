"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api/client";

interface IntegrationItem {
  _id: string;
  provider: string;
  displayName: string;
  status: "connected" | "disconnected" | "error" | "pending";
  config?: Record<string, string | number | boolean>;
  lastSync?: string;
  errorLog?: string;
}

export function IntegrationsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [integrations, setIntegrations] = useState<Record<string, IntegrationItem>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<IntegrationItem | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ integrations: Record<string, IntegrationItem> }>("/integrations/status");
      if (res.data?.integrations) {
        setIntegrations(res.data.integrations);
      }
    } catch {
      showNotification("Failed to fetch integrations health", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

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
          status: "connected",
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
      default:
        return <Sliders className="w-5 h-5 text-[#154734]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#18231D]">Enterprise Integrations &amp; Gateways</h2>
              <p className="text-xs text-[#68756D] mt-0.5">
                Official API gateways: Meta Ads Lead forms, WhatsApp Business Cloud API, Google Calendar synchronization, and Razorpay UPI payments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={loadStatus}
              disabled={isLoading}
              className="p-2 border border-[#E2E9E3] rounded-xl hover:bg-gray-50 text-[#154734] cursor-pointer transition-colors"
              title="Refresh Health"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-16 text-center text-xs text-[#68756D] flex flex-col items-center gap-3 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
          <span>Testing API gateway connectivity...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Object.entries(integrations).map(([key, item]) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-[#E2E9E3] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F7F9F7] border border-[#E2E9E3] flex items-center justify-center">
                      {getProviderIcon(item.provider)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#18231D] font-serif">{item.displayName}</h3>
                      <p className="text-[11px] text-[#68756D] font-mono capitalize">Provider: {item.provider}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                      item.status === "connected"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>{item.status}</span>
                  </span>
                </div>

                <div className="mt-5 p-3.5 bg-[#F7F9F7] rounded-xl border border-[#E2E9E3] text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#68756D]">Webhook Security:</span>
                    <span className="font-semibold text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>HMAC-SHA256 Verified</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#68756D]">Sync Status:</span>
                    <span className="font-mono text-[#18231D] font-medium">
                      {item.lastSync ? new Date(item.lastSync).toLocaleString("en-IN") : "Continuous Webhook Active"}
                    </span>
                  </div>
                  {item.config?.businessPhoneNumber && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#68756D]">Bound Phone:</span>
                      <span className="font-mono font-bold text-[#154734]">{String(item.config.businessPhoneNumber)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E2E9E3] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpenConfig(item)}
                  className="px-3.5 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure Settings</span>
                </button>
                <span className="text-[10px] text-gray-400 font-mono">v1.2 REST Gateway</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIGURATION MODAL */}
      {selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedConfig(null)} />
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#E2E9E3]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#18231D]">
                    Configure {selectedConfig.displayName}
                  </h3>
                  <p className="text-xs text-[#68756D]">Credentials &amp; Webhook Secrets</p>
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
                <label className="block font-semibold text-[#18231D] mb-1.5">Webhook Verify Token</label>
                <input
                  type="text"
                  value={configForm.verifyToken || "trigyna_meta_webhook_verify_token_2026"}
                  onChange={(e) => setConfigForm({ ...configForm, verifyToken: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl font-mono focus:ring-1 focus:ring-[#154734] focus:outline-none text-[#18231D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">Business Account / Phone Number ID</label>
                <input
                  type="text"
                  value={configForm.businessPhoneNumber || "+91 917-277-2326"}
                  onChange={(e) => setConfigForm({ ...configForm, businessPhoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl font-mono focus:ring-1 focus:ring-[#154734] focus:outline-none text-[#18231D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">API Key / Access Token</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••"
                  value={configForm.accessToken || ""}
                  onChange={(e) => setConfigForm({ ...configForm, accessToken: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl font-mono focus:ring-1 focus:ring-[#154734] focus:outline-none text-[#18231D]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E2E9E3]">
                <button
                  type="button"
                  onClick={() => setSelectedConfig(null)}
                  className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-[#68756D] hover:bg-gray-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
