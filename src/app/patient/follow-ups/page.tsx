"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Clock,
  Calendar,
  Video,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Heart,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface FollowUpItem {
  _id: string;
  followUpCode?: string;
  serviceName: string;
  dueDate: string;
  scheduledTime?: string;
  mode: string;
  status: "scheduled" | "completed" | "missed" | "rescheduled" | "planned";
  interval?: string;
  planInstructions?: string;
  staffNotes?: string;
  doctorId?: {
    userId?: {
      name?: string;
    };
  };
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFollowUps() {
      try {
        setLoading(true);
        const res = await api.get<{ followUps: FollowUpItem[] }>("/patient/me/follow-ups");
        if (res.success && res.data) {
          setFollowUps(res.data.followUps || []);
        }
      } catch (err) {
        console.error("Follow-ups fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFollowUps();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4EEE7]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
            Follow-ups & Care Plan
          </h1>
          <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
            Structured clinical milestones, interval evaluations, and ongoing recovery goals
          </p>
        </div>

        <Link
          href="/patient/appointments"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#075B35] hover:bg-[#064A2D] text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <span>Schedule Visit</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Program Intervals Roadmap */}
      <div className="bg-white rounded-2xl border border-[#E4EEE7] p-6 shadow-xs">
        <h3 className="text-base font-serif font-bold text-[#14251F] mb-1">
          {followUps.length > 0 && followUps[0].serviceName ? `${followUps[0].serviceName} Care Roadmap` : "Clinical Care Roadmap"}
        </h3>
        <p className="text-xs text-[#68766F] mb-6">
          Evidence-based milestone intervals tailored to your constitutional homoeopathic care
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { interval: "Day 1", title: "Intake & Baseline", status: "Completed" },
            { interval: "Day 3", title: "Tolerance Check", status: "Completed" },
            { interval: "Day 7", title: "Acute Response", status: "Completed" },
            { interval: "Day 14", title: "Cycle Evaluation", status: "Current Stage" },
            { interval: "Day 21", title: "Endocrine Review", status: "Upcoming" },
          ].map((milestone, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-center transition ${
                milestone.status === "Current Stage"
                  ? "bg-[#EDF8F1] border-[#075B35] shadow-xs"
                  : milestone.status === "Completed"
                  ? "bg-[#F8FAF9] border-[#D5E8DC]"
                  : "bg-white border-gray-200 opacity-60"
              }`}
            >
              <span className="text-[11px] font-bold text-[#075B35] uppercase">{milestone.interval}</span>
              <h4 className="text-xs font-bold text-[#14251F] mt-1">{milestone.title}</h4>
              <span
                className={`text-[10px] font-semibold mt-2 inline-block px-2 py-0.5 rounded-full ${
                  milestone.status === "Current Stage"
                    ? "bg-[#075B35] text-white"
                    : milestone.status === "Completed"
                    ? "bg-[#EDF8F1] text-[#075B35]"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {milestone.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Follow-ups Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-serif font-bold text-[#14251F]">
          Your Follow-up Schedule ({followUps.length})
        </h3>

        {loading ? (
          <div className="py-12 text-center text-[#68766F] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-[#075B35] animate-spin" />
            <span className="text-xs">Loading follow-ups...</span>
          </div>
        ) : followUps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E4EEE7] p-8 text-center text-xs text-[#8C9892]">
            No follow-ups recorded.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {followUps.map((flw) => {
              const dt = new Date(flw.dueDate);
              const formattedDate = dt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={flw._id}
                  className="bg-white rounded-2xl border border-[#E4EEE7] p-5 shadow-xs flex flex-col justify-between hover:border-[#C6E7D2] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#F0F5F2]">
                      <span className="text-xs font-bold text-[#075B35] bg-[#EDF8F1] px-2.5 py-0.5 rounded-full">
                        {flw.interval || "Day 14"}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          flw.status === "completed"
                            ? "bg-[#EDF8F1] text-[#075B35]"
                            : flw.status === "scheduled"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {flw.status}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      <h4 className="text-sm font-bold text-[#14251F]">{flw.serviceName}</h4>
                      <div className="flex items-center gap-4 text-xs text-[#68766F]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#075B35]" />
                          {formattedDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#075B35]" />
                          {flw.scheduledTime || "11:30 AM - 12:00 PM"}
                        </span>
                      </div>

                      {flw.planInstructions && (
                        <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E4EEE7] text-xs text-[#556960] mt-2">
                          <strong className="text-[#14251F] block mb-0.5">Clinical Instructions:</strong>
                          {flw.planInstructions}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F0F5F2] flex items-center justify-between text-xs">
                    <span className="text-[#68766F]">Mode: {flw.mode}</span>
                    <Link
                      href="/patient/appointments"
                      className="text-xs font-semibold text-[#075B35] hover:underline flex items-center gap-1"
                    >
                      <span>Manage Booking &rarr;</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
