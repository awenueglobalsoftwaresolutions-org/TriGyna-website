import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import {
  UsersRound,
  HeartPulse,
  ShieldCheck,
  Leaf,
  Building2,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";
import FinalCTASection from "@/components/sections/FinalCTASection";
import TrustHighlightsSection from "@/components/sections/TrustHighlightsSection";
import { FoliageBranch, DelicateTwig } from "@/components/ui/BotanicalFlourish";
export const metadata: Metadata = {
  title: "About TriGyna — Compassionate Care for Every Stage of Life",
  description:
    "Learn about TriGyna's personalised, evidence-based and holistic care philosophy combining clinical homoeopathy, metabolic nutrition, and root-cause medicine for women and men.",
};

export default function AboutPage() {
  const corePillars = [
    {
      title: "Expert Team",
      desc: "Experienced and qualified professionals dedicated to your well-being.",
      icon: UsersRound,
    },
    {
      title: "Personalised Care",
      desc: "Care plans tailored to your unique needs and health goals.",
      icon: HeartPulse,
    },
    {
      title: "Comprehensive Support",
      desc: "From preventive care to advanced treatment, we're with you at every step.",
      icon: ShieldCheck,
    },
    {
      title: "Holistic Approach",
      desc: "Combining medical care, nutrition and lifestyle guidance.",
      icon: Leaf,
    },
  ];

  const approachValues = [
    {
      title: "Evidence-Based Care",
      desc: "Combining modern diagnostics with holistic therapies.",
      icon: Building2,
    },
    {
      title: "Patient-Centred",
      desc: "Your comfort, privacy and goals always come first.",
      icon: HeartHandshake,
    },
    {
      title: "Long-Term Wellness",
      desc: "Focused on prevention, balance and lasting health.",
      icon: Leaf,
    },
  ];

  const patientAvatars = [
    { src: "/images/testimonials/patient-1.webp", alt: "TriGyna Patient 1" },
    { src: "/images/testimonials/patient-2.webp", alt: "TriGyna Patient 2" },
    { src: "/images/testimonials/patient-3.webp", alt: "TriGyna Patient 3" },
    { src: "/images/testimonials/patient-4.webp", alt: "TriGyna Patient 4" },
  ];

  return (
    <div className="bg-[#F9F7F1] text-[#17221D] overflow-x-hidden">
      {/* SECTION 2 — About Hero */}
      <section className="relative pt-10 sm:pt-14 lg:pt-16 pb-16 sm:pb-20 lg:pb-24 border-b border-[#E8E2D6]/40 overflow-hidden">
        {/* Decorative corner greenery */}
        <div
          className="hidden xl:block absolute right-0 top-12 pointer-events-none select-none text-[#6B8F5B] opacity-70 rotate-[150deg] scale-y-[-1]"
          aria-hidden="true"
        >
          <FoliageBranch className="w-28 h-20" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 xl:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Eyebrow Label */}
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-[2px] bg-[#C8A45D] rounded-full inline-block" />
                <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#6B8F5B]">
                  ABOUT TRIGYNA
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[54px] xl:text-[58px] text-[#154734] font-medium leading-[1.12] tracking-tight">
                Compassionate Care for Every Stage of Life
              </h1>

              {/* Supporting Paragraph */}
              <p className="text-base sm:text-lg text-[#626B63] leading-[1.65] max-w-xl">
                At TriGyna, we are dedicated to providing personalised,
                evidence-based and holistic care for women and men, helping you
                achieve better health and a brighter tomorrow.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/services"
                  className="px-7 py-3.5 rounded-full bg-[#154734] hover:bg-[#0E3828] text-white text-sm sm:text-base font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 inline-flex items-center gap-2 group cursor-pointer"
                >
                  <span>Our Services</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="#consultant"
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-[#F9F7F1] text-[#154734] border border-[#154734]/80 text-sm sm:text-base font-semibold transition-all active:scale-95 inline-flex items-center cursor-pointer shadow-2xs"
                >
                  <span>Meet Our Team</span>
                </Link>
              </div>

              {/* Trust Avatars & Delicate Flourish */}
              <div className="flex items-center justify-between max-w-lg pt-4 sm:pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-2.5">
                    {patientAvatars.map((avatar, idx) => (
                      <div
                        key={idx}
                        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-xs bg-[#EADFCF]"
                      >
                        <Image
                          src={avatar.src}
                          alt={avatar.alt}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#626B63] pl-1">
                    Trusted by thousands of patients
                  </span>
                </div>
                <div
                  className="hidden sm:block text-[#6B8F5B] opacity-75 pointer-events-none select-none pl-4"
                  aria-hidden="true"
                >
                  <DelicateTwig className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* Right Visual Column — Doctor Portrait Cutout */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[380px] sm:max-w-[420px] lg:max-w-[450px] aspect-[4/5] flex items-end justify-center">
                {/* Soft Organic Sage Backdrop Arch */}
                <div
                  className="absolute inset-x-2 sm:inset-x-4 bottom-0 top-10 sm:top-12 bg-[#E2EBDC] rounded-t-[200px] rounded-b-[40px] pointer-events-none select-none shadow-xs border border-[#D5E1CC]/60"
                  aria-hidden="true"
                />

                {/* Transparent Doctor Cutout Asset */}
                <div className="relative w-full h-full z-10 flex items-end justify-center">
                  <Image
                    src="/images/doctors/dr-harshali-cutout.webp"
                    alt="Dr. Harshali Sutar — TriGyna Consultant"
                    fill
                    className="object-contain object-bottom drop-shadow-[0_12px_28px_rgba(21,71,52,0.12)]"
                    sizes="(max-width: 640px) 340px, (max-width: 1024px) 420px, 460px"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Our Story */}
      <section className="py-16 sm:py-24 border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Clinic Reception Image with Floating Badge */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E8E2D6] shadow-md bg-[#EADFCF]">
                <Image
                  src="/images/about/clinic-reception.jpg"
                  alt="TriGyna Clinic Reception Desk"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 580px"
                />

                {/* Floating Care Badge in Bottom Right Corner */}
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white/95 backdrop-blur-xs rounded-2xl p-3 sm:p-4 shadow-xl border border-[#E8E2D6] flex items-center gap-3 z-10">
                  <div className="w-11 h-11 rounded-full bg-[#EBF3E8] border border-[#C5DDBB] flex items-center justify-center text-[#154734] flex-shrink-0">
                    <HeartHandshake className="w-5 h-5 text-[#154734] stroke-[1.8]" />
                  </div>
                  <div className="text-left">
                    <div className="font-serif text-sm font-bold text-[#154734] leading-tight">
                      People
                    </div>
                    <div className="text-xs font-semibold text-[#626B63] leading-tight mt-0.5">
                      Focused Care
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Story Copy */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-[2px] bg-[#C8A45D] rounded-full inline-block" />
                <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#6B8F5B]">
                  OUR STORY
                </span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[44px] text-[#154734] font-medium leading-[1.15]">
                A Journey Rooted in Better Health
              </h2>

              <p className="text-base sm:text-[17px] text-[#626B63] leading-[1.7]">
                TriGyna was founded with a simple belief — everyone deserves
                access to compassionate, high-quality and holistic healthcare.
                We bring together clinical expertise, modern technology and a
                patient-first approach to support your physical, emotional and
                long-term well-being.
              </p>

              <div className="pt-2">
                <Link
                  href="#approach"
                  className="px-7 py-3.5 rounded-full bg-[#154734] hover:bg-[#0E3828] text-white text-sm sm:text-base font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 inline-flex items-center gap-2 group cursor-pointer"
                >
                  <span>Our Journey</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Trust Highlights (Horizontal Strip) */}
      <TrustHighlightsSection />

      {/* SECTION 5 — Our Core Pillars */}
      <section className="py-16 sm:py-24 border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered Heading */}
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <span className="w-8 h-[2px] bg-[#C8A45D] rounded-full inline-block" />
              <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#6B8F5B]">
                OUR CORE PILLARS
              </span>
              <span className="w-8 h-[2px] bg-[#C8A45D] rounded-full inline-block" />
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#154734] font-medium leading-tight mb-4">
              What Makes Us Different
            </h2>

            <p className="text-base sm:text-lg text-[#626B63] leading-relaxed">
              We combine expertise, empathy and a holistic approach to deliver
              care that truly makes a difference.
            </p>
          </div>

          {/* 4 Equal-width Benefit Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {corePillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D6] shadow-[0_2px_12px_rgba(21,71,52,0.03)] hover:shadow-[0_8px_24px_rgba(21,71,52,0.08)] hover:border-[#A7C089] transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Sage Circular Icon Badge */}
                    <div className="w-12 h-12 rounded-full bg-[#EAF0E2] border border-[#CBD7BE]/80 flex items-center justify-center text-[#154734] mb-5 group-hover:scale-105 transition-transform duration-300">
                      <Icon className="w-5 h-5 text-[#154734] stroke-[1.8]" />
                    </div>

                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#154734] mb-2.5">
                      {pillar.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#626B63] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 6 — Our Approach */}
      <section
        id="approach"
        className="py-16 sm:py-24 border-b border-[#E8E2D6]/40 scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
            {/* Left Column: Heading, Paragraph, Learn More */}
            <div className="lg:col-span-4 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-[2px] bg-[#C8A45D] rounded-full inline-block" />
                <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#6B8F5B]">
                  OUR APPROACH
                </span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl text-[#154734] font-medium leading-[1.18]">
                Care That Looks at the Bigger Picture
              </h2>

              <p className="text-sm sm:text-base text-[#626B63] leading-relaxed">
                We go beyond just treating symptoms. Our approach focuses on
                understanding your overall health — physical, hormonal,
                emotional and lifestyle factors — to create sustainable and
                lasting results.
              </p>

              <div className="pt-2">
                <Link
                  href="/services"
                  className="px-7 py-3 rounded-full bg-[#154734] hover:bg-[#0E3828] text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 inline-flex items-center gap-2 group cursor-pointer"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Middle Column: Arched Vertical Wellness Plant Frame */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative w-full max-w-[280px] sm:max-w-[310px] aspect-[3/4] rounded-t-full rounded-b-3xl overflow-hidden border-4 border-white shadow-xl bg-[#EADFCF]">
                <Image
                  src="/images/about/approach-plant.jpg"
                  alt="TriGyna Natural Wellness and Botanical Therapies"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 280px, 310px"
                />
              </div>
            </div>

            {/* Right Column: 3 Value Proposition Items with Circular Badges */}
            <div className="lg:col-span-4 space-y-6">
              {approachValues.map((val, idx) => {
                const Icon = val.icon;
                return (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#EAF0E2] border border-[#CBD7BE]/80 flex items-center justify-center text-[#154734] flex-shrink-0 mt-0.5">
                      <Icon className="w-5 h-5 text-[#154734] stroke-[1.8]" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-[#154734]">
                        {val.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#626B63] leading-relaxed mt-0.5">
                        {val.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — Meet Our Consultant */}
      <section
        id="consultant"
        className="py-16 sm:py-24 border-b border-[#E8E2D6]/40 scroll-mt-20 relative overflow-hidden"
      >
        {/* Subtle Foliage Flourish on Bottom Right */}
        <div
          className="hidden xl:block absolute -right-6 -bottom-6 pointer-events-none select-none text-[#6B8F5B] opacity-70 rotate-[160deg] scale-y-[-1]"
          aria-hidden="true"
        >
          <FoliageBranch className="w-24 h-18" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Doctor Consultation Photo */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E8E2D6] shadow-md bg-[#EADFCF]">
                <Image
                  src="/images/about/doctor-consultation.jpg"
                  alt="Dr. Harshali Sutar consulting with a patient at TriGyna"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 580px"
                />
              </div>
            </div>

            {/* Right Column: Bio Copy & Consultant Route Link */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-[2px] bg-[#C8A45D] rounded-full inline-block" />
                <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#6B8F5B]">
                  MEET OUR CONSULTANT
                </span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[44px] text-[#154734] font-medium leading-[1.15]">
                Dr. Harshali Sutar
              </h2>

              <p className="text-sm sm:text-base font-semibold text-[#6B8F5B]">
                Compassionate Care. Personalised Guidance.
              </p>

              <p className="text-base sm:text-[17px] text-[#626B63] leading-[1.7]">
                With a deep passion for women&apos;s health and holistic
                wellness, Dr. Harshali Sutar brings clinical expertise, empathy
                and a patient-first approach to every consultation.
              </p>

              <div className="pt-2">
                <Link
                  href="/doctor"
                  className="px-7 py-3.5 rounded-full bg-transparent hover:bg-[#154734] text-[#154734] hover:text-white border border-[#154734] text-sm sm:text-base font-semibold transition-all active:scale-95 inline-flex items-center gap-2 group cursor-pointer"
                >
                  <span>Know More About Dr. Harshali</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8 — Final Consultation CTA (Deep Forest Green Theme) */}
      <FinalCTASection
        variant="forest"
        eyebrow="LET'S TAKE THE NEXT STEP"
        title="Your Health Journey Starts Here"
        subtitle="Book a consultation with our expert team and experience personalised, holistic care designed around you."
        buttonText="Book a Consultation"
      />
    </div>
  );
}
