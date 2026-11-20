"use client";

import React from "react";
import {
  BarChart3,
  Layers,
  Gift,
  Folder,
  Tag,
  Calendar,
  CalendarCheck,
  Settings,
} from "lucide-react";

export type CatalogueSubTab =
  | "overview"
  | "services"
  | "packages"
  | "categories"
  | "price-plans"
  | "availability"
  | "bookings"
  | "settings";

interface CatalogueNavTabsProps {
  activeTab: CatalogueSubTab;
  onTabChange: (tab: CatalogueSubTab) => void;
  serviceCount?: number;
  packageCount?: number;
}

export function CatalogueNavTabs({
  activeTab,
  onTabChange,
  serviceCount,
  packageCount,
}: CatalogueNavTabsProps) {
  const tabs: Array<{
    id: CatalogueSubTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "services", label: "Services", icon: Layers, badge: serviceCount },
    { id: "packages", label: "Packages", icon: Gift, badge: packageCount },
    { id: "categories", label: "Categories", icon: Folder },
    { id: "price-plans", label: "Price Plans", icon: Tag },
    { id: "availability", label: "Availability & Slots", icon: Calendar },
    { id: "bookings", label: "Bookings", icon: CalendarCheck },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
              isActive
                ? "bg-[#087A50] text-white shadow-xs font-semibold"
                : "bg-white text-[#64748B] hover:text-[#111827] hover:bg-[#F1F5F9] border border-transparent hover:border-[#E5EAF0]"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#64748B]"}`} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 text-[#475569]"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

