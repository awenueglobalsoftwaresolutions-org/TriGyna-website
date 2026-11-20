"use client";

import React, { useState, useEffect } from "react";
import { X, Filter, Search, RotateCcw } from "lucide-react";
import { CalendarFilterState } from "./types";
import { api } from "@/lib/api/client";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CalendarFilterState;
  onApplyFilters: (filters: CalendarFilterState) => void;
  onResetFilters: () => void;
}

interface DoctorItem {
  _id: string;
  name: string;
}

export function FilterDrawer({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
}: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<CalendarFilterState>(filters);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchDoctors = async () => {
      try {
        const res = await api.get<{ doctors: Array<{ _id: string; userId?: { name: string } }> }>("/doctors?limit=50");
        if (isMounted && res.data?.doctors) {
          setDoctors(
            res.data.doctors.map((d) => ({
              _id: d._id,
              name: d.userId?.name || "Dr. Specialist",
            }))
          );
        }
      } catch {
        // Fallback
      }
    };
    fetchDoctors();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-[#E5EAF0] shadow-2xl flex flex-col justify-between">
      <div className="p-5 border-b border-[#E5EAF0] bg-[#FAFCFB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#087A50]" />
          <h3 className="font-bold text-base text-[#111827]">Calendar Filters & Search</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
        {/* Search Input */}
        <div>
          <label className="font-bold text-[#111827]">Keyword Search</label>
          <div className="relative mt-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={localFilters.search}
              onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
              placeholder="Patient, Doctor, TR-1016, task..."
              className="w-full pl-9 pr-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-[#087A50]"
            />
          </div>
        </div>

        {/* Doctor Filter */}
        <div>
          <label className="font-bold text-[#111827]">Filter by Doctor</label>
          <select
            value={localFilters.doctorId}
            onChange={(e) => setLocalFilters({ ...localFilters, doctorId: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs bg-white focus:outline-[#087A50]"
          >
            <option value="">All Doctors</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="font-bold text-[#111827]">Event Status</label>
          <select
            value={localFilters.status}
            onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs bg-white focus:outline-[#087A50]"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="checked_in">Checked In</option>
            <option value="in_consultation">In Consultation</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="p-4 border-t border-[#E5EAF0] bg-[#FAFCFB] flex items-center justify-between">
        <button
          onClick={handleReset}
          className="px-3.5 py-2 border border-[#E5EAF0] hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
        <button
          onClick={handleApply}
          className="px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
