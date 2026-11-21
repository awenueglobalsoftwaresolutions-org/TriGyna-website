"use client";

import React from "react";
import {
  Search,
  Calendar,
  SlidersHorizontal,
  List,
  LayoutGrid,
  ChevronRight,
  X,
} from "lucide-react";
import { OptionItem } from "./types";

interface FollowUpFilterToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  doctorFilter: string;
  onDoctorFilterChange: (val: string) => void;
  modeFilter: string;
  onModeFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  dateRange: string;
  onDateRangeChange: (val: string) => void;
  doctors: OptionItem[];
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  onToggleAdvancedFilters: () => void;
  activeFilterCount: number;
  onResetFilters: () => void;
}

export function FollowUpFilterToolbar({
  search,
  onSearchChange,
  doctorFilter,
  onDoctorFilterChange,
  modeFilter,
  onModeFilterChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
  doctors,
  viewMode,
  onViewModeChange,
  onToggleAdvancedFilters,
  activeFilterCount,
  onResetFilters,
}: FollowUpFilterToolbarProps) {
  return (
    <div className="bg-white border border-[#E5EAF0] rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[280px] max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by code, patient name, phone, or doctor..."
          className="w-full pl-9 pr-8 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] focus:border-[#087A50] focus:outline-none bg-white text-[#111827] placeholder:text-gray-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns and Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Doctor Filter */}
        <select
          value={doctorFilter}
          onChange={(e) => onDoctorFilterChange(e.target.value)}
          className="px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none font-medium cursor-pointer"
        >
          <option value="all">All Doctors</option>
          {doctors.map((doc) => (
            <option key={doc._id} value={doc._id}>
              {doc.userId?.name || doc.name || "Doctor"}
            </option>
          ))}
        </select>

        {/* Mode Filter */}
        <select
          value={modeFilter}
          onChange={(e) => onModeFilterChange(e.target.value)}
          className="px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none font-medium cursor-pointer"
        >
          <option value="all">All Modes</option>
          <option value="Online Video Consultation">Online Video Consultation</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:ring-1 focus:ring-[#087A50] focus:outline-none font-medium cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="missed">Missed</option>
          <option value="overdue">Overdue</option>
          <option value="rescheduled">Rescheduled</option>
        </select>

        {/* Date Range Selector Pill */}
        <div className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#087A50]" />
          <span>{dateRange || "Oct 1, 2026 - Oct 31, 2026"}</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
        </div>

        {/* Filters Toggle Button */}
        <button
          type="button"
          onClick={onToggleAdvancedFilters}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs border rounded-xl font-medium transition-colors cursor-pointer ${
            activeFilterCount > 0
              ? "bg-emerald-50 border-emerald-300 text-[#087A50]"
              : "bg-white hover:bg-gray-50 border-[#E5EAF0] text-[#111827]"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#087A50] text-white text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
          >
            Reset
          </button>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center border border-[#E5EAF0] rounded-xl p-0.5 bg-gray-50/50">
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            title="List View"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === "list"
                ? "bg-white text-[#087A50] shadow-2xs"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            title="Grid View"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-[#087A50] shadow-2xs"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
