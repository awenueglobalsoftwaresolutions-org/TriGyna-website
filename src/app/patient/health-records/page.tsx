"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Pill,
  CheckCircle2,
  ChevronRight,
  Shield,
  Clock,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface TimelineEvent {
  id: string;
  type: "consultation" | "prescription" | "follow-up" | "appointment" | "document" | "invoice";
  date: string;
  isoDate: string;
  title: string;
  description: string;
  referenceCode?: string;
  actionLabel?: string;
  actionUrl?: string;
}

interface RawTimelineItem {
  id: string;
  category?: string;
  type?: string;
  date?: string;
  createdAt?: string;
  title: string;
  details?: string;
  description?: string;
  badge?: string;
  actionLabel?: string;
  actionUrl?: string;
}

export default function HealthRecordsPage() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ timeline?: RawTimelineItem[]; events?: RawTimelineItem[] }>("/patient/me/timeline");
      if (res.success && res.data) {
        const rawList = res.data.timeline || res.data.events || [];
        const normalized: TimelineEvent[] = rawList.map((item) => {
          const type = (item.type || item.category || "consultation") as TimelineEvent["type"];
          let defaultUrl = "/patient/consultations";
          if (type === "prescription") defaultUrl = "/patient/prescriptions";
          else if (type === "follow-up") defaultUrl = "/patient/follow-ups";
          else if (type === "appointment") defaultUrl = "/patient/appointments";
          else if (type === "document") defaultUrl = "/patient/documents";
          else if (type === "invoice" || (type as string) === "billing") defaultUrl = "/patient/payments";

          return {
            id: item.id,
            type,
            date: item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""),
            isoDate: item.createdAt || new Date().toISOString(),
            title: item.title,
            description: item.description || item.details || "",
            actionLabel: item.actionLabel || "View Details",
            actionUrl: item.actionUrl || defaultUrl,
          };
        });
        setTimeline(normalized);
      }
    } catch (err) {
      console.error("Timeline fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  const filteredEvents = timeline.filter((event) => {
    const matchesType = filterType === "all" || event.type === filterType;
    const matchesSearch =
      !searchFilter ||
      event.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      event.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4EEE7]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
            My Health Records
          </h1>
          <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
            Your unified, encrypted electronic health records timeline and clinical history
          </p>
        </div>

        <Link
          href="/patient/support"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#D5E8DC] hover:bg-[#F2F7F4] text-[#14251F] text-xs font-semibold rounded-xl transition-colors shadow-xs"
        >
          <Shield className="w-3.5 h-3.5 text-[#075B35]" />
          <span>Request Record Correction</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E4EEE7] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "All Records" },
            { id: "consultation", label: "Consultations" },
            { id: "prescription", label: "Prescriptions" },
            { id: "follow-up", label: "Follow-ups" },
            { id: "appointment", label: "Appointments" },
            { id: "document", label: "Documents" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterType === cat.id
                  ? "bg-[#075B35] text-white shadow-xs"
                  : "bg-[#F4F8F5] text-[#556960] hover:bg-[#E5F2EB]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search records..."
            className="w-full h-9 px-3 text-xs bg-[#F4F8F5] border border-[#E4EEE7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#075B35]"
          />
        </div>
      </div>

      {/* Timeline Content */}
      <div className="bg-white rounded-2xl border border-[#E4EEE7] p-6 sm:p-8 shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-[#68766F] flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#075B35] animate-spin mb-2" />
            <p className="text-xs">Loading authorized health records...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8C9892]">
            No records found matching your filter criteria.
          </div>
        ) : (
          <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E4EEE7]">
            {filteredEvents.map((event) => {
              const isConsult = event.type === "consultation";
              const isRx = event.type === "prescription";
              const isFlw = event.type === "follow-up";
              const isAppt = event.type === "appointment";
              const isDoc = event.type === "document";

              return (
                <div key={event.id} className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Timeline Badge Node */}
                  <div
                    className={`absolute -left-6 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white ${
                      isConsult
                        ? "bg-[#075B35] text-white"
                        : isRx
                        ? "bg-[#EDF8F1] text-[#075B35] border border-[#C6E7D2]"
                        : isFlw
                        ? "bg-[#FFF8EC] text-[#D97706] border border-[#FDE68A]"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {isConsult && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {isRx && <Pill className="w-3.5 h-3.5" />}
                    {isFlw && <Clock className="w-3.5 h-3.5" />}
                    {!isConsult && !isRx && !isFlw && <FileText className="w-3.5 h-3.5" />}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold text-[#075B35]">{event.date}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#EDF8F1] text-[#075B35]">
                        {event.type}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#14251F] mt-1">{event.title}</h3>
                    <p className="text-xs text-[#68766F] mt-1 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  {/* Action Link */}
                  {event.actionUrl && (
                    <Link
                      href={event.actionUrl}
                      className="shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#EDF8F1] hover:bg-[#DCECE1] text-[#075B35] text-xs font-semibold rounded-lg transition"
                    >
                      <span>{event.actionLabel || "View"}</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
