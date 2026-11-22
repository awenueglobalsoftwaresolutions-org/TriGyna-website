"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Filter,
  User,
  Clock,
  Calendar,
  Layers,
  CreditCard,
  MessageSquare,
  BarChart2,
  Users2,
  BookOpen,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Sprout,
  Headphones,
  ArrowRight,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth/authContext";
import { SalesSupportModal } from "./SalesSupportModal";

interface SalesDashboardShellProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onOpenAddLeadModal: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  children: React.ReactNode;
}

export function SalesDashboardShell({
  activeTab,
  onTabChange,
  onOpenAddLeadModal,
  searchQuery,
  setSearchQuery,
  dateRange,
  setDateRange,
  children,
}: SalesDashboardShellProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  const showNotification = (message: string, isError = false) => {
    setToastNotification({ message, isError });
    setTimeout(() => setToastNotification(null), 4000);
  };

  // Global Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("sales-global-search");
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 11 Navigation items in exact order (Section 5)
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "leads", label: "Leads & Pipeline", icon: Filter },
    { id: "my-leads", label: "My Leads", icon: User },
    { id: "followups", label: "Follow-ups", icon: Clock },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "packages", label: "Packages & Plans", icon: Layers },
    { id: "invoices", label: "Payments & Invoices", icon: CreditCard },
    { id: "whatsapp", label: "Communication", icon: MessageSquare },
    { id: "reports", label: "Reports & Analytics", icon: BarChart2 },
    { id: "team", label: "Team & Targets", icon: Users2 },
    { id: "resources", label: "Resources", icon: BookOpen },
  ];

  const dateLabels: Record<string, string> = {
    today: "Today",
    yesterday: "Yesterday",
    week: "Last 7 Days",
    month: "Oct 1, 2026 – Oct 31, 2026",
    last_month: "Last Month (September 2026)",
    all: "All Time Pipeline",
  };

  const displayName = user?.name || "Sushil Kumar";
  const displayRole = user?.role === "sales" ? "Sales Executive" : user?.role === "owner" ? "Super Admin (Owner)" : "Sales Executive";

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#F7F9F8] flex flex-col md:flex-row text-[#172033] font-sans antialiased overflow-hidden dashboard-font-reset">
      {/* Toast Alert */}
      {toastNotification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold border shadow-lg transition-all animate-slide-down ${
            toastNotification.isError
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-emerald-50 text-[#159447] border-emerald-200"
          }`}
        >
          <span>{toastNotification.message}</span>
        </div>
      )}

      {/* Support Request Modal */}
      <SalesSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        showNotification={showNotification}
      />

      {/* Mobile Top Navigation */}
      <div className="md:hidden bg-[#062D25] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-[#073B2E] shadow-md">
        <Link href="/sales/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#159447] flex items-center justify-center text-white font-bold">
            <Sprout className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-serif font-bold text-base tracking-wide text-white block leading-tight">TriGyna</span>
            <span className="text-[9px] text-[#A7F3D0] tracking-wider uppercase block">Sales CRM</span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-white hover:bg-white/10 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Dark Green Sidebar (#062D25 / #073B2E) */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen h-[100dvh] max-h-screen w-68 bg-[#062D25] text-white flex flex-col justify-between shrink-0 transition-transform duration-300 overflow-hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } shadow-xl md:shadow-none border-r border-[#073B2E]`}
      >
        <div className="flex flex-col h-full overflow-hidden justify-between">
          <div>
            {/* 1. TriGyna Brand Header with Logo */}
            <div className="p-5 border-b border-white/10 shrink-0">
              <Link href="/sales/dashboard" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#159447] to-[#22C55E] flex items-center justify-center text-white shadow-sm shrink-0">
                  <Sprout className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="font-serif font-bold text-xl tracking-wide text-white block leading-tight group-hover:text-[#A7F3D0] transition-colors">
                    TriGyna
                  </span>
                  <span className="text-[9px] text-[#A7F3D0] tracking-widest uppercase font-semibold block">
                    WOMEN | HEALTH | WELLNESS
                  </span>
                </div>
              </Link>

              {/* Sales Team Role Badge */}
              <div className="mt-4 flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-full bg-[#159447] text-white flex items-center justify-center text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">Sales Team</p>
                  <p className="text-[10px] text-[#A7F3D0] truncate">Sales CRM &amp; Lead Management</p>
                </div>
              </div>
            </div>

            {/* 2. Navigation Items (Exact 11 in order) */}
            <nav className="px-3 py-3 space-y-1 overflow-y-auto max-h-[calc(100vh-340px)] scrollbar-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                      isActive
                        ? "bg-[#E5F4E8] text-[#073B2E] shadow-sm font-bold"
                        : "text-[#D1D5DB] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#073B2E]" : "text-[#9CA3AF]"}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 3. Bottom Section: CRM Support Widget & User Card */}
          <div className="p-3 border-t border-white/10 shrink-0 space-y-3">
            {/* CRM Support Card */}
            <div className="p-3.5 rounded-2xl bg-[#073B2E] border border-white/10 text-white space-y-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#A7F3D0]">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">CRM Support</p>
                <p className="text-[11px] text-[#A7F3D0]/90 mt-0.5 leading-snug">Get help from Admin or CRM team.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(true)}
                className="w-full mt-1 px-3 py-1.5 rounded-full bg-white hover:bg-[#E5F4E8] text-[#073B2E] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Raise a Request</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* User Profile Mini Bar */}
            <div className="relative">
              <div
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#159447] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {displayName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-[#A7F3D0] truncate">{displayRole}</p>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              </div>

              {userDropdownOpen && (
                <div className="absolute bottom-12 left-0 right-0 bg-white text-[#172033] rounded-2xl shadow-xl border border-[#E5EBE8] p-2 z-50 text-xs animate-fade-in space-y-1">
                  <div className="p-2 border-b border-gray-100">
                    <p className="font-bold text-[#172033]">{displayName}</p>
                    <p className="text-[10px] text-[#718096] truncate">{user?.email || user?.phone || ""}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange("settings");
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-500" />
                    <span>CRM Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 text-red-600 rounded-lg flex items-center gap-2 font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 h-screen h-[100dvh] flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar Matching Reference Screenshot */}
        <header className="sticky top-0 z-30 shrink-0 bg-white border-b border-[#E5EBE8] px-5 sm:px-8 py-3 flex items-center justify-between gap-4 shadow-2xs">
          {/* Global Search Bar (Ctrl + K) */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="sales-global-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads, patients, phone number, packages..."
              className="w-full pl-9 pr-16 py-2 rounded-xl border border-[#E5EBE8] bg-[#F7F9F8] text-xs text-[#172033] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#159447] focus:bg-white transition-all shadow-2xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <span className="text-[10px] font-mono font-semibold text-gray-400 bg-white px-1.5 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                Ctrl + K
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Date Range Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                className="px-3.5 py-2 rounded-xl border border-[#E5EBE8] bg-white hover:bg-gray-50 text-xs font-semibold text-[#172033] flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-[#718096]" />
                <span className="hidden sm:inline">{dateLabels[dateRange] || dateLabels.month}</span>
                <span className="sm:hidden">Oct 2026</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#718096]" />
              </button>

              {dateDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5EBE8] rounded-2xl shadow-xl p-2 z-40 text-xs animate-fade-in space-y-1">
                  {[
                    { id: "today", label: "Today" },
                    { id: "yesterday", label: "Yesterday" },
                    { id: "week", label: "Last 7 Days" },
                    { id: "month", label: "This Month (Oct 1, 2026 – Oct 31, 2026)" },
                    { id: "last_month", label: "Last Month (September 2026)" },
                    { id: "all", label: "All Time Pipeline" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDateRange(d.id);
                        setDateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl font-medium cursor-pointer ${
                        dateRange === d.id ? "bg-[#E5F4E8] text-[#159447] font-bold" : "hover:bg-gray-50 text-[#172033]"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell with Red Badge "3" */}
            <button
              type="button"
              onClick={() => onTabChange("notifications")}
              className="relative p-2 rounded-xl text-[#718096] hover:text-[#172033] hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center">
                3
              </span>
            </button>

            {/* WhatsApp Direct Hub Button */}
            <button
              type="button"
              onClick={() => onTabChange("whatsapp")}
              className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
              title="Open WhatsApp Communication Desk"
            >
              <div className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[11px] font-bold">
                <MessageSquare className="w-3 h-3 fill-white" />
              </div>
            </button>

            {/* User Profile Header Badge Matching Screenshot */}
            <div
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 pl-2 border-l border-[#E5EBE8] cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#159447] to-[#22C55E] text-white font-bold text-xs flex items-center justify-center shadow-xs border border-white overflow-hidden relative shrink-0">
                <Image
                  src="/images/testimonials/patient-1.webp"
                  alt={displayName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  {displayName.charAt(0)}
                </span>
              </div>
              <div className="hidden lg:block text-left min-w-0">
                <p className="text-xs font-bold text-[#172033] leading-tight group-hover:text-[#159447] transition-colors truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-[#718096] leading-tight truncate">{displayRole}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 p-5 sm:p-7 overflow-y-auto overflow-x-hidden min-w-0 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
