"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Folder,
  Plus,
  Search,
  LayoutGrid,
  List,
  Clock,
  MoreVertical,
  Calendar,
  Video,
  Building2,
  Sparkles,
  Heart,
  Baby,
  ShieldCheck,
  Flower2,
  Apple,
  Venus,
  CheckCircle2,
  Edit,
  UserCheck,
  Eye,
  Trash2,
  Loader2,
  Tag,
} from "lucide-react";
import { ServiceItem, ServiceCategoryItem } from "./types";

interface CatalogueOverviewTabProps {
  services: ServiceItem[];
  categories: ServiceCategoryItem[];
  isLoading: boolean;
  onEditService: (service: ServiceItem) => void;
  onAssignDoctors: (service: ServiceItem) => void;
  onToggleStatus: (service: ServiceItem) => void;
  onDeleteService: (service: ServiceItem) => void;
  onAddCategory: () => void;
  onAddNewService: () => void;
}

export function CatalogueOverviewTab({
  services,
  categories,
  isLoading,
  onEditService,
  onAssignDoctors,
  onToggleStatus,
  onDeleteService,
  onAddCategory,
  onAddNewService,
}: CatalogueOverviewTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Gynecology & Obstetrics");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Category Icon resolver
  const getCategoryIcon = (catName: string, iconStr?: string) => {
    const lower = catName.toLowerCase();
    if (lower.includes("gynec") || lower.includes("obstet") || iconStr === "Venus") {
      return <Venus className="w-4 h-4 text-[#087A50]" />;
    }
    if (lower.includes("reproduct") || lower.includes("hormon") || iconStr === "Heart") {
      return <Heart className="w-4 h-4 text-rose-500" />;
    }
    if (lower.includes("dermat") || lower.includes("cosmet") || iconStr === "Sparkles") {
      return <Sparkles className="w-4 h-4 text-pink-500" />;
    }
    if (lower.includes("fertil") || lower.includes("ivf") || iconStr === "Baby") {
      return <Baby className="w-4 h-4 text-blue-500" />;
    }
    if (lower.includes("prevent") || lower.includes("checkup") || iconStr === "ShieldCheck") {
      return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
    }
    if (lower.includes("wellness") || iconStr === "Flower2") {
      return <Flower2 className="w-4 h-4 text-purple-500" />;
    }
    if (lower.includes("nutrit") || lower.includes("lifestyle") || iconStr === "Apple") {
      return <Apple className="w-4 h-4 text-amber-600" />;
    }
    return <LayoutGrid className="w-4 h-4 text-slate-500" />;
  };

  // Filter services for current category and search query
  const filteredServices = services.filter((srv) => {
    const matchesCategory =
      selectedCategory === "all" ||
      srv.category.toLowerCase() === selectedCategory.toLowerCase() ||
      srv.department?.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      !searchQuery.trim() ||
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const activeCategoryObj = categories.find(
    (c) => c.name.toLowerCase() === selectedCategory.toLowerCase()
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ==============================================================
          LEFT COLUMN: SERVICE CATEGORIES LIST (Screenshot Left Panel)
          ============================================================== */}
      <div className="lg:col-span-4 xl:col-span-3.5 bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs">
        {/* Categories Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E5EAF0]">
          <h3 className="text-sm font-bold text-[#111827]">
            Service Categories ({categories.length || 8})
          </h3>
          <button
            onClick={onAddCategory}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#087A50] bg-[#E9F8F0] hover:bg-[#D4F3E2] rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.slug || cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setActiveMenuId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-[#E9F8F0] text-[#087A50] font-semibold shadow-2xs"
                    : "text-[#334155] hover:bg-[#F8FAF9] hover:text-[#111827]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">{getCategoryIcon(cat.name, cat.icon)}</div>
                  <span className="truncate">{cat.name}</span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                    isSelected
                      ? "bg-white text-[#087A50] border border-[#C1EDD5]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {cat.servicesCount !== undefined ? cat.servicesCount : 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==============================================================
          RIGHT COLUMN: SERVICES CONTENT (Screenshot Right Panel)
          ============================================================== */}
      <div className="lg:col-span-8 xl:col-span-8.5 space-y-4">
        {/* Header Bar with Category Title, Subtitle, Search & View Switcher */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#111827]">
              {selectedCategory} ({filteredServices.length} Services)
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5 font-normal">
              {activeCategoryObj?.description ||
                "Consultation, diagnostics and care for women's health at every life stage."}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search services or packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] placeholder:text-[#94A3B8] focus:ring-1 focus:ring-[#087A50] focus:border-[#087A50] focus:outline-none"
              />
            </div>

            {/* View Switcher (Grid vs List) */}
            <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E5EAF0] shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#087A50] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#111827]"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-[#087A50] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#111827]"
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ==============================================================
            GRID VIEW (Exact 2x2 Service Cards Recreation)
            ============================================================== */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-16 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
            <span>Loading clinical services...</span>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-12 text-center text-xs text-[#64748B]">
            <p className="font-semibold text-sm text-[#111827] mb-1">No services found</p>
            <p className="mb-4">No services match your search or selected category.</p>
            <button
              onClick={onAddNewService}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#066341] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Service to {selectedCategory}</span>
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredServices.map((srv) => (
              <div
                key={srv.code}
                className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs hover:shadow-md transition-all flex gap-3.5 relative"
              >
                {/* Left Thumbnail Image */}
                <div className="w-24 sm:w-28 h-28 sm:h-32 rounded-xl overflow-hidden shrink-0 bg-slate-100 relative border border-[#E5EAF0]">
                  <Image
                    src={srv.imageUrl || "/images/about/doctor-consultation.jpg"}
                    alt={srv.name}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </div>

                {/* Right Content */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  {/* Top Bar: Code, Status, 3-dots Menu */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-[#087A50] bg-[#E9F8F0] px-2 py-0.5 rounded-md border border-[#D1F2E0]">
                      {srv.code}
                    </span>

                    <div className="flex items-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          srv.status === "active"
                            ? "bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]"
                            : srv.status === "draft"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {srv.status}
                      </span>

                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenuId(activeMenuId === srv.code ? null : srv.code)
                          }
                          className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuId === srv.code && (
                          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl border border-[#E5EAF0] shadow-xl py-1.5 z-20 text-xs">
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onEditService(srv);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[#111827] hover:bg-[#F8FAF9] flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Edit className="w-3.5 h-3.5 text-[#087A50]" />
                              <span>Edit Details</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onAssignDoctors(srv);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[#111827] hover:bg-[#F8FAF9] flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Assign Doctors</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onToggleStatus(srv);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[#111827] hover:bg-[#F8FAF9] flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-600" />
                              <span>
                                {srv.status === "active" ? "Set to Draft" : "Publish to Active"}
                              </span>
                            </button>

                            <div className="my-1 border-t border-[#E5EAF0]" />

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDeleteService(srv);
                              }}
                              className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Deactivate Service</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Service Title */}
                  <h3 className="text-xs sm:text-sm font-bold text-[#111827] mt-1.5 line-clamp-2 leading-snug">
                    {srv.name}
                  </h3>

                  {/* Category */}
                  <p className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1 truncate">
                    <Folder className="w-3 h-3 text-[#087A50] shrink-0" />
                    <span className="truncate">{srv.category}</span>
                  </p>

                  {/* Slot Duration & Base Fee */}
                  <div className="mt-2 pt-2 border-t border-[#E5EAF0]/70 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-[#64748B] text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-[#087A50]" />
                      <span>{srv.durationMinutes} mins slot</span>
                    </span>

                    <span className="font-bold text-[#087A50] font-sans text-sm tracking-tight">
                      ₹{srv.baseFee.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Footer: Delivery Mode & Active Booking */}
                  <div className="mt-2 pt-2 border-t border-[#E5EAF0] flex items-center justify-between text-[11px]">
                    <span className="text-[#64748B] flex items-center gap-1 truncate">
                      <Video className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>Online Video</span>
                    </span>

                    <span className="text-[10px] font-semibold text-[#087A50] bg-[#E9F8F0] px-2 py-0.5 rounded-md border border-[#D1F2E0] shrink-0">
                      Active Booking
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ==============================================================
             LIST VIEW TABLE
             ============================================================== */
          <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] text-[#64748B] font-semibold border-b border-[#E5EAF0]">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Base Fee</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {filteredServices.map((srv) => (
                    <tr key={srv.code} className="hover:bg-[#F8FAF9] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#087A50]">
                        {srv.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#111827]">
                        {srv.name}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {srv.category}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {srv.durationMinutes} mins
                      </td>
                      <td className="py-3 px-4 font-bold text-[#087A50]">
                        ₹{srv.baseFee.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] capitalize">
                        {srv.consultationType.replace("_", " ")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            srv.status === "active"
                              ? "bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {srv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditService(srv)}
                            className="p-1.5 rounded-lg border border-[#E5EAF0] text-[#087A50] hover:bg-[#E9F8F0] cursor-pointer"
                            title="Edit Service"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onAssignDoctors(srv)}
                            className="p-1.5 rounded-lg border border-[#E5EAF0] text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Assign Doctors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteService(srv)}
                            className="p-1.5 rounded-lg border border-[#E5EAF0] text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Deactivate Service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

