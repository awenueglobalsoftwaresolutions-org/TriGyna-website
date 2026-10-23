import React from "react";
import HeroSection from "@/components/sections/HeroSection";
import ServicesSection from "@/components/sections/ServicesSection";
import AboutSection from "@/components/sections/AboutSection";
import WhyChooseSection from "@/components/sections/WhyChooseSection";
import DoctorSection from "@/components/sections/DoctorSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import PatientExperiencesSection from "@/components/sections/PatientExperiencesSection";
import HealthTipsSection from "@/components/sections/HealthTipsSection";
import FAQSection from "@/components/sections/FAQSection";
import FinalCTASection from "@/components/sections/FinalCTASection";

export default function HomePage() {
  return (
    <>
      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Our Services */}
      <ServicesSection />

      {/* 3. About TriGyna */}
      <AboutSection />

      {/* 4. Why Choose TriGyna */}
      <WhyChooseSection />

      {/* 5. Doctor / Consultant */}
      <DoctorSection />

      {/* 6. How It Works */}
      <HowItWorksSection />

      {/* 7. Patient Experiences */}
      <PatientExperiencesSection />

      {/* 8. Health Tips & Articles */}
      <HealthTipsSection />

      {/* 9. Frequently Asked Questions */}
      <FAQSection />

      {/* 10. Final Call to Action */}
      <FinalCTASection />
    </>
  );
}
