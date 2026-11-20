"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MoreVertical,
  Calendar,
  Building2,
  Video,
  Edit,
  UserCheck,
  Eye,
  Trash2,
  Loader2,
  Tag,
  Folder,
} from "lucide-react";
import { ServiceItem, ServiceCategoryItem } from "./types";

interface CatalogueServicesTabProps {
  services: ServiceItem[];
  categories: ServiceCategoryItem[];
  isLoading: boolean;
  onAddNewService: () => void;
  onEditService: (service: ServiceItem) => void;
  onAssignDoctors: (service: ServiceItem) => void;
  onToggleStatus: (service: ServiceItem) => void;
  onDeleteService: (service: ServiceItem) => void;
}

export function CatalogueServicesTab({
  services,
  categories,
  isLoading,
  onAddNewService,
  onEditService,
  onAssignDoctors,
  onToggleStatus,
  onDeleteService,
}: CatalogueServicesTabProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedMode, setSelectedMode] = useState("all");

  const filtered = services.filter((srv) => {
    const matchesSearch =
      !search.trim() ||
      srv.name.toLowerCase().includes(search.toLowerCase()) ||
      srv.code.toLowerCase().includes(search.toLowerCase()) ||
      srv.category.toLowerCase().includes(search.toLowerCase());

    const matchesCat =
      selectedCategory === "all" || srv.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStatus = selectedStatus === "all" || srv.status === selectedStatus;

    const matchesMode =
      selectedMode === "all" || srv.consultationType === selectedMode || srv.consultationType === "both";

    return matchesSearch && matchesCat && matchesStatus && matchesMode;
  });

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, service code, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] placeholder:text-[#94A3B8] focus:ring-1 focus:ring-[#087A50] focus:border-[#087A50] focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (Published)</option>
            <option value="draft">Draft (Hidden)</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Mode Filter */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
          >
            <option value="all">All Delivery Modes</option>
            <option value="both">Both (In-Person &amp; Online)</option>
            <option value="in_person">In-Person Only</option>
            <option value="online">Online Video Only</option>
          </select>
        </div>

        <button
          onClick={onAddNewService}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#087A50] hover:bg-[#066341] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Services Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-16 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
          <span>Loading clinical services...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-12 text-center text-xs text-[#64748B]">
          No clinical services found matching your filters.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-[#64748B] font-semibold border-b border-[#E5EAF0]">
                <tr>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Slot</th>
                  <th className="py-3 px-4">Base Fee</th>
                  <th className="py-3 px-4">Delivery Mode</th>
                  <th className="py-3 px-4">Doctors Assigned</th>
                  <th className="py-3 px-4">Status &amp; Visibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {filtered.map((srv) => (
                  <tr key={srv.code} className="hover:bg-[#F8FAF9] transition-colors">
                    {/* Service info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-100 relative border border-[#E5EAF0]">
                          <Image
                            src={srv.imageUrl || "/images/about/doctor-consultation.jpg"}
                            alt={srv.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#087A50] bg-[#E9F8F0] px-1.5 py-0.2 rounded">
                              {srv.code}
                            </span>
                            <span className="font-semibold text-[#111827] line-clamp-1">
                              {srv.name}
                            </span>
                          </div>
                          {srv.description && (
                            <p className="text-[11px] text-[#64748B] line-clamp-1 max-w-sm mt-0.5">
                              {srv.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-[#64748B]">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Folder className="w-3 h-3 text-[#087A50]" />
                        <span>{srv.category}</span>
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 text-[#64748B]">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-[#087A50]" />
                        <span>{srv.durationMinutes} mins</span>
                      </span>
                    </td>

                    {/* Fee */}
                    <td className="py-3 px-4 font-bold text-[#087A50] text-sm">
                      ₹{srv.baseFee.toLocaleString("en-IN")}
                    </td>

                    {/* Mode */}
                    <td className="py-3 px-4 text-[#64748B]">
                      <span className="inline-flex items-center gap-1 text-[11px] capitalize">
                        {srv.consultationType === "online" ? (
                          <Video className="w-3 h-3 text-blue-600" />
                        ) : srv.consultationType === "in_person" ? (
                          <Building2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Calendar className="w-3 h-3 text-purple-600" />
                        )}
                        <span>{srv.consultationType.replace("_", " ")}</span>
                      </span>
                    </td>

                    {/* Assigned Doctors */}
                    <td className="py-3 px-4">
                      {srv.assignedDoctors && srv.assignedDoctors.length > 0 ? (
                        <button
                          onClick={() => onAssignDoctors(srv)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 cursor-pointer"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>{srv.assignedDoctors.length} Doctors</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onAssignDoctors(srv)}
                          className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-600 hover:underline cursor-pointer"
                        >
                          + Assign Doctors
                        </button>
                      )}
                    </td>

                    {/* Status Pill with toggle action */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onToggleStatus(srv)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          srv.status === "active"
                            ? "bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] hover:bg-[#D4F3E2]"
                            : srv.status === "draft"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                        }`}
                        title="Click to toggle Draft / Active"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            srv.status === "active" ? "bg-[#087A50]" : "bg-amber-500"
                          }`}
                        />
                        <span>{srv.status}</span>
                      </button>
                    </td>

                    {/* Actions */}
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
  );
}

