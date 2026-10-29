"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Phone, Mail, Eye, EyeOff, AlertCircle, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/authContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your registered phone or email, and password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await login(identifier.trim(), password);
      const role = res.user.role;

      // Canonical redirection to role dashboards
      if (role === "owner" || role === "admin" || role === "crm" || role === "hrms" || role === "hr") {
        router.push("/admin/dashboard");
      } else if (role === "doctor") {
        router.push("/doctor/dashboard");
      } else if (role === "reception") {
        router.push("/reception/dashboard");
      } else if (role === "patient") {
        router.push("/patient/dashboard");
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed. Please check your credentials.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
    setIsLoading(true);

    try {
      const res = await login(id, pass);
      const role = res.user.role;

      if (role === "patient") {
        router.push("/patient/dashboard");
      } else if (role === "doctor") {
        router.push("/doctor/dashboard");
      } else if (role === "reception") {
        router.push("/reception/dashboard");
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed. Please check your credentials.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredentials = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
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
          {/* 1-Click Patient Quick Access Banner */}
          <div className="mb-6 p-3.5 bg-gradient-to-r from-[#EDF8F1] via-[#F4FAF6] to-[#FFF8EC] border-2 border-[#075B35]/30 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#075B35] animate-pulse"></span>
                <p className="text-[11px] font-bold text-[#075B35] uppercase tracking-wider">Patient Portal Demo</p>
              </div>
              <p className="text-xs text-[#14251F] font-bold truncate mt-0.5">Ananya Mishra (Case: TR-1001)</p>
              <p className="text-[10px] text-[#68766F] font-mono">patient@trigyna.test</p>
            </div>
            <button
              type="button"
              id="quick-patient-login-btn"
              data-testid="quick-login-patient"
              onClick={() => handleQuickLogin("patient@trigyna.test", "TriGyna@123")}
              disabled={isLoading}
              className="px-3.5 py-2 bg-[#075B35] hover:bg-[#064A2D] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>1-Click Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-xs font-semibold text-[#17221D] mb-1.5 uppercase tracking-wider">
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
                  autoComplete="username email"
                  data-testid="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. patient@trigyna.test or +91 9172772326"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#154734]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-[#17221D] uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-[#626B63]">
                  Case-sensitive
                </span>
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
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#17221D] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#154734]"
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

          {/* Quick Development Test Accounts */}
          <div className="mt-6 pt-5 border-t border-[#E8E2D6]/80">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-semibold text-[#626B63] uppercase tracking-wider">
                All Roles Quick Sign-In
              </p>
              <span className="text-[10px] text-[#8C928D] font-mono">1-Click</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { role: "Doctor", name: "Dr. Ananya Sharma", id: "ananya.sharma@trigyna.test", pass: "TriGyna@123", color: "hover:border-emerald-600 hover:bg-emerald-50/50 border-emerald-300 bg-emerald-50/20" },
                { role: "Doctor", name: "Dr. Harshali Sutar", id: "harshali.sutar@trigyna.test", pass: "TriGyna@123", color: "hover:border-blue-600 hover:bg-blue-50/50" },
                { role: "Patient", name: "Ananya Mishra", id: "patient@trigyna.test", pass: "TriGyna@123", color: "hover:border-rose-500 hover:bg-rose-50/50 border-rose-200 bg-rose-50/20" },
                { role: "Admin", name: "Sushil Kumar", id: "admin@trigyna.test", pass: "TriGyna@123", color: "hover:border-emerald-600 hover:bg-emerald-50/50" },
                { role: "Reception", name: "Rahul Gupta", id: "reception@trigyna.test", pass: "TriGyna@123", color: "hover:border-teal-600 hover:bg-teal-50/50" },
                { role: "CRM", name: "Priya Verma", id: "crm@trigyna.test", pass: "TriGyna@123", color: "hover:border-purple-600 hover:bg-purple-50/50" },
              ].map((acc) => (
                <div
                  key={acc.id}
                  className={`p-2.5 bg-[#F9F7F1] border border-[#E8E2D6] rounded-xl text-left transition-all flex flex-col justify-between ${acc.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#154734] text-[11px]">{acc.role}</span>
                      <button
                        type="button"
                        onClick={() => fillQuickCredentials(acc.id, acc.pass)}
                        className="text-[9px] text-[#556960] hover:text-[#154734] bg-white px-1.5 py-0.5 rounded border border-[#E8E2D6] cursor-pointer"
                        title="Fill inputs only"
                      >
                        Fill
                      </button>
                    </div>
                    <p className="text-[11px] text-[#17221D] font-medium truncate mt-0.5">{acc.name}</p>
                    <p className="text-[9px] text-[#626B63] truncate font-mono">{acc.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin(acc.id, acc.pass)}
                    disabled={isLoading}
                    className="mt-2 w-full py-1 px-2 bg-white hover:bg-[#154734] text-[#154734] hover:text-white border border-[#154734]/30 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer shadow-2xs"
                  >
                    Login as {acc.role}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2.5 p-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-emerald-900 text-[11px]">Owner / SuperAdmin</p>
                <p className="text-[10px] text-emerald-700 font-mono">+91 9172772326</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fillQuickCredentials("+919172772326", "TriGyna@2326")}
                  className="px-2 py-1 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-[10px] font-semibold hover:bg-emerald-100/50 cursor-pointer transition-colors"
                >
                  Fill
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("+919172772326", "TriGyna@2326")}
                  disabled={isLoading}
                  className="px-2.5 py-1 bg-emerald-800 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-900 cursor-pointer transition-colors shadow-2xs"
                >
                  Instant Login
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E8E2D6]/60 flex items-center justify-between text-xs">
            <Link
              href="/"
              className="text-[#626B63] hover:text-[#154734] transition-colors flex items-center gap-1"
            >
              &larr; Return to TriGyna.com
            </Link>
            <div className="flex items-center gap-1 text-[#7B817B] text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#154734]" />
              <span>HIPAA &amp; EHR Aligned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
