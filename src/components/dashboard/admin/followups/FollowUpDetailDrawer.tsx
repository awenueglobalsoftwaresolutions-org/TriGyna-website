"use client";

import React, { useState } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Phone,
  Mail,
  Video,
  Building,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  FileText,
  Activity,
  History,
  MessageSquare,
  Shield,
  Heart,
  ChevronRight,
} from "lucide-react";
import { FollowUpItem } from "./types";

interface FollowUpDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: FollowUpItem | null;
  onCompleteClick: () => void;
  onRescheduleClick: () => void;
  onSendReminderClick: () => void;
}

export function FollowUpDetailDrawer({
  isOpen,
  onClose,
  followUp,
  onCompleteClick,
  onRescheduleClick,
  onSendReminderClick,
}: FollowUpDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "clinical" | "outcome" | "reminders" | "history"
  >("overview");

  if (!isOpen || !followUp) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "missed":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "overdue":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const getModeIcon = (mode: string) => {
    if (mode.toLowerCase().includes("video")) return <Video className="w-3.5 h-3.5 text-blue-600" />;
    if (mode.toLowerCase().includes("clinic") || mode.toLowerCase().includes("person"))
      return <Building className="w-3.5 h-3.5 text-amber-600" />;
    return <Phone className="w-3.5 h-3.5 text-emerald-600" />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform ease-out duration-300">
        {/* Top Header */}
        <div className="p-4 lg:p-5 border-b border-[#E5EAF0] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#087A50] border border-emerald-200 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {getInitials(followUp.patientId?.fullName || "Patient")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#111827]">
                  {followUp.patientId?.fullName || "Patient"}
                </h2>
                <span className="font-mono text-xs font-bold text-[#087A50] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {followUp.followUpCode}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                {followUp.patientId?.patientCode} • {followUp.patientId?.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                followUp.status
              )}`}
            >
              {followUp.status}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-3 bg-white border-b border-[#E5EAF0] flex items-center gap-2 overflow-x-auto">
          {followUp.status !== "completed" && (
            <button
              type="button"
              onClick={onCompleteClick}
              className="px-3 py-1.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete Follow-up</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRescheduleClick}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reschedule</span>
          </button>
          <button
            type="button"
            onClick={onSendReminderClick}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-[#111827] border border-[#E5EAF0] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-[#087A50]" />
            <span>Send Reminder</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#E5EAF0] px-4 bg-[#F8FAF9] gap-4">
          {[
            { key: "overview", label: "Overview" },
            { key: "clinical", label: "Clinical Review" },
            { key: "outcome", label: "Outcome & Recovery" },
            { key: "reminders", label: "Reminders" },
            { key: "history", label: "History & Audit" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === t.key
                  ? "border-[#087A50] text-[#087A50]"
                  : "border-transparent text-[#64748B] hover:text-[#111827]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Schedule Info Box */}
              <div className="p-4 bg-[#F8FAF9] border border-[#E5EAF0] rounded-2xl space-y-3">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block">
                  Schedule Details
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Due Date &amp; Time</span>
                    <span className="font-semibold text-[#111827] font-mono block mt-0.5">
                      {new Date(followUp.dueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      • {followUp.scheduledTime || "11:30 AM"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Mode</span>
                    <span className="font-semibold text-[#111827] flex items-center gap-1.5 mt-0.5">
                      {getModeIcon(followUp.mode)}
                      <span>{followUp.mode}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Interval</span>
                    <span className="font-medium text-[#111827] block mt-0.5">
                      {followUp.interval || "Day 14"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Care Service</span>
                    <span className="font-medium text-[#111827] block mt-0.5">
                      {followUp.serviceName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Profile Card */}
              <div className="p-4 bg-white border border-[#E5EAF0] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    Patient Demographics
                  </span>
                  <span className="text-xs font-mono text-[#087A50] font-semibold">
                    {followUp.patientId?.patientCode}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Full Name</span>
                    <span className="font-medium text-[#111827]">{followUp.patientId?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Gender &amp; Age</span>
                    <span className="font-medium text-[#111827]">
                      {followUp.patientId?.gender || "Female"} • {followUp.patientId?.age || "32"} Yrs
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Phone</span>
                    <span className="font-mono text-[#111827]">{followUp.patientId?.phone}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Blood Group</span>
                    <span className="font-bold text-rose-600">
                      {followUp.patientId?.bloodGroup || "B+"}
                    </span>
                  </div>
                  {followUp.patientId?.allergies && (
                    <div className="col-span-2">
                      <span className="text-[#64748B] block text-[11px]">Allergies</span>
                      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                        {followUp.patientId.allergies}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Doctor Details */}
              <div className="p-4 bg-white border border-[#E5EAF0] rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block">
                  Assigned Consultant
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#111827] block">
                      {followUp.doctorId?.userId?.name || "Dr. Ananya Sharma"}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      {followUp.doctorId?.specialization || "Senior Homoeopathic Consultant"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linked Consultation if any */}
              {followUp.consultationId && (
                <div className="p-4 bg-white border border-[#E5EAF0] rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block">
                    Linked Consultation
                  </span>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-[#64748B]">Encounter Code:</span>
                      <span className="font-bold text-[#087A50]">
                        {followUp.consultationId.consultationCode}
                      </span>
                    </div>
                    {followUp.consultationId.diagnoses && (
                      <div>
                        <span className="text-[#64748B] block text-[11px]">Diagnoses:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {followUp.consultationId.diagnoses.map((d, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px]"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. CLINICAL REVIEW TAB */}
          {activeTab === "clinical" && (
            <div className="space-y-4">
              <div className="p-4 bg-white border border-[#E5EAF0] rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block">
                  Prescribed Care Plan &amp; Protocol
                </span>
                <p className="text-xs text-[#111827] leading-relaxed bg-[#F8FAF9] p-3 rounded-xl border border-[#E5EAF0]">
                  {followUp.planInstructions || "No explicit plan instructions registered."}
                </p>
              </div>

              <div className="p-4 bg-white border border-[#E5EAF0] rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block">
                  Patient Reported Symptoms
                </span>
                <p className="text-xs text-[#111827] leading-relaxed bg-[#F8FAF9] p-3 rounded-xl border border-[#E5EAF0]">
                  {followUp.symptoms || "Awaiting direct patient symptom reporting during session."}
                </p>
              </div>

              <div className="p-4 bg-white border border-[#E5EAF0] rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block">
                  Clinical Observations &amp; Vitals
                </span>
                <p className="text-xs text-[#111827] leading-relaxed bg-[#F8FAF9] p-3 rounded-xl border border-[#E5EAF0]">
                  {followUp.clinicalObservations || "No abnormal clinical observations noted."}
                </p>
              </div>
            </div>
          )}

          {/* 3. OUTCOME & RECOVERY TAB */}
          {activeTab === "outcome" && (
            <div className="space-y-4">
              <div className="p-4 bg-white border border-[#E5EAF0] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    Recovery Status
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                    {followUp.recoveryStatus || "Pending Review"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] block mb-1">Outcome Evaluation:</span>
                  <p className="text-xs text-[#111827] leading-relaxed bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                    {followUp.outcomeNotes ||
                      followUp.outcome ||
                      "Follow-up session pending completion."}
                  </p>
                </div>
                {followUp.completedAt && (
                  <div className="text-[11px] text-[#64748B] pt-2 border-t border-[#F1F5F9]">
                    Completed on:{" "}
                    <span className="font-mono text-[#111827]">
                      {new Date(followUp.completedAt).toLocaleString("en-IN")}
                    </span>{" "}
                    by {followUp.completedBy?.name || "Consultant"}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. REMINDERS TAB */}
          {activeTab === "reminders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111827]">Reminders Dispatched</span>
                <button
                  type="button"
                  onClick={onSendReminderClick}
                  className="text-xs text-[#087A50] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Send New Reminder</span>
                </button>
              </div>

              {(!followUp.reminders || followUp.reminders.length === 0) ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-[#E5EAF0] text-xs text-[#64748B]">
                  <MessageSquare className="w-6 h-6 mx-auto text-gray-300 mb-2" />
                  <p>No reminders logged yet for this follow-up.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {followUp.reminders.map((rem, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-[#E5EAF0] rounded-xl space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="capitalize font-semibold text-[#111827] flex items-center gap-1.5">
                          {rem.channel === "whatsapp" ? (
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Mail className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>{rem.channel}</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            rem.status === "sent" || rem.status === "delivered"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {rem.status}
                        </span>
                      </div>
                      <p className="text-[#64748B] text-[11px]">{rem.content}</p>
                      {rem.sentAt && (
                        <div className="text-[10px] text-gray-400 font-mono">
                          Dispatched: {new Date(rem.sentAt).toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. HISTORY & AUDIT TAB */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#111827] block">
                Audit Trail &amp; Reschedule Logs
              </span>

              {(!followUp.rescheduleHistory || followUp.rescheduleHistory.length === 0) ? (
                <div className="p-6 text-center bg-gray-50 rounded-2xl border border-[#E5EAF0] text-xs text-[#64748B]">
                  <History className="w-6 h-6 mx-auto text-gray-300 mb-2" />
                  <p>Original schedule maintained. No reschedules on record.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followUp.rescheduleHistory.map((hist, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#F8FAF9] border border-[#E5EAF0] rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827]">
                        <span>Reschedule Event #{idx + 1}</span>
                        <span className="text-gray-400 font-mono text-[10px]">
                          {new Date(hist.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <div className="text-gray-600 text-[11px]">
                        From:{" "}
                        <span className="font-mono text-[#111827]">
                          {new Date(hist.originalDate).toLocaleDateString("en-IN")}{" "}
                          {hist.originalTime || ""}
                        </span>{" "}
                        → To:{" "}
                        <span className="font-mono text-[#087A50] font-bold">
                          {new Date(hist.newDate).toLocaleDateString("en-IN")}{" "}
                          {hist.newTime || ""}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 italic">
                        Reason: {hist.reason || "Care schedule adjustment"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-[#64748B] space-y-1">
                <div>Created: {new Date(followUp.createdAt).toLocaleString("en-IN")}</div>
                <div>Last Updated: {new Date(followUp.updatedAt).toLocaleString("en-IN")}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
