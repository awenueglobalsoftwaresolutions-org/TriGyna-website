"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  CreditCard,
  UserCheck,
  Building2,
  Briefcase,
  Activity,
  LogOut,
  Menu,
  X,
  Bell,
  Stethoscope,
  HeartPulse,
  ClipboardList,
  Sparkles,
  RefreshCw,
  FolderLock,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth/authContext";
import { api } from "@/lib/api/client";

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface DashboardShellProps {
  role: "admin" | "doctor" | "reception" | "patient";
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  customNavItems?: NavItem[];
  actions?: React.ReactNode;
}

export default function DashboardShell({
  role,
  title,
  subtitle,
  children,
  activeTab,
  onTabChange,
  customNavItems,
  actions,
}: DashboardShellProps) {
  const { user, logout, isOwner } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState<"checking" | "online" | "degraded">("checking");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<Array<{ _id: string; title: string; message: string; createdAt: string }>>([]);

  // Live health check against backend API (NO hardcoded IP strings)
  const checkHealth = async () => {
    try {
      const res = await api.get<{ status: string }>("/health");
      if (res.data?.status === "ok" || res.status === 200) {
        setBackendHealth("online");
      } else {
        setBackendHealth("degraded");
      }
    } catch {
      setBackendHealth("degraded");
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 45000); // Re-check every 45s
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications feed
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get<{ notifications: Array<{ _id: string; title: string; message: string; isRead: boolean; createdAt: string }> }>("/notifications?limit=5");
        if (res.data?.notifications) {
          setRecentNotifications(res.data.notifications);
          const unread = res.data.notifications.filter((n) => !n.isRead).length;
          setUnreadNotifications(unread);
        }
      } catch {
        // Fallback silently if notifications route isn't available
      }
    };
    fetchNotifications();
  }, []);

  // Default navigation per role if custom nav is not supplied
  const getDefaultNavItems = (): NavItem[] => {
    switch (role) {
      case "admin":
        return [
          { id: "overview", label: "Overview & KPIs", icon: LayoutDashboard },
          { id: "users", label: "User Directory & RBAC", icon: Users },
          { id: "approvals", label: "Approvals & HRMS", icon: UserCheck },
          { id: "audit", label: "Security & Audit Logs", icon: FolderLock },
          { id: "crm", label: "CRM Leads & Pipeline", icon: Briefcase },
          { id: "organization", label: "Clinic & Facilities", icon: Building2 },
          { id: "billing", label: "Invoices & Revenue", icon: CreditCard },
          { id: "appointments", label: "Master Appointments", icon: Calendar },
        ];
      case "doctor":
        return [
          { id: "encounters", label: "Today's Encounters", icon: Stethoscope },
          { id: "patients", label: "Assigned Patients", icon: Users },
          { id: "records", label: "Clinical Records", icon: ClipboardList },
          { id: "prescriptions", label: "Prescription Builder", icon: HeartPulse },
        ];
      case "reception":
        return [
          { id: "intake", label: "Patient Registration", icon: Users },
          { id: "booking", label: "Book Appointment", icon: Calendar },
          { id: "queue", label: "Waiting Room Queue", icon: Activity },
          { id: "billing", label: "POS Billing & Invoicing", icon: CreditCard },
        ];
      case "patient":
        return [
          { id: "records", label: "My Health Records", icon: HeartPulse },
          { id: "appointments", label: "My Appointments", icon: Calendar },
          { id: "prescriptions", label: "Digital Prescriptions", icon: FileText },
          { id: "invoices", label: "Invoices & Receipts", icon: CreditCard },
        ];
    }
  };

  const navItems = customNavItems || getDefaultNavItems();

  const handleNavClick = (itemId: string, href?: string) => {
    if (href) {
      // Let next/link handle route navigation
    } else if (onTabChange) {
      onTabChange(itemId);
    }
    setMobileMenuOpen(false);
  };

  const roleLabel = isOwner
    ? "Super Admin (Owner)"
    : role === "admin"
    ? "Administrator"
    : role === "doctor"
    ? "Doctor Specialist"
    : role === "reception"
    ? "Front Desk / Reception"
    : "Patient";

  const roleBadgeColor = isOwner
    ? "bg-purple-100 text-purple-800 border-purple-200"
    : role === "admin"
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : role === "doctor"
    ? "bg-blue-100 text-blue-800 border-blue-200"
    : role === "reception"
    ? "bg-teal-100 text-teal-800 border-teal-200"
    : "bg-amber-100 text-amber-800 border-amber-200";

  return (
    <div className="min-h-screen bg-[#F9F7F1] text-[#17221D] flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-[#E8E2D6] px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-8 w-28">
            <Image src="/images/brand/logo.png" alt="TriGyna" fill priority className="object-contain" />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium bg-gray-50 border border-gray-200">
            <span
              className={`w-2 h-2 rounded-full ${
                backendHealth === "online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="capitalize">{backendHealth}</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-[#154734] hover:bg-[#F9F7F1] border border-[#E8E2D6] cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-[#E8E2D6] shrink-0 min-h-screen sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#E8E2D6]/80 flex items-center justify-between">
          <Link href="/" className="block">
            <div className="relative h-10 w-36">
              <Image src="/images/brand/logo.png" alt="TriGyna Healthcare" fill priority className="object-contain" />
            </div>
          </Link>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase bg-[#F9F7F1] border-[#E8E2D6] text-[#154734]">
            {role.toUpperCase()}
          </span>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-[#F9F7F1] border border-[#E8E2D6] rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-[#17221D] truncate leading-tight">{user?.name}</h4>
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.2 rounded-full border mt-1 truncate ${roleBadgeColor}`}>
                {roleLabel}
              </span>
              <p className="text-[10px] text-[#626B63] truncate mt-0.5">{user?.email || user?.phone}</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab ? activeTab === item.id : item.href === pathname;

            return item.href ? (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#154734] text-white shadow-sm"
                    : "text-[#626B63] hover:text-[#17221D] hover:bg-[#F9F7F1]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#154734]"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#154734] text-white shadow-sm"
                    : "text-[#626B63] hover:text-[#17221D] hover:bg-[#F9F7F1]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#154734]"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Live Health Indicator & Logout */}
        <div className="p-4 border-t border-[#E8E2D6]/80 space-y-2.5">
          {/* Health indicator without hardcoded IP */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#F9F7F1] border border-[#E8E2D6] rounded-xl text-[11px]">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth === "online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="text-[#626B63] font-medium">
                {backendHealth === "online" ? "Clinical Core Online" : "Service Offline"}
              </span>
            </div>
            <button
              type="button"
              onClick={checkHealth}
              title="Refresh API Health"
              className="text-gray-400 hover:text-[#154734] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#E8E2D6] bg-white hover:bg-red-50 hover:border-red-200 text-xs font-semibold text-[#626B63] hover:text-red-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full flex flex-col z-10 shadow-2xl">
            <div className="p-4 border-b border-[#E8E2D6] flex items-center justify-between">
              <div className="relative h-8 w-28">
                <Image src="/images/brand/logo.png" alt="TriGyna" fill priority className="object-contain" />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F9F7F1] border-b border-[#E8E2D6]">
              <p className="text-xs font-bold text-[#17221D]">{user?.name}</p>
              <span className={`inline-block text-[9px] font-semibold px-2 py-0.2 rounded-full border mt-0.5 ${roleBadgeColor}`}>
                {roleLabel}
              </span>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab ? activeTab === item.id : item.href === pathname;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id, item.href)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-[#154734] text-white"
                        : "text-[#626B63] hover:bg-[#F9F7F1]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#E8E2D6] space-y-2">
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-[#E8E2D6] px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17221D] tracking-tight">{title}</h1>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                Verified EHR
              </span>
            </div>
            {subtitle && <p className="text-xs sm:text-sm text-[#626B63] mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Live Backend Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F9F7F1] border border-[#E8E2D6] text-xs font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth === "online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="text-[#626B63]">
                {backendHealth === "online" ? "System Live" : "API Degraded"}
              </span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl border border-[#E8E2D6] bg-white hover:bg-[#F9F7F1] text-[#626B63] hover:text-[#154734] relative cursor-pointer transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-[#E8E2D6] rounded-2xl shadow-xl p-3 z-50 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8E2D6]">
                    <span className="text-xs font-bold text-[#17221D]">Notifications Feed</span>
                    <span className="text-[10px] text-[#626B63] bg-[#F9F7F1] px-2 py-0.5 rounded-md border border-[#E8E2D6]">
                      Real-time
                    </span>
                  </div>
                  {recentNotifications.length > 0 ? (
                    <div className="space-y-2">
                      {recentNotifications.map((notif) => (
                        <div key={notif._id} className="p-2 bg-[#F9F7F1] rounded-xl text-left border border-[#E8E2D6]/60">
                          <p className="text-xs font-bold text-[#17221D]">{notif.title}</p>
                          <p className="text-[11px] text-[#626B63] mt-0.5 leading-relaxed">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#626B63] text-center py-4">No new notifications</p>
                  )}
                </div>
              )}
            </div>

            {/* Custom page actions */}
            {actions}

            {/* Return to website */}
            <Link
              href="/"
              target="_blank"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E2D6] bg-white hover:bg-[#F9F7F1] text-xs font-semibold text-[#154734] transition-colors"
              title="Open public website in new tab"
            >
              <span>TriGyna.com</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
