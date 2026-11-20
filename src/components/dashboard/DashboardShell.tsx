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
  Briefcase,
  Activity,
  LogOut,
  Menu,
  X,
  Bell,
  Stethoscope,
  HeartPulse,
  ClipboardList,
  ArrowUpRight,
  MessageSquare,
  Clock,
  BarChart3,
  Sliders,
  Search,
  ChevronDown,
  Building2,
  ShieldCheck,
  Layers,
  Megaphone,
  CheckSquare,
  CalendarDays,
  UserPlus,
  Receipt,
  Headphones,
  MapPin,
  Sparkles,
  Award,
} from "lucide-react";
import { useAuth } from "@/lib/auth/authContext";
import { api } from "@/lib/api/client";

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: string | number;
  section?: string;
}

interface DashboardShellProps {
  role: "admin" | "doctor" | "sales" | "patient" | "reception";
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  customNavItems?: NavItem[];
  actions?: React.ReactNode;
}

export function DashboardShell({
  role,
  title,
  subtitle,
  children,
  activeTab,
  onTabChange,
  customNavItems,
  actions,
}: DashboardShellProps) {
  const displayTitle =
    title ||
    (role === "admin"
      ? "Admin Management Console"
      : role === "doctor"
      ? "Doctor Clinical Practice"
      : role === "sales"
      ? "Sales & CRM Command Center"
      : role === "reception"
      ? "Front Desk & Intake"
      : "Personal Patient Portal");
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
      if (res.data?.status === "ok" || res.success) {
        setBackendHealth("online");
      } else {
        setBackendHealth("degraded");
      }
    } catch {
      setBackendHealth("degraded");
    }
  };

  useEffect(() => {
    let isMounted = true;
    api
      .get<{ status: string }>("/health")
      .then((res) => {
        if (!isMounted) return;
        setBackendHealth(res.data?.status === "ok" || res.success ? "online" : "degraded");
      })
      .catch(() => {
        if (!isMounted) return;
        setBackendHealth("degraded");
      });

    const interval = setInterval(() => {
      checkHealth();
    }, 45000); // Re-check every 45s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  // Default navigation per role if custom nav is not supplied
  const getDefaultNavItems = (): NavItem[] => {
    switch (role) {
      case "admin":
        return [
          // Clinical Core
          { id: "overview", label: "Dashboard", icon: LayoutDashboard, section: "Clinical Core" },
          { id: "appointments", label: "Appointments", icon: Calendar, section: "Clinical Core" },
          { id: "doctors", label: "Doctors Roster", icon: Stethoscope, section: "Clinical Core" },
          { id: "consultations", label: "Consultations", icon: FileText, section: "Clinical Core" },
          { id: "patients", label: "Patients", icon: HeartPulse, section: "Clinical Core" },
          { id: "followups", label: "Follow-ups", icon: Clock, section: "Clinical Core" },
          { id: "calendar", label: "Master Calendar", icon: CalendarDays, section: "Clinical Core" },

          // Growth & CRM
          { id: "crm", label: "CRM & Leads", icon: Briefcase, section: "Growth & CRM" },
          { id: "sales", label: "Sales Team", icon: Award, section: "Growth & CRM" },
          { id: "whatsapp", label: "Communication", icon: MessageSquare, section: "Growth & CRM" },
          { id: "marketing", label: "Marketing & Ads", icon: Megaphone, section: "Growth & CRM" },
          { id: "services", label: "Services Catalogue", icon: Layers, section: "Growth & CRM" },

          // Operations & HR
          { id: "billing", label: "Billing & Payments", icon: CreditCard, section: "Operations & HR" },
          { id: "hrms", label: "HRMS & Team", icon: UserCheck, section: "Operations & HR" },
          { id: "approvals", label: "Approval Centre", icon: CheckSquare, section: "Operations & HR" },
          { id: "tasks", label: "Tasks & Tickets", icon: ClipboardList, section: "Operations & HR" },
          { id: "reports", label: "Reports & Analytics", icon: BarChart3, section: "Operations & HR" },

          // Governance & System
          { id: "users", label: "Staff & RBAC", icon: Users, section: "Governance & System" },
          { id: "organization", label: "Clinic Branches", icon: Building2, section: "Governance & System" },
          { id: "audit", label: "Audit Logs", icon: ShieldCheck, section: "Governance & System" },
          { id: "integrations", label: "Settings", icon: Sliders, section: "Governance & System" },
        ];
      case "doctor":
        return [
          { id: "encounters", label: "Today's Encounters", icon: Stethoscope },
          { id: "patients", label: "Assigned Patients", icon: Users },
          { id: "records", label: "Clinical Records", icon: ClipboardList },
          { id: "prescriptions", label: "Prescription Builder", icon: HeartPulse },
        ];
      case "sales":
        return [
          { id: "pipeline", label: "Pipeline & Kanban", icon: Briefcase },
          { id: "leads", label: "Leads Directory", icon: Users },
          { id: "followups", label: "Follow-up Tasks", icon: Clock },
          { id: "packages", label: "Package Catalog", icon: Layers },
          { id: "analytics", label: "Conversion Analytics", icon: BarChart3 },
        ];
      case "reception":
        return [
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "registration", label: "Patient Registration", icon: UserPlus },
          { id: "patients", label: "Patients", icon: Users },
          { id: "appointments", label: "Appointments", icon: Calendar },
          { id: "queue", label: "Check-in & Queue", icon: Activity },
          { id: "billing", label: "Billing & Payments", icon: CreditCard },
          { id: "receipts", label: "Receipts", icon: Receipt },
          { id: "calendar", label: "Calendar", icon: CalendarDays },
          { id: "doctors", label: "Doctors", icon: Stethoscope },
          { id: "services", label: "Services", icon: Layers },
          { id: "notifications", label: "Notifications", icon: Bell, badge: 3 },
          { id: "support", label: "Patient Support", icon: Headphones },
          { id: "reports", label: "Reports", icon: BarChart3 },
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
    : role === "sales"
    ? "Sales Executive / CRM"
    : role === "reception"
    ? "Front Desk / Reception"
    : "Patient";

  const roleBadgeColor = isOwner
    ? "bg-purple-100 text-purple-800 border-purple-200"
    : role === "admin"
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : role === "doctor"
    ? "bg-blue-100 text-blue-800 border-blue-200"
    : role === "sales"
    ? "bg-amber-100 text-amber-900 border-amber-300"
    : role === "reception"
    ? "bg-teal-100 text-teal-800 border-teal-200"
    : "bg-amber-100 text-amber-800 border-amber-200";

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#F9F7F1] text-[#17221D] flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-[#E8E2D6] px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-8 w-28">
            <Image src="/images/brand/logo.png" alt="TriGyna" fill sizes="112px" priority className="object-contain" />
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
      <aside className="hidden md:flex flex-col w-64 lg:w-68 bg-white border-r border-[#E2E9E3] shrink-0 h-screen h-[100dvh] max-h-screen overflow-hidden z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#E2E9E3] flex items-center justify-between">
          <Link href="/" className="block">
            <div className="relative h-10 w-36">
              <Image src="/images/brand/logo.png" alt="TriGyna Healthcare" fill sizes="144px" priority className="object-contain" />
            </div>
          </Link>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase bg-[#F7F9F7] border-[#E2E9E3] text-[#154734]">
            {role.toUpperCase()}
          </span>
        </div>

        {/* User Card (non-admin roles) */}
        {role !== "admin" && (
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
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isSelected = activeTab ? activeTab === item.id : item.href === pathname;
            const showSection = item.section && (index === 0 || navItems[index - 1].section !== item.section);

            const selectedClass = "bg-[#154734] text-white shadow-xs";
            const unselectedClass = "text-[#626B63] hover:text-[#17221D] hover:bg-[#F7F9F7]";
            const iconSelected = "text-white";
            const iconUnselected = "text-[#154734]";

            return (
              <React.Fragment key={item.id}>
                {showSection && (
                  <div className="pt-3.5 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[#68756D]/70 font-mono">
                    {item.section}
                  </div>
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isSelected ? selectedClass : unselectedClass
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isSelected ? iconSelected : iconUnselected}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold ${
                          item.id === "notifications"
                            ? "w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0"
                            : isSelected
                            ? "px-2 py-0.5 rounded-full bg-white/20 text-white"
                            : "px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                      isSelected ? selectedClass : unselectedClass
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isSelected ? iconSelected : iconUnselected}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold ${
                          item.id === "notifications"
                            ? "w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0"
                            : isSelected
                            ? "px-2 py-0.5 rounded-full bg-white/20 text-white"
                            : "px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Botanical Promo Card */}
        <div className="mx-3.5 my-2.5 p-3.5 rounded-2xl bg-gradient-to-br from-[#E8F3EC] via-[#DFEFE5] to-[#D5EADC] border border-[#C6E2D1] shadow-2xs relative overflow-hidden group">
          <div className="flex items-start justify-between relative z-10 gap-2">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#154734]/80">Holistic Care</span>
              <h4 className="text-xs font-serif font-bold text-[#154734] leading-snug mt-0.5">
                Healthy Women<br />Brighter Tomorrows
              </h4>
            </div>
            <div className="w-11 h-11 relative opacity-95 shrink-0 group-hover:scale-105 transition-transform">
              <Image src="/images/about/about-artwork.webp" alt="TriGyna Wellness" fill sizes="44px" className="object-contain" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#154734]/15 flex items-center justify-between">
            <div className="relative h-4 w-16">
              <Image src="/images/brand/logo.png" alt="TriGyna" fill sizes="64px" priority className="object-contain" />
            </div>
            <span className="text-[9px] font-semibold text-[#154734]/70 font-mono">Prayagraj</span>
          </div>
        </div>

        {/* Sidebar Footer with Live Health Indicator & Logout */}
        <div className="p-3 border-t border-[#E2E9E3] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                backendHealth === "online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-[#626B63] font-medium text-[10px]">
              {backendHealth === "online" ? "Clinical Core Live" : "Offline"}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg border border-[#E8E2D6] hover:bg-red-50 hover:border-red-200 text-[#626B63] hover:text-red-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
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

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = activeTab ? activeTab === item.id : item.href === pathname;
                const showSection = item.section && (index === 0 || navItems[index - 1].section !== item.section);

                return (
                  <React.Fragment key={item.id}>
                    {showSection && (
                      <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[#68756D]/70 font-mono">
                        {item.section}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.id, item.href)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[#154734] text-white"
                          : "text-[#626B63] hover:bg-[#F9F7F1]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
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
      <div className="flex-1 h-screen h-[100dvh] flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-[#E2E9E3] px-4 sm:px-6 lg:px-8 py-2.5 shrink-0 z-20 shadow-2xs">
          {role === "admin" ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 max-w-xl">
                {/* Mobile Menu Trigger Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open navigation menu"
                  className="md:hidden w-9 h-9 rounded-xl border border-[#E2E9E3] bg-[#F7F9F7] text-[#154734] hover:bg-[#EBF3E8] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                >
                  <Menu className="w-4 h-4 stroke-[2.2]" />
                </button>

                <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#68756D] shrink-0 font-medium">
                  <span className="hover:text-[#154734] cursor-pointer" onClick={() => onTabChange?.("overview")}>
                    Admin
                  </span>
                  <span className="text-[#A7C4A0]">/</span>
                  <span className="text-[#18231D] font-semibold">
                    {navItems.find((n) => n.id === activeTab)?.label || "Dashboard"}
                  </span>
                </div>

                {/* Global Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#68756D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search patients, leads, appointments, staff..."
                    className="w-full h-9 pl-9 pr-14 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] placeholder:text-[#68756D] focus:bg-white focus:outline-none focus:border-[#154734] transition-colors"
                  />
                  <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono font-medium text-[#68756D] bg-white border border-[#E2E9E3] rounded-md shadow-2xs pointer-events-none">
                    Ctrl K
                  </kbd>
                </div>
              </div>

              {/* Right Header Controls */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Today Date Filter Button */}
                <button
                  type="button"
                  className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E2E9E3] bg-white text-xs font-semibold text-[#17211B] hover:bg-[#F7F9F7] transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#68746D]" />
                  <span>Today</span>
                  <ChevronDown className="w-3 h-3 text-[#68746D]" />
                </button>

                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="w-9 h-9 rounded-xl border border-[#E2E9E3] bg-white hover:bg-[#F7F9F7] text-[#68746D] hover:text-[#154734] relative cursor-pointer transition-colors flex items-center justify-center"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                      {unreadNotifications > 0 ? unreadNotifications : 3}
                    </span>
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
                        <div className="space-y-2 text-xs">
                          <div className="p-2 bg-[#F7F9F7] rounded-xl border border-[#E4EAE5]">
                            <p className="font-bold text-[#17211B]">5 Overdue Follow-ups</p>
                            <p className="text-[11px] text-[#68746D]">Follow-ups require action from CRM team.</p>
                          </div>
                          <div className="p-2 bg-[#F7F9F7] rounded-xl border border-[#E4EAE5]">
                            <p className="font-bold text-[#17211B]">3 Pending Payments</p>
                            <p className="text-[11px] text-[#68746D]">Appointments with uncollected dues.</p>
                          </div>
                          <div className="p-2 bg-[#F7F9F7] rounded-xl border border-[#E4EAE5]">
                            <p className="font-bold text-[#17211B]">2 Unassigned Leads</p>
                            <p className="text-[11px] text-[#68746D]">New enquiries waiting for assignment.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom page actions */}
                {actions}

                {/* User Profile Chip */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 h-9 px-2 rounded-xl hover:bg-[#F7F9F7] border border-transparent hover:border-[#E2E9E3] transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#154734] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-bold text-[#17211B] leading-tight">
                        {user?.name || "Admin"}
                      </p>
                      <p className="text-[10px] text-[#68756D]">
                        Super Admin
                      </p>
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E4EAE5] rounded-2xl shadow-xl p-2 z-50 animate-fade-in">
                      <div className="px-3 py-2 border-b border-[#E4EAE5] mb-1">
                        <p className="text-xs font-bold text-[#17211B] truncate">{user?.name || "Admin"}</p>
                        <p className="text-[10px] text-[#68756D] truncate">{user?.email || "trigyna.health@gmail.com"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onTabChange) onTabChange("integrations");
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-[#17211B] hover:bg-[#F7F9F7] flex items-center gap-2"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#154734]" />
                        <span>Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={logout}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Trigger Button for non-admin */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open navigation menu"
                  className="md:hidden w-9 h-9 rounded-xl border border-[#E2E9E3] bg-[#F7F9F7] text-[#154734] hover:bg-[#EBF3E8] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                >
                  <Menu className="w-4 h-4 stroke-[2.2]" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-bold text-[#17221D] tracking-tight">{displayTitle}</h1>
                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Verified EHR
                    </span>
                  </div>
                  {subtitle && <p className="text-xs text-[#626B63] mt-0.5">{subtitle}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#F9F7F1] border border-[#E8E2D6] text-xs font-medium">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      backendHealth === "online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  <span className="text-[#626B63]">
                    {backendHealth === "online" ? "System Live" : "API Degraded"}
                  </span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="w-9 h-9 rounded-xl border border-[#E8E2D6] bg-white hover:bg-[#F9F7F1] text-[#626B63] hover:text-[#154734] relative cursor-pointer transition-colors flex items-center justify-center"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>
                </div>

                {actions}

                <Link
                  href="/"
                  target="_blank"
                  className="hidden lg:flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E8E2D6] bg-white hover:bg-[#F9F7F1] text-xs font-semibold text-[#154734] transition-colors"
                  title="Open public website in new tab"
                >
                  <span>TriGyna.in</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden min-w-0 scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}

export default DashboardShell;
