import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  ChevronRight,
  Clock,
  CalendarDays,
  UserRound,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { articlesData } from "@/data/articlesData";
import { siteConfig } from "@/data/siteData";
import FinalCTASection from "@/components/sections/FinalCTASection";

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return articlesData.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = articlesData.find((a) => a.slug === slug);

  if (!article) {
    return {
      title: "Article Not Found — TriGyna",
    };
  }

  return {
    title: `${article.title} — TriGyna Health Education`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [article.image],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = articlesData.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  const related = articlesData.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <article className="bg-[#F9F7F1]">
      {/* Breadcrumbs */}
      <div className="bg-[#EADFCF]/30 border-b border-[#E8E2D6]/60 py-3.5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-2 text-xs font-medium text-[#626B63] overflow-x-auto no-scrollbar">
            <Link href="/" className="hover:text-[#154734] transition-colors whitespace-nowrap">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <Link href="/health-tips" className="hover:text-[#154734] transition-colors whitespace-nowrap">
              Health Tips
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-[#154734] font-semibold truncate max-w-xs">{article.title}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <header className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] px-3.5 py-1 rounded-full bg-[#EBF3E8] text-[#154734] border border-[#C5DDBB]">
            {article.category}
          </span>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#154734] font-medium leading-tight">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg text-[#626B63] max-w-2xl mx-auto leading-relaxed">
            {article.excerpt}
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-[#7B817B] pt-2">
            <span className="flex items-center gap-1.5 font-medium text-[#17221D]">
              <UserRound className="w-4 h-4 text-[#6B8F5B]" /> {article.author}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-[#6B8F5B]" /> {article.publishedDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#6B8F5B]" /> {article.readTime}
            </span>
          </div>
        </div>
      </header>

      {/* Featured Image */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
        <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-[#EADFCF]">
          <Image
            src={article.image}
            alt={article.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 896px"
          />
        </div>
      </div>

      {/* Article Body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10 pb-16">
        {/* Intro */}
        <p className="text-lg text-[#17221D] font-serif leading-relaxed italic border-l-4 border-[#154734] pl-5 py-1 bg-white/60 rounded-r-xl">
          {article.content.intro}
        </p>

        {/* Content Sections */}
        {article.content.sections.map((sec, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="font-serif text-2xl text-[#154734] font-semibold">
              {sec.heading}
            </h2>
            {sec.body.map((p, pIdx) => (
              <p key={pIdx} className="text-base text-[#626B63] leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        ))}

        {/* Key Takeaways Card */}
        <div className="bg-[#EBF3E8] border border-[#C5DDBB] rounded-3xl p-6 sm:p-8 space-y-4 my-8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#154734]" />
            <h3 className="font-serif text-xl font-semibold text-[#154734]">
              Clinical Key Takeaways
            </h3>
          </div>
          <div className="space-y-2.5">
            {article.content.keyTakeaways.map((point, kIdx) => (
              <div key={kIdx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#17221D] font-medium leading-relaxed">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Author Bio Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D6] shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#154734] flex-shrink-0 bg-white">
            <Image
              src={siteConfig.doctor.image}
              alt={siteConfig.doctor.name}
              fill
              className="object-cover object-top"
              sizes="80px"
            />
          </div>
          <div className="text-center sm:text-left space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B8F5B]">
              MEDICALLY REVIEWED BY
            </span>
            <h4 className="font-serif text-lg font-semibold text-[#154734]">
              {siteConfig.doctor.name}
            </h4>
            <p className="text-xs text-[#7B817B]">
              {siteConfig.doctor.title} • {siteConfig.doctor.degrees}
            </p>
            <p className="text-xs text-[#626B63] leading-relaxed pt-1">
              Guiding patients through root-cause, evidence-informed natural healthcare and metabolic lifestyle medicine.
            </p>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      <section className="py-14 bg-white border-t border-[#E8E2D6]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-serif text-2xl text-[#154734] font-medium">
              Related Health Articles
            </h3>
            <Link
              href="/health-tips"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B8F5B] hover:text-[#154734] group/all"
            >
              <span>All Articles</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/all:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((rel) => (
              <Link
                key={rel.slug}
                href={`/health-tips/${rel.slug}`}
                className="group bg-[#F9F7F1] rounded-2xl overflow-hidden border border-[#E8E2D6] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EADFCF]/30">
                    <Image
                      src={rel.image}
                      alt={rel.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="350px"
                    />
                  </div>
                  <div className="p-4 sm:p-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B8F5B] block mb-1">
                      {rel.category}
                    </span>
                    <h4 className="font-serif text-base font-semibold text-[#154734] group-hover:underline line-clamp-2">
                      {rel.title}
                    </h4>
                  </div>
                </div>
                <div className="px-5 pb-4 text-xs font-semibold text-[#154734] inline-flex items-center gap-1">
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <FinalCTASection />
    </article>
  );
}
