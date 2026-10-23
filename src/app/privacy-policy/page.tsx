import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — TriGyna",
  description: "TriGyna clinical privacy policy, data protection standards, and patient confidentiality guidelines.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[#F9F7F1] py-14 sm:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8E2D6] shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-2">
              LEGAL &amp; COMPLIANCE
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#154734] font-medium mb-3">
              Privacy Policy
            </h1>
            <p className="text-xs text-[#7B817B]">
              Last updated: October 2026 • TriGyna Healthcare &amp; Wellness
            </p>
          </div>

          <div className="space-y-6 text-sm text-[#626B63] leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                1. Commitment to Patient Confidentiality
              </h2>
              <p>
                At TriGyna (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), patient trust and medical privacy are paramount. We handle all personal details, health inquiries, and diagnostic records in strict accordance with applicable medical ethics and healthcare data protection laws.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                2. Information We Collect
              </h2>
              <p>
                When you submit a consultation enquiry or communicate with our clinical desk, we may collect:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Contact Information: Full name, phone number, email address.</li>
                <li>Consultation Preferences: Preferred mode (online video or in-clinic visit).</li>
                <li>Health Information: Clinical concerns, medical histories, or lab reports shared voluntarily for diagnostic review.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                3. How Information Is Used
              </h2>
              <p>
                Your information is used strictly to coordinate consultations, deliver personalized medical guidance, review laboratory findings, and provide follow-up healthcare counsel. We never sell, rent, or trade your personal or health data to third-party marketing companies.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                4. Data Security Standards
              </h2>
              <p>
                All digital communications, patient notes, and records are stored securely with appropriate administrative, technical, and physical safeguards against unauthorized access or disclosure.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                5. Contact Regarding Privacy
              </h2>
              <p>
                If you have questions regarding your data privacy, please email us at <strong>trigyna.health@gmail.com</strong> or call <strong>+91 917-277-2326</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
