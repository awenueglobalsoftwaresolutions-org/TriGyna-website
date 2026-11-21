"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  X,
  ArrowRight,
  BookOpen,
  Stethoscope,
  CircleHelp,
  Gift,
} from "lucide-react";
import { articlesData } from "@/data/articlesData";
import { faqData } from "@/data/faqData";
import {
  getPublicServices,
  getPublicPackages,
  PublicService,
  PublicPackage,
} from "@/lib/api/publicCatalog";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [liveServices, setLiveServices] = useState<PublicService[]>([]);
  const [livePackages, setLivePackages] = useState<PublicPackage[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      // Fetch fresh catalog data when search modal opens
      Promise.all([getPublicServices(), getPublicPackages()]).then(
        ([srvs, pkgs]) => {
          setLiveServices(srvs);
          setLivePackages(pkgs);
        }
      );
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  // Search live MongoDB services
  const matchedServices = cleanQuery
    ? liveServices.filter((s) => {
        if (s.status === "draft" || s.isPublished === false) return false;
        return (
          s.name.toLowerCase().includes(cleanQuery) ||
          s.code.toLowerCase().includes(cleanQuery) ||
          (s.category && s.category.toLowerCase().includes(cleanQuery)) ||
          (s.description && s.description.toLowerCase().includes(cleanQuery)) ||
          (s.shortDescription && s.shortDescription.toLowerCase().includes(cleanQuery)) ||
          (s.features && s.features.some((f) => f.toLowerCase().includes(cleanQuery)))
        );
      })
    : [];

  // Search live MongoDB wellness packages
  const matchedPackages = cleanQuery
    ? livePackages.filter((p) => {
        if (p.isPublished === false) return false;
        return (
          p.name.toLowerCase().includes(cleanQuery) ||
          (p.category && p.category.toLowerCase().includes(cleanQuery)) ||
          (p.description && p.description.toLowerCase().includes(cleanQuery)) ||
          (p.features && p.features.some((f) => f.toLowerCase().includes(cleanQuery)))
        );
      })
    : [];

  const matchedArticles = cleanQuery
    ? articlesData.filter(
        (a) =>
          a.title.toLowerCase().includes(cleanQuery) ||
          a.category.toLowerCase().includes(cleanQuery) ||
          a.excerpt.toLowerCase().includes(cleanQuery)
      )
    : [];

  const matchedFaqs = cleanQuery
    ? faqData.filter(
        (f) =>
          f.question.toLowerCase().includes(cleanQuery) ||
          f.answer.toLowerCase().includes(cleanQuery)
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#0E3828]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E8E2D6] p-5 sm:p-7 z-10 animate-fade-in">
        <div className="flex items-center gap-3 border-b border-[#E8E2D6] pb-3 mb-4">
          <Search className="w-5 h-5 text-[#104B39]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symptoms, services, packages, articles (e.g. PCOS, hair fall, diet)..."
            className="w-full text-base sm:text-lg text-[#17221D] placeholder-gray-400 focus:outline-none bg-transparent"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!cleanQuery ? (
          <div>
            <p className="text-xs font-semibold text-[#7B817B] uppercase tracking-wider mb-3">
              Popular Care Topics &amp; Consultations
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "PCOS",
                "Gynecology",
                "Pregnancy",
                "Skin & Hair",
                "Fertility",
                "Thyroid",
                "Holistic Packages",
                "Dr. Harshali Sutar",
              ].map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#FBF9F2] border border-[#E8E2D6] text-[#104B39] hover:bg-[#EAE4D5] transition-colors cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-5 divide-y divide-[#E8E2D6]/60 pr-1">
            {/* Live Services Matches */}
            {matchedServices.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#104B39] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" /> Clinical Services ({matchedServices.length})
                </p>
                <div className="space-y-2">
                  {matchedServices.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/services/${s.slug}`}
                      onClick={onClose}
                      className="block p-3 rounded-xl hover:bg-[#FBF9F2] transition-colors group border border-transparent hover:border-[#E8E2D6]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-[#104B39] bg-[#E9EFD9] px-2 py-0.5 rounded">
                            {s.code}
                          </span>
                          <span className="font-serif text-sm font-semibold text-[#104B39] group-hover:underline">
                            {s.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#104B39]">
                            ₹{s.baseFee.toLocaleString("en-IN")}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#104B39] group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                      <p className="text-xs text-[#626B68] mt-1 line-clamp-1">
                        {s.shortDescription || s.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Live Packages Matches */}
            {matchedPackages.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-bold text-[#6B8F5B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" /> Care Packages ({matchedPackages.length})
                </p>
                <div className="space-y-2">
                  {matchedPackages.map((p) => {
                    const priceInr = Math.round(p.pricePaise / 100);
                    return (
                      <Link
                        key={p._id}
                        href={`/services`}
                        onClick={onClose}
                        className="block p-3 rounded-xl hover:bg-[#FBF9F2] transition-colors group border border-transparent hover:border-[#E8E2D6]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-sm font-semibold text-[#104B39] group-hover:underline">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#104B39]">
                              ₹{priceInr.toLocaleString("en-IN")}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#104B39] group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                        <p className="text-xs text-[#626B68] mt-1 line-clamp-1">
                          {p.description} • {p.totalSessions} Sessions ({p.validityDays} Days)
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Articles Matches */}
            {matchedArticles.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-bold text-[#626B68] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Articles ({matchedArticles.length})
                </p>
                <div className="space-y-2">
                  {matchedArticles.map((a) => (
                    <Link
                      key={a.slug}
                      href={`/health-tips/${a.slug}`}
                      onClick={onClose}
                      className="block p-3 rounded-xl hover:bg-[#FBF9F2] transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-sm font-semibold text-[#104B39] group-hover:underline">
                          {a.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9EFD9] text-[#104B39]">
                          {a.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#626B68] mt-0.5 line-clamp-1">
                        {a.excerpt}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs Matches */}
            {matchedFaqs.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-bold text-[#7B817B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CircleHelp className="w-3.5 h-3.5" /> FAQs ({matchedFaqs.length})
                </p>
                <div className="space-y-2">
                  {matchedFaqs.slice(0, 3).map((f) => (
                    <Link
                      key={f.id}
                      href="/faq"
                      onClick={onClose}
                      className="block p-3 rounded-xl hover:bg-[#FBF9F2] transition-colors group"
                    >
                      <span className="text-xs font-semibold text-[#104B39] block">
                        {f.question}
                      </span>
                      <p className="text-xs text-[#626B68] mt-0.5 line-clamp-2">
                        {f.answer}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {matchedServices.length === 0 &&
              matchedPackages.length === 0 &&
              matchedArticles.length === 0 &&
              matchedFaqs.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <p className="text-sm">No exact matches found for &quot;{query}&quot;.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try searching for &quot;PCOS&quot;, &quot;Gynecology&quot;, &quot;Skin&quot;, or reach out to clinic support.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
