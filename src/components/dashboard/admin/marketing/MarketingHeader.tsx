"use client";

import React from "react";
import { Megaphone, Plus, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface MarketingHeaderProps {
  onCreateCampaign: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  integrations?: {
    metaConnected: boolean;
    googleConnected: boolean;
    health: string;
    lastSync?: string;
  };
}

export function MarketingHeader({
  onCreateCampaign,
  onRefresh,
  isRefreshing = false,
  integrations,
}: MarketingHeaderProps) {
  const isHealthy = integrations?.metaConnected || integrations?.googleConnected;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0 shadow-xs border border-[#16A36A]/20">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold font-sans text-[#111827] tracking-tight">
              Marketing &amp; Ads
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E9F8F0] text-[#087A50] border border-[#16A36A]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
              <span>Meta &amp; Google Connected</span>
            </div>
          </div>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-0.5">
            Plan, run and measure your marketing campaigns across Meta, Google and other channels.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh live marketing analytics"
          className="p-2.5 bg-white border border-[#E5EAF0] text-[#64748B] hover:text-[#111827] hover:border-[#CBD5E1] rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#087A50]" : ""}`} />
        </button>

        <button
          onClick={onCreateCampaign}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#087A50] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#075B3D] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Campaign</span>
        </button>
      </div>
    </div>
  );
}
