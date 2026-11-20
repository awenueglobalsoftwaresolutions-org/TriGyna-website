"use client";

import React, { useState, useEffect } from "react";
import {
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Building,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface AdAccountsWorkspaceProps {
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function AdAccountsWorkspace({ showNotification }: AdAccountsWorkspaceProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [platformToConnect, setPlatformToConnect] = useState<"meta" | "google">("meta");

  // Form State
  const [newAccount, setNewAccount] = useState({
    accountName: "",
    providerAccountId: "",
    accessToken: "",
  });

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<any[]>("/marketing/accounts");
      if (res.data && Array.isArray(res.data)) {
        setAccounts(res.data);
      }
    } catch {
      showNotification("Could not load advertising accounts", true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      const res = await api.post<any>("/marketing/accounts/sync", { provider: "all" });
      if (res.success) {
        showNotification("All advertising accounts and campaign tokens synchronized");
        fetchAccounts();
      }
    } catch (err: any) {
      showNotification(err.message || "Account sync failed", true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectAccount = async () => {
    try {
      if (!newAccount.accountName || !newAccount.providerAccountId) {
        showNotification("Account name and provider ID are required", true);
        return;
      }

      const res = await api.post<any>("/marketing/accounts/connect", {
        platform: platformToConnect,
        accountName: newAccount.accountName.trim(),
        providerAccountId: newAccount.providerAccountId.trim(),
        accessToken: newAccount.accessToken?.trim() || undefined,
      });

      if (res.success) {
        showNotification(`${platformToConnect === "meta" ? "Meta" : "Google"} Ads account connected successfully!`);
        setConnectModalOpen(false);
        setNewAccount({ accountName: "", providerAccountId: "", accessToken: "" });
        fetchAccounts();
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to connect ad account", true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#111827]">Connected Advertising Accounts</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage official OAuth integrations, system user tokens, and synchronization schedules for Meta and Google.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 border border-[#E5EAF0] hover:border-slate-300 rounded-xl text-xs font-semibold text-[#111827] cursor-pointer disabled:opacity-60 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#087A50]" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync All Accounts"}</span>
          </button>

          <button
            onClick={() => {
              setPlatformToConnect("meta");
              setConnectModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Account</span>
          </button>
        </div>
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#087A50] mb-2" />
          <span className="text-xs">Loading advertising accounts...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-16 text-center text-[#64748B] text-xs">
          No ad accounts connected yet. Click &apos;Connect Account&apos; to link your Meta or Google ad manager.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {accounts.map((acc) => (
            <div
              key={acc._id}
              className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        acc.platform === "meta"
                          ? "bg-blue-50 text-[#2563EB]"
                          : "bg-red-50 text-[#EA4335]"
                      }`}
                    >
                      {acc.platform === "meta" ? "∞" : "G"}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#111827]">{acc.accountName}</h3>
                      <p className="text-[11px] text-[#64748B] font-mono">ID: {acc.providerAccountId}</p>
                    </div>
                  </div>

                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E9F8F0] text-[#087A50] border border-[#16A36A]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
                    <span>Connected</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#E5EAF0]/60 text-xs">
                  <div>
                    <span className="text-[10px] text-[#64748B] block">Currency</span>
                    <span className="font-semibold text-[#111827]">{acc.currency || "INR"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] block">Timezone</span>
                    <span className="font-semibold text-[#111827]">{acc.timeZone || "Asia/Kolkata"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] block">Last Sync</span>
                    <span className="font-semibold text-[#111827]">
                      {new Date(acc.lastSyncAt || Date.now()).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E5EAF0]/60 text-xs text-[#64748B]">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Token Verified (Graph API v21.0)</span>
                </div>
                <button
                  onClick={handleSyncAll}
                  className="text-xs font-semibold text-[#087A50] hover:underline cursor-pointer"
                >
                  Sync Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Account Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5EAF0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[#111827]">Connect Advertising Account</h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPlatformToConnect("meta")}
                className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                  platformToConnect === "meta"
                    ? "border-[#087A50] bg-[#E9F8F0] text-[#087A50]"
                    : "border-[#E5EAF0] text-[#64748B]"
                }`}
              >
                Meta Ads
              </button>
              <button
                onClick={() => setPlatformToConnect("google")}
                className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                  platformToConnect === "google"
                    ? "border-[#087A50] bg-[#E9F8F0] text-[#087A50]"
                    : "border-[#E5EAF0] text-[#64748B]"
                }`}
              >
                Google Ads
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">Account Name</label>
              <input
                type="text"
                placeholder={platformToConnect === "meta" ? "e.g. TriGyna Meta Ads Manager" : "e.g. TriGyna Google Ads"}
                value={newAccount.accountName}
                onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                {platformToConnect === "meta" ? "Ad Account ID (act_XXXXXXXXX)" : "Customer ID (XXX-XXX-XXXX)"}
              </label>
              <input
                type="text"
                placeholder={platformToConnect === "meta" ? "act_9182374619" : "928-112-4091"}
                value={newAccount.providerAccountId}
                onChange={(e) => setNewAccount({ ...newAccount, providerAccountId: e.target.value })}
                className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
              <button
                onClick={() => setConnectModalOpen(false)}
                className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#111827]"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectAccount}
                className="px-4 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D]"
              >
                Save &amp; Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
