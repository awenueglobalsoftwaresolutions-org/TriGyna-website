"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api/client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMessage("No verification token was provided in the link. Please check your verification email.");
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await api.post<{ verified: boolean; user?: { email: string; name: string } }>(
          "/email/verification/confirm",
          { token }
        );

        if (!isMounted) return;

        if (res.success && res.data?.verified) {
          setSuccess(true);
          setVerifiedEmail(res.data.user?.email || null);
        } else {
          setErrorMessage(res.message || "Email verification failed or link has expired.");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setErrorMessage(err instanceof Error ? err.message : "Invalid or expired email verification link.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E9E3] p-8 shadow-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-2xs">
          {loading ? (
            <div className="bg-[#EAF2ED] text-[#154734] w-full h-full rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : success ? (
            <div className="bg-emerald-100 text-[#075B35] w-full h-full rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : (
            <div className="bg-rose-100 text-rose-700 w-full h-full rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
          )}
        </div>

        {loading && (
          <div>
            <h1 className="text-xl font-serif font-bold text-[#14251F]">Verifying Email Address</h1>
            <p className="text-xs text-[#68766F] mt-2">
              Validating your secure cryptographic verification token with TriGyna platform...
            </p>
          </div>
        )}

        {!loading && success && (
          <div className="space-y-4">
            <h1 className="text-2xl font-serif font-bold text-[#14251F]">Email Address Verified</h1>
            <p className="text-xs text-[#556960] leading-relaxed">
              {verifiedEmail ? (
                <>Your registered email (<strong>{verifiedEmail}</strong>) has been securely verified.</>
              ) : (
                "Your email address has been verified successfully."
              )}
            </p>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-[#075B35] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Confidential medical notifications and receipts are now enabled.</span>
            </div>
            <div className="pt-2">
              <Link
                href="/patient/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#154734] hover:bg-[#0d3224] text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <span>Proceed to Patient Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {!loading && !success && (
          <div className="space-y-4">
            <h1 className="text-xl font-serif font-bold text-[#14251F]">Verification Link Expired</h1>
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 leading-relaxed">
              {errorMessage || "The verification link is invalid, has expired, or has already been used."}
            </p>
            <p className="text-xs text-[#68766F]">
              Verification links expire after 24 hours to protect your security. You can log in and request a new link from your notification settings.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#154734] hover:bg-[#0d3224] text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <span>Log In to Your Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 text-[#154734] animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
