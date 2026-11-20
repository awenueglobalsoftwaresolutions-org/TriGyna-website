"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  Search,
  CheckCircle2,
  Loader2,
  Stethoscope,
  Building2,
} from "lucide-react";
import { ServiceItem, DoctorOption } from "./types";
import { api } from "@/lib/api/client";

interface AssignDoctorsModalProps {
  service: ServiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedService: ServiceItem) => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function AssignDoctorsModal({
  service,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: AssignDoctorsModalProps) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && service) {
      setIsLoading(true);
      // Pre-populate already assigned doctors
      const currentAssigned = (service.assignedDoctors || []).map((d) => d._id);
      setSelectedIds(currentAssigned);

      api.get<{ doctors: DoctorOption[] }>("/doctors?status=active&limit=100")
        .then((res) => {
          if (res.data?.doctors) {
            setDoctors(res.data.doctors);
          }
        })
        .catch(() => {
          showNotification("Failed to load clinic doctor roster", true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, service, showNotification]);

  if (!isOpen || !service) return null;

  const toggleDoctor = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const res = await api.post<{ service: ServiceItem }>(`/services/${service._id}/assign-doctors`, {
        doctorIds: selectedIds,
      });

      if (res.data?.service) {
        showNotification(`Assigned ${selectedIds.length} doctors to '${service.name}'`);
        onSuccess(res.data.service);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to assign doctors", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      !search.trim() ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.specialization || []).some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white border border-[#E5EAF0] rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl z-10 animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5EAF0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Assign Doctors to Service
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-xs sm:max-w-sm">
                [{service.code}] {service.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="my-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search doctors by name or specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:ring-1 focus:ring-[#087A50] focus:outline-none"
            />
          </div>
        </div>

        {/* Doctor Checklist */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#64748B] flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#087A50]" />
              <span>Loading clinic doctors...</span>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#64748B]">
              No active doctors found matching search.
            </div>
          ) : (
            filteredDoctors.map((doc) => {
              const isChecked = selectedIds.includes(doc._id);
              return (
                <div
                  key={doc._id}
                  onClick={() => toggleDoctor(doc._id)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? "bg-blue-50/60 border-blue-300 text-blue-950"
                      : "bg-white border-[#E5EAF0] text-[#111827] hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent onClick
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate">Dr. {doc.name}</div>
                      <div className="text-[11px] text-[#64748B] truncate">
                        {doc.qualifications || "Consultant"} • {(doc.specialization || []).join(", ")}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    ACTIVE
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-between shrink-0">
          <span className="text-xs text-[#64748B]">
            <strong>{selectedIds.length}</strong> doctors selected
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-xs text-[#64748B] hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#087A50] hover:bg-[#066341] text-white text-xs rounded-xl font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-2 shadow-xs"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? "Saving..." : "Save Assignments"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

