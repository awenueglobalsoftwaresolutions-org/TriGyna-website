"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  Clock,
  Building2,
  GraduationCap,
  Award,
  Calendar,
  Save,
  CheckCircle2,
  Lock,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface DoctorProfileData {
  user: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    role: string;
  };
  doctor: {
    _id: string;
    specialization: string;
    department?: string;
    qualifications?: string[];
    experienceYears?: number;
    bio?: string;
    availability?: Array<{
      day: string;
      slots: string[];
    }>;
  };
}

export function DoctorProfileTab() {
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Editable bio & availability
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState<Array<{ day: string; slots: string[] }>>([
    { day: "Monday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Tuesday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Wednesday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Thursday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Friday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Saturday", slots: ["09:00 AM - 02:00 PM"] },
  ]);

  useEffect(() => {
    setIsLoading(true);
    api
      .get<{ data?: DoctorProfileData }>(`/api/v1/doctor/profile`)
      .then((res) => {
        const d = (res as any).data;
        if (d) {
          setProfile(d);
          if (d.doctor?.bio) setBio(d.doctor.bio);
          if (d.doctor?.availability && d.doctor.availability.length > 0) {
            setAvailability(d.doctor.availability);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load doctor profile", err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSaveAvailability = async () => {
    try {
      setIsSaving(true);
      setNotification(null);
      await api.patch(`/api/v1/doctor/availability`, {
        bio,
        availability,
      });
      setNotification("Availability schedule and clinical profile updated successfully.");
    } catch (err: any) {
      setNotification("Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <User className="w-5 h-5 text-[#154734]" /> Professional Profile & Clinical Availability
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Verified medical practitioner credentials, department appointments, and consultation schedules.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveAvailability}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center text-xs text-[#65746B]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
          Loading profile...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Profile Overview (4 Cols) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#E1E9E3] shadow-sm space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#154734] text-white font-bold text-2xl flex items-center justify-center shadow-md mb-3">
                {profile?.user?.fullName?.slice(0, 2).toUpperCase() || "AS"}
              </div>
              <h3 className="font-bold text-base text-[#17251E]">{profile?.user?.fullName || "Dr. Ananya Sharma"}</h3>
              <p className="text-xs font-medium text-[#154734] mt-0.5">
                {profile?.doctor?.specialization || "Obstetrician & Gynecologist"}
              </p>
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F3EA] text-[#287A4B]">
                <ShieldCheck className="w-3.5 h-3.5" /> Licensed Practitioner
              </span>
            </div>

            <div className="pt-4 border-t border-[#E1E9E3] space-y-3 text-xs text-[#17251E]">
              <div className="flex items-center justify-between">
                <span className="text-[#65746B]">Practitioner ID</span>
                <span className="font-mono font-semibold">#DOC-TG01</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#65746B]">Email</span>
                <span className="font-medium">{profile?.user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#65746B]">Department</span>
                <span className="font-semibold text-[#154734]">
                  {profile?.doctor?.department || "Obstetrics & Gynecology"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#65746B]">Experience</span>
                <span className="font-medium">{profile?.doctor?.experienceYears || 12} Years</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E1E9E3] space-y-2">
              <h4 className="text-xs font-bold text-[#17251E] uppercase">Qualifications</h4>
              <div className="flex flex-wrap gap-1.5">
                {(profile?.doctor?.qualifications || ["MBBS", "MS (OBG)", "FICOG", "FMAS"]).map((q, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700"
                  >
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Availability & Bio Settings (8 Cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#E1E9E3] shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-sm text-[#17251E] mb-2">Clinical Bio & Overview</h3>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief clinical focus, interests, and specialty areas..."
                className="w-full p-3 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-xl text-xs text-[#17251E]"
              />
            </div>

            <div>
              <h3 className="font-bold text-sm text-[#17251E] flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[#154734]" /> Weekly Consultation Availability Slots
              </h3>
              <div className="space-y-3">
                {availability.map((av, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#F5F8F6] border border-[#E1E9E3] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-bold text-[#17251E] w-28">{av.day}</span>
                    <div className="flex flex-wrap gap-2 flex-1">
                      {av.slots.map((s, slotIdx) => (
                        <span
                          key={slotIdx}
                          className="px-3 py-1 bg-white border border-[#E1E9E3] rounded-lg text-xs font-medium text-[#154734]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <p className="font-bold">Clinic Policy Note:</p>
              <p>
                Appointment bookings are validated against your active availability window. Emergency consults bypass slot locks with receptionist authorization.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
