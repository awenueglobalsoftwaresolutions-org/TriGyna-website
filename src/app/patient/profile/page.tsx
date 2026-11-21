"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Heart,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";

interface PatientProfile {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  email: string;
  gender: string;
  age?: number;
  dateOfBirth?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string[];
  medicalHistory?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  isVerified?: boolean;
}

export default function PatientProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable fields
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRel, setEmergencyRel] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ patient: PatientProfile }>("/patient/me");
      if (res.success && res.data?.patient) {
        const p = res.data.patient;
        setProfile(p);
        setAddress(p.address || "");
        setBloodGroup(p.bloodGroup || "");
        setAllergiesText((p.allergies || []).join(", "));
        setMedicalHistory(p.medicalHistory || "");
        setEmergencyName(p.emergencyContact?.name || "");
        setEmergencyPhone(p.emergencyContact?.phone || "");
        setEmergencyRel(p.emergencyContact?.relationship || "");
      }
    } catch (err: any) {
      setErrorMessage("Failed to load patient profile data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const allergies = allergiesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const res = await api.patch("/patient/me", {
        address,
        bloodGroup,
        allergies,
        medicalHistory,
        emergencyContact: {
          name: emergencyName,
          phone: emergencyPhone,
          relationship: emergencyRel,
        },
      });

      if (res.success) {
        setSuccessMessage("Profile information updated successfully.");
        fetchProfile();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update profile details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4EEE7]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
            Patient Demographics & Profile
          </h1>
          <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
            Manage your verified contact coordinates, emergency contacts, and allergies
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#68766F] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#075B35] animate-spin mb-2" />
          <p className="text-xs">Loading verified patient chart...</p>
        </div>
      ) : !profile ? (
        <div className="p-8 text-center text-xs text-red-600">Patient chart could not be loaded.</div>
      ) : (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-[#075B35] font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Top Identity Card */}
          <div className="bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#DCECE1] bg-[#EDF8F1] flex items-center justify-center shrink-0">
                <Image
                  src="/images/testimonials/patient-1.webp"
                  alt={profile.fullName}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#14251F]">{profile.fullName}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#EDF8F1] text-[#075B35] rounded-full text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Patient
                  </span>
                </div>
                <p className="text-xs text-[#68766F] font-mono mt-0.5">
                  Universal Patient / Case ID:{" "}
                  <strong className="text-[#075B35] font-bold">{profile.patientCode}</strong>
                </p>
                <p className="text-[11px] text-[#8C9892] mt-0.5">
                  {profile.gender?.toUpperCase()} • Age {profile.age || 28} • DOB: {profile.dateOfBirth || "14 May 1998"}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Case ID & Demographics are protected by clinical integrity policies.</span>
            </div>
          </div>

          {/* Permitted Profile Edit Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Health Tags & Emergency Contact */}
            <div className="bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-4">
              <h3 className="text-base font-serif font-bold text-[#14251F]">
                Clinical Attributes & Allergies
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-[#14251F] block mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#14251F] block mb-1">Registered Phone</label>
                  <input
                    type="text"
                    value={profile.phone}
                    disabled
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#14251F] block mb-1">
                  Known Allergies (comma separated)
                </label>
                <input
                  type="text"
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, Dust Mites"
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F] text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#14251F] block mb-1">Medical Background Summary</label>
                <textarea
                  rows={3}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="e.g. Diagnosed with PCOS in 2024, occasional migraine"
                  className="w-full p-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F] text-xs"
                />
              </div>
            </div>

            {/* Right: Emergency Contact & Residential Address */}
            <div className="bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-4">
              <h3 className="text-base font-serif font-bold text-[#14251F]">
                Address & Emergency Contact
              </h3>

              <div>
                <label className="font-bold text-[#14251F] block mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full street address and city..."
                  className="w-full p-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F] text-xs"
                />
              </div>

              <div className="pt-2 border-t border-[#F0F5F2] space-y-3">
                <span className="font-bold text-xs text-[#075B35] uppercase tracking-wider block">
                  Designated Emergency Contact
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="e.g. Vikram Mishra"
                      className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Relationship</label>
                    <input
                      type="text"
                      value={emergencyRel}
                      onChange={(e) => setEmergencyRel(e.target.value)}
                      placeholder="e.g. Spouse / Sibling"
                      className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="font-semibold text-gray-700 block mb-1">Emergency Phone Number</label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#075B35] hover:bg-[#064A2D] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Updates</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
