"use client";

import React, { useState } from "react";
import { TrendingUp, ChevronDown } from "lucide-react";
import { PerformanceTrendData } from "./salesTeamTypes";

interface SalesTeamPerformanceTrendProps {
  trendData: PerformanceTrendData | null;
  loading?: boolean;
  selectedRange: string;
  onRangeChange: (range: string) => void;
}

export const SalesTeamPerformanceTrend: React.FC<SalesTeamPerformanceTrendProps> = ({
  trendData,
  loading = false,
  selectedRange,
  onRangeChange,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const labels = trendData?.labels || ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const leadsSeries = trendData?.leadsSeries || [45, 50, 90, 135, 175, 210];
  const conversionsSeries = trendData?.conversionsSeries || [30, 32, 38, 46, 62, 76];

  // Chart coordinate space
  const chartWidth = 520;
  const chartHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;

  const width = chartWidth - padLeft - padRight;
  const height = chartHeight - padTop - padBottom;

  const maxY = 250;
  const yTicks = [0, 50, 100, 150, 200, 250];

  const getX = (idx: number) => {
    if (labels.length <= 1) return padLeft + width / 2;
    return padLeft + (idx / (labels.length - 1)) * width;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxY));
    return padTop + height - (clamped / maxY) * height;
  };

  // Build SVG path with smooth bezier curves
  const makeSmoothPath = (series: number[]) => {
    if (series.length === 0) return "";
    let d = `M ${getX(0)} ${getY(series[0])}`;

    for (let i = 0; i < series.length - 1; i++) {
      const x0 = getX(i);
      const y0 = getY(series[i]);
      const x1 = getX(i + 1);
      const y1 = getY(series[i + 1]);

      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  const leadsPath = makeSmoothPath(leadsSeries);
  const convPath = makeSmoothPath(conversionsSeries);

  // Closed area paths for subtle gradient fills
  const leadsAreaPath = `${leadsPath} L ${getX(labels.length - 1)} ${padTop + height} L ${getX(0)} ${padTop + height} Z`;
  const convAreaPath = `${convPath} L ${getX(labels.length - 1)} ${padTop + height} L ${getX(0)} ${padTop + height} Z`;

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs flex flex-col justify-between h-full">
      {/* Header with Title, Legend & Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="text-[#087A50]">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-bold text-[#111827]">Team Performance Trend</h2>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-medium text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A36A]" />
              <span>Leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA]" />
              <span>Conversions</span>
            </div>
          </div>

          {/* Range Dropdown */}
          <div className="relative">
            <select
              value={selectedRange}
              onChange={(e) => onRangeChange(e.target.value)}
              className="appearance-none bg-white border border-[#E5EAF0] text-xs font-semibold text-[#111827] pl-3 pr-7 py-1.5 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#087A50] cursor-pointer shadow-2xs"
            >
              <option value="last_6_months">Last 6 Months</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="this_month">This Month</option>
              <option value="last_12_months">Last 12 Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-56 select-none">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50/50 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-[#087A50] animate-ping" />
              Loading trend analytics...
            </div>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A36A" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#16A36A" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="convGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9333EA" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#9333EA" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Y-Axis labels */}
            {yTicks.map((tick) => {
              const y = getY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + width}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                    strokeDasharray={tick === 0 ? "none" : "3,3"}
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] fill-[#94A3B8] font-sans select-none"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* X-Axis labels */}
            {labels.map((label, idx) => {
              const x = getX(idx);
              const isHovered = hoveredIdx === idx;
              return (
                <text
                  key={idx}
                  x={x}
                  y={padTop + height + 18}
                  textAnchor="middle"
                  className={`text-[10px] select-none font-medium transition-colors ${
                    isHovered ? "fill-[#111827] font-bold" : "fill-[#64748B]"
                  }`}
                >
                  {label}
                </text>
              );
            })}

            {/* Shaded Areas */}
            <path d={leadsAreaPath} fill="url(#leadsGradient)" />
            <path d={convAreaPath} fill="url(#convGradient)" />

            {/* Connecting Lines */}
            <path
              d={leadsPath}
              fill="none"
              stroke="#16A36A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={convPath}
              fill="none"
              stroke="#9333EA"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Circular data points & interactive hover triggers */}
            {labels.map((_, idx) => {
              const x = getX(idx);
              const yLeads = getY(leadsSeries[idx] || 0);
              const yConv = getY(conversionsSeries[idx] || 0);
              const isHovered = hoveredIdx === idx;

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                >
                  {/* Vertical hover indicator */}
                  {isHovered && (
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={padTop + height}
                      stroke="#94A3B8"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  )}

                  {/* Leads circle */}
                  <circle
                    cx={x}
                    cy={yLeads}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#FFFFFF"
                    stroke="#16A36A"
                    strokeWidth={isHovered ? "2.5" : "2"}
                    className="transition-all"
                  />

                  {/* Conversions circle */}
                  <circle
                    cx={x}
                    cy={yConv}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#FFFFFF"
                    stroke="#9333EA"
                    strokeWidth={isHovered ? "2.5" : "2"}
                    className="transition-all"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Floating Tooltip */}
        {hoveredIdx !== null && (
          <div
            className="absolute -top-3 z-20 pointer-events-none transform -translate-x-1/2 bg-[#111827] text-white px-3 py-2 rounded-xl shadow-xl text-xs space-y-0.5 border border-gray-700 font-sans"
            style={{
              left: `${(getX(hoveredIdx) / chartWidth) * 100}%`,
            }}
          >
            <div className="font-bold text-gray-200 border-b border-gray-700 pb-1 mb-1">
              {labels[hoveredIdx]}
            </div>
            <div className="flex items-center justify-between gap-3 text-[#16A36A]">
              <span>Leads:</span>
              <span className="font-bold">{leadsSeries[hoveredIdx]}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#C084FC]">
              <span>Conversions:</span>
              <span className="font-bold">{conversionsSeries[hoveredIdx]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
