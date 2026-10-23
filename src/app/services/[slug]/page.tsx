import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  Clock,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { servicesData } from "@/data/servicesData";
import SectionHeading from "@/components/ui/SectionHeading";
import FAQAccordion from "@/components/ui/FAQAccordion";
import FinalCTASection from "@/components/sections/FinalCTASection";
import EnquiryForm from "@/components/ui/EnquiryForm";

interface ServicePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return servicesData.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = servicesData.find((s) => s.slug === slug);

  if (!service) {
    return {
      title: "Service Not Found — TriGyna",
    };
  }

  return {
    title: `${service.title} Consultation — TriGyna`,
    description: service.shortDesc,
    openGraph: {
      title: `${service.title} — TriGyna Healthcare`,
      description: service.shortDesc,
      images: [service.image],
    },
  };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = servicesData.find((s) => s.slug === slug);

  if (!service) {
    notFound();
  }

  const relatedServices = servicesData.filter((s) => s.slug !== service.slug);

  return (
    <div className="bg-[#F9F7F1]">
      {/* Breadcrumb Navigation */}
      <div className="bg-[#EADFCF]/30 border-b border-[#E8E2D6]/60 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs font-medium text-[#626B63]">
            <Link href="/" className="hover:text-[#154734] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link href="/services" className="hover:text-[#154734] transition-colors">
              Services
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[#154734] font-semibold">{service.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B]">
                {service.eyebrow}
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl text-[#154734] font-medium leading-tight">
                {service.title}
              </h1>
              <p className="text-base sm:text-lg text-[#17221D] font-medium">
                {service.tagline}
              </p>
              <p className="text-sm sm:text-base text-[#626B63] leading-relaxed">
                {service.fullDesc}
              </p>

              {/* Consultation Features Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                <div className="bg-white p-3 rounded-xl border border-[#E8E2D6] text-xs">
                  <Clock className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-[#7B817B] block">Session Length</span>
                  <span className="font-semibold text-[#154734]">45–60 Mins</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#E8E2D6] text-xs">
                  <CalendarDays className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-[#7B817B] block">Availability</span>
                  <span className="font-semibold text-[#154734]">Mon – Sat</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#E8E2D6] text-xs col-span-2 sm:col-span-1">
                  <ShieldCheck className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-[#7B817B] block">Care Approach</span>
                  <span className="font-semibold text-[#154734]">Root Cause</span>
                </div>
              </div>
            </div>

            {/* Right Photo */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[420px] aspect-[4/3] sm:aspect-[1/1] rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-white">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 420px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conditions Treated & Key Benefits */}
      <section className="py-16 sm:py-20 bg-white border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Conditions list */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                  WHAT WE TREAT
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#154734] font-semibold">
                  Common Conditions &amp; Health Concerns
                </h2>
              </div>

              <div className="space-y-3">
                {service.conditionsTreated.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#F9F7F1] border border-[#E8E2D6]/60"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-[#17221D] font-medium">
                      {cond}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Benefits */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                  WHY IT MATTERS
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#154734] font-semibold">
                  Clinical Benefits of Our Approach
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {service.keyBenefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#F9F7F1] border border-[#E8E2D6] space-y-1.5"
                  >
                    <h3 className="font-serif text-base font-semibold text-[#154734]">
                      {b.title}
                    </h3>
                    <p className="text-xs text-[#626B63] leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Consultation Approach (3 Steps) */}
      <section className="py-16 sm:py-20 bg-[#F9F7F1] border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="CONSULTATION FRAMEWORK"
            title="Our 3-Step Care Journey"
            subtitle={`How Dr. Harshali Sutar structures your ${service.title} healing journey.`}
            align="center"
            className="mb-12"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {service.consultationApproach.map((step) => (
              <div
                key={step.step}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D6] shadow-sm relative"
              >
                <span className="font-serif text-4xl font-bold text-[#A7C089]/40 block mb-2">
                  {step.step}
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#154734] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#626B63] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service FAQs & Booking Form Grid */}
      <section className="py-16 sm:py-24 bg-white border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* FAQs */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                  COMMON QUESTIONS
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#154734] font-semibold">
                  Frequently Asked About {service.title}
                </h2>
              </div>

              <FAQAccordion items={service.faqs} defaultOpenIndex={0} />
            </div>

            {/* Quick Enquiry Card */}
            <div className="lg:col-span-6">
              <div className="bg-[#F9F7F1] rounded-3xl p-6 sm:p-8 border border-[#E8E2D6] shadow-sm">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                  START YOUR CARE
                </span>
                <h3 className="font-serif text-2xl text-[#154734] font-semibold mb-2">
                  Enquire About {service.title}
                </h3>
                <p className="text-xs text-[#626B63] mb-5">
                  Book an online video appointment or in-clinic visit in Prayagraj with Dr. Harshali Sutar.
                </p>
                <EnquiryForm initialService={service.title} compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="py-14 sm:py-16 bg-[#F9F7F1] border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-serif text-2xl text-[#154734] font-medium">
              Explore Related Services
            </h3>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B8F5B] hover:text-[#154734] group"
            >
              <span>All Services</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedServices.map((rel) => (
              <Link
                key={rel.slug}
                href={`/services/${rel.slug}`}
                className="group bg-white rounded-2xl p-4 border border-[#E8E2D6] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden mb-3 bg-[#EADFCF]/30">
                    <Image
                      src={rel.image}
                      alt={rel.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                    />
                  </div>
                  <h4 className="font-serif text-sm font-semibold text-[#154734] group-hover:underline">
                    {rel.title}
                  </h4>
                  <p className="text-xs text-[#626B63] mt-1 line-clamp-2">
                    {rel.shortDesc}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B8F5B] mt-3 group-hover:text-[#154734]">
                  <span>Learn More</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
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
