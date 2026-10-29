"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  Pill,
  Clock,
  FileText,
  BarChart3,
  Bell,
  User,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";

export type DoctorTab =
  | "dashboard"
  | "appointments"
  | "patients"
  | "consultations"
  | "prescriptions"
  | "followups"
  | "medical-history"
  | "reports"
  | "notifications"
  | "profile";

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

export function DoctorSidebar({
  activeTab,
  onTabChange,
  doctorName = "Dr. Ananya Sharma",
  doctorDesignation = "Obstetrician & Gynecologist",
  doctorInitials = "AS",
  unreadNotifications = 3,
  mobileOpen = false,
  onMobileClose,
  onLogout,
}: DoctorSidebarProps) {
  const navItems: Array<{ id: DoctorTab; label: string; icon: React.ElementType; badge?: number }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "appointments", label: "My Appointments", icon: Calendar },
    { id: "patients", label: "My Patients", icon: Users },
    { id: "consultations", label: "Consultations", icon: Stethoscope },
    { id: "prescriptions", label: "Prescriptions", icon: Pill },
    { id: "followups", label: "Follow-ups", icon: Clock },
    { id: "medical-history", label: "Medical History", icon: FileText },
    { id: "reports", label: "My Reports", icon: BarChart3 },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotifications },
    { id: "profile", label: "My Profile", icon: User },
  ];

  const content = (
    <div className="h-full flex flex-col justify-between bg-[#154734] text-white select-none">
      {/* Top Header / Logo */}
      <div>
        <div className="px-5 py-6 flex items-center justify-between border-b border-white/10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-11 w-36">
              <Image
                src="/images/brand/logo.png"
                alt="TriGyna"
                fill
                sizes="144px"
                priority
                className="object-contain brightness-0 invert"
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

        {/* Navigation list */}
        <nav className="px-3 py-4 space-y-1" aria-label="Clinical workspace navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  if (onMobileClose) onMobileClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer text-left ${
                  isActive
                    ? "bg-[#1E5641] text-white shadow-xs font-semibold"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
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
                  <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold bg-[#E11D48] text-white rounded-full shadow-xs">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Authenticated Doctor Profile Card */}
      <div className="p-3 border-t border-white/10">
        <div
          onClick={() => {
            onTabChange("profile");
            if (onMobileClose) onMobileClose();
          }}
          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xs font-bold text-white shrink-0 tracking-wider">
              {doctorInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-emerald-200">
                {doctorName}
              </p>
              <p className="text-[10px] text-white/60 truncate leading-tight mt-0.5">
                {doctorDesignation}
              </p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:text-rose-200 hover:bg-rose-900/20 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Workspace</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Full Height) */}
      <aside className="hidden md:block w-60 h-screen sticky top-0 shrink-0 z-30 shadow-md">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative w-64 max-w-[85vw] h-full shadow-2xl z-10 animate-fade-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
