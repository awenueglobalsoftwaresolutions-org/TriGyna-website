"use client";

import React from "react";
import AboutSection from "@/components/sections/AboutSection";
import WhyChooseSection from "@/components/sections/WhyChooseSection";
import TrustStatsStrip from "@/components/ui/TrustStatsStrip";

export { TrustStatsStrip };

export default function AboutWhyChooseSection() {
  return (
    <>
      <AboutSection />
      <WhyChooseSection />
    </>
  );
}
