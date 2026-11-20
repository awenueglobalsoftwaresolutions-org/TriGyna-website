"use client";

import React, { useState } from "react";
import {
  Folder,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Layers,
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

interface CatalogueCategoriesTabProps {
  categories: ServiceCategoryItem[];
  onAddCategory: () => void;
  onEditCategory?: (category: ServiceCategoryItem) => void;
}

export function CatalogueCategoriesTab({
  categories,
  onAddCategory,
}: CatalogueCategoriesTabProps) {
  const getIcon = (name: string, iconStr?: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("gynec") || lower.includes("obstet") || iconStr === "Venus") {
      return <Venus className="w-5 h-5 text-[#087A50]" />;
    }
    if (lower.includes("reproduct") || lower.includes("hormon") || iconStr === "Heart") {
      return <Heart className="w-5 h-5 text-rose-500" />;
    }
    if (lower.includes("dermat") || lower.includes("cosmet") || iconStr === "Sparkles") {
      return <Sparkles className="w-5 h-5 text-pink-500" />;
    }
    if (lower.includes("fertil") || lower.includes("ivf") || iconStr === "Baby") {
      return <Baby className="w-5 h-5 text-blue-500" />;
    }
    if (lower.includes("prevent") || lower.includes("checkup") || iconStr === "ShieldCheck") {
      return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
    }
    if (lower.includes("wellness") || iconStr === "Flower2") {
      return <Flower2 className="w-5 h-5 text-purple-500" />;
    }
    if (lower.includes("nutrit") || lower.includes("lifestyle") || iconStr === "Apple") {
      return <Apple className="w-5 h-5 text-amber-600" />;
    }
    return <LayoutGrid className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">
            Clinical Departments &amp; Categories ({categories.length})
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Organize services and packages into specialty clinics and patient health goals.
          </p>
        </div>

        <button
          onClick={onAddCategory}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#087A50] hover:bg-[#066341] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat, idx) => (
          <div
            key={cat.slug || cat.name}
            className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAF9] border border-[#E5EAF0] flex items-center justify-center">
                  {getIcon(cat.name, cat.icon)}
                </div>
                <span className="text-[11px] font-bold text-[#087A50] bg-[#E9F8F0] px-2.5 py-0.5 rounded-full border border-[#D1F2E0]">
                  {cat.servicesCount || 0} Services
                </span>
              </div>

              <h4 className="text-sm font-bold text-[#111827] mt-3">
                {cat.name}
              </h4>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                {cat.description || "Specialized clinical consultation and therapeutic care."}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5EAF0] flex items-center justify-between text-[11px] text-[#94A3B8]">
              <span>Sort Index: {cat.sortOrder || idx + 1}</span>
              <span className="text-emerald-800 font-semibold">Active Clinic</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

