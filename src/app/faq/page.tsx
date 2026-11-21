"use client";

import React, { useState } from "react";
import { CircleHelp, Search } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { faqData } from "@/data/faqData";
import FAQAccordion from "@/components/ui/FAQAccordion";
import { siteConfig } from "@/data/siteData";
import FinalCTASection from "@/components/sections/FinalCTASection";

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "General", "Consultation", "Homoeopathy", "Services & Care"];

  const filteredFaqs = faqData.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesQuery =
      searchQuery === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="bg-[#F9F7F1]">
      {/* Header */}
      <section className="py-14 sm:py-20 border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-3">
              HELP &amp; INFORMATION
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#154734] font-medium leading-tight mb-5">
              Frequently Asked Questions
            </h1>
            <p className="text-base sm:text-lg text-[#626B63] leading-relaxed">
              Find clear, straightforward answers about our holistic healthcare approach, consultations, homoeopathic medicines, and clinic procedures.
            </p>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="bg-white border-b border-[#E8E2D6]/60 sticky top-[73px] z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-[#154734] text-white shadow-sm"
                      : "bg-[#F9F7F1] text-[#626B63] hover:bg-[#EADFCF] hover:text-[#17221D]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick search */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs..."
                className="w-full pl-9 pr-4 py-2 rounded-full border border-[#E8E2D6] text-xs sm:text-sm text-[#17221D] focus:outline-none focus:ring-2 focus:ring-[#154734] bg-[#F9F7F1]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion List */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredFaqs.length > 0 ? (
            <FAQAccordion items={filteredFaqs} defaultOpenIndex={0} />
          ) : (
            <div className="bg-white rounded-2xl p-10 text-center border border-[#E8E2D6]">
              <CircleHelp className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="font-serif text-lg text-[#154734] font-semibold mb-1">
                No matching questions found
              </h3>
              <p className="text-xs text-[#626B63] max-w-sm mx-auto mb-4">
                We are always available to answer your specific questions directly via WhatsApp or phone.
              </p>
              <a
                href={siteConfig.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#154734] text-white text-xs font-medium"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#A7C089]" />
                Ask on WhatsApp
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <FinalCTASection />
    </div>
  );
}
