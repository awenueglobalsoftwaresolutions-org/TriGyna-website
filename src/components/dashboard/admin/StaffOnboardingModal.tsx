"use client";

import React, { useState } from "react";
import {
  X,
  Stethoscope,
  TrendingUp,
  ShieldCheck,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Sparkles,
  Info,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface StaffOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultRole?: "doctor" | "sales";
}

export default function StaffOnboardingModal({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = "doctor",
}: StaffOnboardingModalProps) {
  const [role, setRole] = useState<"doctor" | "sales">(defaultRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");

  // Doctor Specific
  const [qualifications, setQualifications] = useState("BHMS, MD (Homoeopathy)");
  const [specialization, setSpecialization] = useState("Homoeopathy, Women's Health");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationCouncil, setRegistrationCouncil] = useState("National Medical Commission");
  const [experienceYears, setExperienceYears] = useState("7+ Years");
  const [consultationFee, setConsultationFee] = useState(700);
  const [isVerified, setIsVerified] = useState(false);

  // Sales Specific
  const [salesRole, setSalesRole] = useState("Senior Sales Executive");
  const [monthlyTarget, setMonthlyTarget] = useState(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdData, setCreatedData] = useState<{
    employeeCode: string;
    activationUrl: string;
    emailStatus: string;
    whatsappStatus: string;
    role: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and phone number are required.");
      return;
    }

    if (role === "doctor" && !registrationNumber.trim()) {
      setError("Doctor's professional medical council registration number is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        role,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        designation: designation.trim() || undefined,
        employeeCode: employeeCode.trim() || undefined,
      };

      if (role === "doctor") {
        payload.qualifications = qualifications.trim();
        payload.specialization = specialization.split(",").map((s) => s.trim()).filter(Boolean);
        payload.registrationNumber = registrationNumber.trim();
        payload.registrationCouncil = registrationCouncil.trim();
        payload.experienceYears = experienceYears.trim();
        payload.consultationFee = Number(consultationFee);
        payload.isVerified = isVerified;
      } else {
        payload.salesRole = salesRole;
        payload.monthlyTarget = Number(monthlyTarget);
      }

      const res = await api.post<{
        employee: { employeeCode: string };
        invitation: { activationUrl: string };
        onboarding: { emailStatus: string; whatsappStatus: string };
      }>("/admin/staff/onboard", payload);

      if (res.success && res.data) {
        setCreatedData({
          employeeCode: res.data.employee.employeeCode,
          activationUrl: res.data.invitation.activationUrl,
          emailStatus: res.data.onboarding.emailStatus,
          whatsappStatus: res.data.onboarding.whatsappStatus,
          role,
        });
        if (onSuccess) onSuccess();
      } else {
        throw new Error(res.message || "Failed to onboard staff member.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to onboard staff member.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyActivationLink = () => {
    if (createdData?.activationUrl) {
      navigator.clipboard.writeText(createdData.activationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Admin Staff Onboarding</h2>
              <p className="text-xs text-neutral-500">
                Centralized onboarding for Doctors and Sales with secure activation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {createdData ? (
            <div className="text-center py-6 space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#087F56] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">
                  {createdData.role === "doctor" ? "Doctor" : "Sales Team Member"} Successfully Onboarded!
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Employee ID: <span className="font-mono font-bold text-[#154734]">{createdData.employeeCode}</span>
                </p>
              </div>

              {/* Status pills */}
              <div className="flex items-center justify-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                    createdData.emailStatus === "sent"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email Invitation: {createdData.emailStatus.toUpperCase()}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                    ["sent", "accepted", "delivered"].includes(createdData.whatsappStatus)
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" /> WhatsApp Alert: {createdData.whatsappStatus.toUpperCase()}
                </span>
              </div>

              <div className="bg-[#F8FAFC] border border-neutral-200 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                    Direct Activation Link (One-Time Use)
                  </span>
                  <button
                    onClick={copyActivationLink}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#154734] hover:underline"
                  >
                    <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
                <p className="text-xs font-mono text-neutral-600 truncate bg-white p-2 rounded border border-neutral-200">
                  {createdData.activationUrl}
                </p>
                <p className="text-[11px] text-neutral-500">
                  The employee will set their own login password via this link. No plaintext password is ever sent.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full bg-[#154734] hover:bg-[#0f3426] text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
                >
                  Close &amp; View in Directory
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Role Selector Tabs */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Select Staff Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("doctor")}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                      role === "doctor"
                        ? "border-[#154734] bg-[#F0FDF4] text-[#154734] ring-2 ring-[#154734]/10 shadow-sm"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 text-[#154734]" />
                    <span>Doctor / Physician</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("sales")}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                      role === "sales"
                        ? "border-[#154734] bg-[#F0FDF4] text-[#154734] ring-2 ring-[#154734]/10 shadow-sm"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-[#087F56]" />
                    <span>Sales Team Member</span>
                  </button>
                </div>
              </div>

              {/* Common Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === "doctor" ? "e.g. Dr. Priya Sen" : "e.g. Amit Sharma"}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Work Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="official.email@trigyna.health"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder={role === "doctor" ? "Consultant Physician" : "Sales Specialist"}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                  />
                </div>
              </div>

              {/* Consultation Mode Note */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-2 text-xs text-neutral-700">
                <Info className="w-4 h-4 text-[#154734] flex-shrink-0" />
                <span>
                  <strong>Consultation Mode:</strong> 100% Online Video (Google Meet / Zoom). Physical clinic options have been decommissioned.
                </span>
              </div>

              {/* Role-Specific Fields */}
              {role === "doctor" ? (
                <div className="space-y-4 pt-2 border-t border-neutral-100">
                  <h4 className="text-xs font-bold text-[#154734] uppercase tracking-wider">
                    Doctor Clinical Credentials &amp; Verification
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Medical Registration No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        placeholder="e.g. MCI-2018-0921"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Registration Council
                      </label>
                      <input
                        type="text"
                        value={registrationCouncil}
                        onChange={(e) => setRegistrationCouncil(e.target.value)}
                        placeholder="National Medical Commission / State Council"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Qualifications
                      </label>
                      <input
                        type="text"
                        value={qualifications}
                        onChange={(e) => setQualifications(e.target.value)}
                        placeholder="BHMS, MD (Homoeopathy)"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Online Consultation Fee (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                      />
                    </div>
                  </div>

                  {/* Immediate Credential Verification Checkbox */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                    <input
                      type="checkbox"
                      id="isVerifiedDoctor"
                      checked={isVerified}
                      onChange={(e) => setIsVerified(e.target.checked)}
                      className="mt-0.5 rounded text-[#154734] focus:ring-[#154734]"
                    />
                    <label htmlFor="isVerifiedDoctor" className="text-xs text-amber-900 cursor-pointer">
                      <span className="font-semibold">Verify Medical Registration Credentials Immediately</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        If left unchecked, doctor account is created with <em>Pending Verification</em> status and clinical appointment slots will remain disabled until verified by Admin.
                      </p>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2 border-t border-neutral-100">
                  <h4 className="text-xs font-bold text-[#154734] uppercase tracking-wider">
                    Sales CRM &amp; Target Configuration
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Sales Role
                      </label>
                      <select
                        value={salesRole}
                        onChange={(e) => setSalesRole(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                      >
                        <option value="Sales Executive">Sales Executive</option>
                        <option value="Senior Sales Executive">Senior Sales Executive</option>
                        <option value="Sales Manager">Sales Manager</option>
                        <option value="Team Lead">Team Lead</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Monthly Conversion Target
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={monthlyTarget}
                        onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-[#154734] hover:bg-[#0f3426] disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Account &amp; Sending Activation...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                      Complete Staff Onboarding
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
