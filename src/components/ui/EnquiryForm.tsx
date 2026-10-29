"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import Button from "./Button";
import { siteConfig } from "@/data/siteData";

interface EnquiryFormProps {
  initialService?: string;
  onSuccess?: () => void;
  compact?: boolean;
}

export default function EnquiryForm({
  initialService = "",
  onSuccess,
  compact = false,
}: EnquiryFormProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    service: initialService || "Skin & Hair",
    consultationMode: "Online Video Consultation",
    message: "",
    consent: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const servicesList = [
    "Skin & Hair",
    "Homoeopathy",
    "Diet & Nutrition",
    "PCOD/PCOS Management",
    "General Medicine",
    "General Wellness Consultation",
  ];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      errs.fullName = "Please enter your full name";
    }
    const cleanPhone = formData.phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = "Please enter a valid 10-digit phone number";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Please enter a valid email address";
    }
    if (!formData.consent) {
      errs.consent = "Please agree to the privacy terms";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/v1";
      const res = await fetch(`${apiUrl}/public/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          serviceInterest: formData.service,
          consultationMode: formData.consultationMode,
          message: formData.message,
          consent: formData.consent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Failed to submit enquiry");
      }

      setStatus("success");
      if (onSuccess) {
        setTimeout(onSuccess, 4000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to reach TriGyna servers. Please try again or reach out on WhatsApp.";
      setErrors((prev) => ({ ...prev, form: message }));
      setStatus("error");
    }
  };

  const handleWhatsAppDirect = () => {
    const text = encodeURIComponent(
      `Hello TriGyna,\nMy name is ${formData.fullName || "a patient"}.\nI am interested in ${formData.service} (${formData.consultationMode}).\nPhone: ${formData.phone}\nMessage: ${formData.message || "I would like to schedule a consultation."}`
    );
    window.open(`https://wa.me/${siteConfig.whatsappNumber.replace("+", "")}?text=${text}`, "_blank");
  };

  if (status === "success") {
    return (
      <div className="bg-[#EBF3E8] border border-[#C5DDBB] rounded-2xl p-6 sm:p-8 text-center animate-fade-in">
        <div className="w-14 h-14 bg-[#154734] text-white rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#A7C089]" />
        </div>
        <h3 className="font-serif text-2xl text-[#154734] font-semibold mb-2">
          Enquiry Received with Care
        </h3>
        <p className="text-sm text-[#17221D] max-w-md mx-auto mb-5 leading-relaxed">
          Thank you, <strong>{formData.fullName}</strong>. Our clinical coordination desk has received your enquiry regarding <strong>{formData.service}</strong>. We will contact you via phone or WhatsApp at <strong>{formData.phone}</strong> shortly.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleWhatsAppDirect}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#154734] text-white text-sm font-medium hover:bg-[#0E3828] transition-all"
          >
            <WhatsAppIcon className="w-4 h-4 text-[#A7C089]" />
            Fast-Track on WhatsApp
          </button>
          <button
            onClick={() => setStatus("idle")}
            className="text-xs text-[#626B63] hover:underline"
          >
            Submit Another Enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="block text-xs font-semibold text-[#17221D] mb-1.5 uppercase tracking-wider">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          placeholder="e.g. Ananya Sharma"
          className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#154734] ${
            errors.fullName ? "border-red-500" : "border-[#E8E2D6]"
          }`}
        />
        {errors.fullName && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {errors.fullName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#17221D] mb-1.5 uppercase tracking-wider">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+91 917-277-2326"
            className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#154734] ${
              errors.phone ? "border-red-500" : "border-[#E8E2D6]"
            }`}
          />
          {errors.phone && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#17221D] mb-1.5 uppercase tracking-wider">
            Email Address (Optional)
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="ananya@example.com"
            className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#154734] ${
              errors.email ? "border-red-500" : "border-[#E8E2D6]"
            }`}
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#17221D] mb-1.5 uppercase tracking-wider">
            Service of Interest
          </label>
          <select
            value={formData.service}
            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#17221D] focus:outline-none focus:ring-2 focus:ring-[#154734]"
          >
            {servicesList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#17221D] mb-1.5 uppercase tracking-wider">
            Consultation Mode
          </label>
          <select
            value={formData.consultationMode}
            onChange={(e) =>
              setFormData({ ...formData, consultationMode: e.target.value })
            }
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#17221D] focus:outline-none focus:ring-2 focus:ring-[#154734]"
          >
            <option value="Online Video Consultation">Online Video Consultation</option>
            <option value="In-Clinic Visit (Prayagraj)">In-Clinic Visit (Prayagraj)</option>
          </select>
        </div>
      </div>

      {!compact && (
        <div>
          <label className="block text-xs font-semibold text-[#17221D] mb-1.5 uppercase tracking-wider">
            Brief Health Concern (Optional)
          </label>
          <textarea
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Share any key symptoms or questions you'd like Dr. Harshali Sutar to address..."
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#154734]"
          />
        </div>
      )}

      <div className="pt-1">
        <label className="flex items-start gap-2 text-xs text-[#626B63] cursor-pointer">
          <input
            type="checkbox"
            checked={formData.consent}
            onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
            className="mt-0.5 rounded border-gray-300 text-[#154734] focus:ring-[#154734]"
          />
          <span>
            I agree to receive consultation guidance and updates from TriGyna. Health discussions remain strictly confidential.
          </span>
        </label>
        {errors.consent && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {errors.consent}
          </p>
        )}
      </div>

      {errors.form && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errors.form}</p>
            <button
              type="button"
              onClick={handleWhatsAppDirect}
              className="text-xs text-[#154734] font-semibold underline mt-1 block"
            >
              Click here to chat directly on WhatsApp instead &rarr;
            </button>
          </div>
        </div>
      )}

      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        <Button
          type="submit"
          variant="primary"
          arrow
          fullWidth
          disabled={status === "submitting"}
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Submitting Enquiry...
            </>
          ) : (
            "Submit Healthcare Enquiry"
          )}
        </Button>
      </div>

      <p className="text-[11px] text-[#7B817B] text-center pt-1 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-[#154734] shrink-0 inline-block -mt-0.5" />
        <span>Confidential &amp; HIPAA/Indian EHR aligned. No spam, ever.</span>
      </p>
    </form>
  );
}
