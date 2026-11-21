"use client";

import React, { useState } from "react";
import {
  X,
  FolderPlus,
  Plus,
  Loader2,
  Venus,
  Heart,
  Sparkles,
  Baby,
  ShieldCheck,
  Flower2,
  Apple,
  LayoutGrid,
} from "lucide-react";
import { ServiceCategoryItem } from "./types";
import { api } from "@/lib/api/client";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cat: ServiceCategoryItem) => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

const ICONS = [
  { label: "Women's Care", icon: Venus, name: "Venus" },
  { label: "Hormones & Heart", icon: Heart, name: "Heart" },
  { label: "Dermatology", icon: Sparkles, name: "Sparkles" },
  { label: "Fertility & Baby", icon: Baby, name: "Baby" },
  { label: "Preventive", icon: ShieldCheck, name: "ShieldCheck" },
  { label: "Wellness", icon: Flower2, name: "Flower2" },
  { label: "Diet & Nutrition", icon: Apple, name: "Apple" },
  { label: "General", icon: LayoutGrid, name: "LayoutGrid" },
];

export function AddCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Venus");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification("Please provide a category name", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ category: ServiceCategoryItem }>("/services/categories", {
        name: name.trim(),
        icon,
        description: description.trim(),
      });

      if (res.data?.category) {
        showNotification(`Category '${name}' created successfully!`);
        onSuccess(res.data.category);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to create category", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white border border-[#E5EAF0] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl z-10 animate-fade-in">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <FolderPlus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Create Service Category</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Add a new specialty department or clinical division.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#111827] mb-1">Category Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pediatric & Adolescent Wellness"
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] font-semibold text-[#111827]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1.5">Select Icon Symbol</label>
            <div className="grid grid-cols-4 gap-2">
              {ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = icon === item.name;
                return (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() => setIcon(item.name)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#E9F8F0] border-[#087A50] text-[#087A50] font-semibold"
                        : "bg-white border-[#E5EAF0] text-[#64748B] hover:bg-gray-50"
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clinical scope and specialties covered..."
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5EAF0]">
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
              <span>{isSubmitting ? "Creating..." : "Create Category"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

