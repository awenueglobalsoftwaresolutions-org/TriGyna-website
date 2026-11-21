"use client";

import React, { useState, useRef, useEffect } from "react";
import { Layers, Plus, ChevronDown, PackagePlus, FolderPlus, RefreshCw } from "lucide-react";

interface CatalogueHeaderProps {
  onAddNewService: () => void;
  onCreatePackage: () => void;
  onAddCategory: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function CatalogueHeader({
  onAddNewService,
  onCreatePackage,
  onAddCategory,
  onRefresh,
  isRefreshing = false,
}: CatalogueHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0 border border-[#D1F2E0] shadow-xs">
            <Layers className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111827] tracking-tight">
              Services &amp; Packages Catalogue
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed font-normal">
              Configure clinic consultation packages, holistic wellness programmes, base pricing, and duration slots.
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-[#E5EAF0] text-[#64748B] hover:text-[#087A50] hover:bg-[#F8FAF9] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh catalogue data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#087A50]" : ""}`} />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#087A50] hover:bg-[#066341] active:bg-[#055135] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Service</span>
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] opacity-90 ml-0.5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E5EAF0] shadow-xl py-1.5 z-30 animate-fade-in text-xs">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onAddNewService();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-[#111827] hover:bg-[#F8FAF9] hover:text-[#087A50] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <Plus className="w-4 h-4 text-[#087A50]" />
                  <span>Add New Clinical Service</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onCreatePackage();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-[#111827] hover:bg-[#F8FAF9] hover:text-[#087A50] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <PackagePlus className="w-4 h-4 text-purple-600" />
                  <span>Build Wellness Package</span>
                </button>

                <div className="my-1 border-t border-[#E5EAF0]" />

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onAddCategory();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-[#111827] hover:bg-[#F8FAF9] hover:text-[#087A50] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <FolderPlus className="w-4 h-4 text-amber-600" />
                  <span>Create Service Category</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

