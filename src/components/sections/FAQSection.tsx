import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { faqData } from "@/data/faqData";
import SectionHeading from "@/components/ui/SectionHeading";
import FAQAccordion from "@/components/ui/FAQAccordion";

export default function FAQSection() {
  const homepageFaqs = faqData.slice(0, 5);

  return (
    <section className="py-16 sm:py-24 bg-[#F9F7F1] border-b border-[#E8E2D6]/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FREQUENTLY ASKED QUESTIONS"
          title="Common Questions Answered"
          subtitle="Everything you need to know about our holistic consultation process and clinical care."
          align="center"
          className="mb-10"
        />

        <FAQAccordion items={homepageFaqs} defaultOpenIndex={0} />

        <div className="text-center pt-8">
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#154734] hover:text-[#0E3828] group"
          >
            <span>Have more questions? Read our full FAQ guide</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
