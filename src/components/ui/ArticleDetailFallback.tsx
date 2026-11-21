import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * ArticleDetailFallback
 * Accessible, zero-CLS skeleton placeholder for Health Tip Article Detail pages.
 * Supports Next.js 16 Partial Prerendering (PPR) and Instant Navigation.
 */
export default function ArticleDetailFallback() {
  return (
    <article
      className="bg-[#F9F7F1] min-h-screen"
      role="status"
      aria-label="Loading health article..."
    >
      <span className="sr-only">Loading article, please wait...</span>

      {/* 1. Breadcrumbs */}
      <div className="bg-[#EADFCF]/30 border-b border-[#E8E2D6]/60 py-3.5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <nav
            aria-label="Breadcrumb loading"
            className="flex items-center gap-2 text-xs font-medium text-[#626B63]"
          >
            <Link href="/" className="hover:text-[#154734] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <Link
              href="/health-tips"
              className="hover:text-[#154734] transition-colors"
            >
              Health Tips
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <div className="w-24 sm:w-36 h-3 bg-[#154734]/15 rounded-full animate-pulse motion-reduce:animate-none" />
          </nav>
        </div>
      </div>

      {/* 2. Header Skeleton */}
      <header className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          {/* Category Badge Placeholder */}
          <div className="w-28 h-6 bg-[#EBF3E8] border border-[#C5DDBB] rounded-full mx-auto animate-pulse motion-reduce:animate-none" />

          {/* Title Placeholder */}
          <div className="space-y-2 max-w-2xl mx-auto pt-1">
            <div className="w-full h-8 sm:h-11 bg-[#154734]/15 rounded-xl animate-pulse motion-reduce:animate-none" />
            <div className="w-4/5 h-8 sm:h-11 bg-[#154734]/10 rounded-xl mx-auto animate-pulse motion-reduce:animate-none" />
          </div>

          {/* Excerpt Placeholder */}
          <div className="space-y-2 max-w-xl mx-auto pt-2">
            <div className="w-full h-4 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
            <div className="w-5/6 h-4 bg-[#626B63]/10 rounded mx-auto animate-pulse motion-reduce:animate-none" />
          </div>

          {/* Meta details bar (Author / Date / Time) */}
          <div className="flex items-center justify-center gap-4 pt-3">
            <div className="w-28 h-3.5 bg-gray-200 rounded animate-pulse motion-reduce:animate-none" />
            <span className="text-gray-300">•</span>
            <div className="w-24 h-3.5 bg-gray-200 rounded animate-pulse motion-reduce:animate-none" />
            <span className="text-gray-300">•</span>
            <div className="w-20 h-3.5 bg-gray-200 rounded animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
      </header>

      {/* 3. Featured Image Skeleton */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
        <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-[#EADFCF]/50 flex items-center justify-center animate-pulse motion-reduce:animate-none">
          <div className="w-16 h-16 rounded-2xl bg-white/40" />
        </div>
      </div>

      {/* 4. Article Body Skeleton */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10 pb-16">
        {/* Intro blockquote placeholder */}
        <div className="border-l-4 border-[#154734]/30 pl-5 py-3 bg-white/40 rounded-r-xl space-y-2">
          <div className="w-full h-4 bg-[#17221D]/10 rounded animate-pulse motion-reduce:animate-none" />
          <div className="w-11/12 h-4 bg-[#17221D]/10 rounded animate-pulse motion-reduce:animate-none" />
        </div>

        {/* Section 1 */}
        <div className="space-y-3 pt-2">
          <div className="w-48 h-6 bg-[#154734]/15 rounded-lg animate-pulse motion-reduce:animate-none" />
          <div className="w-full h-3.5 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
          <div className="w-full h-3.5 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
          <div className="w-4/5 h-3.5 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
        </div>

        {/* Key Takeaways Card */}
        <div className="bg-[#EBF3E8]/60 border border-[#C5DDBB]/80 rounded-3xl p-6 sm:p-8 space-y-3 my-8">
          <div className="w-44 h-5 bg-[#154734]/20 rounded-md animate-pulse motion-reduce:animate-none" />
          <div className="space-y-2 pt-1">
            <div className="w-full h-4 bg-[#17221D]/10 rounded animate-pulse motion-reduce:animate-none" />
            <div className="w-11/12 h-4 bg-[#17221D]/10 rounded animate-pulse motion-reduce:animate-none" />
            <div className="w-4/5 h-4 bg-[#17221D]/10 rounded animate-pulse motion-reduce:animate-none" />
          </div>
        </div>

        {/* Author Bio Card Skeleton */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D6] shadow-xs flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[#154734]/10 shrink-0 animate-pulse motion-reduce:animate-none" />
          <div className="space-y-2 w-full text-center sm:text-left">
            <div className="w-28 h-3 bg-[#6B8F5B]/20 rounded mx-auto sm:mx-0 animate-pulse motion-reduce:animate-none" />
            <div className="w-44 h-5 bg-[#154734]/15 rounded mx-auto sm:mx-0 animate-pulse motion-reduce:animate-none" />
            <div className="w-full h-3.5 bg-[#626B63]/10 rounded animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    </article>
  );
}
