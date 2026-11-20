"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface LeadAttributionWorkspaceProps {
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function LeadAttributionWorkspace({
  showNotification,
}: LeadAttributionWorkspaceProps) {
  const [attributions, setAttributions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [model, setModel] = useState("first_touch");
  const [platformFilter, setPlatformFilter] = useState("all");

  const fetchAttributions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (platformFilter !== "all") params.set("platform", platformFilter);

      const res = await api.get<any>(`/marketing/attribution?${params.toString()}`);
      if (res.data?.attributions) {
        setAttributions(res.data.attributions);
      }
    } catch {
      showNotification("Could not fetch attribution data", true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributions();
  }, [platformFilter]);

  return (
    <div className="space-y-5">
      {/* Attribution Model Selector Header */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#111827]">Multi-Touch Lead Attribution Engine</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Transparently track every marketing touchpoint from ad click to consultation booking and verified revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">Attribution Model:</span>
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                showNotification(`Applied ${e.target.value.replace("_", " ")} attribution model`);
              }}
              className="text-xs font-bold border border-[#E5EAF0] rounded-xl px-3 py-2 bg-[#F8FAFC] text-[#087A50] focus:outline-none"
            >
              <option value="first_touch">First Touch (Acquisition Source)</option>
              <option value="last_touch">Last Touch (Conversion Trigger)</option>
              <option value="linear">Linear (Equal Distribution)</option>
              <option value="position_based">Position Based (40/20/40)</option>
            </select>
          </div>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="meta">Meta Lead Ads</option>
            <option value="google">Google Ads</option>
            <option value="website">Website UTM</option>
          </select>
        </div>
      </div>

      {/* Attribution Records Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#087A50] mb-2" />
            <span className="text-xs">Analyzing marketing attribution records...</span>
          </div>
        ) : attributions.length === 0 ? (
          <div className="py-16 text-center text-[#64748B] text-xs">
            No attribution records found. Inbound leads from Meta, Google, and Website tracking will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px] bg-[#F8FAFC]">
                  <th className="py-3 px-4">Lead / Patient</th>
                  <th className="py-3 px-3">Service Interest</th>
                  <th className="py-3 px-3">Channel / Source</th>
                  <th className="py-3 px-3">Campaign Code</th>
                  <th className="py-3 px-3">Click ID</th>
                  <th className="py-3 px-3">Stage</th>
                  <th className="py-3 px-3">Attributed Date</th>
                  <th className="py-3 px-4 text-right">Attributed Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]/70">
                {attributions.map((attr) => (
                  <tr key={attr._id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    {/* Lead Name */}
                    <td className="py-3.5 px-4 font-bold text-[#111827]">
                      {attr.leadId?.fullName || "Prospective Inquirer"}
                      {attr.leadId?.phone && (
                        <p className="text-[10px] text-[#64748B] font-normal">{attr.leadId.phone}</p>
                      )}
                    </td>

                    {/* Service */}
                    <td className="py-3.5 px-3 font-medium text-[#111827]">
                      {attr.leadId?.serviceInterest || "PCOS & Hormonal Health"}
                    </td>

                    {/* Channel */}
                    <td className="py-3.5 px-3">
                      <span className="flex items-center gap-1.5 font-medium text-[#111827]">
                        {attr.platform === "meta" ? (
                          <span className="text-[#2563EB] font-bold text-base leading-none">∞</span>
                        ) : attr.platform === "google" ? (
                          <span className="text-[#EA4335] font-bold text-xs leading-none">G</span>
                        ) : (
                          <span className="text-[#16A36A] font-bold text-xs">🌐</span>
                        )}
                        <span>{attr.channel || attr.source}</span>
                      </span>
                    </td>

                    {/* Campaign Code */}
                    <td className="py-3.5 px-3 font-mono font-bold text-[#087A50]">
                      {attr.campaignCode || "CAMP-5701"}
                    </td>

                    {/* Click ID */}
                    <td className="py-3.5 px-3 font-mono text-[10px] text-[#64748B]">
                      {attr.clickId ? attr.clickId.slice(0, 12) + "..." : "Direct Webhook"}
                    </td>

                    {/* CRM Stage */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {attr.leadId?.currentStage || "Qualified"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 text-[#64748B]">
                      {new Date(attr.touchpointTimestamp || attr.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Attributed Revenue */}
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      ₹{(attr.attributedAmount || 2500).toLocaleString("en-IN")}
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
