import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * ServiceDetailFallback
 * Lightweight, accessible loading skeleton for the Service Detail page.
 * Strictly adheres to TriGyna's brand palette:
 * - Forest green: #154734
 * - Deep forest: #0E3828
 * - Warm cream: #F9F7F1
 * - Sage: #6B8F5B
 * - Border: #E8E2D6
 *
 * Implements:
 * - Precise layout dimensions matching ServiceDetailContent to prevent layout shift (CLS).
 * - Responsive breakpoints for mobile, tablet, and desktop.
 * - Respects prefers-reduced-motion via Tailwind motion-reduce modifiers.
 * - Semantic accessibility with role="status" and screen-reader guidance.
 */
export default function ServiceDetailFallback() {
  return (
    <div
      className="bg-[#F9F7F1] min-h-screen"
      role="status"
      aria-label="Loading service details..."
    >
      <span className="sr-only">Loading service details, please wait...</span>

      {/* 1. Breadcrumb Bar */}
      <div className="bg-[#EADFCF]/30 border-b border-[#E8E2D6]/60 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb loading"
            className="flex items-center gap-2 text-xs font-medium text-[#626B63]"
          >
            <Link href="/" className="hover:text-[#154734] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link
              href="/services"
              className="hover:text-[#154734] transition-colors"
            >
              Services
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            {/* Active Service Breadcrumb Placeholder */}
            <div className="w-24 sm:w-32 h-3.5 bg-[#154734]/15 rounded-full animate-pulse motion-reduce:animate-none" />
          </nav>
        </div>
      </div>

      {/* 2. Hero Section Skeleton */}
      <section className="py-12 sm:py-16 border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-4">
              {/* Eyebrow */}
              <div className="w-36 h-3 bg-[#6B8F5B]/20 rounded-full animate-pulse motion-reduce:animate-none" />

              {/* Title (matches font-serif 3xl to 5xl) */}
              <div className="space-y-2">
                <div className="w-4/5 h-9 sm:h-12 bg-[#154734]/15 rounded-xl animate-pulse motion-reduce:animate-none" />
                <div className="w-3/5 h-9 sm:h-12 bg-[#154734]/10 rounded-xl animate-pulse motion-reduce:animate-none" />
              </div>

              {/* Tagline */}
              <div className="w-11/12 h-5 bg-[#17221D]/10 rounded-lg animate-pulse motion-reduce:animate-none pt-1" />

              {/* Description Paragraph (3 lines) */}
              <div className="space-y-2 pt-1">
                <div className="w-full h-3.5 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
                <div className="w-11/12 h-3.5 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
                <div className="w-4/5 h-3.5 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
              </div>

              {/* Consultation Features Strip Skeleton (3 Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`bg-white p-3 rounded-xl border border-[#E8E2D6] space-y-2 ${
                      idx === 3 ? "col-span-2 sm:col-span-1" : ""
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-[#6B8F5B]/20 animate-pulse motion-reduce:animate-none" />
                    <div className="w-16 h-2.5 bg-gray-200 rounded animate-pulse motion-reduce:animate-none" />
                    <div className="w-20 h-3.5 bg-[#154734]/15 rounded animate-pulse motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Photo Placeholder */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[420px] aspect-[4/3] sm:aspect-[1/1] rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-[#EADFCF]/40 flex items-center justify-center animate-pulse motion-reduce:animate-none">
                <div className="w-16 h-16 rounded-2xl bg-white/40 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#154734]/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Conditions & Benefits Section Skeleton */}
      <section className="py-16 sm:py-20 bg-white border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Conditions list */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <div className="w-28 h-3 bg-[#6B8F5B]/20 rounded-full animate-pulse motion-reduce:animate-none" />
                <div className="w-4/5 h-7 sm:h-8 bg-[#154734]/15 rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#F9F7F1] border border-[#E8E2D6]/60"
                  >
                    <div className="w-4 h-4 rounded-full bg-[#22C55E]/20 flex-shrink-0 animate-pulse motion-reduce:animate-none" />
                    <div className="w-3/4 h-3.5 bg-[#17221D]/10 rounded animate-pulse motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>

            {/* Key Benefits */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <div className="w-28 h-3 bg-[#6B8F5B]/20 rounded-full animate-pulse motion-reduce:animate-none" />
                <div className="w-4/5 h-7 sm:h-8 bg-[#154734]/15 rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((b) => (
                  <div
                    key={b}
                    className="p-5 rounded-2xl bg-[#F9F7F1] border border-[#E8E2D6] space-y-2"
                  >
                    <div className="w-3/4 h-4 bg-[#154734]/15 rounded animate-pulse motion-reduce:animate-none" />
                    <div className="w-full h-3 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
                    <div className="w-4/5 h-3 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Consultation Approach (3 Steps) Skeleton */}
      <section className="py-16 sm:py-20 bg-[#F9F7F1] border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-12">
            <div className="w-36 h-3 bg-[#6B8F5B]/20 rounded-full mx-auto animate-pulse motion-reduce:animate-none" />
            <div className="w-64 h-8 bg-[#154734]/15 rounded-lg mx-auto animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D6] shadow-xs space-y-3"
              >
                <div className="w-10 h-8 bg-[#A7C089]/20 rounded animate-pulse motion-reduce:animate-none" />
                <div className="w-3/5 h-5 bg-[#154734]/15 rounded animate-pulse motion-reduce:animate-none" />
                <div className="w-full h-3.5 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
                <div className="w-4/5 h-3.5 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
