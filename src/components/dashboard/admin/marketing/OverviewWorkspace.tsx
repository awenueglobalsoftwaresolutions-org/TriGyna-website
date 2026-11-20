"use client";

import React, { useState } from "react";
import {
  Users,
  Calendar,
  DollarSign,
  Coins,
  ChevronDown,
  ArrowUpRight,
  MoreVertical,
  PlusCircle,
  RefreshCw,
  Code2,
  BarChart3,
  Globe,
  PhoneCall,
  Loader2,
} from "lucide-react";
import { MarketingTabKey } from "./MarketingNav";

interface OverviewWorkspaceProps {
  onNavigateTab: (tab: MarketingTabKey) => void;
  onCreateCampaign: () => void;
  onSyncMetaLeads: () => void;
  isSyncingMeta?: boolean;
  overviewData?: any;
}

export function OverviewWorkspace({
  onNavigateTab,
  onCreateCampaign,
  onSyncMetaLeads,
  isSyncingMeta = false,
  overviewData,
}: OverviewWorkspaceProps) {
  const [selectedRange, setSelectedRange] = useState("Last 30 Days");
  const [activeHoverPoint, setActiveHoverPoint] = useState<number | null>(5); // Default pinned to Oct 21 (index 5)
  const [campaignMenuOpen, setCampaignMenuOpen] = useState<string | null>(null);

  const kpis = overviewData?.kpis || {
    totalLeads: { value: 108, changePct: "+24%", comparison: "vs last month" },
    bookingsGenerated: { value: 20, changePct: "+18.5%", comparison: "conversion rate" },
    adSpendRecorded: { value: 12300, formatted: "₹12,300", changePct: "+6.2%", comparison: "vs last month" },
    attributedRevenue: { value: 79500, formatted: "₹79,500", changePct: "+8.4x", comparison: "ROI on ad spend" },
  };

  const performanceTrend = overviewData?.analytics?.performanceTrend || [
    { date: "Oct 1", leads: 8, bookings: 1 },
    { date: "Oct 5", leads: 14, bookings: 2 },
    { date: "Oct 9", leads: 18, bookings: 3 },
    { date: "Oct 13", leads: 22, bookings: 4 },
    { date: "Oct 17", leads: 28, bookings: 5 },
    { date: "Oct 21", leads: 36, bookings: 8 },
    { date: "Oct 25", leads: 30, bookings: 6 },
    { date: "Oct 29", leads: 33, bookings: 7 },
  ];

  const roiGauge = overviewData?.analytics?.roiGauge || {
    roi: "6.46x",
    formattedRevenue: "₹79,500",
    formattedSpend: "₹12,300",
  };

  const channels = overviewData?.analytics?.channels || [
    { channel: "Meta (Facebook/Instagram)", platform: "meta", leads: 72, percentage: 66.7 },
    { channel: "Google Ads", platform: "google", leads: 18, percentage: 16.7 },
    { channel: "Website (UTM)", platform: "website", leads: 11, percentage: 10.2 },
    { channel: "Others", platform: "other", leads: 7, percentage: 6.4 },
  ];

  const activeCampaigns = overviewData?.activeCampaigns || [
    {
      id: "CAMP-5701",
      name: "PCOS Root-Cause Healing",
      platform: "meta",
      status: "active",
      leads: 93,
      bookings: 9,
      formattedSpend: "₹4,200",
      roas: "6.66x",
    },
    {
      id: "CAMP-5702",
      name: "Chronic Eczema & Psoriasis",
      platform: "google",
      status: "active",
      leads: 4,
      bookings: 6,
      formattedSpend: "₹3,180",
      roas: "5.32x",
    },
    {
      id: "CAMP-5703",
      name: "Natural Fertility & Hormonal...",
      platform: "meta",
      status: "active",
      leads: 11,
      bookings: 5,
      formattedSpend: "₹5,000",
      roas: "7.00x",
    },
  ];

  // SVG Chart Dimensions & Math
  const chartWidth = 520;
  const chartHeight = 180;
  const paddingX = 35;
  const paddingY = 25;
  const maxLeads = 40;

  const pointsCount = performanceTrend.length;
  const stepX = (chartWidth - paddingX * 2) / (pointsCount - 1);

  const getCoordinates = (index: number, val: number) => {
    const x = paddingX + index * stepX;
    const y = chartHeight - paddingY - (val / maxLeads) * (chartHeight - paddingY * 2);
    return { x, y };
  };

  // Generate SVG path strings
  let leadsPath = "";
  let leadsAreaPath = "";
  let bookingsPath = "";
  let bookingsAreaPath = "";

  performanceTrend.forEach((pt: any, i: number) => {
    const lCoord = getCoordinates(i, pt.leads);
    const bCoord = getCoordinates(i, pt.bookings);

    if (i === 0) {
      leadsPath = `M ${lCoord.x} ${lCoord.y}`;
      leadsAreaPath = `M ${lCoord.x} ${chartHeight - paddingY} L ${lCoord.x} ${lCoord.y}`;

      bookingsPath = `M ${bCoord.x} ${bCoord.y}`;
      bookingsAreaPath = `M ${bCoord.x} ${chartHeight - paddingY} L ${bCoord.x} ${bCoord.y}`;
    } else {
      const prevL = getCoordinates(i - 1, performanceTrend[i - 1].leads);
      const prevB = getCoordinates(i - 1, performanceTrend[i - 1].bookings);
      const cpX1 = prevL.x + stepX / 2;
      const cpX2 = lCoord.x - stepX / 2;

      leadsPath += ` C ${cpX1} ${prevL.y}, ${cpX2} ${lCoord.y}, ${lCoord.x} ${lCoord.y}`;
      leadsAreaPath += ` C ${cpX1} ${prevL.y}, ${cpX2} ${lCoord.y}, ${lCoord.x} ${lCoord.y}`;

      const bcpX1 = prevB.x + stepX / 2;
      const bcpX2 = bCoord.x - stepX / 2;
      bookingsPath += ` C ${bcpX1} ${prevB.y}, ${bcpX2} ${bCoord.y}, ${bCoord.x} ${bCoord.y}`;
      bookingsAreaPath += ` C ${bcpX1} ${prevB.y}, ${bcpX2} ${bCoord.y}, ${bCoord.x} ${bCoord.y}`;
    }
  });

  const lastIndex = pointsCount - 1;
  const lastX = paddingX + lastIndex * stepX;
  leadsAreaPath += ` L ${lastX} ${chartHeight - paddingY} Z`;
  bookingsAreaPath += ` L ${lastX} ${chartHeight - paddingY} Z`;

  // Active hover/pinned point data
  const pinnedPt = activeHoverPoint !== null ? performanceTrend[activeHoverPoint] : performanceTrend[5];
  const pinnedIndex = activeHoverPoint !== null ? activeHoverPoint : 5;
  const pinnedCoords = getCoordinates(pinnedIndex, pinnedPt?.leads || 36);
  const pinnedBookingCoords = getCoordinates(pinnedIndex, pinnedPt?.bookings || 8);

  return (
    <div className="space-y-6">
      {/* 1. Primary 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Ad Leads */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#64748B] font-medium">Total Ad Leads</p>
              <p className="text-2xl sm:text-3xl font-bold font-sans text-[#111827] tracking-tight">
                {kpis.totalLeads?.value || 108}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#16A36A]">
            <span>↑ {kpis.totalLeads?.changePct || "+24%"}</span>
            <span className="text-[#64748B] font-normal">{kpis.totalLeads?.comparison || "vs last month"}</span>
          </div>
        </div>

        {/* Card 2: Bookings Generated */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#64748B] font-medium">Bookings Generated</p>
              <p className="text-2xl sm:text-3xl font-bold font-sans text-[#111827] tracking-tight">
                {kpis.bookingsGenerated?.value || 20}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#16A36A]">
            <span>↑ {kpis.bookingsGenerated?.changePct || "+18.5%"}</span>
            <span className="text-[#64748B] font-normal">{kpis.bookingsGenerated?.comparison || "conversion rate"}</span>
          </div>
        </div>

        {/* Card 3: Ad Spend Recorded */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
              <span className="text-lg font-bold">₹</span>
            </div>
            <div>
              <p className="text-xs text-[#64748B] font-medium">Ad Spend Recorded</p>
              <p className="text-2xl sm:text-3xl font-bold font-sans text-[#111827] tracking-tight">
                {kpis.adSpendRecorded?.formatted || "₹12,300"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#E11D48]">
            <span>↑ {kpis.adSpendRecorded?.changePct || "+6.2%"}</span>
            <span className="text-[#64748B] font-normal">{kpis.adSpendRecorded?.comparison || "vs last month"}</span>
          </div>
        </div>

        {/* Card 4: Attributed Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#64748B] font-medium">Attributed Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold font-sans text-[#111827] tracking-tight">
                {kpis.attributedRevenue?.formatted || "₹79,500"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#16A36A]">
            <span>↑ {kpis.attributedRevenue?.changePct || "+8.4x"}</span>
            <span className="text-[#64748B] font-normal">{kpis.attributedRevenue?.comparison || "ROI on ad spend"}</span>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: 3 Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Visual 1: Lead & Booking Performance (Line Chart) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]/60">
            <h3 className="text-sm font-bold text-[#111827]">Lead &amp; Booking Performance</h3>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium">
                <span className="flex items-center gap-1 text-[#16A36A]">
                  <span className="w-2 h-2 rounded-full bg-[#16A36A]" /> Ad Leads
                </span>
                <span className="flex items-center gap-1 text-[#9333EA]">
                  <span className="w-2 h-2 rounded-full bg-[#9333EA]" /> Bookings
                </span>
              </div>
              <button className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#111827] border border-[#E5EAF0] px-2.5 py-1 rounded-lg">
                <span>{selectedRange}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Responsive SVG Area Chart */}
          <div className="relative w-full h-[190px] mt-2 select-none">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A36A" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#16A36A" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333EA" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#9333EA" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 10, 20, 30, 40].map((val) => {
                const y = chartHeight - paddingY - (val / maxLeads) * (chartHeight - paddingY * 2);
                return (
                  <g key={val}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94A3B8"
                      fontFamily="sans-serif"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area fills */}
              <path d={leadsAreaPath} fill="url(#leadsGradient)" />
              <path d={bookingsAreaPath} fill="url(#bookingsGradient)" />

              {/* Stroke Lines */}
              <path d={bookingsPath} fill="none" stroke="#9333EA" strokeWidth="2.2" strokeLinecap="round" />
              <path d={leadsPath} fill="none" stroke="#16A36A" strokeWidth="2.2" strokeLinecap="round" />

              {/* X-axis Labels */}
              {performanceTrend.map((pt: any, i: number) => {
                const coord = getCoordinates(i, 0);
                return (
                  <text
                    key={pt.date}
                    x={coord.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#94A3B8"
                    fontFamily="sans-serif"
                  >
                    {pt.date}
                  </text>
                );
              })}

              {/* Pinned / Active Hover Vertical Guide Line */}
              {pinnedPt && (
                <g>
                  <line
                    x1={pinnedCoords.x}
                    y1={paddingY}
                    x2={pinnedCoords.x}
                    y2={chartHeight - paddingY}
                    stroke="#16A36A"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  {/* Pinned Bookings Dot */}
                  <circle
                    cx={pinnedBookingCoords.x}
                    cy={pinnedBookingCoords.y}
                    r="4"
                    fill="#9333EA"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  {/* Pinned Leads Dot */}
                  <circle
                    cx={pinnedCoords.x}
                    cy={pinnedCoords.y}
                    r="4.5"
                    fill="#16A36A"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* Invisible interactive hover targets */}
              {performanceTrend.map((_: any, i: number) => {
                const coord = getCoordinates(i, 0);
                return (
                  <rect
                    key={i}
                    x={coord.x - stepX / 2}
                    y={0}
                    width={stepX}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveHoverPoint(i)}
                  />
                );
              })}
            </svg>

            {/* Tooltip Overlay */}
            {pinnedPt && (
              <div
                className="absolute pointer-events-none z-10 transition-all duration-150"
                style={{
                  left: `${(pinnedCoords.x / chartWidth) * 100}%`,
                  top: `${(pinnedCoords.y / chartHeight) * 100}%`,
                  transform: "translate(-50%, -115%)",
                }}
              >
                <div className="bg-[#1E293B] text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg border border-slate-700 whitespace-nowrap">
                  <p className="font-bold text-slate-200">{pinnedPt.date}, 2026</p>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Ad Leads: {pinnedPt.leads}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Bookings: {pinnedPt.bookings}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Visual 2: Ad Spend vs Revenue (ROI Ring Gauge) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-[#E5EAF0]/60">
            <h3 className="text-sm font-bold text-[#111827]">Ad Spend vs Revenue</h3>
          </div>

          <div className="flex items-center justify-center gap-6 my-auto py-2">
            {/* Donut Gauge */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#E9F8F0"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#087A50"
                  strokeWidth="12"
                  strokeDasharray="238.76"
                  strokeDashoffset="48"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold font-sans text-[#111827] leading-none">
                  {roiGauge.roi || "6.46x"}
                </span>
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mt-0.5">
                  ROI
                </span>
              </div>
            </div>

            {/* Revenue / Spend Key-Value Legend */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#087A50]" />
                  <span>Attributed Revenue</span>
                </div>
                <p className="text-base font-bold text-[#111827] ml-4 mt-0.5">
                  {roiGauge.formattedRevenue || "₹79,500"}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#334155]" />
                  <span>Ad Spend</span>
                </div>
                <p className="text-base font-bold text-[#111827] ml-4 mt-0.5">
                  {roiGauge.formattedSpend || "₹12,300"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual 3: Leads by Channel (Breakdown Bars) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-[#E5EAF0]/60">
            <h3 className="text-sm font-bold text-[#111827]">Leads by Channel</h3>
          </div>

          <div className="space-y-3.5 my-auto py-1">
            {channels.map((ch: any) => {
              return (
                <div key={ch.channel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-[#111827]">
                      {ch.platform === "meta" && (
                        <span className="text-[#2563EB] font-bold text-sm leading-none">∞</span>
                      )}
                      {ch.platform === "google" && (
                        <span className="text-[#EA4335] font-bold text-xs leading-none">G</span>
                      )}
                      {ch.platform === "website" && (
                        <Globe className="w-3.5 h-3.5 text-[#16A36A]" />
                      )}
                      {ch.platform === "other" && (
                        <PhoneCall className="w-3.5 h-3.5 text-[#9333EA]" />
                      )}
                      <span className="truncate max-w-[120px]">{ch.channel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#111827]">{ch.leads} Leads</span>
                      <span className="text-[#64748B] text-[11px] min-w-[35px] text-right">
                        {ch.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#087A50] rounded-full transition-all duration-500"
                      style={{ width: `${ch.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Active Campaigns Table + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Active Campaigns Table (approx 65% width / 8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5 pb-3 flex items-center justify-between border-b border-[#E5EAF0]/60">
            <h3 className="text-sm font-bold text-[#111827]">
              Active Campaigns ({activeCampaigns.length})
            </h3>
            <button
              onClick={() => onNavigateTab("campaigns")}
              className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px] bg-[#F8FAFC]">
                  <th className="py-2.5 px-4">Campaign</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Leads</th>
                  <th className="py-2.5 px-3 text-center">Bookings</th>
                  <th className="py-2.5 px-3">Spend</th>
                  <th className="py-2.5 px-3">ROAS</th>
                  <th className="py-2.5 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]/70">
                {activeCampaigns.map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    {/* Thumbnail + Name + ID */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 overflow-hidden text-emerald-700 font-bold text-xs">
                          {camp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#111827] line-clamp-1">{camp.name}</p>
                          <p className="text-[10px] text-[#64748B] font-mono">ID: {camp.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="py-3 px-3">
                      {camp.platform === "meta" ? (
                        <span className="text-[#2563EB] font-bold text-base leading-none" title="Meta (Facebook/Instagram)">
                          ∞
                        </span>
                      ) : (
                        <span className="text-[#EA4335] font-bold text-xs leading-none" title="Google Ads">
                          G
                        </span>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#E9F8F0] text-[#087A50] border border-[#16A36A]/20">
                        Active
                      </span>
                    </td>

                    {/* Leads */}
                    <td className="py-3 px-3 text-center font-bold text-[#111827]">
                      {camp.leads}
                    </td>

                    {/* Bookings */}
                    <td className="py-3 px-3 text-center font-bold text-[#111827]">
                      {camp.bookings}
                    </td>

                    {/* Spend */}
                    <td className="py-3 px-3 font-medium text-[#111827]">
                      {camp.formattedSpend}
                    </td>

                    {/* ROAS Pill */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-[#E9F8F0] text-[#087A50] font-bold text-[11px] border border-[#16A36A]/20">
                        {camp.roas}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3 px-3 text-right relative">
                      <button
                        onClick={() => setCampaignMenuOpen(campaignMenuOpen === camp.id ? null : camp.id)}
                        className="p-1 text-[#64748B] hover:text-[#111827] rounded-md transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {campaignMenuOpen === camp.id && (
                        <div className="absolute right-3 top-8 z-20 w-36 bg-white border border-[#E5EAF0] rounded-xl shadow-lg py-1 text-left">
                          <button
                            onClick={() => {
                              setCampaignMenuOpen(null);
                              onNavigateTab("campaigns");
                            }}
                            className="w-full px-3 py-1.5 text-xs text-[#111827] hover:bg-[#F8FAFC] text-left"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              setCampaignMenuOpen(null);
                              onNavigateTab("attribution");
                            }}
                            className="w-full px-3 py-1.5 text-xs text-[#111827] hover:bg-[#F8FAFC] text-left"
                          >
                            View Leads
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions (approx 35% width / 4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-[#E5EAF0]/60">
            <h3 className="text-sm font-bold text-[#111827]">Quick Actions</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 my-auto">
            {/* Action 1: Create Campaign */}
            <button
              onClick={onCreateCampaign}
              className="p-3.5 rounded-xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] text-left transition-all cursor-pointer group flex flex-col justify-between h-[100px]"
            >
              <div className="w-8 h-8 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] group-hover:text-[#087A50] transition-colors">
                  Create Campaign
                </p>
                <p className="text-[10px] text-[#64748B] line-clamp-1 mt-0.5">
                  Launch a new ad campaign
                </p>
              </div>
            </button>

            {/* Action 2: Sync Meta Leads */}
            <button
              onClick={onSyncMetaLeads}
              disabled={isSyncingMeta}
              className="p-3.5 rounded-xl bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#E9D5FF] text-left transition-all cursor-pointer group flex flex-col justify-between h-[100px] disabled:opacity-60"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
                {isSyncingMeta ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] group-hover:text-[#9333EA] transition-colors">
                  Sync Meta Leads
                </p>
                <p className="text-[10px] text-[#64748B] line-clamp-1 mt-0.5">
                  {isSyncingMeta ? "Syncing..." : "Import leads from Meta Ads"}
                </p>
              </div>
            </button>

            {/* Action 3: Generate UTM */}
            <button
              onClick={() => onNavigateTab("utm")}
              className="p-3.5 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A] text-left transition-all cursor-pointer group flex flex-col justify-between h-[100px]"
            >
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] group-hover:text-[#D97706] transition-colors">
                  Generate UTM
                </p>
                <p className="text-[10px] text-[#64748B] line-clamp-1 mt-0.5">
                  Create tracking links
                </p>
              </div>
            </button>

            {/* Action 4: View Reports */}
            <button
              onClick={() => onNavigateTab("performance")}
              className="p-3.5 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-left transition-all cursor-pointer group flex flex-col justify-between h-[100px]"
            >
              <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] group-hover:text-[#2563EB] transition-colors">
                  View Reports
                </p>
                <p className="text-[10px] text-[#64748B] line-clamp-1 mt-0.5">
                  Detailed performance analytics
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
