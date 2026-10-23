"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, ArrowRight, BookOpen, Stethoscope, CircleHelp } from "lucide-react";
import { servicesData } from "@/data/servicesData";
import { articlesData } from "@/data/articlesData";
import { faqData } from "@/data/faqData";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
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

  const matchedServices = cleanQuery
    ? servicesData.filter(
        (s) =>
          s.title.toLowerCase().includes(cleanQuery) ||
          s.shortDesc.toLowerCase().includes(cleanQuery) ||
          s.conditionsTreated.some((c) => c.toLowerCase().includes(cleanQuery))
      )
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
          <Search className="w-5 h-5 text-[#154734]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symptoms, services, articles (e.g. PCOS, hair fall, diet)..."
            className="w-full text-base sm:text-lg text-[#17221D] placeholder-gray-400 focus:outline-none bg-transparent"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!cleanQuery ? (
          <div>
            <p className="text-xs font-semibold text-[#7B817B] uppercase tracking-wider mb-3">
              Popular Care Topics
            </p>
            <div className="flex flex-wrap gap-2">
              {["PCOD / PCOS", "Skin & Hair", "Diet & Nutrition", "Homoeopathy", "Stress Relief", "Dr. Harshali Sutar"].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#F9F7F1] border border-[#E8E2D6] text-[#154734] hover:bg-[#EADFCF] transition-colors"
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-5 divide-y divide-[#E8E2D6]/60 pr-1">
            {matchedServices.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#154734] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" /> Services ({matchedServices.length})
                </p>
                <div className="space-y-2">
                  {matchedServices.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/services/${s.slug}`}
                      onClick={onClose}
                      className="block p-3 rounded-xl hover:bg-[#F9F7F1] transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-sm font-semibold text-[#154734] group-hover:underline">
                          {s.title}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#154734] group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-xs text-[#626B63] mt-0.5 line-clamp-1">
                        {s.shortDesc}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {matchedArticles.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-bold text-[#6B8F5B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Articles ({matchedArticles.length})
                </p>
                <div className="space-y-2">
                  {matchedArticles.map((a) => (
                    <Link
                      key={a.slug}
                      href={`/health-tips/${a.slug}`}
                      onClick={onClose}
                      className="block p-3 rounded-xl hover:bg-[#F9F7F1] transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-sm font-semibold text-[#154734] group-hover:underline">
                          {a.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF3E8] text-[#154734]">
                          {a.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#626B63] mt-0.5 line-clamp-1">
                        {a.excerpt}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {matchedFaqs.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-bold text-[#A7C089] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CircleHelp className="w-3.5 h-3.5" /> FAQs ({matchedFaqs.length})
                </p>
                <div className="space-y-2">
                  {matchedFaqs.slice(0, 3).map((f) => (
                    <Link
                      key={f.id}
                      href="/faq"
                      onClick={onClose}
                      className="block p-3 rounded-xl hover:bg-[#F9F7F1] transition-colors group"
                    >
                      <span className="text-xs font-semibold text-[#154734] block">
                        {f.question}
                      </span>
                      <p className="text-xs text-[#626B63] mt-0.5 line-clamp-2">
                        {f.answer}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {matchedServices.length === 0 &&
              matchedArticles.length === 0 &&
              matchedFaqs.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <p className="text-sm">No exact matches found for &quot;{query}&quot;.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try searching for &quot;skin&quot;, &quot;nutrition&quot;, &quot;PCOS&quot;, or reach out via WhatsApp.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
