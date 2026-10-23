import React from "react";
import { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions — TriGyna",
  description: "TriGyna terms of service, medical consultation disclaimers, and user agreements.",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="bg-[#F9F7F1] py-14 sm:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8E2D6] shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-2">
              TERMS OF USE
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#154734] font-medium mb-3">
              Terms &amp; Conditions
            </h1>
            <p className="text-xs text-[#7B817B]">
              Last updated: October 2026 • TriGyna Healthcare &amp; Wellness
            </p>
          </div>

          <div className="space-y-6 text-sm text-[#626B63] leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                1. Medical Disclaimer &amp; Emergency Situations
              </h2>
              <p>
                The information, educational articles, and content published on this website are for general informational purposes only and do not constitute emergency medical services.
              </p>
              <div className="flex items-start gap-2.5 p-4 rounded-xl bg-[#F6E8DD] border border-[#E8E2D6] text-xs font-medium text-[#17221D]">
                <AlertTriangle className="w-4 h-4 text-[#C8A45D] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  In case of acute medical emergencies, sudden severe chest pain, extreme breathlessness, severe trauma, or acute obstetric distress, please visit the nearest hospital emergency room immediately.
                </span>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                2. Consultation Services &amp; Relationship
              </h2>
              <p>
                A formal doctor-patient relationship is established only upon completion of a scheduled clinical consultation with Dr. Harshali Sutar, whether conducted online via telemedicine or in-person at our clinic in Prayagraj.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                3. Patient Responsibility
              </h2>
              <p>
                Patients agree to provide truthful, accurate, and complete information regarding current medical symptoms, existing prescription drugs, allergies, and past medical history during the consultation.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                4. Intellectual Property
              </h2>
              <p>
                All brand marks, logos, educational guides, website architecture, and clinical content are the intellectual property of TriGyna and may not be reproduced without prior written permission.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
