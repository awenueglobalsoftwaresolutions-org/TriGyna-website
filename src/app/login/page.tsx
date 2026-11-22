"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Phone,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/authContext";
import { api } from "@/lib/api/client";
import { getCanonicalDashboardForRole } from "@/components/dashboard/RoleGuard";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await api.post<{ sent: boolean }>("/auth/forgot-password", {
        identifier: forgotIdentifier.trim(),
      });
      if (res.success) {
        setForgotSuccess(true);
      }
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Failed to request password reset link.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setError("Please enter your registered phone or email, and password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await login(cleanIdentifier, password);
      const role = res.user.role;

      // Safe redirect validation: must be a local relative path starting with "/" and not "//"
      if (
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//") &&
        !redirectParam.startsWith("/login")
      ) {
        router.push(redirectParam);
      } else {
        const canonicalDashboard = getCanonicalDashboardForRole(role);
        router.push(canonicalDashboard);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Invalid email/phone or password. Please verify your credentials.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F1] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block transition-transform hover:scale-105 duration-200">
          <div className="relative h-14 w-52 mx-auto mb-2">
            <Image
              src="/images/brand/logo.png"
              alt="TriGyna Healthcare"
              fill
              priority
              className="object-contain"
            />
          </div>
        </Link>
        <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-[#154734]">
          Healthcare Portal
        </h2>
        <p className="mt-1 text-xs text-[#626B63]">
          Secure clinical management, CRM, HRMS, and patient records
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-[#154734]/5 border border-[#E8E2D6] rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold text-[#17221D] mb-1.5 uppercase tracking-wider"
              >
                Phone Number or Email
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  {identifier.includes("@") ? (
                    <Mail className="h-4 w-4 text-[#154734]" />
                  ) : (
                    <Phone className="h-4 w-4 text-[#154734]" />
                  )}
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  data-testid="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. name@example.com or +91 9876543210"
                  required
                  autoFocus
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#154734] disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#17221D] uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotSuccess(false);
                    setForgotError(null);
                    setForgotIdentifier(identifier.trim());
                  }}
                  className="text-[11px] font-semibold text-[#154734] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4 text-[#154734]" />
                </div>
                <input
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  data-testid="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#154734] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#154734] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-button"
              data-testid="login-submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Healthcare Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E8E2D6]/60 flex items-center justify-between text-xs">
            <Link
              href="/"
              className="text-[#626B63] hover:text-[#154734] transition-colors flex items-center gap-1"
            >
              &larr; Return to TriGyna.in
            </Link>
            <div className="flex items-center gap-1 text-[#7B817B] text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#154734]" />
              <span>HIPAA &amp; EHR Aligned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-[#E2E9E3] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-[#14251F]">Reset Password</h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotSuccess ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-[#075B35] text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 mx-auto" />
                <p className="text-xs font-semibold">
                  If an account matches that email or phone, a password reset link has been dispatched.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-2 text-xs font-bold text-[#154734] underline cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <p className="text-xs text-[#68766F]">
                  Enter your registered email address or phone number to receive a secure password reset link.
                </p>

                {forgotError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {forgotError}
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="name@example.com or phone"
                    required
                    disabled={forgotLoading}
                    className="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2E9E3] rounded-xl text-xs text-[#14251F] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 focus:border-[#154734]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-1.5 bg-[#154734] hover:bg-[#0d3224] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send Reset Link</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9F7F1] flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-[#154734] animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
