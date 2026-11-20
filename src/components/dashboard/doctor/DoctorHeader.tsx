"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Calendar,
  X,
  Loader2,
  FileText,
  Clock,
  Menu,
  Stethoscope,
  Pill,
} from "lucide-react";
import { DoctorTab } from "./DoctorSidebar";
import { api } from "@/lib/api/client";

interface DoctorHeaderProps {
  doctorName?: string;
  doctorInitials?: string;
  doctorSpecialization?: string;
  unreadNotifications?: number;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  onNavigateTab: (tab: DoctorTab) => void;
  onSelectPatient?: (patientId: string) => void;
  onOpenMobileMenu?: () => void;
  onLogout?: () => void;
}

function formatHeaderDate(dateStr?: string): string {
  if (!dateStr) return "Today";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface SearchResult {
  _id: string;
  type: "patient" | "appointment" | "prescription";
  title: string;
  subtitle: string;
  referenceId?: string;
}

export function DoctorHeader({
  doctorName = "Doctor",
  doctorInitials = "DR",
  doctorSpecialization = "Consultant Gynaecologist",
  unreadNotifications = 0,
  selectedDate,
  onDateChange,
  onNavigateTab,
  onSelectPatient,
  onOpenMobileMenu,
  onLogout,
}: DoctorHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search across patients, appointments & prescriptions
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const [patientsRes, apptsRes] = await Promise.all([
          api.get<{ patients?: any[] }>(`/api/v1/doctor/patients?search=${encodeURIComponent(query)}&limit=4`),
          api.get<{ appointments?: any[] }>(`/api/v1/doctor/appointments?search=${encodeURIComponent(query)}&limit=4`),
        ]).catch(() => [{}, {}]);

        if (!active) return;

        const results: SearchResult[] = [];
        const patients = (patientsRes as any)?.data?.patients || (patientsRes as any)?.patients || [];
        const appts = (apptsRes as any)?.data?.appointments || (apptsRes as any)?.appointments || [];

        patients.forEach((p: any) => {
          results.push({
            _id: p._id,
            type: "patient",
            title: p.fullName,
            subtitle: `${p.patientCode || "#TG"} • ${p.phone || ""}`,
            referenceId: p._id,
          });
        });

        appts.forEach((a: any) => {
          results.push({
            _id: a._id,
            type: "appointment",
            title: `${a.appointmentCode} (${a.serviceName || "Consultation"})`,
            subtitle: `${a.patientId?.fullName || "Patient"} • ${a.appointmentDate} at ${a.startTime}`,
            referenceId: a.patientId?._id || a._id,
          });
        });

        setSearchResults(results);
        setSearchOpen(results.length > 0);
      } catch {
        // Silent fallback
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Load notifications preview when opening dropdown
  const handleOpenNotifications = async () => {
    const nextState = !notifDropdownOpen;
    setNotifDropdownOpen(nextState);
    setUserMenuOpen(false);
    if (nextState && notificationsList.length === 0) {
      try {
        const res = await api.get<{ notifications?: any[] }>("/api/v1/doctor/notifications");
        const list = (res as any)?.data?.notifications || (res as any)?.notifications || [];
        setNotificationsList(list.slice(0, 5));
      } catch {
        // Fallback
      }
    }
  };

  return (
    <header className="h-[68px] bg-white border-b border-[#E1EAE4] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Left: Mobile Drawer Trigger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden w-9 h-9 text-[#07543D] hover:bg-[#F2F7F4] rounded-xl border border-[#E1EAE4] cursor-pointer flex items-center justify-center shrink-0 transition-colors"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Global Search Bar */}
        <div ref={searchContainerRef} className="relative w-full max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-[#718078] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setSearchOpen(true);
              }}
              placeholder="Search patients, appointments, prescriptions..."
              className="w-full h-9 pl-9 pr-10 bg-[#F2F7F4] focus:bg-white text-xs text-[#17251F] placeholder-[#718078] border border-[#E1EAE4] focus:border-[#07543D] rounded-xl transition-colors outline-none"
            />
            {isSearching && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#07543D] absolute right-8 top-1/2 -translate-y-1/2" />
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718078] hover:text-[#17251F] p-0.5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Search Dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E1EAE4] rounded-2xl shadow-xl p-2 z-50 animate-fade-in max-h-80 overflow-y-auto">
              <div className="px-2.5 py-1 text-[10px] font-bold text-[#718078] uppercase tracking-wider">
                Matching Clinical Records
              </div>
              <div className="divide-y divide-[#E1EAE4]/60">
                {searchResults.map((item) => (
                  <button
                    key={`${item.type}-${item._id}`}
                    type="button"
                    onClick={() => {
                      if (item.type === "patient" && onSelectPatient && item.referenceId) {
                        onSelectPatient(item.referenceId);
                      } else if (item.type === "appointment") {
                        onNavigateTab("appointments");
                      } else {
                        onNavigateTab("prescriptions");
                      }
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#F2F7F4] rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#E7F3EA] text-[#07543D] flex items-center justify-center shrink-0">
                        {item.type === "patient" ? (
                          <User className="w-3.5 h-3.5" />
                        ) : item.type === "appointment" ? (
                          <Calendar className="w-3.5 h-3.5" />
                        ) : (
                          <Pill className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#17251F] group-hover:text-[#07543D] truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[#718078] truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-[#07543D] bg-[#E7F3EA] px-2 py-0.5 rounded-md shrink-0">
                      View
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Date Selector + Notification Icon + Doctor Profile Pill */}
      <div className="flex items-center gap-3 ml-4">
        {/* Date Selector Pill (Matches Reference Screenshot) */}
        {selectedDate && onDateChange && (
          <div className="relative hidden md:block">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              aria-label="Select Date"
            />
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#E1EAE4] hover:border-[#07543D]/40 rounded-xl text-xs font-semibold text-[#17251F] shadow-2xs transition-colors cursor-pointer select-none">
              <Calendar className="w-3.5 h-3.5 text-[#07543D]" />
              <span>Today: {formatHeaderDate(selectedDate)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#718078]" />
            </div>
          </div>
        )}

        {/* Notification Bell with Badge */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={handleOpenNotifications}
            className="w-9 h-9 rounded-xl text-[#17251F] hover:bg-[#F2F7F4] transition-colors cursor-pointer border border-[#E1EAE4] flex items-center justify-center relative"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4 text-[#17251F]" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold bg-[#EF4444] text-white rounded-full shadow-2xs">
                {unreadNotifications}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Preview */}
          {notifDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#E1EAE4] rounded-2xl shadow-xl p-3 z-50 animate-fade-in text-left">
              <div className="flex items-center justify-between pb-2 border-b border-[#E1EAE4]">
                <h4 className="text-xs font-bold text-[#17251F]">Clinical Notifications</h4>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("notifications");
                    setNotifDropdownOpen(false);
                  }}
                  className="text-[11px] font-semibold text-[#07543D] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="divide-y divide-[#E1EAE4]/60 py-1 max-h-64 overflow-y-auto">
                {notificationsList.length === 0 ? (
                  <p className="py-4 text-center text-xs text-[#718078]">No new unread notifications</p>
                ) : (
                  notificationsList.map((n, i) => (
                    <div key={n._id || i} className="py-2 px-1 hover:bg-[#F2F7F4] rounded-lg transition-colors">
                      <p className="text-xs font-semibold text-[#17251F] leading-snug">{n.title}</p>
                      <p className="text-[11px] text-[#718078] mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Doctor Profile Pill Dropdown (Matches Screenshot: AS Circle + Doctor Name + Designation ˇ) */}
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotifDropdownOpen(false);
            }}
            className="flex items-center gap-2 p-1 sm:pr-2.5 rounded-full sm:rounded-xl hover:bg-[#F2F7F4] transition-colors cursor-pointer select-none"
            aria-label="Doctor profile menu"
          >
            <div className="w-8 h-8 rounded-full bg-[#E7F3EA] text-[#07543D] border border-[#07543D]/20 flex items-center justify-center font-bold text-xs tracking-wider shrink-0">
              {doctorInitials}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-[#17251F] block leading-tight">
                {doctorName}
              </span>
              <span className="text-[10px] text-[#718078] block leading-tight">
                {doctorSpecialization}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#718078] hidden sm:inline-block" />
          </button>

          {/* Profile Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E1EAE4] rounded-2xl shadow-xl p-2 z-50 animate-fade-in text-left">
              <div className="px-3 py-2 border-b border-[#E1EAE4]">
                <p className="text-xs font-bold text-[#17251F] truncate">{doctorName}</p>
                <p className="text-[10px] text-[#718078] truncate mt-0.5">{doctorSpecialization}</p>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("profile");
                    setUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-[#17251F] hover:bg-[#F2F7F4] rounded-xl flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#07543D]" />
                  <span>My Profile & Availability</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("reports");
                    setUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-[#17251F] hover:bg-[#F2F7F4] rounded-xl flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#07543D]" />
                  <span>Clinical Reports</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("notifications");
                    setUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-[#17251F] hover:bg-[#F2F7F4] rounded-xl flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                >
                  <Bell className="w-3.5 h-3.5 text-[#07543D]" />
                  <span>Notification Center</span>
                </button>
              </div>

              {onLogout && (
                <div className="pt-1 border-t border-[#E1EAE4]">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 cursor-pointer text-left transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Secure Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
