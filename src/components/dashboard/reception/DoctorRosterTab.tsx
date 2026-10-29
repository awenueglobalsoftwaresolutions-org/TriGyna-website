"use client";

import React from "react";
import {
  Stethoscope,
  Calendar,
  Clock,
  Building,
  Loader2,
} from "lucide-react";
import { Doctor } from "./QueueDeskTab";

interface DoctorRosterTabProps {
  doctors: Doctor[];
  isLoading: boolean;
  onBookWithDoctor: (doctorId: string) => void;
}

export function DoctorRosterTab({
  doctors,
  isLoading,
  onBookWithDoctor,
}: DoctorRosterTabProps) {
  if (isLoading && doctors.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-12 text-center shadow-xs flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#154734] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#17221D]">Loading OPD Roster...</p>
        <p className="text-xs text-[#758277]">Fetching clinical staff schedules and availability</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5ED] text-[#154734] text-xs font-semibold mb-2 border border-[#D1E2D8]">
            <Stethoscope className="w-3.5 h-3.5" />
            Clinical Staffing &amp; Consultation Suites
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17221D]">
            Doctor OPD Roster &amp; Live Availability
          </h2>
          <p className="text-xs text-[#758277] mt-0.5 max-w-xl">
            Check active consultation suites, practitioner shift timings, consultation charges, and dispatch appointments to available rooms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {doctors.length} Doctors on Roster
          </span>
        </div>
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {doctors.map((doc, idx) => {
          const docName = doc.userId?.fullName || doc.userId?.name || "Dr. Harshali Sutar";
          const isLead = docName.toLowerCase().includes("harshali") || idx === 0;

          return (
            <div
              key={doc._id}
              className="bg-white rounded-3xl border border-[#E8E2D6] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#154734] text-white flex items-center justify-center font-bold text-base shadow-xs">
                    {docName.replace("Dr.", "").trim().charAt(0)}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Available In Clinic
                  </span>
                </div>

                <div>
                  <h3 className="font-serif font-bold text-base text-[#154734] flex items-center gap-1.5">
                    Dr. {docName.replace("Dr.", "").trim()}
                    {isLead && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[#154734] font-sans font-bold border border-[#E8E2D6]">
                        Lead Specialist
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#758277] mt-0.5">
                    BHMS, MD (Homoeopathy), PGDEMS
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {doc.specialization?.map((spec, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF8F5] text-[#17221D] border border-[#E8E2D6]"
                    >
                      {spec}
                    </span>
                  )) || (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF8F5] text-[#17221D]">
                      Classical Homoeopathy &amp; Gynaecology
                    </span>
                  )}
                </div>

                <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E2D6] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#758277] flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-[#154734]" />
                      Consultation Suite:
                    </span>
                    <span className="font-bold text-[#17221D]">
                      {isLead ? "Suite 1 (Main Clinical Room)" : `Suite ${idx + 1}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#758277] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#154734]" />
                      OPD Shift Hours:
                    </span>
                    <span className="font-bold text-[#17221D]">
                      10:00 AM - 01:30 PM &amp; 04:30 PM - 08:30 PM
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-black/5">
                    <span className="text-[#758277]">Consultation Fee:</span>
                    <span className="font-mono font-bold text-[#154734] text-xs">
                      ₹{doc.consultationFee || 800}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8E2D6] flex justify-end">
                <button
                  onClick={() => onBookWithDoctor(doc._id)}
                  className="w-full py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Book Patient Slot with Dr. {docName.replace("Dr.", "").trim()}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
