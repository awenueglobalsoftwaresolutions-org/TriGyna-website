"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  X,
  Stethoscope,
  Gift,
  Clock,
  IndianRupee,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
  Video,
  UserCheck,
  RefreshCw,
  Heart,
  Baby,
  Flower2,
  Apple,
  LayoutGrid,
} from "lucide-react";
import {
  PublicService,
  PublicPackage,
  PublicCategory,
  getPublicServices,
  getPublicPackages,
} from "@/lib/api/publicCatalog";

interface PublicCatalogViewProps {
  initialServices: PublicService[];
  initialPackages: PublicPackage[];
  initialCategories: PublicCategory[];
}

export default function PublicCatalogView({
  initialServices,
  initialPackages,
  initialCategories,
}: PublicCatalogViewProps) {
  const [activeTab, setActiveTab] = useState<"services" | "packages">("services");
  const [services, setServices] = useState<PublicService[]>(initialServices);
  const [packages, setPackages] = useState<PublicPackage[]>(initialPackages);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Function to pull latest live data directly from MongoDB Express API
  const refreshLiveCatalogue = async () => {
    setIsRefreshing(true);
    try {
      const [freshServices, freshPackages] = await Promise.all([
        getPublicServices(),
        getPublicPackages(),
      ]);
      setServices(freshServices);
      setPackages(freshPackages);
      setLastUpdated(new Date());
    } catch {
      // Kept current on error
    } finally {
      setIsRefreshing(false);
    }
  };

  // Poll for live changes every 60 seconds or on component mount
  useEffect(() => {
    refreshLiveCatalogue();
    const interval = setInterval(refreshLiveCatalogue, 60000);
    return () => clearInterval(interval);
  }, []);

  // Compute category counts for clinical services
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: services.length };
    services.forEach((s) => {
      const cat = s.category || "Others";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [services]);

  // Filter clinical services
  const filteredServices = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return services.filter((s) => {
      // Draft / unpublished safety check
      if (s.status !== "active" || s.isPublished === false) return false;

      // Category filter
      if (selectedCategory !== "All" && s.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (query) {
        const matchTitle = s.name.toLowerCase().includes(query);
        const matchCode = s.code.toLowerCase().includes(query);
        const matchDesc = (s.description || "").toLowerCase().includes(query);
        const matchCat = (s.category || "").toLowerCase().includes(query);
        const matchFeatures = (s.features || []).some((f) => f.toLowerCase().includes(query));
        const matchDoctors = (s.assignedDoctors || []).some((d) =>
          (d.userId?.name || "").toLowerCase().includes(query)
        );
        return matchTitle || matchCode || matchDesc || matchCat || matchFeatures || matchDoctors;
      }

      return true;
    });
  }, [services, selectedCategory, searchQuery]);

  // Filter packages
  const filteredPackages = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return packages.filter((p) => {
      if (p.isPublished === false) return false;

      if (query) {
        const matchTitle = p.name.toLowerCase().includes(query);
        const matchDesc = (p.description || "").toLowerCase().includes(query);
        const matchFeatures = (p.features || []).some((f) => f.toLowerCase().includes(query));
        return matchTitle || matchDesc || matchFeatures;
      }
      return true;
    });
  }, [packages, searchQuery]);

  const getCategoryIcon = (name: string) => {
    switch (name) {
      case "Gynecology & Obstetrics":
        return <Stethoscope className="w-4 h-4 text-[#104B39]" />;
      case "Reproductive & Hormonal Wellness":
        return <Heart className="w-4 h-4 text-[#D94E34]" />;
      case "Dermatology & Cosmetology":
        return <Sparkles className="w-4 h-4 text-[#8E518D]" />;
      case "Fertility & IVF":
        return <Baby className="w-4 h-4 text-[#1E5F74]" />;
      case "Preventive Health & Checkups":
        return <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />;
      case "Wellness Programmes":
        return <Flower2 className="w-4 h-4 text-[#9C27B0]" />;
      case "Nutrition & Lifestyle":
        return <Apple className="w-4 h-4 text-[#E65100]" />;
      default:
        return <LayoutGrid className="w-4 h-4 text-[#626B68]" />;
    }
  };

  return (
    <div className="space-y-10">
      {/* Real-time Status & Sync Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-[#E8E2D6] shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#104B39] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#104B39]"></span>
          </span>
          <span className="text-xs font-semibold text-[#104B39]">
            Live Medical Database Connected
          </span>
          <span className="text-[11px] text-[#7B817B] hidden sm:inline">
            • {services.length} Clinical Services • {packages.length} Wellness Packages
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#7B817B] hidden md:inline">
            Updated: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={refreshLiveCatalogue}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FBF9F2] hover:bg-[#EAE4D5] text-[#104B39] border border-[#E8E2D6] transition-colors cursor-pointer disabled:opacity-50"
            title="Fetch latest updates from TriGyna Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Main Switcher: Clinical Services vs Holistic Wellness Packages */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 border-b border-[#E8E2D6] pb-6">
        <div className="inline-flex items-center bg-[#EAE4D5]/60 p-1.5 rounded-2xl border border-[#E8E2D6]">
          <button
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "services"
                ? "bg-[#104B39] text-white shadow-md shadow-[#104B39]/15"
                : "text-[#626B68] hover:text-[#104B39]"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Clinical Services ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("packages")}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "packages"
                ? "bg-[#104B39] text-white shadow-md shadow-[#104B39]/15"
                : "text-[#626B68] hover:text-[#104B39]"
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Wellness Packages ({packages.length})</span>
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="w-4 h-4 text-[#7B817B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "services"
                ? "Search services, conditions, codes..."
                : "Search care packages, protocols..."
            }
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E8E2D6] rounded-xl text-xs sm:text-sm text-[#17221D] placeholder-[#7B817B] focus:outline-none focus:ring-2 focus:ring-[#104B39]/20 focus:border-[#104B39]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#7B817B] hover:text-[#17221D]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: CLINICAL SERVICES */}
      {activeTab === "services" && (
        <div className="space-y-8">
          {/* Category Filter Pills */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B8F5B]">
              Filter By Clinical Specialty:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  selectedCategory === "All"
                    ? "bg-[#104B39] text-white border-[#104B39] shadow-xs"
                    : "bg-white text-[#626B68] border-[#E8E2D6] hover:border-[#104B39]/40 hover:text-[#104B39]"
                }`}
              >
                All Services ({services.length})
              </button>

              {initialCategories.map((cat) => {
                const count = categoryCounts[cat.name] || 0;
                const isSelected = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-[#104B39] text-white border-[#104B39] shadow-xs"
                        : "bg-white text-[#626B68] border-[#E8E2D6] hover:border-[#104B39]/40 hover:text-[#104B39]"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isSelected ? "bg-white/20 text-white" : "bg-[#F3EFE6] text-[#626B68]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Consultation Mode Filter */}
          <div className="flex items-center justify-between text-xs text-[#7B817B]">
            <div>
              Showing <span className="font-bold text-[#104B39]">{filteredServices.length}</span>{" "}
              consultation services
              {selectedCategory !== "All" && <span> in "{selectedCategory}"</span>}
              {searchQuery && <span> matching "{searchQuery}"</span>}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EBF3E8] text-[#154734] font-medium text-xs border border-[#C5DDBB]">
              <Video className="w-3.5 h-3.5 text-[#154734]" />
              <span>100% Online Video Consultations</span>
            </div>
          </div>

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E8E2D6] p-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#F3EFE6] flex items-center justify-center mx-auto text-[#104B39]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#104B39]">
                No matching services found
              </h3>
              <p className="text-xs text-[#626B68] max-w-md mx-auto">
                Try searching for different symptoms or reset your category filters to view all
                available clinical consultations.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                  setSelectedMode("all");
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#104B39] text-white text-xs font-semibold hover:bg-[#0D3B2D] transition-colors"
              >
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {filteredServices.map((service) => {
                const doctor = service.assignedDoctors?.[0];
                return (
                  <div
                    key={service._id}
                    className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs hover:shadow-lg hover:border-[#C5A880]/50 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Meta Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-[#104B39] bg-[#E9EFD9] px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            {service.code}
                          </span>
                          <span className="text-[11px] font-semibold text-[#6B8F5B] flex items-center gap-1">
                            {getCategoryIcon(service.category)}
                            <span>{service.category}</span>
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#22C55E] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                          <span>Active</span>
                        </span>
                      </div>

                      {/* Main Card Content */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 mb-4">
                        {/* Service Thumbnail */}
                        <div className="sm:col-span-4 relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#EAE4D5]/30 border border-[#E8E2D6]/60">
                          <Image
                            src={service.imageUrl || "/images/about/doctor-consultation.jpg"}
                            alt={service.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, 180px"
                          />
                          <div className="absolute bottom-2 left-2 right-2">
                            <span className="block text-center text-[9px] font-bold bg-[#104B39]/90 backdrop-blur-md text-white py-1 px-1.5 rounded-md shadow-xs">
                              Online Video Consultation
                            </span>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="sm:col-span-8 flex flex-col justify-between">
                          <div>
                            <Link href={`/services/${service.slug}`}>
                              <h3 className="font-serif text-lg font-bold text-[#104B39] hover:text-[#6B8F5B] transition-colors leading-snug">
                                {service.name}
                              </h3>
                            </Link>
                            <p className="text-xs text-[#626B68] line-clamp-3 mt-1.5 leading-relaxed">
                              {service.description ||
                                service.shortDescription ||
                                "Holistic clinical consultation with constitutional evaluation and personalized regimen."}
                            </p>
                          </div>

                          {/* Duration & Mode Specs */}
                          <div className="flex items-center gap-4 text-xs text-[#7B817B] mt-3 pt-2 border-t border-[#E8E2D6]/40">
                            <div className="flex items-center gap-1.5 font-medium text-[#17221D]">
                              <Clock className="w-3.5 h-3.5 text-[#6B8F5B]" />
                              <span>{service.durationMinutes} mins slot</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {service.consultationType === "online" ? (
                                <Video className="w-3.5 h-3.5 text-[#6B8F5B]" />
                              ) : (
                                <Building2 className="w-3.5 h-3.5 text-[#6B8F5B]" />
                              )}
                              <span>
                                {service.consultationType === "both"
                                  ? "Dual Mode"
                                  : service.consultationType === "in_person"
                                  ? "Prayagraj Clinic"
                                  : "Tele-Consult"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Clinical Features Pills */}
                      {service.features && service.features.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {service.features.slice(0, 3).map((f, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[11px] bg-[#FBF9F2] text-[#444E47] px-2.5 py-1 rounded-lg border border-[#E8E2D6]/70"
                            >
                              <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                              <span>{f}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Doctor Assignment Strip */}
                      {doctor && (
                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FBF9F2] border border-[#E8E2D6]/60 mb-4">
                          <div className="w-7 h-7 rounded-full bg-[#104B39] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {doctor.userId?.name ? doctor.userId.name.charAt(3) || "D" : "D"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#104B39] truncate flex items-center gap-1">
                              <span>{doctor.userId?.name || "Consultant Specialist"}</span>
                              <UserCheck className="w-3 h-3 text-[#22C55E]" />
                            </p>
                            <p className="text-[10px] text-[#7B817B] truncate">
                              {doctor.qualifications || doctor.specialization?.[0] || "Specialist"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Pricing & CTAs */}
                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#E8E2D6] mt-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7B817B] block">
                          Consultation Fee
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold font-serif text-[#104B39]">
                            ₹{service.baseFee.toLocaleString("en-IN")}
                          </span>
                          {service.discountFee && service.discountFee > 0 && (
                            <span className="text-xs text-[#7B817B] line-through">
                              ₹{(service.baseFee + service.discountFee).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/services/${service.slug}`}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-[#104B39] hover:bg-[#F3EFE6] border border-[#E8E2D6] transition-colors"
                        >
                          <span>Details</span>
                        </Link>
                        <Link
                          href={`/book-appointment?service=${service._id}&name=${encodeURIComponent(
                            service.name
                          )}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#104B39] hover:bg-[#0D3B2D] text-white shadow-xs transition-colors"
                        >
                          <span>Book Slot</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: WELLNESS PACKAGES */}
      {activeTab === "packages" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between text-xs text-[#7B817B]">
            <div>
              Showing <span className="font-bold text-[#104B39]">{filteredPackages.length}</span>{" "}
              curated wellness &amp; reversal packages
            </div>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E8E2D6] p-8 space-y-4">
              <Gift className="w-8 h-8 text-[#104B39] mx-auto" />
              <h3 className="font-serif text-xl font-semibold text-[#104B39]">
                No matching packages found
              </h3>
              <p className="text-xs text-[#626B68]">
                Clear your search query to see all structured holistic programs.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-5 py-2 rounded-full bg-[#104B39] text-white text-xs font-semibold"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPackages.map((pkg, idx) => {
                const priceInr = Math.round(pkg.pricePaise / 100);
                const originalInr = pkg.originalPricePaise
                  ? Math.round(pkg.originalPricePaise / 100)
                  : Math.round(priceInr * 1.35);
                const discountPercent = Math.round(
                  ((originalInr - priceInr) / originalInr) * 100
                );

                return (
                  <div
                    key={pkg._id}
                    className={`bg-white rounded-3xl border p-6 sm:p-7 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between relative ${
                      idx === 0
                        ? "border-[#104B39] ring-2 ring-[#104B39]/20"
                        : "border-[#E8E2D6]"
                    }`}
                  >
                    {idx === 0 && (
                      <div className="absolute -top-3 left-6">
                        <span className="bg-[#104B39] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#C5A880]" />
                          <span>Most Recommended</span>
                        </span>
                      </div>
                    )}

                    <div>
                      {/* Package Category & Mode */}
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="font-semibold text-[#6B8F5B] text-[11px] uppercase tracking-wider">
                          {pkg.category || "Holistic Programme"}
                        </span>
                        <span className="text-[10px] font-bold text-[#104B39] bg-[#E9EFD9] px-2.5 py-0.5 rounded-full">
                          {pkg.consultationMode || "In-Person & Online"}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-serif text-xl font-bold text-[#104B39] mb-2 leading-snug">
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-[#626B68] leading-relaxed mb-5">
                        {pkg.description}
                      </p>

                      {/* Core Package Metrics */}
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#FBF9F2] border border-[#E8E2D6]/70 mb-5 text-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#7B817B] block">
                            Included Sessions
                          </span>
                          <span className="text-sm font-bold text-[#104B39]">
                            {pkg.totalSessions} Consultations
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#7B817B] block">
                            Validity Period
                          </span>
                          <span className="text-sm font-bold text-[#104B39]">
                            {pkg.validityDays} Days
                          </span>
                        </div>
                      </div>

                      {/* Inclusions List */}
                      <div className="space-y-2 mb-6">
                        <span className="text-[11px] uppercase font-bold text-[#104B39] tracking-wider block">
                          Protocol Inclusions:
                        </span>
                        {pkg.features.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2 text-xs text-[#444E47]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Pricing & CTA */}
                    <div className="pt-4 border-t border-[#E8E2D6]">
                      <div className="flex items-baseline justify-between mb-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#7B817B] block">
                            Package Price
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-serif text-[#104B39]">
                              ₹{priceInr.toLocaleString("en-IN")}
                            </span>
                            <span className="text-xs text-[#7B817B] line-through">
                              ₹{originalInr.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {discountPercent > 0 && (
                          <span className="text-[10px] font-bold text-[#104B39] bg-[#E9EFD9] px-2 py-0.5 rounded-md">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/book-appointment?package=${pkg._id}&name=${encodeURIComponent(
                          pkg.name
                        )}`}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#104B39] hover:bg-[#0D3B2D] text-white text-xs font-semibold shadow-xs transition-colors group"
                      >
                        <span>Enroll In Package</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
