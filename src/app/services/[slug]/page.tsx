import React, { Suspense } from "react";
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
  UserCheck,
  Building2,
  Video,
  Star,
  Sparkles,
  PhoneCall,
} from "lucide-react";
import { servicesData } from "@/data/servicesData";
import SectionHeading from "@/components/ui/SectionHeading";
import FAQAccordion from "@/components/ui/FAQAccordion";
import FinalCTASection from "@/components/sections/FinalCTASection";
import EnquiryForm from "@/components/ui/EnquiryForm";
import ServiceDetailFallback from "@/components/ui/ServiceDetailFallback";
import {
  getPublicServices,
  getPublicServiceBySlug,
  PublicService,
} from "@/lib/api/publicCatalog";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface ServicePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);

  if (!service) {
    return {
      title: "Service Not Found — TriGyna",
    };
  }

  const title = service.name;
  const description =
    service.shortDescription ||
    service.description ||
    `Book doctor consultation for ${title} at TriGyna Health & Wellness.`;

  return {
    title: `${title} Consultation — TriGyna Health & Wellness`,
    description,
    openGraph: {
      title: `${title} — TriGyna Clinical Care`,
      description,
      images: [service.imageUrl || "/images/about/doctor-consultation.jpg"],
    },
  };
}

export default function ServiceDetailPage({ params }: ServicePageProps) {
  return (
    <Suspense fallback={<ServiceDetailFallback />}>
      <ServiceDetailContent params={params} />
    </Suspense>
  );
}

async function ServiceDetailContent({ params }: ServicePageProps) {
  const { slug } = await params;

  // 1. Fetch live service from MongoDB API
  const liveService = await getPublicServiceBySlug(slug);
  if (!liveService || liveService.status === "draft" || liveService.isPublished === false) {
    notFound();
  }

  // 2. Cross-reference static rich data if available
  const staticData = servicesData.find(
    (s) =>
      s.slug === slug ||
      (s.slug === "skin-hair" &&
        (slug === "clinical-dermatology-hair-analysis" || liveService.code === "SRV-DRM-01")) ||
      (s.slug === "pcod-pcos" &&
        (slug === "pcos-metabolic-health-evaluation" || liveService.code === "SRV-PCOS-01")) ||
      (s.slug === "diet-nutrition" &&
        (slug === "clinical-dietetics-metabolic-nutrition" || liveService.code === "SRV-NUT-01")) ||
      (s.slug === "homoeopathy" &&
        (slug === "comprehensive-gynecological-consultation" || liveService.code === "SRV-GYN-01")) ||
      (s.slug === "general-medicine" &&
        (slug === "general-medicine-holistic-second-opinion" || liveService.code === "SRV-GEN-01"))
  );

  // 3. Fetch all services for related services carousel
  const allServices = await getPublicServices();
  const relatedServices = allServices
    .filter((s) => s.slug !== slug && s.status === "active" && s.isPublished !== false)
    .slice(0, 4);

  // Normalize fields
  const title = staticData?.title || liveService.name;
  const category = staticData?.eyebrow || liveService.category || "General Clinical Care";
  const code = liveService.code;
  const duration = liveService.durationMinutes || 30;
  const baseFee = liveService.baseFee || 1200;
  const image =
    staticData?.image || liveService.imageUrl || "/images/about/doctor-consultation.jpg";
  const description =
    staticData?.fullDesc ||
    liveService.description ||
    "Evidence-based clinical consultation combining modern diagnostic rigor, classical homoeopathy, and tailored nutrition.";

  // Conditions treated list
  const conditionsTreated =
    liveService.features && liveService.features.length > 0
      ? liveService.features
      : staticData?.conditionsTreated || [
          "Hormonal and menstrual irregularities",
          "Chronic metabolic fatigue and stress",
          "Root-cause diagnostic review",
          "Personalized therapeutic protocol",
        ];

  // Key benefits list
  const keyBenefits =
    staticData?.keyBenefits || [
      {
        title: "Root Cause Resolution",
        desc: "We look beyond symptom suppression to address underlying hormonal, metabolic, and lifestyle triggers.",
      },
      {
        title: "100% Doctor-Supervised Care",
        desc: "All clinical formulations and lifestyle prescriptions are personally verified by licensed medical specialists.",
      },
      {
        title: "Zero Harsh Side-Effects",
        desc: "Natural constitutional therapeutics that work harmoniously with your endocrine and digestive systems.",
      },
      {
        title: "Continuous Digital Monitoring",
        desc: "Access follow-up guidance and dosage checks through our dedicated clinic support portal.",
      },
    ];

  // Consultation steps
  const consultationApproach =
    staticData?.consultationApproach || [
      {
        step: "01",
        title: "Case Analysis & Diagnostic Review",
        desc: "A thorough 30-45 minute clinical review of your complete medical history, lab reports, and lifestyle patterns.",
      },
      {
        step: "02",
        title: "Constitutional Prescription",
        desc: "Selection of specific, personalized homoeopathic and nutritional remedies aligned with your unique metabolic constitution.",
      },
      {
        step: "03",
        title: "Review & Progressive Pacing",
        desc: "Bi-weekly or monthly milestone checkups to adjust potency, track symptom remission, and reinforce lasting vitality.",
      },
    ];

  // FAQs
  const faqs =
    staticData?.faqs || [
      {
        question: `What should I prepare before my ${title} consultation?`,
        answer:
          "Please have your recent blood test reports, ultrasound scans, current prescriptions, and a brief note of your symptoms and cycle history ready.",
      },
      {
        question: "Can I consult online via video call?",
        answer:
          liveService.consultationType === "in_person"
            ? "This specific clinical evaluation requires an in-person physical assessment at our Prayagraj clinic."
            : "Yes! High-definition video consultations are available with digital prescriptions sent directly via WhatsApp and our patient portal.",
      },
      {
        question: "How soon can I expect clinical improvement?",
        answer:
          "Most patients notice positive shifts in energy and symptom intensity within 2 to 4 weeks, with complete constitutional reversal progressing steadily over 3 to 6 months.",
      },
    ];

  const assignedDoctors = liveService.assignedDoctors || [];

  return (
    <div className="bg-[#FBF9F2] min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="bg-[#EAE4D5]/40 border-b border-[#E8E2D6] py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs font-medium text-[#626B68]">
            <Link href="/" className="hover:text-[#104B39] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link href="/services" className="hover:text-[#104B39] transition-colors">
              Clinical Catalogue
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[#6B8F5B]">{category}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[#104B39] font-semibold truncate max-w-xs">{title}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 border-b border-[#E8E2D6] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[11px] font-bold text-[#104B39] bg-[#E9EFD9] px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  {code}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B]">
                  {category}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#22C55E] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span>Verified Service</span>
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#104B39] font-medium leading-[1.2]">
                {title}
              </h1>

              <p className="text-base sm:text-lg text-[#17221D] font-medium">
                {liveService.shortDescription ||
                  "Specialized root-cause clinical consultation tailored for long-term recovery."}
              </p>

              <p className="text-sm sm:text-base text-[#626B68] leading-relaxed">
                {description}
              </p>

              {/* Consultation Features Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D6] text-xs">
                  <Clock className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-[#7B817B] block text-[10px] uppercase font-bold">
                    Slot Length
                  </span>
                  <span className="font-semibold text-[#104B39]">{duration} Mins</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D6] text-xs">
                  <Video className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-[#7B817B] block text-[10px] uppercase font-bold">
                    Delivery Mode
                  </span>
                  <span className="font-semibold text-[#104B39]">
                    Online Video Consultation
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D6] text-xs">
                  <CalendarDays className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-[#7B817B] block text-[10px] uppercase font-bold">
                    Consultation Days
                  </span>
                  <span className="font-semibold text-[#104B39]">Mon – Sat</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D6] text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#6B8F5B] mb-1" />
                  <span className="text-[#7B817B] block text-[10px] uppercase font-bold">
                    Consultation Fee
                  </span>
                  <span className="font-semibold text-[#104B39] text-sm">
                    ₹{baseFee.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Direct Booking CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  href={`/book-appointment?service=${liveService._id}&name=${encodeURIComponent(
                    title
                  )}`}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#104B39] hover:bg-[#0D3B2D] text-white text-sm font-semibold shadow-md shadow-[#104B39]/20 transition-all group"
                >
                  <span>Book Consultation Now</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <a
                  href="tel:+919876543210"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-[#F3EFE6] text-[#104B39] text-sm font-semibold border border-[#E8E2D6] transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-[#6B8F5B]" />
                  <span>Call Clinic Support</span>
                </a>
              </div>
            </div>

            {/* Right Photo */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[440px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                <Image
                  src={image}
                  alt={title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 440px"
                />
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#E8E2D6] shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#7B817B] block">
                      Consultation Slot
                    </span>
                    <span className="text-sm font-bold text-[#104B39]">
                      ₹{baseFee.toLocaleString("en-IN")} / session
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#22C55E] bg-[#DCFCE7] px-2.5 py-1 rounded-full">
                    Immediate Slots Available
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ASSIGNED DOCTORS SECTION */}
      {assignedDoctors.length > 0 && (
        <section className="py-12 sm:py-16 bg-white border-b border-[#E8E2D6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                MEET YOUR SPECIALIST
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#104B39] font-semibold">
                Available Doctors for {title}
              </h2>
              <p className="text-xs sm:text-sm text-[#626B68] mt-1">
                Licensed healthcare specialists credentialed to lead this consultation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedDoctors.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-[#FBF9F2] rounded-3xl p-6 border border-[#E8E2D6] hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#104B39] text-white flex items-center justify-center font-serif text-xl font-bold shrink-0 shadow-sm">
                        {doc.userId?.name ? doc.userId.name.charAt(3) || "D" : "D"}
                      </div>
                      <div>
                        <h3 className="font-serif text-base font-bold text-[#104B39] flex items-center gap-1.5">
                          <span>{doc.userId?.name || "Dr. TriGyna Specialist"}</span>
                          <UserCheck className="w-4 h-4 text-[#22C55E]" />
                        </h3>
                        <p className="text-xs text-[#6B8F5B] font-medium">
                          {doc.qualifications || "Consultant Physician"}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-[#7B817B] mt-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>4.9 (Verified Reviews)</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#626B68] leading-relaxed mb-4">
                      {doc.bio ||
                        "Dedicated clinical practitioner with extensive expertise in holistic diagnosis, root-cause healing, and personalized regimens."}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {doc.specialization?.map((spec, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] bg-white text-[#444E47] px-2 py-0.5 rounded-md border border-[#E8E2D6]"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8E2D6] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#7B817B] block">
                        Consultation
                      </span>
                      <span className="text-sm font-bold text-[#104B39]">
                        ₹{(doc.consultationFee || baseFee).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <Link
                      href={`/book-appointment?service=${liveService._id}&doctorId=${doc._id}&name=${encodeURIComponent(
                        title
                      )}`}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#104B39] hover:bg-[#0D3B2D] text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <span>Choose Slot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Conditions Treated & Key Benefits */}
      <section className="py-16 sm:py-20 bg-white border-b border-[#E8E2D6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Conditions list */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                  CLINICAL FOCUS
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#104B39] font-semibold">
                  Key Concerns &amp; Conditions Addressed
                </h2>
              </div>

              <div className="space-y-3">
                {conditionsTreated.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FBF9F2] border border-[#E8E2D6]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
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
                  PATIENT ADVANTAGES
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#104B39] font-semibold">
                  Why Choose Our Clinical Approach
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {keyBenefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#FBF9F2] border border-[#E8E2D6] space-y-1.5"
                  >
                    <h3 className="font-serif text-sm font-semibold text-[#104B39]">
                      {b.title}
                    </h3>
                    <p className="text-xs text-[#626B68] leading-relaxed">
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
      <section className="py-16 sm:py-20 bg-[#FBF9F2] border-b border-[#E8E2D6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="CONSULTATION FRAMEWORK"
            title="Our 3-Step Care Journey"
            subtitle={`How our clinical team structures your ${title} healing protocol.`}
            align="center"
            className="mb-12"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {consultationApproach.map((step) => (
              <div
                key={step.step}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8E2D6] shadow-xs relative"
              >
                <span className="font-serif text-4xl font-bold text-[#C5A880]/50 block mb-2">
                  {step.step}
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#104B39] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#626B68] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service FAQs & Booking Form Grid */}
      <section className="py-16 sm:py-24 bg-white border-b border-[#E8E2D6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* FAQs */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                  COMMON QUESTIONS
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#104B39] font-semibold">
                  Frequently Asked Questions
                </h2>
              </div>

              <FAQAccordion items={faqs} defaultOpenIndex={0} />
            </div>

            {/* Quick Enquiry Card */}
            <div className="lg:col-span-6">
              <div className="bg-[#FBF9F2] rounded-3xl p-6 sm:p-8 border border-[#E8E2D6] shadow-xs">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                  START YOUR CARE
                </span>
                <h3 className="font-serif text-2xl text-[#104B39] font-semibold mb-2">
                  Enquire About {title}
                </h3>
                <p className="text-xs text-[#626B68] mb-5">
                  Book a secure online video consultation via Google Meet or Zoom.
                </p>
                <EnquiryForm initialService={title} compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Services */}
      {relatedServices.length > 0 && (
        <section className="py-14 sm:py-16 bg-[#FBF9F2] border-b border-[#E8E2D6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-serif text-2xl text-[#104B39] font-medium">
                Explore Related Consultations
              </h3>
              <Link
                href="/services"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B8F5B] hover:text-[#104B39] group"
              >
                <span>View Full Catalogue</span>
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
                    <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden mb-3 bg-[#EAE4D5]/30">
                      <Image
                        src={rel.imageUrl || "/images/about/doctor-consultation.jpg"}
                        alt={rel.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#6B8F5B] uppercase tracking-wider block">
                      {rel.category}
                    </span>
                    <h4 className="font-serif text-sm font-semibold text-[#104B39] group-hover:underline mt-0.5">
                      {rel.name}
                    </h4>
                    <p className="text-xs text-[#626B68] mt-1 line-clamp-2">
                      {rel.description || rel.shortDescription}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#E8E2D6]/40 mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#104B39]">
                      ₹{rel.baseFee.toLocaleString("en-IN")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B8F5B] group-hover:text-[#104B39]">
                      <span>View</span>
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <FinalCTASection />
    </div>
  );
}
