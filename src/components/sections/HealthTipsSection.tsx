import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { articlesData } from "@/data/articlesData";

export default function HealthTipsSection() {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Lifestyle":
        return "bg-[#EBF3E8] text-[#154734]";
      case "Women's Health":
        return "bg-[#F8D9D1] text-[#9A3412]";
      case "Men's Health":
        return "bg-[#E0E7FF] text-[#3730A3]";
      case "Nutrition":
        return "bg-[#FEF3C7] text-[#92400E]";
      default:
        return "bg-[#F9F7F1] text-[#154734]";
    }
  };

  return (
    <section className="py-16 sm:py-20 bg-[#F9F7F1] border-b border-[#E8E2D6]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-2">
              HEALTH TIPS &amp; ARTICLES
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#154734] font-medium">
              Knowledge for a Healthier Life
            </h2>
          </div>

          <Link
            href="/health-tips"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#154734] hover:text-[#0E3828] group"
          >
            <span>View All Articles</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articlesData.map((article) => (
            <div
              key={article.slug}
              className="group bg-white rounded-2xl overflow-hidden border border-[#E8E2D6] shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                {/* Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EADFCF]/30">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5">
                  <span
                    className={`inline-block text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2.5 uppercase tracking-wider ${getCategoryColor(
                      article.category
                    )}`}
                  >
                    {article.category}
                  </span>

                  <h3 className="font-serif text-base sm:text-lg font-semibold text-[#154734] group-hover:text-[#0E3828] leading-snug line-clamp-2">
                    {article.title}
                  </h3>
                </div>
              </div>

              {/* Read More Link */}
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                <Link
                  href={`/health-tips/${article.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#154734] hover:text-[#0E3828] group/link"
                >
                  <span>Read More</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
