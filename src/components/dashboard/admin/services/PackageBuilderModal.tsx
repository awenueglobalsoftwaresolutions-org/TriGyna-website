"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Gift,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  Calendar,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { PackageItem, ServiceCategoryItem } from "./types";
import { api } from "@/lib/api/client";

interface PackageBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedPkg: PackageItem) => void;
  categories: ServiceCategoryItem[];
  editPackage?: PackageItem | null;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function PackageBuilderModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  editPackage,
  showNotification,
}: PackageBuilderModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Wellness Programmes");
  const [totalSessions, setTotalSessions] = useState(6);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(45);
  const [validityDays, setValidityDays] = useState(90);
  const [priceRupees, setPriceRupees] = useState(3999);
  const [originalPriceRupees, setOriginalPriceRupees] = useState(6000);
  const [consultationMode, setConsultationMode] = useState<PackageItem["consultationMode"]>(
    "Online Video Consultation"
  );
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editPackage) {
      setName(editPackage.name);
      setCategory(editPackage.category || "Wellness Programmes");
      setTotalSessions(editPackage.totalSessions);
      setSessionDurationMinutes(editPackage.sessionDurationMinutes);
      setValidityDays(editPackage.validityDays);
      setPriceRupees(editPackage.pricePaise ? editPackage.pricePaise / 100 : 3999);
      setOriginalPriceRupees(
        editPackage.originalPricePaise ? editPackage.originalPricePaise / 100 : 6000
      );
      setConsultationMode(editPackage.consultationMode || "Both (In-Person & Online)");
      setDescription(editPackage.description);
      setFeaturesText((editPackage.features || []).join("\n"));
      setIsPublished(editPackage.isPublished);
    } else {
      setName("");
      setCategory("Wellness Programmes");
      setTotalSessions(6);
      setSessionDurationMinutes(45);
      setValidityDays(90);
      setPriceRupees(3999);
      setOriginalPriceRupees(6000);
      setConsultationMode("Both (In-Person & Online)");
      setDescription("Complete holistic care protocol addressing root causes with constitutional therapies.");
      setFeaturesText(
        "6 Specialist Clinical Sessions\nPersonalized Nutrition & Diet Roadmap\nDedicated WhatsApp Care Coordinator\nRegular Ovulatory & Symptom Audits"
      );
      setIsPublished(true);
    }
  }, [editPackage, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !priceRupees || !totalSessions) {
      showNotification("Please provide Package Name, Price, and Total Sessions", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const features = featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        category,
        description: description.trim(),
        pricePaise: Number(priceRupees) * 100,
        originalPricePaise: Number(originalPriceRupees) * 100,
        totalSessions: Number(totalSessions),
        sessionDurationMinutes: Number(sessionDurationMinutes),
        validityDays: Number(validityDays),
        consultationMode,
        features,
        isPublished,
      };

      if (editPackage?._id) {
        const res = await api.patch<{ package: PackageItem }>(`/packages/${editPackage._id}`, payload);
        if (res.data?.package) {
          showNotification(`Package '${payload.name}' updated!`);
          onSuccess(res.data.package);
        }
      } else {
        const res = await api.post<{ package: PackageItem }>("/packages", payload);
        if (res.data?.package) {
          showNotification(`Package '${payload.name}' created successfully!`);
          onSuccess(res.data.package);
        }
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to save package", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white border border-[#E5EAF0] rounded-2xl p-6 sm:p-7 max-w-xl w-full shadow-2xl z-10 animate-fade-in max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Gift className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                {editPackage ? "Edit Wellness Package" : "Build Holistic Wellness Package"}
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Configure bundled sessions, validity days, per-session entitlement, and pricing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#111827] mb-1">Package Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PCOD/PCOS 3-Month Holistic Care"
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] font-semibold text-[#111827]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Health Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#111827] mb-1">Consultation Mode</label>
              <div className="w-full px-3 py-2 border border-[#C5DDBB] bg-[#EBF3E8] rounded-xl font-semibold text-[#154734] text-xs">
                Online Video Consultation (Online Only)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Total Included Sessions *</label>
              <input
                type="number"
                min="1"
                required
                value={totalSessions}
                onChange={(e) => setTotalSessions(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] font-bold text-purple-700 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111827] mb-1">Session Slot (Mins)</label>
              <select
                value={sessionDurationMinutes}
                onChange={(e) => setSessionDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#111827] mb-1">Validity (Days) *</label>
              <input
                type="number"
                min="7"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Package Price (₹ INR) *</label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={priceRupees}
                onChange={(e) => setPriceRupees(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] font-bold text-[#087A50] text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111827] mb-1">Original Price (₹ Strike-through)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={originalPriceRupees}
                onChange={(e) => setOriginalPriceRupees(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">Short Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Package Inclusions &amp; Features (1 per line)
            </label>
            <textarea
              rows={3}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="e.g. 6 Specialist Clinical Sessions&#10;Personalized Diet Roadmap&#10;WhatsApp Doctor Support"
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50]"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#E5EAF0]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded text-[#087A50] focus:ring-[#087A50]"
              />
              <span className="font-semibold text-gray-700">Publish immediately to patients</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-[#64748B] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#087A50] hover:bg-[#066341] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-2 shadow-xs"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{isSubmitting ? "Saving..." : editPackage ? "Update Package" : "Build Package"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

