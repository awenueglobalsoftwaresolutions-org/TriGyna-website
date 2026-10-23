"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, CalendarDays } from "lucide-react";
import { articlesData } from "@/data/articlesData";
import FinalCTASection from "@/components/sections/FinalCTASection";

export default function HealthTipsIndexPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Lifestyle", "Women's Health", "Men's Health", "Nutrition"];

  const filteredArticles =
    selectedCategory === "All"
      ? articlesData
      : articlesData.filter((a) => a.category === selectedCategory);

  return (
    <div className="bg-[#F9F7F1]">
      {/* Header */}
      <section className="py-14 sm:py-20 border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-3">
              HEALTH EDUCATION &amp; ARTICLES
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#154734] font-medium leading-tight mb-5">
              Knowledge for a Healthier Life
            </h1>
            <p className="text-base sm:text-lg text-[#626B63] leading-relaxed">
              Explore evidence-informed health articles, hormonal wellness guides, circadian lifestyle tips, and clinical nutritional insights curated by Dr. Harshali Sutar.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter Bar */}
      <section className="bg-white border-b border-[#E8E2D6]/60 sticky top-[73px] z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
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
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article) => (
              <Link
                key={article.slug}
                href={`/health-tips/${article.slug}`}
                className="group bg-white rounded-3xl overflow-hidden border border-[#E8E2D6] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div>
                  {/* Image */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EADFCF]/30">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <span className="absolute top-3 left-3 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-white/95 text-[#154734] shadow-sm">
                      {article.category}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <div className="flex items-center gap-3 text-xs text-[#7B817B] mb-2.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {article.readTime}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" /> {article.publishedDate}
                      </span>
                    </div>

                    <h2 className="font-serif text-xl font-semibold text-[#154734] group-hover:text-[#0E3828] leading-snug mb-3">
                      {article.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-[#626B63] leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>
                </div>

                {/* Footer link */}
                <div className="px-6 pb-6 pt-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#154734] group-hover:text-[#0E3828]">
                    <span>Read Full Article</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <FinalCTASection />
    </div>
  );
}
