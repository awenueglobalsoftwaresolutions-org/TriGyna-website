"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Laptop,
  Smartphone,
  LogOut,
  FileCheck,
  AlertTriangle,
  Download,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";

export default function PrivacySecurityPage() {
  const { user, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string; success: boolean } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMessage({ text: "New passwords do not match.", success: false });
      return;
    }

    if (newPassword.length < 8) {
      setPassMessage({ text: "Password must be at least 8 characters long.", success: false });
      return;
    }

    setChangingPass(true);
    setPassMessage(null);

    try {
      // Endpoint to update password
      const res = await api.patch("/patient/me/password", {
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setPassMessage({ text: "Your password has been changed successfully.", success: true });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPassMessage({
        text: err?.message || "Password update failed. Please verify your current password.",
        success: false,
      });
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-2 border-b border-[#E4EEE7]">
        <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
          Privacy & Account Security
        </h1>
        <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
          Manage your credentials, active login sessions, and data privacy rights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Change Password & Security Policies (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Password Reset Card */}
          <div className="bg-white rounded-3xl border border-[#E4EEE7] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0F5F2]">
              <div className="w-10 h-10 rounded-xl bg-[#EDF8F1] text-[#075B35] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#14251F]">Change Password</h3>
                <p className="text-xs text-[#68766F]">Ensure your account utilizes a strong password</p>
              </div>
            </div>

            {passMessage && (
              <div
                className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  passMessage.success
                    ? "bg-emerald-50 border-emerald-200 text-[#075B35]"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {passMessage.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{passMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#14251F] block mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#14251F] block mb-1">New Password (Min. 8 characters)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter strong new password"
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#14251F] block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-6 py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {changingPass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Privacy & Health Data Policy */}
          <div className="bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-3 text-xs">
            <h3 className="text-base font-serif font-bold text-[#14251F]">
              Health Data Retention & Privacy Rights
            </h3>
            <p className="text-[#68766F] leading-relaxed">
              TriGyna complies with applicable national healthcare retention mandates. Clinical prescriptions and consultation records are preserved according to ethical medical board guidelines.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/patient/support"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EDF8F1] text-[#075B35] rounded-lg font-semibold hover:bg-[#DCECE1] transition"
              >
                <span>Request Data Export / Portability</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Active Sessions & Consent History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Sessions Card */}
          <div className="bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-4">
            <h3 className="text-base font-serif font-bold text-[#14251F]">Active Device Sessions</h3>
            <p className="text-xs text-[#68766F]">
              Review authenticated logins associated with your patient account.
            </p>

            <div className="space-y-3 pt-1 text-xs">
              <div className="p-3.5 rounded-xl border border-[#C6E7D2] bg-[#F4FAF6] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-[#075B35]" />
                  <div>
                    <span className="font-bold text-[#14251F] block">Chrome on Windows (Current)</span>
                    <span className="text-[10px] text-[#68766F]">IP: 127.0.0.1 • Bengaluru, India</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#075B35] px-2 py-0.5 rounded-full bg-[#EDF8F1]">
                  Active Now
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-gray-500" />
                  <div>
                    <span className="font-bold text-[#14251F] block">TriGyna Mobile App • iOS</span>
                    <span className="text-[10px] text-[#68766F]">Last active: 2 days ago</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="w-full mt-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Everywhere</span>
            </button>
          </div>

          {/* Electronic Consent History */}
          <div className="bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-3 text-xs">
            <h3 className="text-base font-serif font-bold text-[#14251F]">Electronic Consent Log</h3>
            <div className="space-y-2 text-[#556960]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#075B35] shrink-0 mt-0.5" />
                <span>Tele-Homoeopathy Care & Posology Consent (Signed on Registration)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#075B35] shrink-0 mt-0.5" />
                <span>Digital EHR Medical Records Storage & Encryption Consent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
