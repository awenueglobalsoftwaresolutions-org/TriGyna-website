import React from "react";
import Image from "next/image";
import { Metadata } from "next";
import {
  CheckCircle2,
  Clock,
  Stethoscope,
  Languages,
} from "lucide-react";
import { siteConfig } from "@/data/siteData";
import FinalCTASection from "@/components/sections/FinalCTASection";
import EnquiryForm from "@/components/ui/EnquiryForm";

export const metadata: Metadata = {
  title: "Dr. Harshali Sutar — Consultant | Healthcare & Wellness | TriGyna",
  description:
    "Consult Dr. Harshali Sutar at TriGyna. Dedicated to helping individuals and families lead healthier, happier lives through personalized care and holistic treatment.",
};

export default function DoctorProfilePage() {
  const { doctor } = siteConfig;

  const clinicalSpecialties = [
    "Hormonal Balance & PCOD/PCOS Remission",
    "Clinical & Classical Homoeopathy",
    "Metabolic & Functional Nutrition",
    "Dermatological & Scalp Health",
    "Preventive Family Health & Immunity",
    "Chronic Lifestyle & Stress Management",
  ];

  return (
    <div className="bg-[#F9F7F1]">
      {/* Hero Profile Banner */}
      <section className="py-14 sm:py-20 border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Doctor Portrait */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[380px] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                <Image
                  src={doctor.image}
                  alt={doctor.name}
                  fill
                  priority
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 380px"
                />
              </div>
            </div>

            {/* Doctor Bio and Highlights */}
            <div className="lg:col-span-7 space-y-5">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B]">
                CONSULTANT PROFILE
              </span>

              <h1 className="font-serif text-3xl sm:text-5xl text-[#154734] font-medium leading-tight">
                {doctor.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[#154734] bg-[#EBF3E8] px-3.5 py-1 rounded-full border border-[#C5DDBB]">
                  {doctor.title}
                </span>
                <span className="text-xs sm:text-sm text-[#7B817B]">
                  {doctor.degrees}
                </span>
              </div>

              <p className="text-base text-[#626B63] leading-relaxed">
                {doctor.bio}
              </p>

              {/* Quote */}
              <div className="bg-white border-l-4 border-[#154734] p-4 sm:p-5 rounded-r-2xl shadow-sm">
                <p className="font-serif italic text-base sm:text-lg text-[#154734] leading-relaxed">
                  &quot;{doctor.philosophy}&quot;
                </p>
                <span className="block text-xs font-semibold text-[#6B8F5B] mt-2">
                  — {doctor.name}
                </span>
              </div>

              {/* Quick details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-white p-3.5 rounded-xl border border-[#E8E2D6]">
                  <Clock className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-xs text-[#7B817B] block">Experience</span>
                  <span className="font-serif text-sm font-semibold text-[#154734]">
                    10+ Years
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#E8E2D6]">
                  <Stethoscope className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-xs text-[#7B817B] block">Mode</span>
                  <span className="font-serif text-sm font-semibold text-[#154734]">
                    Online &amp; In-Clinic
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#E8E2D6] col-span-2 sm:col-span-1">
                  <Languages className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-xs text-[#7B817B] block">Languages</span>
                  <span className="font-serif text-sm font-semibold text-[#154734]">
                    English, Hindi, Marathi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specialties & Approach */}
      <section className="py-16 sm:py-24 bg-white border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Clinical Focus Areas */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B]">
                AREAS OF EXPERTISE
              </span>
              <h2 className="font-serif text-3xl text-[#154734] font-medium leading-tight">
                Specialized Holistic Care Domains
              </h2>
              <p className="text-sm text-[#626B63] leading-relaxed">
                Dr. Harshali Sutar focuses on conditions where conventional symptom-suppressive medicine often falls short, providing integrated care plans that restore biological resilience.
              </p>

              <div className="space-y-3 pt-2">
                {clinicalSpecialties.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-[#17221D]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Enquiry Form with Doctor */}
            <div className="lg:col-span-6">
              <div className="bg-[#F9F7F1] rounded-3xl p-6 sm:p-8 border border-[#E8E2D6] shadow-sm">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                  SCHEDULE CONSULTATION
                </span>
                <h3 className="font-serif text-2xl text-[#154734] font-semibold mb-2">
                  Request a Consultation
                </h3>
                <p className="text-xs text-[#626B63] mb-6">
                  Online video consultation or in-person clinic visit in Prayagraj.
                </p>
                <EnquiryForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <FinalCTASection />
    </div>
  );
}
