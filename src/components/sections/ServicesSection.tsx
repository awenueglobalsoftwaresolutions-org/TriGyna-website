"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Sprout, ClipboardCheck, HeartPulse, Stethoscope, ArrowRight } from "lucide-react";

export default function ServicesSection() {
  const services = [
    {
      id: "skin-hair",
      title: "Skin & Hair",
      desc: "Healthy skin and strong, lustrous hair. Expert solutions for lasting confidence.",
      image: "/images/services/skin-hair.webp",
      slug: "skin-hair",
      icon: Sparkles,
      imagePosition: "object-[center_22%]",
    },
    {
      id: "homeopathy",
      title: "Homeopathy",
      desc: "Gentle, natural healing for long-term health, vitality and disease prevention.",
      image: "/images/services/homoeopathy.webp",
      slug: "homoeopathy",
      icon: Sprout,
      imagePosition: "object-[center_35%]",
    },
    {
      id: "diet-nutrition",
      title: "Diet & Nutrition",
      desc: "Personalized nutrition plans for a healthier, energized and balanced you.",
      image: "/images/services/diet-nutrition.webp",
      slug: "diet-nutrition",
      icon: ClipboardCheck,
      imagePosition: "object-[center_18%]",
    },
    {
      id: "pcod-pcos",
      title: "PCOD/PCOS Care",
      desc: "Balanced hormones, reproductive wellness, and comprehensive lifestyle support.",
      image: "/images/services/pcod-pcos.webp",
      slug: "pcod-pcos",
      icon: HeartPulse,
      imagePosition: "object-[center_20%]",
    },
    {
      id: "general-medicine",
      title: "General Medicine",
      desc: "Comprehensive diagnostic care and treatment for your everyday health needs.",
      image: "/images/services/general-medicine.webp",
      slug: "general-medicine",
      icon: Stethoscope,
      imagePosition: "object-[center_42%]",
    },
  ];

  return (
    <section id="services" className="relative py-14 sm:py-20 lg:py-24 bg-[#FBF9F2] border-b border-[#E8E2D6] overflow-hidden">
      {/* Subtle Ambient Background Light */}
      <div
        className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(233,239,217,0.45),transparent_70%)] pointer-events-none select-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <div className="inline-flex items-center justify-center gap-2.5 mb-2.5 sm:mb-3.5">
            <span className="w-6 sm:w-7 h-[2px] bg-[#C5A880] rounded-full" aria-hidden="true" />
            <span className="text-[11px] sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#6B8F5B]">
              OUR SERVICES
            </span>
            <span className="w-6 sm:w-7 h-[2px] bg-[#C5A880] rounded-full" aria-hidden="true" />
          </div>

          <h2 className="font-serif text-[28px] xs:text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#104B39] leading-[1.18] tracking-tight">
            Comprehensive Care for Men and Women
          </h2>
          <p className="mt-2.5 sm:mt-3.5 text-[14px] sm:text-base lg:text-[17px] text-[#626B68] max-w-2xl mx-auto leading-relaxed">
            Personalized clinical treatments, natural homeopathy, and holistic lifestyle therapies crafted for your long-term wellness.
          </p>
        </div>

        {/* 5-Card Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-6 lg:gap-4 xl:gap-5">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={`/services/${item.slug}`}
                className="group bg-white rounded-[22px] overflow-hidden border border-[#E8E2D6]/85 shadow-[0_2px_12px_rgba(16,75,57,0.04)] hover:shadow-[0_16px_32px_-8px_rgba(16,75,57,0.12)] hover:border-[#A7C089] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div>
                  {/* Service Photography with optimized mobile aspect ratio & focal centering */}
                  <div className="relative w-full aspect-[16/10.5] sm:aspect-auto sm:h-[205px] lg:h-[180px] xl:h-[195px] overflow-hidden bg-[#EADFCF]/30">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className={`object-cover ${item.imagePosition} transition-transform duration-700 ease-out group-hover:scale-108`}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity duration-300" />
                  </div>

                  {/* Service Info with Elevated Badge */}
                  <div className="relative px-5 pt-7 pb-3">
                    {/* Elevated Badge with Solid Contrast */}
                    <div className="absolute -top-6 left-5 w-12 h-12 rounded-full bg-white p-1 shadow-[0_4px_14px_rgba(16,75,57,0.12)] border border-[#E8E2D6] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <div className="w-full h-full rounded-full bg-[#E9EFD9] group-hover:bg-[#104B39] flex items-center justify-center text-[#104B39] group-hover:text-white transition-colors duration-300">
                        <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    </div>

                    <h3 className="font-serif text-[20px] sm:text-[19px] lg:text-[18px] xl:text-[20px] font-bold text-[#104B39] group-hover:text-[#0B3D2E] mb-2 leading-[1.25] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[13.5px] sm:text-[14px] text-[#626B68] leading-[1.55]">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {/* Bottom Know More Action with Circular Arrow */}
                <div className="px-5 pb-5 pt-2">
                  <div className="pt-3 border-t border-[#F0EBE1] flex items-center justify-between text-[13.5px] font-bold text-[#104B39] group-hover:text-[#0B3D2E] transition-colors">
                    <span>Know More</span>
                    <span className="w-7 h-7 rounded-full bg-[#E9EFD9] group-hover:bg-[#104B39] text-[#104B39] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-2xs">
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
