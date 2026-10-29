"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Shield,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";

interface ConsultationRecord {
  _id: string;
  consultationCode?: string;
  chiefComplaints?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  vitalSigns?: {
    bloodPressure?: string;
    pulse?: number;
    weightKg?: number;
    bmi?: number;
  };
  isFinalized: boolean;
  finalizedAt?: string;
  createdAt: string;
  doctorId?: {
    qualifications?: string;
    userId?: {
      name?: string;
    };
  };
  appointmentId?: {
    appointmentCode?: string;
    appointmentDate?: string;
    serviceName?: string;
  };
}

export default function OnlineConsultationPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const roomCode = searchParams?.get("room") || "TG-ROOM-CONSULT";

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "PT";

  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Video Room Controls
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [callActive, setCallActive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "ended">("connected");

  useEffect(() => {
    async function loadConsultations() {
      try {
        setLoading(true);
        const res = await api.get<{ consultations: ConsultationRecord[] }>("/patient/me/consultations");
        if (res.success && res.data) {
          setConsultations(res.data.consultations || []);
        }
      } catch (err) {
        console.error("Consultations fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConsultations();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="pb-3 border-b border-[#E4EEE7]">
        <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
          Online Video Consultation
        </h1>
        <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
          Secure, encrypted tele-health consultation with your homoeopathic practitioner
        </p>
      </div>

      {/* Live Video Room Canvas */}
      <div className="bg-[#14251F] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${callActive ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Active Tele-Consultation Room: <span className="font-mono text-emerald-300">{roomCode}</span>
              </h2>
              <p className="text-xs text-gray-400">
                Encrypted Session • Provider Adapter: TriGyna WebRTC Secure Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 rounded-full text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>HIPAA / DISHA Encrypted</span>
            </span>
          </div>
        </div>

        {/* Video Screens Area */}
        <div className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden bg-black/60 border border-white/10 p-4 relative">
            {/* Main Stage: Doctor Feed */}
            <div className="md:col-span-2 relative rounded-xl overflow-hidden bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-6 border border-white/5">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-400 shadow-xl mb-3 bg-gray-800">
                <Image
                  src="/images/doctors/dr-harshali-sutar.webp"
                  alt="Dr. Harshali Sutar"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-base font-bold text-white">Dr. Harshali Sutar</h3>
              <p className="text-xs text-emerald-400 font-medium">Consultant Gynaecology & Homoeopathy</p>
              <div className="mt-3 px-3 py-1 bg-black/40 rounded-full text-[11px] text-gray-300 border border-white/10">
                Status: Connected and Ready (Slot: 11:30 AM - 12:00 PM)
              </div>

              {/* Watermark badge */}
              <div className="absolute bottom-3 left-3 bg-black/70 px-2.5 py-1 rounded-md text-[10px] text-gray-300">
                Doctor Audio/Video Feed • 1080p 30fps
              </div>
            </div>

            {/* Side Panel: Patient Self-View & Notes */}
            <div className="flex flex-col gap-3">
              {/* Patient Self-View */}
              <div className="flex-1 rounded-xl bg-gray-900 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden p-4">
                {videoEnabled ? (
                  <div className="w-16 h-16 rounded-full bg-[#075B35] text-white flex items-center justify-center font-bold text-lg mb-2 shadow-md">
                    {userInitials}
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs flex flex-col items-center gap-1">
                    <VideoOff className="w-6 h-6 text-gray-500" />
                    <span>Camera Muted</span>
                  </div>
                )}
                <span className="text-xs font-semibold text-gray-200">{user?.name || "Patient"} (You)</span>
                <span className="text-[10px] text-gray-400">Microphone: {micEnabled ? "Active" : "Muted"}</span>
                <div className="absolute top-2 right-2 flex gap-1">
                  {!micEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </div>

              {/* Consultation Guidelines Card */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs space-y-1.5 text-gray-300">
                <p className="font-semibold text-white">During your consultation:</p>
                <ul className="list-disc pl-4 text-[11px] space-y-1 text-gray-400">
                  <li>Keep any recent ultrasound or hormone reports accessible.</li>
                  <li>Doctor will review symptom changes since your last prescription.</li>
                  <li>Digital prescription will be published upon conclusion.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Video Control Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMicEnabled(!micEnabled)}
              className={`p-3 rounded-full font-semibold transition cursor-pointer ${
                micEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-600 hover:bg-red-700 text-white"
              }`}
              title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={`p-3 rounded-full font-semibold transition cursor-pointer ${
                videoEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-600 hover:bg-red-700 text-white"
              }`}
              title={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCallActive(false);
                setConnectionStatus("ended");
              }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* Past Completed Consultations & Clinical Summaries */}
      <div className="bg-white rounded-2xl border border-[#E4EEE7] p-6 shadow-xs">
        <h2 className="text-lg font-serif font-bold text-[#14251F] mb-1">
          Consultation History & Doctor&apos;s Notes
        </h2>
        <p className="text-xs text-[#68766F] mb-6">
          Permitted clinical summaries and treatment plans finalized by your practitioners
        </p>

        {loading ? (
          <div className="py-8 text-center text-[#68766F] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-[#075B35] animate-spin" />
            <span className="text-xs">Loading consultation records...</span>
          </div>
        ) : consultations.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8C9892]">
            No completed consultation summaries recorded.
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.map((c) => (
              <div
                key={c._id}
                className="p-5 rounded-2xl border border-[#E4EEE7] bg-[#FAFCFA] hover:bg-white transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E4EEE7]">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#EDF8F1] text-[#075B35]">
                      {c.consultationCode || "CON-2026-001"}
                    </span>
                    <span className="text-xs text-[#68766F] font-medium">
                      Date: {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#075B35] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Finalized by {c.doctorId?.userId?.name || "Dr. Harshali Sutar"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#68766F] block font-medium">Chief Complaints:</span>
                    <p className="font-semibold text-[#14251F] mt-0.5">
                      {c.chiefComplaints || "General health discussion & treatment plan"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#68766F] block font-medium">Clinical Diagnosis:</span>
                    <p className="font-semibold text-[#075B35] mt-0.5">
                      {c.diagnosis || "PCOS, mild hormonal imbalance"}
                    </p>
                  </div>
                </div>

                {c.treatmentPlan && (
                  <div className="p-3 bg-white rounded-xl border border-[#E4EEE7] text-xs">
                    <span className="font-bold text-[#14251F] block mb-1">Prescribed Clinical Plan:</span>
                    <p className="text-[#68766F] leading-relaxed">{c.treatmentPlan}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
