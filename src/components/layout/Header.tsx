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
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
      setServicesDropdownOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Prevent background scroll when mobile menu is open
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

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#F9F7F1]/95 backdrop-blur-md shadow-sm border-b border-[#E8E2D6]/80 py-3"
            : "bg-[#F9F7F1] border-b border-[#E8E2D6]/40 py-4"
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-[82px]">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="relative h-12 w-44 xs:h-14 xs:w-52 sm:h-16 sm:w-60 transition-transform duration-300 group-hover:scale-[1.02]">
                <Image
                  src="/images/brand/logo.png"
                  alt="TriGyna — Holistic Healthcare"
                  fill
                  priority
                  sizes="(max-width: 480px) 176px, (max-width: 640px) 208px, 240px"
                  className="object-contain object-left"
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-7">
              {navigationLinks.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                if (item.children) {
                  return (
                    <div
                      key={item.label}
                      className="relative"
                      onMouseEnter={() => setServicesDropdownOpen(true)}
                      onMouseLeave={() => setServicesDropdownOpen(false)}
                    >
                      <button
                        className={`flex items-center gap-1 text-sm font-medium transition-colors py-2 ${
                          isActive
                            ? "text-[#154734] font-semibold"
                            : "text-[#17221D] hover:text-[#154734]"
                        }`}
                        onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                      >
                        {item.label}
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            servicesDropdownOpen ? "rotate-180 text-[#154734]" : "text-gray-500"
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      <div
                        className={`absolute left-0 top-full pt-2 w-72 transition-all duration-200 ${
                          servicesDropdownOpen
                            ? "opacity-100 visible translate-y-0"
                            : "opacity-0 invisible -translate-y-2 pointer-events-none"
                        }`}
                      >
                        <div className="bg-white rounded-2xl shadow-xl border border-[#E8E2D6] p-2 space-y-1">
                          {item.children.map((sub) => (
                            <Link
                              key={sub.label}
                              href={sub.href}
                              className="block p-2.5 rounded-xl hover:bg-[#F9F7F1] transition-colors group"
                            >
                              <div className="text-xs font-semibold text-[#154734] group-hover:text-[#0E3828] flex items-center justify-between">
                                {sub.label}
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </div>
                              {sub.desc && (
                                <p className="text-[11px] text-[#626B63] mt-0.5 line-clamp-1">
                                  {sub.desc}
                                </p>
                              )}
                            </Link>
                          ))}
                          <div className="border-t border-[#E8E2D6]/60 pt-1.5 mt-1">
                            <Link
                              href="/services"
                              className="inline-flex items-center justify-center gap-1.5 w-full text-center text-xs font-semibold text-[#6B8F5B] hover:text-[#154734] py-1.5 group"
                            >
                              <span>View All 5 Services</span>
                              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
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
                    className={`text-sm font-medium transition-colors ${
                      isActive
                        ? "text-[#154734] font-semibold border-b-2 border-[#154734] pb-1"
                        : "text-[#17221D] hover:text-[#154734]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Phone */}
              <a
                href={`tel:${siteConfig.phone.replace(/[^0-9+]/g, "")}`}
                className="flex items-center gap-2.5 text-[#626B63] hover:text-[#154734] font-bold text-base transition-colors px-1"
              >
                <Phone className="w-4 h-4 text-[#154734]" />
                <span>{siteConfig.phone}</span>
              </a>

              {/* Search Pill Button */}
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search TriGyna"
                className="w-12 h-12 rounded-full border border-[#E8E2D6] bg-[#F9F7F1] flex items-center justify-center text-[#154734] hover:bg-[#EADFCF]/40 shadow-sm transition-all"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Primary Enquire Now Button */}
              <button
                onClick={() => openEnquiryModal()}
                className="h-[50px] px-7 rounded-full bg-[#154734] hover:bg-[#0E3828] text-white text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 active:scale-95 group"
              >
                <span>Enquire Now</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Mobile Actions: Search + Hamburger Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search TriGyna"
                className="w-10 h-10 rounded-full border border-[#E8E2D6] bg-white flex items-center justify-center text-[#104B39] hover:bg-[#EADFCF]/40 shadow-2xs transition-all active:scale-95"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                className="w-11 h-11 rounded-full bg-[#E8EFE3] hover:bg-[#DCE7D6] text-[#104B39] flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#104B39]/20"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 stroke-[2.2]" />
                ) : (
                  <Menu className="w-5 h-5 stroke-[2.2]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Right-Side Off-Canvas Drawer Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity duration-300 ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Right-Side Off-Canvas Navigation Drawer */}
      <aside
        id="mobile-navigation-drawer"
        aria-label="Mobile Navigation Menu"
        className={`lg:hidden fixed top-0 right-0 bottom-0 h-full w-[86vw] max-w-[360px] sm:max-w-[380px] bg-[#FBF9F2] z-50 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Top Bar with Brand & Close Button */}
        <div className="shrink-0 px-6 py-5 border-b border-[#E8E2D6]/80 flex items-center justify-between bg-[#FBF9F2]">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2"
          >
            <div className="relative h-10 w-36">
              <Image
                src="/images/brand/logo.png"
                alt="TriGyna"
                fill
                sizes="144px"
                className="object-contain object-left"
              />
            </div>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="w-10 h-10 rounded-full bg-[#E8EFE3] hover:bg-[#DCE7D6] text-[#104B39] flex items-center justify-center transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#104B39]/20"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Doctor Status Bar (Clean & Minimalist) */}
        <div className="shrink-0 px-6 py-2.5 bg-[#E8EFE3]/60 border-b border-[#E8E2D6]/60 flex items-center justify-between text-xs text-[#104B39]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#104B39] animate-pulse" />
            <span className="font-semibold tracking-wide">Dr. Harshali Sutar</span>
          </div>
          <span className="text-[11px] text-[#626B63] font-medium bg-white px-2 py-0.5 rounded-full border border-[#E8E2D6]/80 shadow-2xs">
            Prayagraj, UP
          </span>
        </div>

        {/* Navigation Links (Pure clean typography, no cards!) */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-6 py-3 space-y-0.5">
          {navigationLinks.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            if (item.children) {
              return (
                <div key={item.label} className="border-b border-[#E8E2D6]/50">
                  <button
                    onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                    className={`w-full flex items-center justify-between py-3.5 text-left text-base font-semibold transition-all ${
                      isActive || mobileServicesOpen
                        ? "text-[#104B39] font-bold"
                        : "text-[#2C3E35] hover:text-[#104B39]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {(isActive || mobileServicesOpen) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8A45D]" />
                      )}
                      <span>{item.label}</span>
                      <span className="text-[10px] font-semibold text-[#104B39] bg-[#E8EFE3] px-2 py-0.5 rounded-full">
                        5 Areas
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#104B39] transition-transform duration-200 ${
                        mobileServicesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Clean Indented Sub-Links (No Cards!) */}
                  {mobileServicesOpen && (
                    <div className="pl-4 pb-3 pt-1 space-y-2 border-l border-[#C8A45D]/40 ml-2 animate-fade-in">
                      {item.children.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block py-1.5 text-sm transition-colors ${
                              isSubActive
                                ? "text-[#104B39] font-bold"
                                : "text-[#626B63] hover:text-[#104B39]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{sub.label}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-[#104B39]/40" />
                            </div>
                          </Link>
                        );
                      })}
                      <div className="pt-2">
                        <Link
                          href="/services"
                          onClick={() => setMobileMenuOpen(false)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#104B39] hover:underline"
                        >
                          <span>Explore All Services</span>
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
                className={`group flex items-center justify-between py-3.5 border-b border-[#E8E2D6]/50 text-base font-semibold transition-all ${
                  isActive
                    ? "text-[#104B39] font-bold"
                    : "text-[#2C3E35] hover:text-[#104B39]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8A45D]" />
                  )}
                  <span>{item.label}</span>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isActive
                      ? "text-[#104B39] translate-x-0.5"
                      : "text-[#A0A8A4] opacity-70 group-hover:text-[#104B39] group-hover:translate-x-0.5"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer Actions (Clean & Sleek) */}
        <div className="shrink-0 p-5 bg-[#F4F1EA] border-t border-[#E8E2D6] space-y-3">
          {/* Primary Consultation Button */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              openEnquiryModal();
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#104B39] hover:bg-[#0B3D2E] text-white font-bold text-sm shadow-md active:scale-98 transition-all"
          >
            <span>Book Consultation</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Contact Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-full bg-[#E8EFE3] hover:bg-[#DCE7D6] text-[#104B39] font-semibold text-xs transition-colors"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
              <span>WhatsApp</span>
            </a>

            <a
              href={`tel:${siteConfig.phone.replace(/[^0-9+]/g, "")}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-full bg-white hover:bg-[#F9F7F1] border border-[#E8E2D6] text-[#104B39] font-semibold text-xs transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#104B39] shrink-0" />
              <span>Direct Call</span>
            </a>
          </div>

          {/* Clinic Location & Hours */}
          <div className="pt-1 flex flex-col gap-1 text-[11px] text-[#626B63] text-center">
            <div className="flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-[#C8A45D] shrink-0" />
              <span>{siteConfig.location}</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-[#C8A45D] shrink-0" />
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
