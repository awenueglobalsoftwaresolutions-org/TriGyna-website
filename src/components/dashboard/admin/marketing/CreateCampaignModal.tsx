"use client";

import React, { useState } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  Megaphone,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function CreateCampaignModal({
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: CreateCampaignModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    platform: "meta",
    channelName: "Meta (Facebook/Instagram)",
    serviceCategory: "PCOS & Hormonal Health",
    objective: "LEAD_GENERATION",
    dailyBudget: 500,
    lifetimeBudget: 15000,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    locations: "Delhi NCR, Uttar Pradesh, Maharashtra",
    ageMin: 21,
    ageMax: 45,
    gender: "female",
    headline: "",
    descriptionText: "",
    adCopy: "",
    cta: "Book Consultation",
    destinationUrl: "https://www.trigyna.in/services/pcos",
    utmSource: "facebook",
    utmMedium: "cpc",
    utmCampaign: "",
  });

  if (!isOpen) return null;

  const totalSteps = 6;

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      showNotification("Please provide a campaign name", true);
      return;
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async (publishImmediately = false) => {
    try {
      setIsSubmitting(true);

      const generatedUtm = formData.utmCampaign || formData.name.toLowerCase().replace(/[^a-z0-9]/g, "_");

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        platform: formData.platform,
        channelName: formData.platform === "google" ? "Google Search Ads" : "Meta (Facebook/Instagram)",
        serviceCategory: formData.serviceCategory,
        objective: formData.objective,
        budget: {
          dailyBudget: Number(formData.dailyBudget) || 500,
          lifetimeBudget: Number(formData.lifetimeBudget) || 15000,
          spendingLimit: Number(formData.lifetimeBudget) || 15000,
        },
        currency: "INR",
        startDate: formData.startDate ? new Date(formData.startDate) : new Date(),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        audience: {
          locations: formData.locations.split(",").map((l) => l.trim()).filter(Boolean),
          ageMin: Number(formData.ageMin) || 18,
          ageMax: Number(formData.ageMax) || 65,
          gender: formData.gender,
          languages: ["English", "Hindi"],
        },
        creative: {
          headline: formData.headline || formData.name,
          description: formData.descriptionText,
          adCopy: formData.adCopy,
          cta: formData.cta,
          destinationUrl: formData.destinationUrl,
        },
        tracking: {
          utmSource: formData.platform === "google" ? "google" : "facebook",
          utmMedium: "cpc",
          utmCampaign: generatedUtm,
          landingPage: formData.destinationUrl,
        },
        status: publishImmediately ? "active" : "draft",
      };

      const res = await api.post<any>("/marketing/campaigns", payload);
      if (res.success) {
        showNotification(
          publishImmediately
            ? `Campaign '${formData.name}' published live successfully!`
            : `Campaign '${formData.name}' saved as draft.`
        );
        onSuccess();
        onClose();
      } else {
        showNotification(res.message || "Failed to create campaign", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to create campaign", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-[#E5EAF0] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E5EAF0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center font-bold">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827]">Create Marketing Campaign</h2>
              <p className="text-xs text-[#64748B]">
                Step {step} of {totalSteps}: {
                  step === 1 ? "Campaign Info" :
                  step === 2 ? "Platform & Objective" :
                  step === 3 ? "Healthcare Audience" :
                  step === 4 ? "Budget & Schedule" :
                  step === 5 ? "Ad Creative & Tracking" :
                  "Review & Publish"
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#64748B] hover:text-[#111827] rounded-xl hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Step 1: Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. PCOS Root-Cause Healing - Meta Ads"
                  className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Service Category
                </label>
                <select
                  value={formData.serviceCategory}
                  onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50] bg-white"
                >
                  <option value="PCOS & Hormonal Health">PCOS &amp; Hormonal Health</option>
                  <option value="Skin & Hair">Skin &amp; Hair (Chronic Eczema &amp; Psoriasis)</option>
                  <option value="Fertility & Conception">Fertility &amp; Natural Conception</option>
                  <option value="Gut Health & Digestion">Gut Health &amp; Digestion</option>
                  <option value="General Integrative Care">General Integrative Care</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Campaign Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the campaign goal, specific messaging, or targeted cohort..."
                  className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Platform & Objective */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-2">
                  Advertising Platform
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, platform: "meta" })}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      formData.platform === "meta"
                        ? "border-[#087A50] bg-[#E9F8F0]/40 shadow-xs"
                        : "border-[#E5EAF0] hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#2563EB] font-bold text-lg leading-none">∞</span>
                      <span className="font-bold text-xs sm:text-sm text-[#111827]">Meta Ads</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Facebook Feed, Instagram Reels, and Meta Lead Ads native forms.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, platform: "google" })}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      formData.platform === "google"
                        ? "border-[#087A50] bg-[#E9F8F0]/40 shadow-xs"
                        : "border-[#E5EAF0] hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#EA4335] font-bold text-base leading-none">G</span>
                      <span className="font-bold text-xs sm:text-sm text-[#111827]">Google Ads</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Google Search Ads, High-Intent Keywords, and Display network.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Campaign Objective
                </label>
                <select
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50] bg-white"
                >
                  <option value="LEAD_GENERATION">Lead Generation (In-App Lead Forms)</option>
                  <option value="APPOINTMENT_BOOKING">Appointment Booking (Direct Scheduling)</option>
                  <option value="CONVERSIONS">Website Conversions (Landing Page Enquiries)</option>
                  <option value="AWARENESS">Brand Awareness &amp; Health Literacy</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Audience with Healthcare Guard */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Healthcare policy alert */}
              <div className="bg-[#E9F8F0] border border-[#16A36A]/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-[#075B3D]">
                <ShieldCheck className="w-5 h-5 text-[#087A50] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Healthcare Advertising Safety Guard Active</p>
                  <p className="text-[11px] mt-0.5 text-[#087A50]">
                    In strict compliance with healthcare advertising regulations, private patient medical records, diagnoses, or clinical consultations are never uploaded or passed to advertising networks.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Target Locations (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.locations}
                  onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                  placeholder="e.g. Delhi NCR, Lucknow, Mumbai"
                  className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Age Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.ageMin}
                      onChange={(e) => setFormData({ ...formData, ageMin: parseInt(e.target.value) })}
                      className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3 py-2"
                    />
                    <span className="text-xs text-[#64748B]">to</span>
                    <input
                      type="number"
                      value={formData.ageMax}
                      onChange={(e) => setFormData({ ...formData, ageMax: parseInt(e.target.value) })}
                      className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="female">Women Only</option>
                    <option value="all">All Genders</option>
                    <option value="male">Men Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Budget */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Daily Budget (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={formData.dailyBudget}
                    onChange={(e) => setFormData({ ...formData, dailyBudget: parseFloat(e.target.value) })}
                    className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Lifetime Budget Cap (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={formData.lifetimeBudget}
                    onChange={(e) => setFormData({ ...formData, lifetimeBudget: parseFloat(e.target.value) })}
                    className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Creative & Tracking */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Ad Headline
                </label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="e.g. Long-term Healing for PCOS & Hormonal Imbalance"
                  className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Ad Copy / Primary Text
                </label>
                <textarea
                  rows={3}
                  value={formData.adCopy}
                  onChange={(e) => setFormData({ ...formData, adCopy: e.target.value })}
                  placeholder="Holistic doctor consultations, tailored nutrition plans, and root-cause care."
                  className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Destination URL
                </label>
                <input
                  type="url"
                  value={formData.destinationUrl}
                  onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
                />
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E5EAF0] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Campaign Name:</span>
                  <span className="font-bold text-[#111827]">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Platform:</span>
                  <span className="font-bold text-[#111827]">{formData.platform.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Service:</span>
                  <span className="font-bold text-[#111827]">{formData.serviceCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Daily Budget:</span>
                  <span className="font-bold text-[#111827]">₹{formData.dailyBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Lifetime Budget:</span>
                  <span className="font-bold text-[#111827]">₹{formData.lifetimeBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Destination:</span>
                  <span className="font-mono text-[#087A50] truncate max-w-[240px]">{formData.destinationUrl}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Publishing this campaign commits real budget to the connected ad account. Review all details before proceeding.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-[#E5EAF0] flex items-center justify-between bg-[#F8FAFC]">
          {step > 1 ? (
            <button
              onClick={handlePrev}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#E5EAF0] rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#111827] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step < totalSteps ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleCreate(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border border-[#E5EAF0] rounded-xl text-xs font-semibold text-[#111827] hover:bg-black/5 cursor-pointer disabled:opacity-60"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleCreate(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition-all cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Publish Campaign</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
