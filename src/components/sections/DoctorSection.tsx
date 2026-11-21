"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  UserRoundCheck,
  Stethoscope,
  Leaf,
  UsersRound,
  ShieldCheck,
} from "lucide-react";
import { siteConfig } from "@/data/siteData";

export default function DoctorSection() {
  const { doctor } = siteConfig;

  const pillars = [
    { text: "Personalised Consultation", icon: UserRoundCheck },
    { text: "Evidence-Based Treatment", icon: Stethoscope },
    { text: "Holistic Approach", icon: Leaf },
    { text: "Support for Men & Women", icon: UsersRound },
    { text: "Focus on Long-Term Wellness", icon: ShieldCheck },
  ];

  return (
    <section className="py-16 sm:py-24 bg-[#F9F7F1] border-b border-[#E8E2D6]/40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left: Bio & Credentials */}
          <div className="lg:col-span-4 space-y-4">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B]">
              MEET OUR CONSULTANT
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] text-[#154734] font-medium leading-tight">
              {doctor.name}
            </h2>

            <p className="text-sm font-semibold text-[#6B8F5B] uppercase tracking-wide">
              {doctor.title}
            </p>

            <p className="text-xs sm:text-sm text-[#7B817B]">
              {doctor.degrees} • {doctor.experienceYears} Clinical Experience
            </p>

            <p className="text-sm sm:text-base text-[#626B63] leading-relaxed pt-1">
              {doctor.bio}
            </p>

            <div className="pt-2">
              <Link
                href="/doctor"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#154734] hover:bg-[#0E3828] text-white text-xs sm:text-sm font-medium shadow-sm transition-all group"
              >
                <span>Know More</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Center: Doctor Portrait */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative w-full max-w-[340px] aspect-[4/5] rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-white">
              <Image
                src={doctor.image}
                alt={doctor.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 340px, 340px"
              />
            </div>
          </div>

          {/* Right: Feature Panel & Quote Card */}
          <div className="lg:col-span-4 space-y-5">
            {/* Dark Forest Green Pillars Card */}
            <div className="bg-[#154734] text-white rounded-2xl p-6 shadow-md space-y-3.5">
              {pillars.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#A7C089] flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium tracking-wide">
                      {p.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Light Cream Quote Card */}
            <div className="bg-white border border-[#E8E2D6] rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="font-serif text-5xl text-[#6B8F5B]/30 absolute top-2 left-4 select-none">
                “
              </div>
              <p className="font-serif italic text-base sm:text-lg text-[#154734] relative z-10 leading-snug pt-3">
                &quot;{doctor.philosophy}&quot;
              </p>
              <p className="text-xs font-semibold text-[#6B8F5B] text-right mt-3">
                — {doctor.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
