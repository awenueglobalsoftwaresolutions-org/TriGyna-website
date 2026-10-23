import React from "react";
import { Metadata } from "next";
import {
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { siteConfig } from "@/data/siteData";
import EnquiryForm from "@/components/ui/EnquiryForm";
import FAQAccordion from "@/components/ui/FAQAccordion";
import { faqData } from "@/data/faqData";

export const metadata: Metadata = {
  title: "Contact Us & Consultation Enquiry — TriGyna",
  description:
    "Connect with TriGyna for online video consultations or Prayagraj in-clinic appointments. Phone: +91 917-277-2326, Email: trigyna.health@gmail.com.",
};

export default function ContactPage() {
  const contactFaqs = faqData.slice(1, 4);

  return (
    <div className="bg-[#F9F7F1]">
      {/* Header */}
      <section className="py-14 sm:py-20 border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-3">
              GET IN TOUCH
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#154734] font-medium leading-tight mb-5">
              Contact &amp; Consultation Enquiry
            </h1>
            <p className="text-base sm:text-lg text-[#626B63] leading-relaxed">
              We are here to listen, guide, and support your pathway to lasting wellness. Connect with our care coordination team for online video appointments or in-clinic visits in Prayagraj.
            </p>
          </div>
        </div>
      </section>

      {/* Main Form & Contact Info */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Contact Info & Channels */}
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B]">
                  DIRECT ACCESS
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#154734] font-semibold">
                  How to Connect with Our Care Desk
                </h2>
                <p className="text-sm text-[#626B63] leading-relaxed">
                  Whether you have questions regarding treatment plans, lab report reviews, or scheduling, our team responds promptly during clinical hours.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#E8E2D6] shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EBF3E8] border border-[#C5DDBB] flex items-center justify-center flex-shrink-0 text-[#154734]">
                    <Phone className="w-5 h-5 text-[#154734]" />
                  </div>
                  <div>
                    <span className="text-xs text-[#7B817B] font-medium block">
                      Phone Call
                    </span>
                    <a
                      href={`tel:${siteConfig.phone.replace(/[^0-9+]/g, "")}`}
                      className="font-serif text-base font-semibold text-[#154734] hover:underline"
                    >
                      {siteConfig.phone}
                    </a>
                    <span className="text-[11px] text-[#626B63] block mt-0.5">
                      Mon – Sat: 9:00 AM – 7:00 PM IST
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#E8E2D6] shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EBF3E8] border border-[#C5DDBB] flex items-center justify-center flex-shrink-0 text-[#154734]">
                    <WhatsAppIcon className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  <div>
                    <span className="text-xs text-[#7B817B] font-medium block">
                      WhatsApp Quick Chat
                    </span>
                    <a
                      href={siteConfig.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-serif text-base font-semibold text-[#154734] hover:underline"
                    >
                      Chat with Care Coordinator
                    </a>
                    <span className="text-[11px] text-[#626B63] block mt-0.5">
                      Fast responses for appointment slots &amp; reports
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#E8E2D6] shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EBF3E8] border border-[#C5DDBB] flex items-center justify-center flex-shrink-0 text-[#154734]">
                    <Mail className="w-5 h-5 text-[#154734]" />
                  </div>
                  <div>
                    <span className="text-xs text-[#7B817B] font-medium block">
                      Email Inquiries
                    </span>
                    <a
                      href={`mailto:${siteConfig.email}`}
                      className="font-serif text-base font-semibold text-[#154734] hover:underline"
                    >
                      {siteConfig.email}
                    </a>
                    <span className="text-[11px] text-[#626B63] block mt-0.5">
                      For detailed clinical documentation &amp; medical records
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#E8E2D6] shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EBF3E8] border border-[#C5DDBB] flex items-center justify-center flex-shrink-0 text-[#154734]">
                    <MapPin className="w-5 h-5 text-[#154734]" />
                  </div>
                  <div>
                    <span className="text-xs text-[#7B817B] font-medium block">
                      In-Clinic Location
                    </span>
                    <span className="font-serif text-base font-semibold text-[#154734]">
                      {siteConfig.location}
                    </span>
                    <span className="text-[11px] text-[#626B63] block mt-0.5">
                      Consultations by prior scheduled appointment
                    </span>
                  </div>
                </div>
              </div>

              {/* Consultation FAQs preview */}
              <div className="pt-4">
                <h3 className="font-serif text-lg font-semibold text-[#154734] mb-3">
                  Consultation FAQs
                </h3>
                <FAQAccordion items={contactFaqs} defaultOpenIndex={0} />
              </div>
            </div>

            {/* Right: Interactive Form Container */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl p-7 sm:p-10 border border-[#E8E2D6] shadow-xl">
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-1">
                    CONFIDENTIAL FORM
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl text-[#154734] font-semibold">
                    Submit a Consultation Enquiry
                  </h2>
                  <p className="text-xs sm:text-sm text-[#626B63] mt-1">
                    Fill out your details below and our patient care team will get in touch to confirm your appointment.
                  </p>
                </div>

                <EnquiryForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
