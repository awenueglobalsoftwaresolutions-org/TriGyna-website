"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  History,
  FileText,
  Calendar,
  Pill,
  Clock,
  ShieldCheck,
  FileDown,
  Loader2,
  CheckCircle2,
  User,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface TimelineEvent {
  id: string;
  type: "REGISTRATION" | "CONSULTATION" | "PRESCRIPTION" | "TREATMENT_PLAN" | "FOLLOW_UP" | "DOCUMENT";
  title: string;
  subtitle: string;
  date: string;
  status?: string;
  refId?: string;
  fileUrl?: string;
}

interface PatientTimelineModalProps {
  patientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function PatientTimelineModal({
  patientId,
  isOpen,
  onClose,
  showNotification,
}: PatientTimelineModalProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [patient, setPatient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !patientId) return;

    const loadTimeline = async () => {
      try {
        setIsLoading(true);
        const res = await api.get<{ patient: any; timeline: TimelineEvent[] }>(
          `/clinical/patients/${patientId}/timeline`
        );
        if (res.data) {
          setTimeline(res.data.timeline || []);
          setPatient(res.data.patient || null);
        }
      } catch (err: any) {
        showNotification(err.message || "Failed to load patient clinical timeline", true);
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeline();
  }, [isOpen, patientId, showNotification]);

  if (!isOpen) return null;

  const getEventBadge = (type: string) => {
    switch (type) {
      case "CONSULTATION":
        return {
          icon: FileText,
          bg: "bg-[#E9F8F0] text-[#087A50] border-[#D1F2E0]",
          label: "Consultation",
        };
      case "PRESCRIPTION":
        return {
          icon: Pill,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          label: "Prescription",
        };
      case "TREATMENT_PLAN":
        return {
          icon: ShieldCheck,
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          label: "Care Plan",
        };
      case "FOLLOW_UP":
        return {
          icon: Clock,
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          label: "Follow-up",
        };
      case "DOCUMENT":
        return {
          icon: FileDown,
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          label: "Document",
        };
      default:
        return {
          icon: User,
          bg: "bg-gray-100 text-gray-700 border-gray-200",
          label: "Patient",
        };
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white border border-[#E5EAF0] rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-5 border-b border-[#E5EAF0] flex items-center justify-between shrink-0 bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#087A50] text-white flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#111827]">
                Patient Chronological EHR Timeline
              </h3>
              <p className="text-xs text-[#64748B]">
                {patient?.fullName || "Patient"} • {patient?.patientCode || "PAT"} • {patient?.phone || ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {isLoading ? (
            <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
              <span>Compiling patient clinical history...</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="py-16 text-center text-[#64748B]">
              No clinical events recorded for this patient.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5EAF0]">
              {timeline.map((event) => {
                const badge = getEventBadge(event.type);
                const Icon = badge.icon;
                return (
                  <div key={event.id} className="relative group">
                    {/* Timeline Node dot */}
                    <div className="absolute -left-[27px] top-1 w-5 h-5 rounded-full bg-white border-2 border-[#087A50] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#087A50]" />
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl p-3.5 space-y-1.5 hover:border-[#087A50]/40 transition">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                          <span className="font-bold text-xs text-[#111827]">{event.title}</span>
                        </div>

                        <span className="text-[11px] text-[#64748B] font-mono">
                          {new Date(event.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-[#64748B] leading-relaxed">{event.subtitle}</p>

                      {event.status && (
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[#087A50] capitalize bg-white px-2 py-0.5 rounded border border-[#E5EAF0]">
                            Status: {event.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E5EAF0] bg-[#F8FAFC] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

