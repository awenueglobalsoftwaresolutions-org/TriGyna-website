"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  User,
  Stethoscope,
  Building2,
  RefreshCw,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { CalendarEvent, AuditLogEntry } from "./types";
import { api } from "@/lib/api/client";

interface EventDetailDrawerProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onReschedule: (event: CalendarEvent) => void;
  onCancel: (event: CalendarEvent) => void;
  onNavigateToTab?: (tabId: string) => void;
}

export function EventDetailDrawer({
  event,
  onClose,
  onReschedule,
  onCancel,
  onNavigateToTab,
}: EventDetailDrawerProps) {
  const [activeSection, setActiveSection] = useState<"overview" | "participants" | "schedule" | "history">("overview");
  const [detailedEvent, setDetailedEvent] = useState<CalendarEvent | null>(event);
  const [historyLogs, setHistoryLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (!event) {
      return;
    }

    let isMounted = true;
    const loadRichDetail = async () => {
      try {
        setIsLoadingDetail(true);
        const [detailRes, histRes] = await Promise.all([
          api.get<{ event: CalendarEvent }>(`/calendar/events/${event.id}`).catch(() => null),
          api.get<{ history: AuditLogEntry[] }>(`/calendar/events/${event.id}/history`).catch(() => null),
        ]);

        if (isMounted) {
          if (detailRes?.data?.event) {
            setDetailedEvent(detailRes.data.event);
          } else {
            setDetailedEvent(event);
          }
          if (histRes?.data?.history) {
            setHistoryLogs(histRes.data.history);
          }
          setIsLoadingDetail(false);
        }
      } catch {
        if (isMounted) {
          setDetailedEvent(event);
          setIsLoadingDetail(false);
        }
      }
    };

    loadRichDetail();

    return () => {
      isMounted = false;
    };
  }, [event]);

  if (!event) return null;
  const current = detailedEvent || event;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "followup":
        return "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
      case "doctor_session":
        return "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]";
      case "staff_leave":
        return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
      case "task":
        return "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
      case "appointment":
      default:
        return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    }
  };

  const getSourceTabId = (sourceType: string) => {
    switch (sourceType) {
      case "appointment":
        return "appointments";
      case "followup":
        return "followups";
      case "doctor_session":
        return "doctors";
      case "staff_leave":
        return "hrms";
      case "task":
        return "tasks";
      default:
        return "calendar";
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-[#E5EAF0] shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out">
      {/* DRAWER HEADER */}
      <div className="p-5 border-b border-[#E5EAF0] bg-[#FAFCFB]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getCategoryColor(
                current.category
              )}`}
            >
              {current.category.replace("_", " ")}
            </span>
            {current.referenceCode && (
              <span className="text-xs font-mono font-bold text-[#64748B] bg-gray-100 px-2 py-0.5 rounded">
                {current.referenceCode}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-lg font-bold font-sans text-[#111827] mt-3">{current.title}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 capitalize">
            Status: {current.status}
          </span>
          {current.branch?.name && (
            <span className="text-xs text-[#64748B] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {current.branch.name}
            </span>
          )}
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E5EAF0] overflow-x-auto">
          {(["overview", "participants", "schedule", "history"] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer whitespace-nowrap ${
                activeSection === sec
                  ? "bg-[#087A50] text-white shadow-2xs"
                  : "text-[#64748B] hover:text-[#111827] hover:bg-gray-100"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* DRAWER BODY */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isLoadingDetail && (
          <div className="flex items-center gap-2 text-xs text-[#087A50] font-medium bg-[#E9F8F0] p-2 rounded-lg">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Synchronizing live MongoDB data...</span>
          </div>
        )}

        {/* 1. OVERVIEW SECTION */}
        {activeSection === "overview" && (
          <div className="space-y-4">
            <div className="bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Service / Activity</span>
                <span className="font-bold text-[#111827]">{current.serviceName || "Clinical Consultation"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Consultation Mode</span>
                <span className="font-semibold text-[#111827]">{current.mode || "Online Video Consultation"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Date & Slot</span>
                <span className="font-mono font-bold text-[#087A50]">
                  {current.date} ({current.startTime} - {current.endTime})
                </span>
              </div>
              {current.paymentStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Payment Status</span>
                  <span className="font-bold uppercase text-[#111827]">{current.paymentStatus}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Clinical Notes / Details</label>
              <div className="mt-1.5 bg-gray-50 border border-[#E5EAF0] p-3 rounded-xl text-xs text-[#334155] leading-relaxed">
                {current.description || current.details || "No special instructions recorded for this session."}
              </div>
            </div>

            {/* Quick Link to Source Module */}
            {onNavigateToTab && (
              <div className="pt-2">
                <button
                  onClick={() => onNavigateToTab(getSourceTabId(current.sourceType))}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#E5EAF0] hover:border-[#087A50] text-[#087A50] rounded-xl text-xs font-semibold transition-colors cursor-pointer bg-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in {current.sourceType.toUpperCase()} Module</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. PARTICIPANTS SECTION */}
        {activeSection === "participants" && (
          <div className="space-y-4">
            {/* Patient Card */}
            {current.patient && (
              <div className="border border-[#E5EAF0] rounded-xl p-4 bg-white shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#087A50]" />
                  <span className="text-xs font-bold uppercase text-[#64748B]">Patient Details</span>
                </div>
                <p className="text-sm font-bold text-[#111827]">{current.patient.fullName}</p>
                <div className="text-xs text-[#64748B] space-y-1">
                  <p>Patient Code: <span className="font-mono font-semibold">{current.patient.patientCode}</span></p>
                  {current.patient.phone && <p>Phone: <span className="font-mono">{current.patient.phone}</span></p>}
                  {current.patient.gender && <p>Gender/Age: {current.patient.gender} · {current.patient.age || "N/A"} yrs</p>}
                </div>
              </div>
            )}

            {/* Doctor Card */}
            {current.doctor && (
              <div className="border border-[#E5EAF0] rounded-xl p-4 bg-white shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#9333EA]" />
                  <span className="text-xs font-bold uppercase text-[#64748B]">Doctor / Specialist</span>
                </div>
                <p className="text-sm font-bold text-[#111827]">{current.doctor.name}</p>
                <div className="text-xs text-[#64748B] space-y-1">
                  <p>Specialization: {current.doctor.specialization?.join(", ") || "Homoeopathy"}</p>
                  {current.doctor.consultationFee && (
                    <p>Consultation Fee: ₹{current.doctor.consultationFee}</p>
                  )}
                </div>
              </div>
            )}

            {/* Staff Card */}
            {current.staff && (
              <div className="border border-[#E5EAF0] rounded-xl p-4 bg-white shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0284C7]" />
                  <span className="text-xs font-bold uppercase text-[#64748B]">Assigned Staff</span>
                </div>
                <p className="text-sm font-bold text-[#111827]">{current.staff.name}</p>
                <div className="text-xs text-[#64748B] space-y-1">
                  {current.staff.department && <p>Department: {current.staff.department}</p>}
                  {current.staff.employeeCode && <p>Code: {current.staff.employeeCode}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. SCHEDULE SECTION */}
        {activeSection === "schedule" && (
          <div className="space-y-3 text-xs">
            <div className="border border-[#E5EAF0] rounded-xl p-4 space-y-2.5 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Scheduled Date</span>
                <span className="font-bold text-[#111827]">{current.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Start Time</span>
                <span className="font-mono font-semibold text-[#111827]">{current.startTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">End Time</span>
                <span className="font-mono font-semibold text-[#111827]">{current.endTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">All Day Event</span>
                <span className="font-semibold text-[#111827]">{current.allDay ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. ACTIVITY & AUDIT HISTORY SECTION */}
        {activeSection === "history" && (
          <div className="space-y-3">
            {historyLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No change history recorded yet for this operational record.
              </div>
            ) : (
              <div className="space-y-2">
                {historyLogs.map((log, idx) => (
                  <div key={log._id || idx} className="border border-[#E5EAF0] rounded-xl p-3 bg-white text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111827]">{log.action}</span>
                      <span className="text-[10px] text-[#64748B] font-mono">
                        {new Date(log.timestamp || log.createdAt || "").toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      By {log.actorId?.name || log.actorRole || "System User"}
                    </p>
                    {log.details?.reason && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded mt-1">
                        Reason: {log.details.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DRAWER ACTIONS FOOTER */}
      <div className="p-4 border-t border-[#E5EAF0] bg-[#FAFCFB] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {current.permissions?.canReschedule !== false && current.status !== "cancelled" && (
            <button
              onClick={() => onReschedule(current)}
              className="px-3.5 py-2 border border-[#E5EAF0] hover:border-[#087A50] bg-white hover:bg-[#F8FAFC] text-[#087A50] rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Reschedule</span>
            </button>
          )}

          {current.permissions?.canCancel !== false && current.status !== "cancelled" && (
            <button
              onClick={() => onCancel(current)}
              className="px-3.5 py-2 border border-[#FECACA] hover:bg-[#FEF2F2] text-[#DC2626] rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 border border-[#E5EAF0] bg-white text-[#475569] hover:bg-gray-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
