"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  Video,
  FileText,
  Pill,
  CheckSquare,
  Folder,
  CreditCard,
  MessageSquare,
  User,
  ShieldCheck,
  Headphones,
  Search,
  Bell,
  Sun,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/authContext";
import { api } from "@/lib/api/client";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NotificationItem {
  _id: string;
  title: string;
  description?: string;
  message?: string;
  type?: string;
  relativeTime?: string;
  createdAt?: string;
  read: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  type: "appointment" | "prescription" | "document" | "consultation";
  date?: string;
  url: string;
}

export function PatientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [patientData, setPatientData] = useState<{ fullName?: string; patientCode?: string }>({});

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch live notifications and profile info
  useEffect(() => {
    let isMounted = true;

    async function loadShellData() {
      try {
        const res = await api.get<{
          unreadNotificationsCount?: number;
          recentActivity?: NotificationItem[];
          patient?: { fullName?: string; patientCode?: string };
        }>("/patient/me/dashboard");

        if (isMounted && res.success && res.data) {
          if (res.data.unreadNotificationsCount !== undefined) {
            setUnreadCount(res.data.unreadNotificationsCount);
          }
          if (res.data.recentActivity) {
            setNotifications(res.data.recentActivity);
          }
          if (res.data.patient) {
            setPatientData(res.data.patient);
          }
        }
      } catch {
        // Fallback gracefully without breaking UI
      }
    }

    loadShellData();
    const interval = setInterval(loadShellData, 45000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search querying authorized data
  useEffect(() => {
    if (!searchQuery.trim()) {
      const clearTimer = setTimeout(() => {
        setSearchResults([]);
        setSearchOpen(false);
      }, 0);
      return () => clearTimeout(clearTimer);
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchOpen(true);
      try {
        const [apptsRes, rxRes, docsRes] = await Promise.all([
          api.get<{ appointments: Array<{ _id: string; serviceName: string; appointmentDate: string; appointmentCode: string }> }>("/patient/me/appointments"),
          api.get<{ prescriptions: Array<{ _id: string; prescriptionCode: string; dietaryAdvice?: string; createdAt: string }> }>("/patient/me/prescriptions"),
          api.get<{ documents: Array<{ _id: string; title: string; category: string; fileUrl: string }> }>("/patient/me/documents"),
        ]);

        const query = searchQuery.toLowerCase();
        const results: SearchResult[] = [];

        if (apptsRes.data?.appointments) {
          apptsRes.data.appointments
            .filter((a) => (a.serviceName || "").toLowerCase().includes(query) || (a.appointmentCode || "").toLowerCase().includes(query))
            .forEach((a) => {
              results.push({
                id: `appt-${a._id}`,
                title: a.serviceName || "Appointment",
                type: "appointment",
                date: a.appointmentDate,
                url: `/patient/appointments?id=${a._id}`,
              });
            });
        }

        if (rxRes.data?.prescriptions) {
          rxRes.data.prescriptions
            .filter((p) => (p.prescriptionCode || "").toLowerCase().includes(query) || (p.dietaryAdvice || "").toLowerCase().includes(query))
            .forEach((p) => {
              results.push({
                id: `rx-${p._id}`,
                title: `Prescription ${p.prescriptionCode}`,
                type: "prescription",
                date: new Date(p.createdAt).toLocaleDateString(),
                url: `/patient/prescriptions?id=${p._id}`,
              });
            });
        }

        if (docsRes.data?.documents) {
          docsRes.data.documents
            .filter((d) => (d.title || "").toLowerCase().includes(query) || (d.category || "").toLowerCase().includes(query))
            .forEach((d) => {
              results.push({
                id: `doc-${d._id}`,
                title: d.title,
                type: "document",
                url: `/patient/documents?id=${d._id}`,
              });
            });
        }

        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/patient/me/notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setUnreadCount(0);
    }
  };

  const navItems: NavItem[] = [
    { name: "Overview", href: "/patient/dashboard", icon: Home },
    { name: "My Appointments", href: "/patient/appointments", icon: Calendar },
    { name: "Online Consultation", href: "/patient/consultations", icon: Video },
    { name: "Health Records", href: "/patient/health-records", icon: FileText },
    { name: "Prescriptions", href: "/patient/prescriptions", icon: Pill },
    { name: "Follow-ups & Care Plan", href: "/patient/follow-ups", icon: CheckSquare },
    { name: "Documents", href: "/patient/documents", icon: Folder },
    { name: "Payments & Invoices", href: "/patient/payments", icon: CreditCard },
    { name: "Messages & Notifications", href: "/patient/notifications", icon: MessageSquare, badge: unreadCount },
    { name: "My Profile", href: "/patient/profile", icon: User },
    { name: "Privacy & Security", href: "/patient/security", icon: ShieldCheck },
    { name: "Help & Support", href: "/patient/support", icon: Headphones },
  ];

  const firstName = (patientData.fullName || user?.name || "Ananya").split(" ")[0];

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col antialiased text-[#14251F]">
      {/* Desktop Fixed Left Sidebar (280-300px) */}
      <aside className="hidden lg:flex flex-col w-[285px] fixed inset-y-0 left-0 bg-white border-r border-[#E4EEE7] z-30 select-none">
        {/* Brand Logo Header */}
        <div className="h-20 px-6 flex items-center border-b border-[#F0F5F2]">
          <Link href="/patient/dashboard" className="flex items-center gap-3 group focus:outline-none">
            <Image
              src="/images/brand/logo.webp"
              alt="TriGyna Women Health & Wellness"
              width={160}
              height={48}
              priority
              className="h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>
        </div>

        {/* Navigation Items (12 Items) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/patient/dashboard" && pathname === "/patient") ||
              (item.href !== "/patient/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#075B35] text-white shadow-sm font-semibold"
                    : "text-[#68766F] hover:text-[#14251F] hover:bg-[#F2F7F4]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? "text-white stroke-[2.2]" : "text-[#68766F] stroke-[1.8]"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                      isActive
                        ? "bg-white text-[#075B35]"
                        : "bg-[#E53E3E] text-white shadow-xs"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Promotional Botanical Card */}
        <div className="p-4 pt-1">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#EDF8F1] via-[#FFF8EC] to-[#E3F2E9] border border-[#D5E8DC] p-4 shadow-xs">
            {/* Background Decorative Foliage SVG */}
            <svg
              className="absolute -right-3 -bottom-3 w-28 h-28 text-[#075B35]/15 pointer-events-none"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              <path d="M50 0 C70 30 90 40 100 70 C70 90 40 90 20 70 C10 50 30 20 50 0 Z" />
              <path d="M30 40 C45 20 70 20 85 45 C65 60 45 60 30 40 Z" opacity="0.6" />
            </svg>

            {/* Content matching reference */}
            <div className="relative z-10">
              <h4 className="font-serif font-bold text-[#075B35] text-[15px] leading-tight">
                Your Health<br />Our Priority
              </h4>
              <p className="text-[11px] text-[#556960] mt-1.5 font-medium leading-relaxed max-w-[155px]">
                Empowering Women for a Healthier Tomorrow
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Right Content Canvas (Offset by sidebar width on desktop) */}
      <div className="lg:pl-[285px] flex flex-col flex-1 min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E4EEE7] h-20 px-4 md:px-8 flex items-center justify-between gap-4">
          {/* Mobile Hamburger & Logo */}
          <div className="flex items-center gap-2 sm:gap-3 lg:hidden shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-1.5 rounded-xl text-[#14251F] hover:bg-[#F2F7F4] transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
            <Link href="/patient/dashboard" className="flex items-center shrink-0">
              <Image
                src="/images/brand/logo.webp"
                alt="TriGyna"
                width={140}
                height={40}
                priority
                className="h-8 sm:h-9 w-auto object-contain shrink-0"
              />
            </Link>
          </div>

          {/* Contextual Greeting (Sun + Greeting) - shown on large desktop screens to prevent tablet header wrapping */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#FFF8EC] border border-[#FDE68A] flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-serif font-bold text-[#14251F] tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                Good morning, {firstName}
              </h1>
              <p className="text-xs md:text-sm text-[#68766F] font-normal whitespace-nowrap">
                Here&apos;s your health journey at a glance
              </p>
            </div>
          </div>

          {/* Right Header Utilities: Search, Bell, Profile */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 ml-auto">
            {/* Desktop Search Bar (hidden on mobile, responsive width on tablet) */}
            <div className="relative hidden md:block" ref={searchRef}>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#68766F] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setSearchOpen(true);
                  }}
                  placeholder="Search appointments, prescriptions, documents..."
                  className="w-48 md:w-64 lg:w-80 h-10 pl-9 pr-4 text-xs md:text-sm bg-[#F4F8F5] border border-[#E4EEE7] rounded-full text-[#14251F] placeholder-[#8C9892] focus:outline-none focus:ring-2 focus:ring-[#075B35]/20 focus:border-[#075B35] transition-all"
                />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-[#075B35] absolute right-3 animate-spin" />
                )}
              </div>

              {/* Dynamic Search Results Popover */}
              {searchOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E4EEE7] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-[#F0F5F2] flex items-center justify-between text-xs font-semibold text-[#68766F]">
                    <span>Search Results</span>
                    <span>{searchResults.length} found</span>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#8C9892]">
                      No authorized records found matching &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#F0F5F2]">
                      {searchResults.map((res) => (
                        <Link
                          key={res.id}
                          href={res.url}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="flex items-center justify-between p-3.5 hover:bg-[#F2F7F4] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {res.type === "appointment" && <Calendar className="w-4 h-4 text-[#075B35] shrink-0" />}
                            {res.type === "prescription" && <Pill className="w-4 h-4 text-[#075B35] shrink-0" />}
                            {res.type === "document" && <Folder className="w-4 h-4 text-[#075B35] shrink-0" />}
                            <div className="truncate">
                              <p className="text-xs font-semibold text-[#14251F] truncate">{res.title}</p>
                              {res.date && <p className="text-[10px] text-[#68766F]">{res.date}</p>}
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-[#075B35] uppercase px-2 py-0.5 rounded-full bg-[#EDF8F1]">
                            {res.type}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Search Icon Button (visible only on mobile) */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="sm:hidden p-2.5 rounded-full text-[#68766F] hover:text-[#14251F] hover:bg-[#F2F7F4] transition-colors focus:outline-none"
              aria-label="Search"
            >
              {mobileSearchOpen ? (
                <X className="w-5 h-5 text-[#14251F]" />
              ) : (
                <Search className="w-5 h-5 stroke-[1.8]" />
              )}
            </button>

            {/* Notification Bell with Badge 3 */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2.5 rounded-full text-[#68766F] hover:text-[#14251F] hover:bg-[#F2F7F4] transition-colors focus:outline-none"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5 stroke-[1.8]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#E53E3E] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E4EEE7] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-4 border-b border-[#F0F5F2] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#14251F]">Notifications</h3>
                      <p className="text-xs text-[#68766F]">{unreadCount} unread updates</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-[#075B35] hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#F0F5F2]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#8C9892]">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          className={`p-3.5 flex gap-3 text-left transition-colors ${
                            !n.read ? "bg-[#F9FCFA]" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-[#075B35]" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-[#14251F]">{n.title}</h4>
                            <p className="text-xs text-[#556960] mt-0.5 line-clamp-2">
                              {n.description || n.message}
                            </p>
                            <span className="text-[10px] text-[#8C9892] mt-1 inline-block">
                              {n.relativeTime || "Recent"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 border-t border-[#F0F5F2] text-center bg-[#FAFCFA] rounded-b-2xl">
                    <Link
                      href="/patient/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-medium text-[#075B35] hover:underline"
                    >
                      View all notifications &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Patient Avatar & Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#F2F7F4] transition-colors focus:outline-none"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#DCECE1] bg-[#EDF8F1] flex items-center justify-center shrink-0">
                  <Image
                    src="/images/testimonials/patient-1.webp"
                    alt={patientData.fullName || "Ananya"}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <span className="text-xs font-bold text-[#075B35]">AM</span>
                </div>
                <div className="hidden md:flex flex-col text-left pr-1">
                  <span className="text-sm font-semibold text-[#14251F] leading-tight">
                    {firstName}
                  </span>
                  <span className="text-[11px] text-[#68766F] font-normal leading-tight">
                    Patient
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#68766F] hidden md:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E4EEE7] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-[#F0F5F2]">
                    <p className="text-xs font-bold text-[#14251F]">{patientData.fullName || "Ananya Mishra"}</p>
                    <p className="text-[11px] text-[#68766F] truncate">{user?.email || "patient@trigyna.test"}</p>
                    <p className="text-[10px] text-[#075B35] font-semibold mt-0.5">
                      Case ID: {patientData.patientCode || "TR-1001"}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/patient/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#14251F] hover:bg-[#F2F7F4]"
                    >
                      <User className="w-4 h-4 text-[#68766F]" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      href="/patient/security"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#14251F] hover:bg-[#F2F7F4]"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#68766F]" />
                      <span>Privacy & Security</span>
                    </Link>
                    <Link
                      href="/patient/support"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#14251F] hover:bg-[#F2F7F4]"
                    >
                      <Headphones className="w-4 h-4 text-[#68766F]" />
                      <span>Help & Support</span>
                    </Link>
                  </div>

                  <div className="border-t border-[#F0F5F2] pt-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#E53E3E] hover:bg-red-50 text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Search Dropdown Bar */}
        {mobileSearchOpen && (
          <div className="sm:hidden sticky top-20 z-20 bg-white border-b border-[#E4EEE7] p-3 shadow-md animate-in slide-in-from-top-1 duration-150">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#68766F] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appointments, prescriptions, docs..."
                className="w-full h-10 pl-9 pr-9 text-xs bg-[#F4F8F5] border border-[#E4EEE7] rounded-full text-[#14251F] placeholder-[#8C9892] focus:outline-none focus:ring-2 focus:ring-[#075B35]/20 focus:border-[#075B35]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-[#8C9892] hover:text-[#14251F] p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Search Results Dropdown */}
            {searchQuery && searchResults.length > 0 && (
              <div className="mt-2 bg-white rounded-xl shadow-lg border border-[#E4EEE7] divide-y divide-[#F0F5F2] max-h-60 overflow-y-auto">
                {searchResults.map((res) => (
                  <Link
                    key={res.id}
                    href={res.url}
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="flex items-center justify-between p-3 hover:bg-[#F2F7F4]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {res.type === "appointment" && <Calendar className="w-4 h-4 text-[#075B35] shrink-0" />}
                      {res.type === "prescription" && <Pill className="w-4 h-4 text-[#075B35] shrink-0" />}
                      {res.type === "document" && <Folder className="w-4 h-4 text-[#075B35] shrink-0" />}
                      <div className="truncate">
                        <p className="text-xs font-semibold text-[#14251F] truncate">{res.title}</p>
                        {res.date && <p className="text-[10px] text-[#68766F]">{res.date}</p>}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-[#075B35] uppercase px-2 py-0.5 rounded-full bg-[#EDF8F1]">
                      {res.type}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="mt-2 p-3 bg-[#F8FAF9] rounded-xl text-center text-xs text-[#8C9892]">
                No matching records found
              </div>
            )}
          </div>
        )}

        {/* Mobile Slide-Out Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col z-50">
              <div className="h-20 px-6 flex items-center justify-between border-b border-[#F0F5F2]">
                <Image
                  src="/images/brand/logo.webp"
                  alt="TriGyna"
                  width={140}
                  height={40}
                  className="h-9 w-auto object-contain"
                />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href === "/patient/dashboard" && pathname === "/patient");
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? "bg-[#075B35] text-white font-semibold"
                          : "text-[#68766F] hover:bg-[#F2F7F4] hover:text-[#14251F]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-[#E53E3E] text-white flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="p-4 border-t border-[#F0F5F2]">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    router.push("/login");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[#E53E3E] bg-red-50 rounded-xl hover:bg-red-100"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Patient Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
