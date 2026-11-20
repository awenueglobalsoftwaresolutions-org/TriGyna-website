"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  HeartPulse,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { PatientRecord } from "./PatientDetailPanel";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface RegisterPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient: PatientRecord) => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function RegisterPatientModal({
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: RegisterPatientModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    gender: "female" as "female" | "male" | "other",
    dateOfBirth: "",
    age: 28,
    phone: "",
    email: "",
    address: "",
    city: "Mumbai",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "Spouse",
    bloodGroup: "B+",
    clinicalFocus: "PCOS Care",
    medicalHistory: "",
    allergies: "None reported",
    consentGiven: true,
  });

  // Auto calculate age from date of birth
  useEffect(() => {
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const diff = Date.now() - dob.getTime();
      const calculatedAge = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
      if (calculatedAge > 0 && calculatedAge < 120) {
        setFormData((prev) => ({ ...prev, age: calculatedAge }));
      }
    }
  }, [formData.dateOfBirth]);

  if (!isOpen) return null;

  // Duplicate Check on phone change when leaving step 2
  const checkDuplicates = async () => {
    if (!formData.phone.trim()) return;
    setIsCheckingDuplicates(true);
    setDuplicateWarning(null);
    try {
      const res = await api.post<{ hasDuplicates: boolean; matchCount: number; matches: any[] }>(
        "/patients/duplicate-check",
        { phone: formData.phone.trim(), email: formData.email.trim(), fullName: formData.fullName.trim() }
      );
      if (res.data?.hasDuplicates) {
        const match = res.data.matches[0];
        setDuplicateWarning(
          `Attention: A patient record with matching contact details already exists (${match.patient.fullName} - ${match.patient.patientCode}). You can proceed if this is an authorized family profile.`
        );
      }
    } catch {
      // Continue safely
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!formData.fullName.trim()) {
        showNotification("Please provide the patient full name", true);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.phone.trim()) {
        showNotification("Primary phone number is required", true);
        return;
      }
      await checkDuplicates();
      setCurrentStep(3);
    } else if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      showNotification("Patient Name and Phone are required", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const historyComposite = `${formData.clinicalFocus} | ${formData.medicalHistory || "General Consultation"}`;
      const payload: Record<string, unknown> = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || undefined,
        age: Number(formData.age),
        address: `${formData.address.trim()}${formData.city ? `, ${formData.city.trim()}` : ""}`,
        bloodGroup: formData.bloodGroup,
        medicalHistory: historyComposite,
        allergies: formData.allergies.trim() && formData.allergies !== "None reported" ? [formData.allergies.trim()] : [],
      };

      if (formData.emergencyContactName.trim() || formData.emergencyContactPhone.trim()) {
        payload.emergencyContact = {
          name: formData.emergencyContactName.trim(),
          phone: formData.emergencyContactPhone.trim(),
          relationship: formData.emergencyContactRelation,
        };
      }

      const res = await api.post<{ patient: PatientRecord }>("/patients", payload);
      if (res.success && res.data?.patient) {
        showNotification(`Patient ${res.data.patient.fullName} (${res.data.patient.patientCode}) registered successfully`);
        onSuccess(res.data.patient);
        onClose();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to register patient", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAF0] px-6 py-4 bg-[#F8FAFC]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[#087A50] text-[10px] font-bold uppercase border border-emerald-100">
              <HeartPulse className="w-3 h-3" />
              <span>Step {currentStep} of 5</span>
            </div>
            <h3 className="font-sans font-bold text-base text-[#111827] mt-1">Register New Patient</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-100 w-full">
          <div
            className="h-full bg-[#087A50] transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* STEP 1: Personal Demographics */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <span className="text-[11px] font-bold text-[#087A50] uppercase tracking-wider block border-b border-[#E5EAF0] pb-1">
                1. Personal Demographics
              </span>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alka Singh"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:ring-1 focus:ring-[#087A50] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as "female" | "male" | "other" })}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none focus:border-[#087A50]"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Age *</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Date of Birth (Optional)</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Contact Information */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <span className="text-[11px] font-bold text-[#087A50] uppercase tracking-wider block border-b border-[#E5EAF0] pb-1">
                2. Contact Information
              </span>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Primary Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43224"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="alka.s@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Street / Apartment / Sector"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Emergency Contact */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <span className="text-[11px] font-bold text-[#087A50] uppercase tracking-wider block border-b border-[#E5EAF0] pb-1">
                3. Emergency Contact (Next of Kin)
              </span>

              {duplicateWarning && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-[11px] leading-relaxed">{duplicateWarning}</p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Contact Person Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vikram Singh"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    placeholder="9876500015"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Relationship</label>
                  <select
                    value={formData.emergencyContactRelation}
                    onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Clinical Intake */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <span className="text-[11px] font-bold text-[#087A50] uppercase tracking-wider block border-b border-[#E5EAF0] pb-1">
                4. Clinical Intake &amp; Medical History
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none focus:border-[#087A50] font-mono"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Clinical Focus Area</label>
                  <select
                    value={formData.clinicalFocus}
                    onChange={(e) => setFormData({ ...formData, clinicalFocus: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none focus:border-[#087A50]"
                  >
                    <option value="General Consultation">General Consultation</option>
                    <option value="PCOS Care">PCOS Care</option>
                    <option value="Fertility Care">Fertility Care</option>
                    <option value="Menopause Care">Menopause Care</option>
                    <option value="Skin & Hair">Skin &amp; Hair</option>
                    <option value="Diet & Nutrition">Diet &amp; Nutrition</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Chief Health Concerns</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Hormonal imbalance, irregular cycles, constitutional fatigue..."
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Known Allergies / Drug Sensitivities</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Pollen, or 'None reported'"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 5: Review & Consent */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <span className="text-[11px] font-bold text-[#087A50] uppercase tracking-wider block border-b border-[#E5EAF0] pb-1">
                5. Review Demographics &amp; Patient Consent
              </span>

              <div className="bg-[#F8FAFC] rounded-xl border border-[#E5EAF0] p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Name &amp; Age:</span>
                  <span className="font-semibold text-[#111827]">{formData.fullName} ({formData.gender}, {formData.age} Yrs)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Phone:</span>
                  <span className="font-mono font-semibold text-[#111827]">{formData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Blood Group:</span>
                  <span className="font-mono font-bold text-rose-700">{formData.bloodGroup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Clinical Focus:</span>
                  <span className="font-semibold text-[#087A50]">{formData.clinicalFocus}</span>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer p-3 rounded-xl border border-emerald-100 bg-emerald-50/50">
                <input
                  type="checkbox"
                  checked={formData.consentGiven}
                  onChange={(e) => setFormData({ ...formData, consentGiven: e.target.checked })}
                  className="rounded text-[#087A50] focus:ring-[#087A50] mt-0.5"
                />
                <span className="text-[11px] text-[#087A50] leading-snug">
                  Patient or legal guardian has provided informed consent for digital electronic health record storage under HIPAA and NDHM compliance protocols.
                </span>
              </label>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5EAF0]">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center gap-1 px-3.5 py-2 border border-[#E5EAF0] rounded-xl text-[#64748B] hover:bg-gray-50 cursor-pointer font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-[#64748B] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isCheckingDuplicates}
                  className="flex items-center gap-1 px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
                >
                  <span>{isCheckingDuplicates ? "Checking..." : "Continue"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.consentGiven}
                  className="px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Register</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}

