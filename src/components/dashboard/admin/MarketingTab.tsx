"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Loader2,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface CampaignItem {
  id: string;
  name: string;
  platform: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  leadsCount: number;
  consultationsBooked: number;
  conversions: number;
  spend: number;
  attributedRevenue: number;
  roas: number;
}

export function MarketingTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  const loadCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ campaigns: Record<string, unknown>[] }>("/integrations/meta/campaigns");
      if (res.data?.campaigns && Array.isArray(res.data.campaigns)) {
        const normalized: CampaignItem[] = res.data.campaigns.map((raw: Record<string, unknown>) => {
          const spend = Number(raw.spend) || 0;
          const attributedRevenue = Number(raw.attributedRevenue) || 0;
          let parsedRoas = 0;
          if (typeof raw.roas === "number" && !isNaN(raw.roas)) {
            parsedRoas = raw.roas;
          } else if (typeof raw.roas === "string") {
            parsedRoas = parseFloat(raw.roas.replace(/[^0-9.]/g, "")) || 0;
          } else if (spend > 0) {
            parsedRoas = attributedRevenue / spend;
          }

          return {
            id: String(raw.id || raw.campaignId || `CAMP-${Math.random().toString(36).substring(7)}`),
            name: String(raw.name || raw.campaignName || "Campaign"),
            platform: String(raw.platform || raw.source || "Meta Lead Ads"),
            status: (raw.status as "ACTIVE" | "PAUSED" | "COMPLETED") || "ACTIVE",
            leadsCount: Number(raw.leadsCount ?? raw.leadCount ?? 0),
            consultationsBooked: Number(raw.consultationsBooked ?? raw.bookingsCount ?? 0),
            conversions: Number(raw.conversions ?? raw.convertedCount ?? 0),
            spend,
            attributedRevenue,
            roas: parsedRoas,
          };
        });
        setCampaigns(normalized);
      }
    } catch {
      showNotification("Could not fetch Meta campaigns data", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleSyncMetaLeads = async () => {
    try {
      setIsSyncing(true);
      const res = await api.post<{ syncedCount: number }>("/integrations/meta/sync", {});
      if (res.success) {
        showNotification(`Meta Lead Ads synchronized: ${res.data?.syncedCount ?? 0} leads refreshed`);
        loadCampaigns();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Meta synchronization failed", true);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) =>
    filterPlatform === "all" ? true : c.platform.toLowerCase().includes(filterPlatform.toLowerCase())
  );

  const totalLeads = campaigns.reduce((acc, c) => acc + c.leadsCount, 0);
  const totalBookings = campaigns.reduce((acc, c) => acc + c.consultationsBooked, 0);
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + c.attributedRevenue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Sync Control */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Meta Graph API &amp; Webhooks Connected
            </span>
          </div>
          <h2 className="text-lg font-serif font-bold text-[#17221D] mt-2">
            Marketing &amp; Social Lead Attribution
          </h2>
          <p className="text-xs text-[#626B63] max-w-2xl mt-0.5">
            Directly capturing leads from Facebook Pages, Instagram Professional Accounts, Meta Lead Ads, and Website UTM parameters with verified attribution.
          </p>
        </div>

        <button
          onClick={handleSyncMetaLeads}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#154734] text-white rounded-xl text-xs font-semibold hover:bg-[#0E3828] transition-all cursor-pointer shadow-xs disabled:opacity-60"
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <RefreshCw className="w-4 h-4 text-emerald-200" />
          )}
          <span>{isSyncing ? "Syncing Meta Leads..." : "Sync Live Lead Ads"}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#626B63] uppercase tracking-wider">Total Ad Leads</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#17221D] mt-2">{totalLeads}</p>
          <p className="text-[11px] text-purple-700 mt-1 font-medium">Meta &amp; Social Lead Ads</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#626B63] uppercase tracking-wider">Bookings Generated</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#17221D] mt-2">{totalBookings}</p>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
            {totalLeads > 0 ? `${((totalBookings / totalLeads) * 100).toFixed(1)}% conversion rate` : "0% conversion"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#626B63] uppercase tracking-wider">Ad Spend Recorded</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#17221D] mt-2">₹{totalSpend.toLocaleString()}</p>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">Meta Ads Manager Budget</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#626B63] uppercase tracking-wider">Attributed Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#17221D] mt-2">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-teal-700 mt-1 font-medium">
            {totalSpend > 0 ? `${(totalRevenue / totalSpend).toFixed(2)}x Return on Ad Spend` : "ROAS pending"}
          </p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#626B63]" />
            <span className="text-xs font-semibold text-[#17221D]">Filter Channel:</span>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="text-xs border border-[#E8E2D6] rounded-xl px-3 py-1.5 bg-white text-[#17221D] focus:outline-none"
            >
              <option value="all">All Channels</option>
              <option value="meta">Meta Lead Ads</option>
              <option value="facebook">Facebook Page</option>
              <option value="instagram">Instagram Account</option>
              <option value="website">Website Enquiries</option>
            </select>
          </div>
          <span className="text-xs text-[#626B63]">{filteredCampaigns.length} campaigns tracked</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-[#626B63] flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#154734] mb-2" />
            <span className="text-xs">Loading campaign attribution metrics...</span>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-12 text-center text-[#626B63] text-xs">
            No campaigns found matching current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E8E2D6] text-[#626B63] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Campaign / Source</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Leads</th>
                  <th className="py-3 px-3 text-center">Bookings</th>
                  <th className="py-3 px-3">Ad Spend</th>
                  <th className="py-3 px-3">Attributed Revenue</th>
                  <th className="py-3 px-3 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D6]/60">
                {filteredCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-[#F9F7F1]/50 transition-colors">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-[#17221D]">{camp.name}</p>
                      <p className="text-[10px] text-[#626B63] font-mono mt-0.5">ID: {camp.id}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-xs font-medium text-[#17221D]">{camp.platform}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          camp.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-[#17221D]">{camp.leadsCount}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-emerald-700">{camp.consultationsBooked}</td>
                    <td className="py-3.5 px-3 font-mono text-[#626B63]">₹{(Number(camp.spend) || 0).toLocaleString()}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-800">₹{(Number(camp.attributedRevenue) || 0).toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 font-bold border border-teal-200">
                        {(Number(camp.roas) || 0).toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
