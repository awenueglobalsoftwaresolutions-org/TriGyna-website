import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Leaf,
  Apple,
  Activity,
  Stethoscope,
  Clock,
  UserCheck,
  Building2,
  Video,
} from "lucide-react";
import { servicesData } from "@/data/servicesData";
import { getPublicServices, PublicService } from "@/lib/api/publicCatalog";
import FinalCTASection from "@/components/sections/FinalCTASection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Specialised Healthcare Services — TriGyna",
  description:
    "Explore TriGyna's comprehensive healthcare services: Skin & Hair, Homoeopathy, Diet & Nutrition, PCOD/PCOS Management, and Clinical Consultations.",
};

export default async function ServicesOverviewPage() {
  // Fetch real services from MongoDB
  const liveServices = await getPublicServices();

  const getIcon = (name?: string) => {
    switch (name) {
      case "Sparkles":
        return <Sparkles className="w-5 h-5 text-[#154734]" />;
      case "Leaf":
        return <Leaf className="w-5 h-5 text-[#154734]" />;
      case "Apple":
        return <Apple className="w-5 h-5 text-[#154734]" />;
      case "Activity":
        return <Activity className="w-5 h-5 text-[#154734]" />;
      default:
        return <Stethoscope className="w-5 h-5 text-[#154734]" />;
    }
  };

  // Harmonize services: prioritize live database services, matching rich static details where available
  const displayServices = liveServices.map((service, idx) => {
    const staticMatch = servicesData.find(
      (s) =>
        s.slug === service.slug ||
        (s.id === "skin-hair" && service.code === "SRV-DRM-01") ||
        (s.id === "pcod-pcos" && service.code === "SRV-PCOS-01") ||
        (s.id === "diet-nutrition" && service.code === "SRV-NUT-01") ||
        (s.id === "homeopathy" && service.code === "SRV-GYN-01") ||
        (s.id === "general-medicine" && service.code === "SRV-GEN-01")
    );

    return {
      id: service._id,
      code: service.code,
      slug: service.slug,
      title: service.name,
      eyebrow: staticMatch?.eyebrow || service.category?.toUpperCase() || "CLINICAL SPECIALTY",
      tagline: staticMatch?.tagline || service.shortDescription || "Evidence-based, personalized clinical care.",
      fullDesc: service.description || staticMatch?.fullDesc || "Comprehensive consultation addressing root causes.",
      image: service.imageUrl || staticMatch?.image || "/images/about/doctor-consultation.jpg",
      iconName: staticMatch?.iconName || "Stethoscope",
      conditionsTreated:
        service.features && service.features.length > 0
          ? service.features
          : staticMatch?.conditionsTreated || [
              "Hormonal and cycle balancing",
              "Metabolic health restoration",
              "Root-cause diagnostic workup",
              "Personalized therapeutic formulation",
            ],
      baseFee: service.baseFee || 1200,
      durationMinutes: service.durationMinutes || 30,
      consultationType: service.consultationType || "both",
      assignedDoctor: service.assignedDoctors?.[0],
    };
  });

  return (
    <div className="bg-[#F9F7F1]">
      {/* Header */}
      <section className="py-14 sm:py-20 border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-3">
              OUR CLINICAL SPECIALTIES
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#154734] font-medium leading-tight mb-5">
              Comprehensive Care for Men and Women
            </h1>
            <p className="text-base sm:text-lg text-[#626B63] leading-relaxed">
              Explore our specialized clinical practices combining modern diagnostic rigor, classical homoeopathy, and personalized metabolic nutrition. Click any service to view full consultation details, doctor credentials, and book appointments.
            </p>
          </div>
        </div>
      </section>

      {/* Services List Detailed Cards */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {displayServices.map((service, idx) => (
            <div
              key={service.id}
              className={`bg-white rounded-3xl overflow-hidden border border-[#E8E2D6] shadow-sm hover:shadow-xl transition-all p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${
                idx % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Image Column */}
              <div
                className={`lg:col-span-5 relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md bg-[#EADFCF]/40 ${
                  idx % 2 === 1 ? "lg:order-2" : "lg:order-1"
                }`}
              >
                <Link href={`/services/${service.slug}`} className="block relative w-full h-full group">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 1024px) 100vw, 450px"
                  />
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center border border-[#E8E2D6]">
                    {getIcon(service.iconName)}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block text-xs font-semibold bg-[#104B39]/90 backdrop-blur-md text-white py-1 px-3 rounded-full shadow-xs">
                      {service.durationMinutes} mins slot • ₹{service.baseFee.toLocaleString("en-IN")}
                    </span>
                  </div>
                </Link>
              </div>

              {/* Text Info */}
              <div
                className={`lg:col-span-7 space-y-4 ${
                  idx % 2 === 1 ? "lg:order-1" : "lg:order-2"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-[#104B39] bg-[#E9EFD9] px-2 py-0.5 rounded uppercase">
                    {service.code}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B]">
                    {service.eyebrow}
                  </span>
                </div>

                <Link href={`/services/${service.slug}`} className="block group">
                  <h2 className="font-serif text-2xl sm:text-3xl text-[#154734] group-hover:text-[#6B8F5B] font-semibold transition-colors">
                    {service.title}
                  </h2>
                </Link>

                <p className="text-sm text-[#17221D] font-medium">
                  {service.tagline}
                </p>

                <p className="text-sm text-[#626B63] leading-relaxed">
                  {service.fullDesc}
                </p>

                {/* Key conditions list */}
                <div className="pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#154734] block mb-2">
                    Common Concerns Addressed:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#626B63]">
                    {service.conditionsTreated.slice(0, 4).map((cond, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0 mt-0.5" />
                        <span>{cond}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assigned Doctor info strip if available */}
                {service.assignedDoctor && (
                  <div className="pt-1 flex items-center gap-2 text-xs text-[#626B63]">
                    <UserCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Specialist: </span>
                    <span className="font-semibold text-[#154734]">
                      {service.assignedDoctor.userId?.name || "Consultant Doctor"}
                    </span>
                    <span className="text-[11px] text-[#7B817B]">
                      ({service.assignedDoctor.qualifications || "Senior Specialist"})
                    </span>
                  </div>
                )}

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#154734] hover:bg-[#0E3828] text-white text-xs sm:text-sm font-medium shadow-sm transition-all group"
                  >
                    <span>Explore Full Service Details</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href={`/book-appointment?service=${service.id}&name=${encodeURIComponent(
                      service.title
                    )}`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E9EFD9] hover:bg-[#D5E1BC] text-[#104B39] text-xs sm:text-sm font-semibold transition-colors"
                  >
                    <span>Book Appointment (₹{service.baseFee})</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <FinalCTASection />
    </div>
  );
}
