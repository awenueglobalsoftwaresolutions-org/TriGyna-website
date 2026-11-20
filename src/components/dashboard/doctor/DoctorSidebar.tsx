"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Calendar,
  Users,
  Stethoscope,
  Pill,
  FileText,
  Clock,
  BarChart2,
  Bell,
  User,
  X,
} from "lucide-react";

export type DoctorTab =
  | "dashboard"
  | "appointments"
  | "patients"
  | "consultations"
  | "prescriptions"
  | "medical-history"
  | "followups"
  | "reports"
  | "notifications"
  | "profile"
  | "communications"
  | "billing";

interface DoctorSidebarProps {
  activeTab: DoctorTab;
  onTabChange: (tab: DoctorTab) => void;
  doctorName?: string;
  doctorDesignation?: string;
  doctorInitials?: string;
  unreadNotifications?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onLogout?: () => void;
}

interface NavItem {
  id: DoctorTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function DoctorSidebar({
  activeTab,
  onTabChange,
  unreadNotifications = 3,
  mobileOpen = false,
  onMobileClose,
  onLogout,
}: DoctorSidebarProps) {
  // Navigation sections strictly matching reference screenshot
  const navSections: NavSection[] = [
    {
      title: "",
      items: [{ id: "dashboard", label: "Dashboard", icon: Home }],
    },
    {
      title: "CLINICAL PRACTICE",
      items: [
        { id: "appointments", label: "My Appointments", icon: Calendar },
        { id: "patients", label: "My Patients", icon: Users },
        { id: "consultations", label: "Consultations", icon: Stethoscope },
        { id: "prescriptions", label: "Prescriptions", icon: Pill },
        { id: "medical-history", label: "Medical History", icon: FileText },
        { id: "followups", label: "Follow-ups", icon: Clock },
      ],
    },
    {
      title: "REPORTS & ACCOUNT",
      items: [
        { id: "reports", label: "My Reports", icon: BarChart2 },
        {
          id: "notifications",
          label: "Notifications",
          icon: Bell,
          badge: unreadNotifications > 0 ? unreadNotifications : 3,
        },
        { id: "profile", label: "My Profile", icon: User },
      ],
    },
  ];

  const content = (
    <div className="h-full flex flex-col justify-between bg-[#064E3B] text-white select-none overflow-y-auto scrollbar-thin">
      <div className="flex flex-col">
        {/* 1. Top Logo Header */}
        <div className="px-5 pt-6 pb-5 flex items-center justify-between">
          <Link
            href="/doctor/dashboard"
            onClick={() => {
              onTabChange("dashboard");
              if (onMobileClose) onMobileClose();
            }}
            className="flex items-center gap-3 group block cursor-pointer"
          >
            <div className="relative h-11 w-44">
              <Image
                src="/images/brand/logo.png"
                alt="TriGyna Women's Health & Wellness"
                fill
                sizes="176px"
                priority
                className="object-contain object-left brightness-0 invert"
              />
            </div>
          </Link>

          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="md:hidden text-white/70 hover:text-white p-1 rounded-lg"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. Structured Navigation Links */}
        <nav
          className="px-3.5 space-y-3.5"
          aria-label="Doctor workspace navigation"
        >
          {navSections.map((sec, secIdx) => (
            <div key={sec.title || secIdx} className="space-y-1">
              {sec.title && (
                <div className="text-[10px] font-bold text-emerald-200/50 uppercase tracking-wider px-3.5 pt-2 pb-1">
                  {sec.title}
                </div>
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeTab === item.id ||
                  (item.id === "profile" && activeTab === "billing") ||
                  (item.id === "patients" && activeTab === "communications");

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      if (onMobileClose) onMobileClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer text-left ${
                      isActive
                        ? "bg-[#0C684B] border border-[#10B981]/30 text-white font-semibold shadow-xs"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isActive ? "text-white" : "text-white/70"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold bg-[#EF4444] text-white rounded-full shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Full Height, 240px matching reference image) */}
      <aside className="hidden md:block w-[240px] h-screen sticky top-0 shrink-0 z-30 shadow-md">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative w-[240px] max-w-[85vw] h-full shadow-2xl z-10 animate-fade-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
}