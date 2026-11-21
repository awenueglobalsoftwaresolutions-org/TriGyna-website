"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Layers,
  Plus,
  Loader2,
  CheckCircle2,
  Building2,
  Video,
  Sparkles,
  Clock,
  IndianRupee,
  ShieldAlert,
} from "lucide-react";
import { ServiceItem, ServiceCategoryItem, DoctorOption } from "./types";
import { api } from "@/lib/api/client";

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedService: ServiceItem) => void;
  categories: ServiceCategoryItem[];
  editService?: ServiceItem | null;
  showNotification: (msg: string, isErr?: boolean) => void;
}

const PRESET_IMAGES = [
  { label: "Doctor Consultation", url: "/images/about/doctor-consultation.jpg" },
  { label: "PCOD & Women's Care", url: "/images/services/pcod-pcos.webp" },
  { label: "Skin & Dermatology", url: "/images/services/skin-hair.webp" },
  { label: "Maternal & Clinic", url: "/images/about/approach-plant.jpg" },
  { label: "Clinic Reception", url: "/images/about/clinic-reception.jpg" },
  { label: "Diet & Nutrition", url: "/images/services/diet-nutrition.webp" },
  { label: "Homoeopathic Care", url: "/images/services/homoeopathy.webp" },
  { label: "General Medicine", url: "/images/services/general-medicine.webp" },
];

export function AddServiceModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  editService,
  showNotification,
}: AddServiceModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [baseFee, setBaseFee] = useState(1200);
  const [discountFee, setDiscountFee] = useState(0);
  const [consultationType, setConsultationType] = useState<ServiceItem["consultationType"]>("both");
  const [status, setStatus] = useState<ServiceItem["status"]>("active");
  const [imageUrl, setImageUrl] = useState("/images/about/doctor-consultation.jpg");
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editService) {
      setCode(editService.code);
      setName(editService.name);
      setCategory(editService.category);
      setDurationMinutes(editService.durationMinutes);
      setBaseFee(editService.baseFee);
      setDiscountFee(editService.discountFee || 0);
      setConsultationType(editService.consultationType);
      setStatus(editService.status);
      setImageUrl(editService.imageUrl || "/images/about/doctor-consultation.jpg");
      setDescription(editService.description || "");
      setFeaturesText((editService.features || []).join("\n"));
    } else {
      const catCode = (categories[0]?.name || "CLIN").replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
      setCode(`SRV-${catCode}-${Date.now().toString().slice(-4)}`);
      setName("");
      setCategory(categories[0]?.name || "Gynecology & Obstetrics");
      setDurationMinutes(30);
      setBaseFee(1200);
      setDiscountFee(0);
      setConsultationType("online");
      setStatus("active");
      setImageUrl("/images/about/doctor-consultation.jpg");
      setDescription("");
      setFeaturesText("Specialist Doctor Consultation\nDigital Prescription & Diet Advice\n7-Day Post-Care Support");
    }
  }, [editService, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !category.trim()) {
      showNotification("Please fill in Code, Name, and Category", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const features = featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category: category.trim(),
        department: category.trim(),
        durationMinutes: Number(durationMinutes),
        baseFee: Number(baseFee),
        discountFee: Number(discountFee) || 0,
        consultationType,
        status,
        isPublished: status === "active",
        imageUrl,
        description: description.trim(),
        features,
      };

      if (editService?._id) {
        const res = await api.patch<{ service: ServiceItem }>(`/services/${editService._id}`, payload);
        if (res.data?.service) {
          showNotification(`Service '${payload.name}' updated successfully!`);
          onSuccess(res.data.service);
        }
      } else {
        const res = await api.post<{ service: ServiceItem }>("/services", payload);
        if (res.data?.service) {
          showNotification(`Service '${payload.name}' added to catalogue!`);
          onSuccess(res.data.service);
        }
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to save service", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white border border-[#E5EAF0] rounded-2xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl z-10 animate-fade-in max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                {editService ? "Edit Clinical Service" : "Add New Clinical Service"}
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Configure consultation specifications, pricing, duration slot, and image.
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
          {/* Row 1: Code and Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Service Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SRV-GYN-01"
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] font-mono font-bold text-[#087A50] uppercase"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#111827] mb-1">Service Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Comprehensive Gynecological Consultation"
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] font-semibold text-[#111827]"
              />
            </div>
          </div>

          {/* Row 2: Category and Delivery Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Specialty Category *</label>
              <select
                required
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
              <label className="block font-semibold text-[#111827] mb-1">Consultation Delivery Mode</label>
              <select
                value={consultationType}
                onChange={(e) =>
                  setConsultationType(e.target.value as ServiceItem["consultationType"])
                }
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              >
                <option value="both">Both (In-Person &amp; Online Video)</option>
                <option value="in_person">In-Person Consultation Only</option>
                <option value="online">Online Video Consultation Only</option>
              </select>
            </div>
          </div>

          {/* Row 3: Slot Duration, Base Fee, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Slot Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes (Standard)</option>
                <option value={45}>45 Minutes (Extended)</option>
                <option value={60}>60 Minutes</option>
                <option value={90}>90 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#111827] mb-1">Base Fee (₹ INR) *</label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={baseFee}
                onChange={(e) => setBaseFee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] font-bold text-[#087A50] text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111827] mb-1">Catalogue Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceItem["status"])}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              >
                <option value="active">Active (Published)</option>
                <option value="draft">Draft (Hidden from Public)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Row 4: Image Selector */}
          <div>
            <label className="block font-semibold text-[#111827] mb-1.5">Card Image Thumbnail</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_IMAGES.map((img) => (
                <button
                  type="button"
                  key={img.url}
                  onClick={() => setImageUrl(img.url)}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    imageUrl === img.url
                      ? "border-[#087A50] ring-2 ring-[#087A50]/20 scale-102"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={img.url} alt={img.label} fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Or enter custom image URL"
              className="w-full px-3 py-1.5 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] text-[11px] text-[#475569]"
            />
          </div>

          {/* Row 5: Description & Features */}
          <div>
            <label className="block font-semibold text-[#111827] mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clinical scope, diagnostic workup, and treatment approach..."
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Included Features (1 per line)
            </label>
            <textarea
              rows={2}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="e.g. Ultrasound review&#10;Doctor consultation 30 mins&#10;Digital prescription"
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50]"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-[#E5EAF0]">
            <span className="text-[11px] text-[#64748B]">
              {editService ? "Updates apply to future bookings" : "Will appear in catalogue immediately"}
            </span>

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
                <span>{isSubmitting ? "Saving..." : editService ? "Update Service" : "Add to Catalogue"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

