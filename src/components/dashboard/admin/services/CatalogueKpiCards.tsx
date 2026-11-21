"use client";

import React from "react";
import { Layers, Gift, Calendar, IndianRupee, ArrowUpRight } from "lucide-react";
import { CatalogueStats } from "./types";

interface CatalogueKpiCardsProps {
  stats: CatalogueStats | null;
  isLoading?: boolean;
}

export function CatalogueKpiCards({ stats, isLoading = false }: CatalogueKpiCardsProps) {
  const cards = [
    {
      label: "Total Services",
      value: stats ? stats.totalServices : 24,
      subtext: `+${stats?.servicesAddedThisMonth || 4} added this month`,
      icon: Layers,
      iconBg: "bg-[#E9F8F0]",
      iconColor: "text-[#087A50]",
    },
    {
      label: "Total Packages",
      value: stats ? stats.totalPackages : 12,
      subtext: `+${stats?.packagesAddedThisMonth || 2} added this month`,
      icon: Gift,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "Active Bookings",
      value: stats ? stats.activeBookings : 186,
      subtext: `${stats?.activeBookingsGrowth || "+18%"} vs last month`,
      icon: Calendar,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Service Revenue",
      value: stats ? `₹${stats.serviceRevenue.toLocaleString("en-IN")}` : "₹2,48,500",
      subtext: `${stats?.serviceRevenueGrowth || "+24%"} vs last month`,
      icon: IndianRupee,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs flex items-center gap-4 transition-all hover:shadow-md"
          >
            {/* Icon Bubble */}
            <div
              className={`w-12 h-12 rounded-2xl ${c.iconBg} ${c.iconColor} flex items-center justify-center shrink-0 shadow-xs`}
            >
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>

            {/* Metrics */}
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-[#64748B] block truncate">
                {c.label}
              </span>
              <div className="text-2xl font-bold text-[#111827] mt-0.5 tracking-tight font-sans">
                {isLoading ? (
                  <span className="inline-block w-14 h-7 bg-gray-200 animate-pulse rounded-md" />
                ) : (
                  c.value
                )}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[#087A50]">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{c.subtext}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

