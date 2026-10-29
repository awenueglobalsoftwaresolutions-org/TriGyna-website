"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Clock,
  Menu,
  Calendar,
  X,
  Loader2,
} from "lucide-react";
import { DoctorTab } from "./DoctorSidebar";
import { api } from "@/lib/api/client";

interface DoctorHeaderProps {
  doctorName?: string;
  doctorInitials?: string;
  unreadNotifications?: number;
  onNavigateTab: (tab: DoctorTab) => void;
  onSelectPatient?: (patientId: string) => void;
  onOpenMobileMenu?: () => void;
  onLogout?: () => void;
}

interface SearchResult {
  _id: string;
  fullName: string;
  patientCode: string;
  phone: string;
  age?: number;
}

export function DoctorHeader({
  doctorName = "Dr. Ananya Sharma",
  doctorInitials = "AS",
  unreadNotifications = 3,
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

  // Debounced live patient search
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get<{ patients?: SearchResult[] }>(
          `/api/v1/doctor/patients?search=${encodeURIComponent(query)}&limit=5`
        );
        const list = res.data?.patients || [];
        if (active) {
          setSearchResults(list);
          setSearchOpen(true);
        }
      } catch {
        // Fallback silently
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  return (
    <header className="h-16 bg-white border-b border-[#E1E9E3] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile Menu & Search Input */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-[#154734] hover:bg-[#F5F8F6] rounded-xl border border-[#E1E9E3] cursor-pointer"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Global Search Bar */}
        <div ref={searchContainerRef} className="relative w-full">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8C9B92] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setSearchOpen(true);
              }}
              placeholder="Search patients, appointments or records..."
              className="w-full pl-10 pr-12 py-2 bg-[#F5F8F6] focus:bg-white text-xs sm:text-sm text-[#17251E] placeholder-[#8C9B92] border border-transparent focus:border-[#154734] rounded-xl transition-all outline-none"
            />
            {isSearching && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#154734] absolute right-8 top-1/2 -translate-y-1/2" />
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E1E9E3] rounded-2xl shadow-xl p-2 z-50 animate-fade-in max-h-80 overflow-y-auto">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-[#65746B] uppercase tracking-wider">
                Matching Authorized Patients
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => {
                      if (onSelectPatient) onSelectPatient(p._id);
                      onNavigateTab("patients");
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#F5F8F6] rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#17251E] group-hover:text-[#154734]">
                        {p.fullName}
                      </p>
                      <p className="text-[11px] text-[#65746B]">
                        {p.age ? `${p.age} yrs • ` : ""}
                        {p.patientCode} • {p.phone}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-[#154734] bg-[#E7F3EA] px-2 py-0.5 rounded-md">
                      Open Profile
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Notifications & Doctor Profile Dropdown */}
      <div className="flex items-center gap-3 sm:gap-4 ml-4">
        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifDropdownOpen(!notifDropdownOpen);
              setUserMenuOpen(false);
            }}
            className="relative p-2 rounded-xl text-[#17251E] hover:bg-[#F5F8F6] transition-colors cursor-pointer border border-transparent hover:border-[#E1E9E3]"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5 text-[#17251E]" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#E11D48] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadNotifications}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-[#E1E9E3] rounded-2xl shadow-xl p-3 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                <span className="text-xs font-bold text-[#154734]">Clinical Alerts</span>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("notifications");
                    setNotifDropdownOpen(false);
                  }}
                  className="text-[11px] font-semibold text-[#154734] hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-[#F5F8F6] rounded-xl flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#154734] mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#17251E]">Patient Checked In</p>
                    <p className="text-[11px] text-[#65746B] mt-0.5">Sonal Gupta (#TG0018) is waiting in Room 2</p>
                  </div>
                </div>
                <div className="p-2 bg-[#F5F8F6] rounded-xl flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#17251E]">Lab Reports Available</p>
                    <p className="text-[11px] text-[#65746B] mt-0.5">Kavya Mehta (#TG0020) TSH &amp; Lipid profile ready</p>
                  </div>
                </div>
                <div className="p-2 bg-[#F5F8F6] rounded-xl flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#17251E]">Follow-up Scheduled</p>
                    <p className="text-[11px] text-[#65746B] mt-0.5">Neha Singh due on 28 October 2026</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Doctor User Dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotifDropdownOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-[#F5F8F6] transition-colors cursor-pointer border border-transparent hover:border-[#E1E9E3]"
          >
            {/* Initials avatar pill */}
            <div className="w-8 h-8 rounded-full bg-[#E7F3EA] text-[#154734] font-bold text-xs flex items-center justify-center shrink-0 border border-[#C5DDBB]">
              {doctorInitials}
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold text-[#17251E] max-w-[140px] truncate">
              {doctorName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#65746B]" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E1E9E3] rounded-2xl shadow-xl p-2 z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="text-xs font-bold text-[#17251E] truncate">{doctorName}</p>
                <p className="text-[10px] text-[#65746B] uppercase tracking-wider font-semibold">
                  Clinical Workspace
                </p>
              </div>

              <div className="space-y-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("profile");
                    setUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#F5F8F6] rounded-xl flex items-center gap-2.5 text-[#17251E] transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#154734]" />
                  <span>My Profile &amp; Bio</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("profile");
                    setUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#F5F8F6] rounded-xl flex items-center gap-2.5 text-[#17251E] transition-colors cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-[#154734]" />
                  <span>Working Hours &amp; Slots</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("appointments");
                    setUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#F5F8F6] rounded-xl flex items-center gap-2.5 text-[#17251E] transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#154734]" />
                  <span>Full Schedule View</span>
                </button>
              </div>

              {onLogout && (
                <div className="pt-1 mt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
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
