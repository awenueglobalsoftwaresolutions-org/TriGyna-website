"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

function ActivateAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [staffInfo, setStaffInfo] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setValid(false);
      setErrorMsg("No account activation token provided. Please check your invitation email.");
      return;
    }

    async function verify() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/v1";
        const res = await fetch(`${apiUrl}/auth/verify-activation-token?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (res.ok && json.success && json.data?.valid) {
          setValid(true);
          setStaffInfo(json.data.user);
        } else {
          setValid(false);
          setErrorMsg(json.message || json.error?.message || "Invalid or expired activation link.");
        }
      } catch (err) {
        setValid(false);
        setErrorMsg("Unable to communicate with the TriGyna server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!password || password.length < 8) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/v1";
      const res = await fetch(`${apiUrl}/auth/activate-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error?.message || "Activation failed.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Activation failed. Please contact administrator.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-[#154734] animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-600">Verifying secure activation token...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#154734] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#087F56]" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Account Activated!</h2>
          <p className="text-sm text-neutral-600 mb-6">
            Your credentials have been securely established. You can now sign in to your assigned TriGyna dashboard.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#154734] hover:bg-[#0f3426] text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm"
          >
            Sign In to Portal <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-red-200 shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Activation Link Invalid</h2>
          <p className="text-sm text-neutral-600 mb-6">
            {errorMsg || "This activation link is either expired, already used, or revoked."}
          </p>
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 mb-6 text-left">
            <p className="font-semibold text-neutral-800 mb-1">Need help?</p>
            <p>Please contact your TriGyna Administration team to request a new activation invitation link.</p>
            <p className="mt-2 text-neutral-500">Helpline: +91 917-277-2326 • care@trigyna.health</p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center text-sm font-semibold text-[#154734] hover:underline"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#154734] flex items-center justify-center text-white font-bold text-lg shadow-sm">
            T
          </div>
          <span className="text-2xl font-bold tracking-tight text-neutral-900">TriGyna</span>
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Staff Account Activation</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Set up your secure password to access your staff portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-neutral-200 sm:rounded-2xl sm:px-10">
          {staffInfo && (
            <div className="mb-6 p-4 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#154734] text-white flex items-center justify-center">
                  {staffInfo.role === "doctor" ? (
                    <Stethoscope className="w-5 h-5" />
                  ) : (
                    <TrendingUp className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-neutral-900">{staffInfo.name}</h3>
                  <p className="text-xs text-neutral-600">{staffInfo.email}</p>
                  <span className="inline-block mt-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#DCFCE7] text-[#154734]">
                    {staffInfo.role === "doctor" ? "Doctor / Physician" : "Sales Team"}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-emerald-800">
                {staffInfo.role === "doctor" ? (
                  <p>
                    <strong>Clinical Notice:</strong> TriGyna operates 100% online video consultations. Appointments will be enabled once medical council credentials are confirmed.
                  </p>
                ) : (
                  <p>
                    <strong>Sales CRM Notice:</strong> You will manage incoming website leads, coordinate consultations, and generate Razorpay payment links.
                  </p>
                )}
              </div>
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#154734] focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#154734] focus:border-transparent"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#154734] hover:bg-[#0f3426] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating Account...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Complete Activation & Set Password
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-neutral-500">
            Already activated?{" "}
            <Link href="/login" className="font-semibold text-[#154734] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#154734] animate-spin" />
        </div>
      }
    >
      <ActivateAccountContent />
    </Suspense>
  );
}
