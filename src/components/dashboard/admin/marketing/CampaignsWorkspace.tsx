"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  Play,
  Pause,
  Archive,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface CampaignsWorkspaceProps {
  onCreateCampaign: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function CampaignsWorkspace({
  onCreateCampaign,
  showNotification,
}: CampaignsWorkspaceProps) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await api.get<any>(`/marketing/campaigns?${params.toString()}`);
      if (res.data?.campaigns) {
        setCampaigns(res.data.campaigns);
      }
    } catch {
      showNotification("Could not load campaigns", true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, platformFilter, searchQuery]);

  const handleAction = async (action: string, campaignId: string) => {
    try {
      setActiveMenuId(null);
      let endpoint = `/marketing/campaigns/${campaignId}/${action}`;
      if (action === "pause" || action === "resume" || action === "archive" || action === "approve" || action === "submit-approval" || action === "publish") {
        const res = await api.post<any>(endpoint, {});
        if (res.success) {
          showNotification(`Campaign ${action} action executed successfully`);
          fetchCampaigns();
        } else {
          showNotification(res.message || "Action failed", true);
        }
      }
    } catch (err: any) {
      showNotification(err.message || "Campaign action error", true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E5EAF0] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campaigns by name, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-[#E5EAF0] rounded-xl focus:outline-none focus:border-[#087A50]"
            />
          </div>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="meta">Meta Ads</option>
            <option value="google">Google Ads</option>
            <option value="website">Website UTM</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <button
          onClick={onCreateCampaign}
          className="flex items-center gap-2 px-4 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition-all cursor-pointer shadow-xs shrink-0 self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#087A50] mb-2" />
            <span className="text-xs">Loading campaign registry...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center text-[#64748B] text-xs">
            No campaigns found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px] bg-[#F8FAFC]">
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Leads</th>
                  <th className="py-3 px-3 text-center">Bookings</th>
                  <th className="py-3 px-3">Spend</th>
                  <th className="py-3 px-3">Revenue</th>
                  <th className="py-3 px-3">ROAS</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]/70">
                {campaigns.map((camp) => (
                  <tr key={camp._id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    {/* Campaign Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 font-bold text-xs text-emerald-800">
                          {camp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#111827] line-clamp-1">{camp.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                            <span className="font-mono">ID: {camp.campaignId}</span>
                            <span>•</span>
                            <span>{camp.serviceCategory}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="py-3.5 px-3">
                      <span className="font-medium text-[#111827] flex items-center gap-1.5">
                        {camp.platform === "meta" ? (
                          <span className="text-[#2563EB] font-bold text-base leading-none">∞</span>
                        ) : (
                          <span className="text-[#EA4335] font-bold text-xs leading-none">G</span>
                        )}
                        <span>{camp.channelName || (camp.platform === "meta" ? "Meta Ads" : "Google Ads")}</span>
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          camp.status === "active"
                            ? "bg-[#E9F8F0] text-[#087A50] border-[#16A36A]/20"
                            : camp.status === "draft"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : camp.status === "pending_approval"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : camp.status === "paused"
                            ? "bg-orange-100 text-orange-800 border-orange-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {camp.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Leads */}
                    <td className="py-3.5 px-3 text-center font-bold text-[#111827]">
                      {camp.metrics?.leadsCount ?? 0}
                    </td>

                    {/* Bookings */}
                    <td className="py-3.5 px-3 text-center font-bold text-[#111827]">
                      {camp.metrics?.bookingsCount ?? 0}
                    </td>

                    {/* Spend */}
                    <td className="py-3.5 px-3 font-medium text-[#111827]">
                      ₹{(camp.metrics?.spend || 0).toLocaleString("en-IN")}
                    </td>

                    {/* Revenue */}
                    <td className="py-3.5 px-3 font-bold text-emerald-700">
                      ₹{(camp.metrics?.attributedRevenue || 0).toLocaleString("en-IN")}
                    </td>

                    {/* ROAS */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-[#E9F8F0] text-[#087A50] font-bold text-[11px] border border-[#16A36A]/20">
                        {(camp.metrics?.roas || 0).toFixed(2)}x
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-3 text-right relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === camp._id ? null : camp._id)}
                        className="p-1 text-[#64748B] hover:text-[#111827] rounded-md transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === camp._id && (
                        <div className="absolute right-3 top-8 z-20 w-44 bg-white border border-[#E5EAF0] rounded-xl shadow-lg py-1 text-left">
                          {camp.status === "draft" && (
                            <button
                              onClick={() => handleAction("submit-approval", camp._id)}
                              className="w-full px-3 py-1.5 text-xs text-[#111827] hover:bg-[#F8FAFC] text-left flex items-center gap-2"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                              <span>Submit Approval</span>
                            </button>
                          )}
                          {camp.status === "pending_approval" && (
                            <button
                              onClick={() => handleAction("approve", camp._id)}
                              className="w-full px-3 py-1.5 text-xs text-[#111827] hover:bg-[#F8FAFC] text-left flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Approve Campaign</span>
                            </button>
                          )}
                          {(camp.status === "approved" || camp.status === "draft") && (
                            <button
                              onClick={() => handleAction("publish", camp._id)}
                              className="w-full px-3 py-1.5 text-xs text-[#087A50] hover:bg-emerald-50 text-left font-semibold flex items-center gap-2"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Publish Live</span>
                            </button>
                          )}
                          {camp.status === "active" && (
                            <button
                              onClick={() => handleAction("pause", camp._id)}
                              className="w-full px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 text-left flex items-center gap-2"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause Campaign</span>
                            </button>
                          )}
                          {camp.status === "paused" && (
                            <button
                              onClick={() => handleAction("resume", camp._id)}
                              className="w-full px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 text-left flex items-center gap-2"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Resume Campaign</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleAction("archive", camp._id)}
                            className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 text-left flex items-center gap-2"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>Archive</span>
                          </button>
                        </div>
                      )}
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
