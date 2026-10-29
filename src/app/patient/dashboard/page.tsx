"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Heart,
  FileText,
  CreditCard,
  Video,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Printer,
  X,
  Shield,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";

interface OverviewMetrics {
  upcomingAppointmentsCount: number;
  activeFollowUpsCount: number;
  prescriptionsCount: number;
  outstandingBalance: number;
}

interface DoctorInfo {
  _id?: string;
  name: string;
  qualifications: string;
  specialization: string[];
  photoUrl: string;
  consultationFee?: number;
}

interface NextAppointment {
  _id: string;
  appointmentCode: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  mode: string;
  serviceName: string;
  subService: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  joinEligible: boolean;
  meetingUrl: string | null;
  doctor: DoctorInfo;
}

interface CareJourneyEvent {
  id: string;
  type: string;
  date: string;
  isoDate: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  icon: string;
}

interface FollowUpItem {
  _id: string;
  title: string;
  day: number;
  month: string;
  fullDate: string;
  time: string;
  mode: string;
  planInstructions?: string;
  status: string;
  actionLabel: string;
}

interface ActivityItem {
  _id: string;
  title: string;
  description: string;
  type: string;
  relativeTime: string;
  read: boolean;
}


export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live state from API
  const [overview, setOverview] = useState<OverviewMetrics>({
    upcomingAppointmentsCount: 0,
    activeFollowUpsCount: 0,
    prescriptionsCount: 0,
    outstandingBalance: 0,
  });
  const [nextAppointment, setNextAppointment] = useState<NextAppointment | null>(null);
  const [careJourney, setCareJourney] = useState<CareJourneyEvent[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUpItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Interactive Modal Dialogues
  const [activeModal, setActiveModal] = useState<
    "appointment_details" | "consultation_summary" | "prescription_view" | "followup_plan" | "join_consultation" | "doctor_profile" | null
  >(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedItemData, setSelectedItemData] = useState<any>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{
        overview: OverviewMetrics;
        nextAppointment: NextAppointment | null;
        careJourney: CareJourneyEvent[];
        upcomingFollowUps: FollowUpItem[];
        recentActivity: ActivityItem[];
        unreadNotificationsCount?: number;
      }>("/patient/me/dashboard");

      if (res.success && res.data) {
        setOverview(res.data.overview);
        setNextAppointment(res.data.nextAppointment);
        setCareJourney(res.data.careJourney || []);
        setUpcomingFollowUps(res.data.upcomingFollowUps || []);
        setRecentActivity(res.data.recentActivity || []);
      }
    } catch (err: unknown) {
      console.error("Dashboard fetch error:", err);
      setError("Unable to load live dashboard metrics. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await api.get<{
          overview: OverviewMetrics;
          nextAppointment: NextAppointment | null;
          careJourney: CareJourneyEvent[];
          upcomingFollowUps: FollowUpItem[];
          recentActivity: ActivityItem[];
          unreadNotificationsCount?: number;
        }>("/patient/me/dashboard");

        if (isMounted && res.success && res.data) {
          setOverview(res.data.overview);
          setNextAppointment(res.data.nextAppointment);
          setCareJourney(res.data.careJourney || []);
          setUpcomingFollowUps(res.data.upcomingFollowUps || []);
          setRecentActivity(res.data.recentActivity || []);
        }
      } catch (err: unknown) {
        console.error("Dashboard fetch error:", err);
        if (isMounted) setError("Unable to load live dashboard metrics. Please check network connection.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-200">
      {/* Loading Skeleton */}
      {loading && !nextAppointment && (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#075B35] animate-spin" />
          <p className="text-sm text-[#68766F] font-medium">Loading your health journey...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-red-300 rounded-lg text-xs font-semibold hover:bg-red-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* 1. Four Summary Cards (2x2 on Mobile, 4 columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {/* Card 1: Upcoming Appointments */}
        <div className="bg-[#F3FAF5] border border-[#E1EFE6] rounded-2xl p-3.5 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#E2F2E7] text-[#075B35] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-[11px] sm:text-xs text-[#556960] font-medium leading-tight">Upcoming appointments</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#14251F] mt-1 tracking-tight">
              {overview.upcomingAppointmentsCount}
            </p>
          </div>
          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[#E1EFE6]/60">
            <Link
              href="/patient/appointments"
              className="text-[11px] sm:text-xs font-semibold text-[#075B35] hover:text-[#064A2D] flex items-center gap-1 group"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {/* Subtle calendar decorative watermark */}
          <Calendar className="absolute -right-2 sm:-right-3 -bottom-2 sm:-bottom-3 w-14 h-14 sm:w-20 sm:h-20 text-[#075B35]/5 pointer-events-none stroke-[1]" />
        </div>

        {/* Card 2: Active Follow-ups */}
        <div className="bg-[#FFFBF3] border border-[#F6EBD9] rounded-2xl p-3.5 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#FEEED6] text-[#D97706] flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-[11px] sm:text-xs text-[#7A6348] font-medium leading-tight">Active follow-ups</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#14251F] mt-1 tracking-tight">
              {overview.activeFollowUpsCount}
            </p>
          </div>
          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[#F6EBD9]/60">
            <Link
              href="/patient/follow-ups"
              className="text-[11px] sm:text-xs font-semibold text-[#075B35] hover:text-[#064A2D] flex items-center gap-1 group"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {/* Subtle heart decorative watermark */}
          <Heart className="absolute -right-2 sm:-right-3 -bottom-2 sm:-bottom-3 w-14 h-14 sm:w-20 sm:h-20 text-[#D97706]/5 pointer-events-none stroke-[1]" />
        </div>

        {/* Card 3: Prescriptions */}
        <div className="bg-[#F4FAF6] border border-[#E1EFE6] rounded-2xl p-3.5 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#E2F2E7] text-[#075B35] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-[11px] sm:text-xs text-[#556960] font-medium leading-tight">Prescriptions</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#14251F] mt-1 tracking-tight">
              {overview.prescriptionsCount}
            </p>
          </div>
          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[#E1EFE6]/60">
            <Link
              href="/patient/prescriptions"
              className="text-[11px] sm:text-xs font-semibold text-[#075B35] hover:text-[#064A2D] flex items-center gap-1 group"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {/* Subtle document decorative watermark */}
          <FileText className="absolute -right-2 sm:-right-3 -bottom-2 sm:-bottom-3 w-14 h-14 sm:w-20 sm:h-20 text-[#075B35]/5 pointer-events-none stroke-[1]" />
        </div>

        {/* Card 4: Outstanding Balance */}
        <div className="bg-[#FFFBF3] border border-[#F6EBD9] rounded-2xl p-3.5 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#FEEED6] text-[#D97706] flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-[11px] sm:text-xs text-[#7A6348] font-medium leading-tight">Outstanding balance</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#14251F] mt-1 tracking-tight">
              ₹{overview.outstandingBalance}
            </p>
          </div>
          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[#F6EBD9]/60">
            <Link
              href="/patient/payments"
              className="text-[11px] sm:text-xs font-semibold text-[#075B35] hover:text-[#064A2D] flex items-center gap-1 group"
            >
              <span>View invoices</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {/* Subtle card decorative watermark */}
          <CreditCard className="absolute -right-2 sm:-right-3 -bottom-2 sm:-bottom-3 w-14 h-14 sm:w-20 sm:h-20 text-[#D97706]/5 pointer-events-none stroke-[1]" />
        </div>
      </div>

      {/* 2. Next Appointment Card (Matching Exact Reference Proportions & Elements) */}
      <div className="bg-white rounded-2xl border border-[#E4EEE7] p-6 shadow-xs relative overflow-hidden">
        {/* Section Heading */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg md:text-xl font-serif font-bold text-[#14251F] tracking-tight">
            Next Appointment
          </h2>
          {nextAppointment && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF8F1] text-[#075B35] border border-[#CDE5D6]">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              Confirmed
            </span>
          )}
        </div>

        {nextAppointment ? (
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 relative z-10">
            {/* Left: Date Block & Consultant Details */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-5 shrink-0">
              {/* Date Block */}
              <div className="w-20 shrink-0 rounded-xl overflow-hidden shadow-xs border border-[#D5E8DC] text-center">
                <div className="bg-[#075B35] text-white text-xs font-bold uppercase py-1 tracking-wider">
                  Mon
                </div>
                <div className="bg-[#F8FAF9] py-2 px-1">
                  <span className="block text-2xl font-bold text-[#14251F] leading-none">
                    27
                  </span>
                  <span className="text-[11px] font-semibold text-[#68766F] mt-0.5 block">
                    Oct 2026
                  </span>
                </div>
              </div>

              {/* Consultant Portrait & Credentials */}
              <div className="flex items-center gap-3.5">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden border-2 border-[#DCECE1] bg-[#F2F7F4] shrink-0">
                  <Image
                    src={nextAppointment.doctor?.photoUrl || "/images/doctors/dr-harshali-sutar.webp"}
                    alt={nextAppointment.doctor?.name || "Assigned Consultant"}
                    width={72}
                    height={72}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <p className="text-xs text-[#68766F] font-medium">Consultation with</p>
                  <h3 className="text-base font-bold text-[#14251F] tracking-tight">
                    {nextAppointment.doctor?.name || "Assigned Consultant"}
                  </h3>
                  <p className="text-xs text-[#68766F]">
                    {nextAppointment.doctor?.qualifications || "Consultant"}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedItemData(nextAppointment.doctor);
                      setActiveModal("doctor_profile");
                    }}
                    className="text-xs font-semibold text-[#075B35] hover:text-[#064A2D] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Middle: Service, Mode, Scheduled Time */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-3 xl:py-0 border-y xl:border-y-0 xl:border-l xl:border-r border-[#F0F5F2] xl:px-6 w-full xl:w-auto">
              {/* Service */}
              <div className="flex items-start gap-2.5 min-w-[140px]">
                <div className="w-8 h-8 rounded-lg bg-[#EDF8F1] text-[#075B35] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-[#14251F] leading-tight">
                    {nextAppointment.serviceName}
                  </h4>
                  <p className="text-[11px] text-[#68766F] leading-tight mt-0.5">
                    {nextAppointment.subService}
                  </p>
                </div>
              </div>

              {/* Mode */}
              <div className="flex items-start gap-2.5 min-w-[140px]">
                <div className="w-8 h-8 rounded-lg bg-[#EDF8F1] text-[#075B35] flex items-center justify-center shrink-0 mt-0.5">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-[#14251F] leading-tight">
                    Video consultation
                  </h4>
                  <p className="text-[11px] text-[#68766F] leading-tight mt-0.5">
                    Online (Secure &amp; Encrypted)
                  </p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-2.5 min-w-[140px]">
                <div className="w-8 h-8 rounded-lg bg-[#EDF8F1] text-[#075B35] flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-[#14251F] leading-tight">
                    {nextAppointment.startTime === "11:30" ? "11:30 AM - 12:00 PM" : `${nextAppointment.startTime} - ${nextAppointment.endTime}`}
                  </h4>
                  <p className="text-[11px] text-[#68766F] leading-tight mt-0.5">
                    {nextAppointment.durationMinutes} minutes
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto xl:w-auto shrink-0 justify-end">
              <button
                onClick={() => {
                  setSelectedItemData(nextAppointment);
                  setActiveModal("appointment_details");
                }}
                className="flex-1 lg:flex-none px-4 py-2.5 bg-white border border-[#D5E8DC] hover:bg-[#F2F7F4] text-[#14251F] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                View details
              </button>

              <button
                onClick={() => {
                  setSelectedItemData(nextAppointment);
                  setActiveModal("join_consultation");
                }}
                className="flex-1 lg:flex-none px-5 py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Video className="w-4 h-4 stroke-[2]" />
                <span>Join consultation</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Calendar className="w-10 h-10 text-[#68766F] mx-auto mb-2 opacity-60" />
            <h3 className="text-sm font-bold text-[#14251F]">No Upcoming Appointments Scheduled</h3>
            <p className="text-xs text-[#68766F] mt-1 max-w-sm mx-auto">
              Ready to begin your personalized homoeopathic care journey?
            </p>
            <Link
              href="/patient/appointments"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#075B35] text-white text-xs font-semibold rounded-xl hover:bg-[#064A2D] transition"
            >
              <span>Book Appointment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Botanical Foliage Decorative Branch (Right Side) */}
        <div className="absolute right-0 bottom-0 w-36 h-36 pointer-events-none opacity-40 lg:opacity-75">
          <svg viewBox="0 0 160 160" fill="none" className="w-full h-full text-[#6D982B]">
            <path
              d="M160 160C140 110 90 80 50 80C90 100 120 130 160 160Z"
              fill="currentColor"
              fillOpacity="0.35"
            />
            <path
              d="M160 110C130 70 80 50 30 50C70 70 100 90 160 110Z"
              fill="currentColor"
              fillOpacity="0.45"
            />
            <path
              d="M160 60C120 30 70 20 20 20C60 35 90 50 160 60Z"
              fill="currentColor"
              fillOpacity="0.25"
            />
          </svg>
        </div>
      </div>

      {/* 3. Lower Dashboard Section (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Your Care Journey Timeline (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E4EEE7] p-6 shadow-xs">
          <div className="mb-6">
            <h3 className="text-lg font-serif font-bold text-[#14251F]">Your care journey</h3>
            <p className="text-xs text-[#68766F] mt-0.5">
              A timeline of your consultations, prescriptions and follow-ups
            </p>
          </div>

          {/* Timeline Items */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E4EEE7]">
            {careJourney.length === 0 ? (
              <p className="text-xs text-[#8C9892]">No care journey events recorded yet.</p>
            ) : (
              careJourney.map((event) => {
                const isCompleted = event.title.includes("completed");
                const isPrescription = event.type === "prescription";
                const isScheduled = event.title.includes("scheduled");
                const isPlanned = event.title.includes("Planned");

                return (
                  <div key={event.id} className="relative flex items-start justify-between gap-4">
                    {/* Timeline Node Icon (Centered on vertical line) */}
                    <div
                      className={`absolute -left-6 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white ${
                        isCompleted
                          ? "bg-[#075B35] text-white"
                          : isPrescription
                          ? "bg-[#EDF8F1] text-[#075B35] border border-[#C6E7D2]"
                          : isScheduled
                          ? "bg-[#FFF8EC] text-[#D97706] border border-[#FDE68A]"
                          : "bg-white text-gray-400 border-2 border-gray-300"
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                      {isPrescription && <FileText className="w-3 h-3 stroke-[2.2]" />}
                      {isScheduled && <Calendar className="w-3 h-3 stroke-[2.2]" />}
                      {isPlanned && <div className="w-2 h-2 rounded-full bg-gray-300" />}
                    </div>

                    {/* Event Content: Date, Title, Description */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs font-semibold text-[#68766F] shrink-0">
                          {event.date}
                        </span>
                        <h4 className="text-sm font-bold text-[#14251F] leading-tight truncate">
                          {event.title}
                        </h4>
                      </div>
                      <p className="text-xs text-[#68766F] mt-1 line-clamp-1">
                        {event.description}
                      </p>
                    </div>

                    {/* Action Button */}
                    {event.actionLabel && (
                      <button
                        onClick={() => {
                          setSelectedItemData(event);
                          if (isPrescription) setActiveModal("prescription_view");
                          else if (isCompleted) setActiveModal("consultation_summary");
                          else setActiveModal("followup_plan");
                        }}
                        className="shrink-0 px-3 py-1.5 bg-[#EDF8F1] hover:bg-[#DCECE1] text-[#075B35] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        {event.actionLabel}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Follow-ups & Recent Activity (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Upcoming Follow-ups */}
          <div className="bg-white rounded-2xl border border-[#E4EEE7] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-serif font-bold text-[#14251F]">
                Upcoming follow-ups
              </h3>
              <Link
                href="/patient/follow-ups"
                className="text-xs font-semibold text-[#075B35] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3.5">
              {upcomingFollowUps.length === 0 ? (
                <p className="text-xs text-[#8C9892]">No upcoming follow-ups scheduled.</p>
              ) : (
                upcomingFollowUps.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#F0F5F2] hover:bg-[#FAFCFA] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Compact Date Box */}
                      <div className="w-12 h-12 rounded-lg bg-[#FFF8EC] border border-[#FDE68A] flex flex-col items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#14251F] leading-none">
                          {item.day}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-[#68766F] mt-0.5">
                          {item.month}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-[#14251F] leading-tight">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-[#68766F] mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#68766F]" />
                            {item.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3 text-[#68766F]" />
                            {item.mode}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedItemData(item);
                        setActiveModal("followup_plan");
                      }}
                      className="shrink-0 px-3 py-1.5 bg-[#EDF8F1] hover:bg-[#DCECE1] text-[#075B35] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      {item.actionLabel || "View plan"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card: Recent Activity */}
          <div className="bg-white rounded-2xl border border-[#E4EEE7] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-serif font-bold text-[#14251F]">
                Recent activity
              </h3>
              <Link
                href="/patient/notifications"
                className="text-xs font-semibold text-[#075B35] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-[#8C9892]">No recent activity recorded.</p>
              ) : (
                recentActivity.map((act) => {
                  const isAppt = act.title.toLowerCase().includes("appointment");
                  const isRx = act.title.toLowerCase().includes("prescription");

                  return (
                    <div key={act._id} className="flex items-start justify-between gap-3 text-left">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isAppt
                              ? "bg-[#EDF8F1] text-[#075B35]"
                              : isRx
                              ? "bg-[#EDF8F1] text-[#075B35]"
                              : "bg-[#FFF8EC] text-[#D97706]"
                          }`}
                        >
                          {isAppt && <Calendar className="w-4 h-4" />}
                          {isRx && <FileText className="w-4 h-4" />}
                          {!isAppt && !isRx && <MessageSquare className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#14251F]">{act.title}</h4>
                          <p className="text-xs text-[#68766F] mt-0.5 leading-snug">
                            {act.description}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] text-[#8C9892] shrink-0 whitespace-nowrap">
                        {act.relativeTime}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Interactive Working Modal Dialogues (View Details, Join, Prescription, Plan) */}
      {/* ========================================================================= */}

      {/* Modal 1: Appointment Details */}
      {activeModal === "appointment_details" && selectedItemData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F5F2]">
              <div>
                <span className="text-xs font-bold text-[#075B35] uppercase tracking-wider">
                  Appointment Overview
                </span>
                <h3 className="text-lg font-serif font-bold text-[#14251F]">
                  {selectedItemData.appointmentCode}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7]">
                <div>
                  <span className="text-[#68766F] block">Service:</span>
                  <span className="font-bold text-[#14251F] text-sm">{selectedItemData.serviceName}</span>
                </div>
                <div>
                  <span className="text-[#68766F] block">Consultant:</span>
                  <span className="font-bold text-[#14251F] text-sm">{selectedItemData.doctor?.name}</span>
                </div>
                <div>
                  <span className="text-[#68766F] block">Scheduled Slot:</span>
                  <span className="font-semibold text-[#14251F]">
                    {selectedItemData.appointmentDate} at {selectedItemData.startTime}
                  </span>
                </div>
                <div>
                  <span className="text-[#68766F] block">Consultation Mode:</span>
                  <span className="font-semibold text-[#075B35]">{selectedItemData.mode}</span>
                </div>
                <div>
                  <span className="text-[#68766F] block">Booking Status:</span>
                  <span className="inline-block px-2 py-0.5 bg-[#EDF8F1] text-[#075B35] font-bold rounded-full">
                    {selectedItemData.statusLabel || "Confirmed"}
                  </span>
                </div>
                <div>
                  <span className="text-[#68766F] block">Payment:</span>
                  <span className="font-semibold text-[#075B35]">Verified Paid (₹{selectedItemData.doctor?.consultationFee || 700})</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>24-Hour Notice Policy:</strong> Rescheduling or cancellation is permitted up to 24 hours prior to your scheduled consultation time.
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#F0F5F2]">
              <Link
                href="/patient/appointments"
                onClick={() => setActiveModal(null)}
                className="flex-1 text-center py-2.5 bg-gray-100 hover:bg-gray-200 text-[#14251F] font-semibold text-xs rounded-xl"
              >
                Manage Booking
              </Link>
              <button
                onClick={() => setActiveModal("join_consultation")}
                className="flex-1 py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Video className="w-4 h-4" />
                <span>Join Consultation Room</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Online Consultation Room */}
      {activeModal === "join_consultation" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#14251F] text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-base font-bold">TriGyna Secure Tele-Consultation</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 space-y-4">
              {/* Virtual Video Canvas Simulation */}
              <div className="relative aspect-video rounded-2xl bg-black/50 border border-white/10 flex flex-col items-center justify-center text-center p-6 overflow-hidden">
                <div className="w-20 h-20 rounded-full border-2 border-emerald-400 overflow-hidden mb-3 bg-white/10">
                  <Image
                    src="/images/doctors/dr-harshali-sutar.webp"
                    alt="Dr. Harshali Sutar"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-sm font-bold text-white">
                  {nextAppointment?.doctor?.name || "TriGyna Specialist"}
                </h4>
                <p className="text-xs text-emerald-400 font-medium mt-0.5">
                  {nextAppointment?.doctor?.qualifications || "Consultant Gynaecology & Homoeopathy"}
                </p>
                <p className="text-[11px] text-gray-300 mt-3 max-w-sm">
                  Encrypted peer-to-peer room ready. Camera and microphone permissions verified.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-emerald-950/80 text-emerald-300 rounded-full border border-emerald-800">
                  <Shield className="w-3.5 h-3.5" />
                  <span>256-bit HIPAA / EHR Compliant Session</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
              <span className="text-gray-400">
                Scheduled: {nextAppointment ? `${nextAppointment.appointmentDate}, ${nextAppointment.startTime}` : "Upcoming Slot"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium"
                >
                  Close
                </button>
                <Link
                  href="/patient/consultations"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-[#075B35] hover:bg-[#064A2D] rounded-xl font-semibold flex items-center gap-1.5"
                >
                  <span>Open Full Video Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Prescription Slip View & Print */}
      {activeModal === "prescription_view" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Printable Prescription Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E4EEE7]">
              <div>
                <Image
                  src="/images/brand/logo.webp"
                  alt="TriGyna"
                  width={130}
                  height={38}
                  className="h-8 w-auto object-contain"
                />
                <p className="text-[10px] text-[#68766F] mt-1">EHR Medical Prescription Slip</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clinician & Patient Header */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-[#F0F5F2]">
              <div>
                <span className="text-[#68766F] block">Prescribing Clinician:</span>
                <span className="font-bold text-[#14251F]">
                  {nextAppointment?.doctor?.name || "Consultant Clinician"}
                </span>
                <span className="text-[11px] text-[#68766F] block">
                  {nextAppointment?.doctor?.qualifications || "Consultant Gynaecology & Homoeopathy"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#68766F] block">Patient:</span>
                <span className="font-bold text-[#14251F]">{user?.name || "Patient"}</span>
                <span className="text-[10px] text-[#68766F]">
                  Date: {selectedItemData?.date || "Authorized EHR Slip"}
                </span>
              </div>
            </div>

            {/* Prescribed Medications */}
            <div className="py-4 space-y-3">
              <span className="text-xs font-bold text-[#075B35] uppercase tracking-wider block">
                Rx Prescribed Posology
              </span>
              <div className="p-4 rounded-xl border border-gray-200 bg-[#F8FAF9] text-xs space-y-2">
                <p className="font-semibold text-[#14251F]">
                  {selectedItemData?.title || "Published Prescription"}
                </p>
                <p className="text-[#68766F] leading-relaxed">
                  {selectedItemData?.description || "Digital prescription issued by attending doctor."}
                </p>
              </div>
            </div>

            {/* Print & Action Footer */}
            <div className="flex gap-3 pt-4 border-t border-[#F0F5F2]">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#14251F] font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
              <Link
                href="/patient/prescriptions"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white font-semibold text-xs rounded-xl text-center"
              >
                View in Prescriptions Hub
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Follow-up Care Plan */}
      {activeModal === "followup_plan" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F5F2]">
              <div>
                <span className="text-xs font-bold text-[#075B35] uppercase tracking-wider">
                  Care Plan Milestone
                </span>
                <h3 className="text-lg font-serif font-bold text-[#14251F]">
                  {selectedItemData?.title || "Care Plan & Follow-up"}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#68766F]">Milestone:</span>
                  <span className="font-bold text-[#14251F]">{selectedItemData?.title || "Recommended Checkup"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68766F]">Target Window:</span>
                  <span className="font-bold text-[#075B35]">{selectedItemData?.date || "Scheduled with Doctor"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68766F]">Supervising Clinician:</span>
                  <span className="font-semibold text-[#14251F]">{nextAppointment?.doctor?.name || "Consultant Clinician"}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-[#14251F] block mb-1">Doctor&apos;s Advice & Instructions:</span>
                <p className="text-[#68766F] leading-relaxed">
                  {selectedItemData?.description || "Review symptoms, monitor vitality indicators, and evaluate clinical response to prescribed management plan."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#F0F5F2]">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#14251F] font-semibold text-xs rounded-xl"
              >
                Close
              </button>
              <Link
                href="/patient/follow-ups"
                onClick={() => setActiveModal(null)}
                className="flex-1 text-center py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white font-semibold text-xs rounded-xl"
              >
                View Full Care Plan
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Consultation Summary */}
      {activeModal === "consultation_summary" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F5F2]">
              <div>
                <span className="text-xs font-bold text-[#075B35] uppercase tracking-wider">
                  Clinical Consultation Summary
                </span>
                <h3 className="text-lg font-serif font-bold text-[#14251F]">
                  {selectedItemData?.title || "Clinical Summary"}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-3 text-xs">
              <div className="p-3.5 bg-[#F8FAF9] rounded-xl border border-[#E4EEE7]">
                <span className="text-[#68766F] block text-[11px]">Consultation Record:</span>
                <p className="font-semibold text-[#14251F] text-sm mt-0.5">
                  {selectedItemData?.title || "Health Consultation"}
                </p>
                {selectedItemData?.date && (
                  <p className="text-[11px] text-[#68766F] mt-0.5">Date: {selectedItemData.date}</p>
                )}
              </div>

              <div>
                <span className="font-bold text-[#14251F] block mb-1">Clinical Notes & Diagnosis:</span>
                <p className="text-[#68766F] leading-relaxed">
                  {selectedItemData?.description || "Patient health consultation documented and finalized in EHR."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#F0F5F2]">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#14251F] font-semibold text-xs rounded-xl"
              >
                Close
              </button>
              <Link
                href="/patient/health-records"
                onClick={() => setActiveModal(null)}
                className="flex-1 text-center py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white font-semibold text-xs rounded-xl"
              >
                Open Health Records
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Doctor Profile */}
      {activeModal === "doctor_profile" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F5F2]">
              <h3 className="text-base font-serif font-bold text-[#14251F]">
                Consultant Profile
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-[#075B35]/20 mx-auto mb-3 shadow-md">
                <Image
                  src="/images/doctors/dr-harshali-sutar.webp"
                  alt="Dr. Harshali Sutar"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-lg font-bold text-[#14251F]">Dr. Harshali Sutar</h4>
              <p className="text-xs font-semibold text-[#075B35]">BHMS, MD (Homoeopathy)</p>
              <p className="text-xs text-[#68766F] mt-1">Senior Consultant Gynaecology & Women&apos;s Wellness</p>
              <div className="mt-4 p-3 bg-[#F8FAF9] rounded-xl border border-[#E4EEE7] text-left text-xs space-y-1.5 text-[#68766F]">
                <p><strong>Clinical Focus:</strong> PCOD/PCOS, Endocrine Balance, Pre-conception Care, Natural Menopause.</p>
                <p><strong>Experience:</strong> 12+ Years in Advanced Clinical Homoeopathy.</p>
                <p><strong>Languages:</strong> English, Hindi, Marathi.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-[#F0F5F2]">
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white font-semibold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
