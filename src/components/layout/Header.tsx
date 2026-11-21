"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Search,
  Phone,
  ArrowRight,
  MapPin,
  Clock,
  LogIn,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { navigationLinks, siteConfig } from "@/data/siteData";
import { useEnquiryModal } from "@/components/context/EnquiryModalContext";
import SearchModal from "@/components/ui/SearchModal";

export default function Header() {
  const pathname = usePathname();
  const { openEnquiryModal } = useEnquiryModal();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Global keyboard shortcut: Ctrl+K / Cmd+K to launch search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile drawer and dropdown on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
      setServicesDropdownOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const isDashboard =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/doctor/dashboard") ||
    pathname?.startsWith("/sales") ||
    pathname?.startsWith("/patient") ||
    pathname?.startsWith("/portal") ||
    pathname?.startsWith("/login");

  if (isDashboard) {
    return null;
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 h-[68px] sm:h-[72px] transition-colors duration-200 motion-reduce:transition-none border-b select-none ${
          isScrolled
            ? "bg-[#FBF9F4]/95 backdrop-blur-md border-[#E8E2D6] shadow-[0_2px_12px_rgba(21,71,52,0.04)]"
            : "bg-[#FBF9F4] border-[#E8E2D6]/40"
        }`}
      >
        <div className="max-w-[1600px] h-full mx-auto px-4 xs:px-6 sm:px-8 lg:px-12 flex items-center justify-between">
          {/* 1. Brand Wordmark Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group focus-visible:outline-2 focus-visible:outline-[#154734] focus-visible:outline-offset-4 rounded-md"
            aria-label="TriGyna Home"
          >
            <div className="relative h-9 w-36 xs:h-10 xs:w-44 sm:h-11 sm:w-48 transition-opacity duration-150 motion-reduce:transition-none group-hover:opacity-90">
              <Image
                src="/images/brand/logo.png"
                alt="TriGyna — Holistic Healthcare"
                fill
                priority
                sizes="(max-width: 480px) 144px, (max-width: 640px) 176px, 192px"
                className="object-contain object-left"
              />
            </div>
          </Link>

          {/* 2. Desktop Navigation Links (Hallmark Macrostructure) */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 h-full" aria-label="Main Navigation">
            {navigationLinks.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              if (item.children) {
                const isChildActive = item.children.some((sub) => pathname === sub.href);
                return (
                  <div
                    key={item.label}
                    className="relative h-full flex items-center"
                    onMouseEnter={() => setServicesDropdownOpen(true)}
                    onMouseLeave={() => setServicesDropdownOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                      aria-expanded={servicesDropdownOpen}
                      aria-haspopup="true"
                      className={`relative h-full flex items-center gap-1.5 text-[13px] xl:text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#154734] focus-visible:outline-offset-2 rounded-sm cursor-pointer ${
                        isActive || isChildActive
                          ? "text-[#154734] font-semibold"
                          : "text-[#2C3E35] hover:text-[#154734]"
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 motion-reduce:transition-none ${
                          servicesDropdownOpen ? "rotate-180 text-[#154734]" : "text-[#626B63]"
                        }`}
                      />
                      {(isActive || isChildActive) && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#154734] rounded-full" />
                      )}
                    </button>

                    {/* Dropdown Menu with Hover Bridge */}
                    <div
                      className={`absolute left-0 top-[calc(100%-8px)] pt-2 w-80 transition-[opacity,transform] duration-150 motion-reduce:transition-none z-50 ${
                        servicesDropdownOpen
                          ? "opacity-100 visible translate-y-0"
                          : "opacity-0 invisible -translate-y-1 pointer-events-none"
                      }`}
                    >
                      {/* Invisible hover bridge to eliminate pointer flicker */}
                      <div className="absolute -top-3 left-0 right-0 h-4 content-['']" />
                      <div className="bg-white rounded-2xl shadow-[0_12px_32px_rgba(21,71,52,0.08)] border border-[#E8E2D6] p-2 space-y-1">
                        <div className="px-3 pt-2 pb-1 text-xs font-semibold text-[#626B63]">
                          Clinical specialities
                        </div>
                        {item.children.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.label}
                              href={sub.href}
                              className={`block p-2.5 rounded-xl transition-colors motion-reduce:transition-none group ${
                                isSubActive ? "bg-[#154734]/5 text-[#154734]" : "hover:bg-[#F9F7F1]"
                              }`}
                            >
                              <div className="text-xs font-semibold text-[#154734] group-hover:text-[#0E3828] flex items-center justify-between">
                                <span>{sub.label}</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-[opacity,transform] motion-reduce:transition-none text-[#154734]" />
                              </div>
                              {sub.desc && (
                                <p className="text-[11px] text-[#626B63] mt-0.5 line-clamp-1">
                                  {sub.desc}
                                </p>
                              )}
                            </Link>
                          );
                        })}
                        <div className="border-t border-[#E8E2D6]/70 pt-1.5 mt-1">
                          <Link
                            href="/services"
                            className="inline-flex items-center justify-center gap-1.5 w-full text-center text-xs font-semibold text-[#6B8F5B] hover:text-[#154734] py-1.5 rounded-lg transition-colors motion-reduce:transition-none group"
                          >
                            <span>Explore all 5 specialities</span>
                            <ArrowRight className="w-3 h-3 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`relative h-full flex items-center text-[13px] xl:text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#154734] focus-visible:outline-offset-2 rounded-sm ${
                    isActive
                      ? "text-[#154734] font-semibold"
                      : "text-[#2C3E35] hover:text-[#154734]"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#154734] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* 3. Desktop Actions (Unified 40px Height Sizing & Hierarchy) */}
          <div className="hidden lg:flex items-center gap-2.5 xl:gap-3">
            {/* Phone Contact */}
            <a
              href={`tel:${siteConfig.phone.replace(/[^0-9+]/g, "")}`}
              className="h-10 px-3 rounded-xl text-xs font-medium text-[#2C3E35] hover:text-[#154734] hover:bg-[#154734]/5 flex items-center gap-2 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#154734] focus-visible:outline-offset-2"
              title="Direct Clinic Line"
            >
              <Phone className="w-3.5 h-3.5 text-[#154734]" />
              <span className="hidden xl:inline font-mono tracking-tight text-[11px]">{siteConfig.phone}</span>
            </a>

            {/* Search Button (40x40px) */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search TriGyna (Ctrl+K)"
              className="w-10 h-10 rounded-xl border border-[#E8E2D6] bg-white/80 hover:bg-[#154734]/5 hover:border-[#154734]/40 text-[#154734] flex items-center justify-center transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#154734] focus-visible:outline-offset-2 cursor-pointer shadow-2xs"
              title="Search TriGyna (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Portal Login Button (Secondary 40px Action) */}
            <Link
              href="/login"
              className="h-10 px-3.5 rounded-xl border border-[#154734]/25 hover:border-[#154734] bg-white text-xs font-semibold text-[#154734] hover:bg-[#154734]/5 flex items-center gap-1.5 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#154734] focus-visible:outline-offset-2 cursor-pointer shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Portal Login</span>
            </Link>

            {/* Primary Action Button: Book Consultation (40px Primary CTA) */}
            <button
              type="button"
              onClick={() => openEnquiryModal()}
              className="h-10 px-4.5 sm:px-5 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm active:translate-y-[1px] flex items-center gap-2 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#154734] focus-visible:outline-offset-2 cursor-pointer group"
            >
              <span>Book Consultation</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* 4. Mobile Header Actions (Matching 40px Sizing) */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search TriGyna"
              className="w-10 h-10 rounded-xl border border-[#E8E2D6] bg-white text-[#154734] hover:bg-[#154734]/5 flex items-center justify-center transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#154734] cursor-pointer shadow-2xs"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="w-10 h-10 rounded-xl bg-[#154734]/10 hover:bg-[#154734]/15 text-[#154734] flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#154734]"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Menu className="w-5 h-5 stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Off-Canvas Drawer Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/40 z-50 transition-opacity duration-200 motion-reduce:transition-none ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Off-Canvas Navigation Drawer */}
      <aside
        id="mobile-navigation-drawer"
        aria-label="Mobile Navigation Menu"
        className={`lg:hidden fixed top-0 right-0 bottom-0 h-full w-[85vw] max-w-[340px] bg-[#FBF9F4] z-50 shadow-2xl flex flex-col justify-between transition-transform duration-200 motion-reduce:transition-none ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="shrink-0 px-5 py-4 border-b border-[#E8E2D6] flex items-center justify-between bg-[#FBF9F4]">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2"
          >
            <div className="relative h-8 w-32">
              <Image
                src="/images/brand/logo.png"
                alt="TriGyna"
                fill
                sizes="128px"
                className="object-contain object-left"
              />
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="w-9 h-9 rounded-xl bg-[#154734]/10 hover:bg-[#154734]/15 text-[#154734] flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Drawer Navigation List */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-5 py-3 space-y-0.5">
          {navigationLinks.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            if (item.children) {
              const isChildActive = item.children.some((sub) => pathname === sub.href);
              return (
                <div key={item.label} className="border-b border-[#E8E2D6]/60">
                  <button
                    type="button"
                    onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                    className={`w-full flex items-center justify-between py-3 text-left text-sm font-semibold transition-colors motion-reduce:transition-none cursor-pointer ${
                      isActive || isChildActive || mobileServicesOpen
                        ? "text-[#154734]"
                        : "text-[#2C3E35] hover:text-[#154734]"
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#154734] transition-transform duration-200 motion-reduce:transition-none ${
                        mobileServicesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Clean Indented Sub-links */}
                  {mobileServicesOpen && (
                    <div className="pl-3 pb-2.5 pt-0.5 space-y-1 border-l-2 border-[#154734]/20 ml-1.5 animate-in fade-in-50 duration-150">
                      {item.children.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block py-1.5 px-2 text-xs rounded-lg transition-colors motion-reduce:transition-none ${
                              isSubActive
                                ? "bg-[#154734]/10 text-[#154734] font-semibold"
                                : "text-[#4A5950] hover:text-[#154734] hover:bg-[#154734]/5"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{sub.label}</span>
                              <ChevronRight className="w-3 h-3 text-[#154734]/50" />
                            </div>
                          </Link>
                        );
                      })}
                      <div className="pt-1.5 px-2">
                        <Link
                          href="/services"
                          onClick={() => setMobileMenuOpen(false)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#154734] hover:underline"
                        >
                          <span>Explore all specialities</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between py-3 border-b border-[#E8E2D6]/60 text-sm font-semibold transition-colors motion-reduce:transition-none ${
                  isActive
                    ? "text-[#154734] font-bold"
                    : "text-[#2C3E35] hover:text-[#154734]"
                }`}
              >
                <span>{item.label}</span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform duration-200 motion-reduce:transition-none ${
                    isActive ? "text-[#154734] translate-x-0.5" : "text-[#8C9B92]"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer Actions */}
        <div className="shrink-0 p-4 bg-[#F5F2EA] border-t border-[#E8E2D6] space-y-2.5">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              openEnquiryModal();
            }}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white font-semibold text-xs sm:text-sm shadow-xs active:translate-y-[1px] transition-colors motion-reduce:transition-none cursor-pointer"
          >
            <span>Book Consultation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Secondary Portal Link */}
          <Link
            href="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-[#154734]/30 bg-white hover:bg-[#154734]/5 text-[#154734] font-semibold text-xs transition-colors motion-reduce:transition-none"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Patient & Staff Portal Login</span>
          </Link>

          {/* Quick Direct Actions */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl bg-[#E8EFE3] hover:bg-[#DCE7D6] text-[#154734] font-semibold text-[11px] transition-colors motion-reduce:transition-none"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
              <span>WhatsApp</span>
            </a>

            <a
              href={`tel:${siteConfig.phone.replace(/[^0-9+]/g, "")}`}
              className="flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl bg-white hover:bg-[#F9F7F1] border border-[#E8E2D6] text-[#154734] font-semibold text-[11px] transition-colors motion-reduce:transition-none"
            >
              <Phone className="w-3 h-3 text-[#154734] shrink-0" />
              <span>Call Clinic</span>
            </a>
          </div>

          {/* Clinic Location & Timings */}
          <div className="pt-1.5 flex flex-col gap-1 text-[10px] text-[#626B63] text-center">
            <div className="flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-[#154734] shrink-0" />
              <span>{siteConfig.location}</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-[#154734] shrink-0" />
              <span>{siteConfig.clinicHours}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Quick Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
