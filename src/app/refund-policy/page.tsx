import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — TriGyna",
  description: "TriGyna consultation appointment rescheduling and refund guidelines.",
};

export default function RefundPolicyPage() {
  return (
    <div className="bg-[#F9F7F1] py-14 sm:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8E2D6] shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8F5B] block mb-2">
              APPOINTMENT POLICIES
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#154734] font-medium mb-3">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="text-xs text-[#7B817B]">
              Last updated: October 2026 • TriGyna Healthcare &amp; Wellness
            </p>
          </div>

          <div className="space-y-6 text-sm text-[#626B63] leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                1. Appointment Rescheduling
              </h2>
              <p>
                We understand that unexpected circumstances arise. You may reschedule your consultation up to 4 hours prior to the scheduled slot by messaging our WhatsApp care desk at <strong>+91 917-277-2326</strong> or emailing <strong>trigyna.health@gmail.com</strong> without any penalty.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                2. Cancellations &amp; Refunds
              </h2>
              <p>
                - If a consultation is canceled at least 24 hours in advance, a full refund will be processed to the original payment source within 5–7 business days.
              </p>
              <p>
                - Once a consultation has been completed and clinical recommendations or prescriptions have been issued, fees are non-refundable as the professional clinical service and doctor’s time have been rendered.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl text-[#154734] font-semibold">
                3. Technical Disruption Policy
              </h2>
              <p>
                In the rare event of technical failure, network disruptions, or physician emergency during an online video consultation, your appointment will be rescheduled at the earliest mutual convenience at no additional cost.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
