"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogOut, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth/authContext";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  pageTitle?: string;
}

export function getCanonicalDashboardForRole(role?: string): string {
  if (!role) return "/login";
  if (role === "owner" || role === "admin" || role === "crm" || role === "hrms" || role === "hr") {
    return "/admin/dashboard";
  }
  if (role === "doctor") {
    return "/doctor/dashboard";
  }
  if (role === "reception") {
    return "/reception/dashboard";
  }
  if (role === "patient") {
    return "/patient/dashboard";
  }
  return "/login";
}

export default function RoleGuard({ allowedRoles, children, pageTitle = "Dashboard" }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || "/")}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F7F1] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-[#E8E2D6] flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-[#154734] animate-spin" />
        </div>
        <h2 className="text-lg font-serif font-bold text-[#154734]">Verifying Security Credentials</h2>
        <p className="text-xs text-[#626B63] mt-1">Enforcing zero-trust server-side authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Check authorization
  // Admin and owner satisfy admin / owner / crm / hrms checks
  const isOwner = user.role === "owner";
  const isAdmin = user.role === "admin" || isOwner;
  const isAuthorized =
    allowedRoles.includes(user.role) ||
    (isAdmin && (allowedRoles.includes("admin") || allowedRoles.includes("owner") || allowedRoles.includes("crm") || allowedRoles.includes("hrms")));

  if (!isAuthorized) {
    const userRoleDisplay = user.role.toUpperCase();
    const authorizedRolesDisplay = allowedRoles.map((r) => r.toUpperCase()).join(", ");
    const myDashboardUrl = getCanonicalDashboardForRole(user.role);

    return (
      <div className="min-h-screen bg-[#F9F7F1] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-red-200 shadow-xl rounded-3xl p-6 sm:p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>403 Access Forbidden</span>
          </div>

          <h1 className="text-2xl font-serif font-bold text-[#17221D] mb-2">
            Access Restricted
          </h1>

          <p className="text-xs sm:text-sm text-[#626B63] leading-relaxed mb-6">
            You are logged in as <span className="font-bold text-[#17221D] bg-gray-100 px-2 py-0.5 rounded">{userRoleDisplay}</span> ({user.name}), but this section requires authorization for:{" "}
            <span className="font-semibold text-red-700">{authorizedRolesDisplay}</span>.
          </p>

          <div className="space-y-3">
            <Link
              href={myDashboardUrl}
              className="w-full py-3 px-4 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to My {userRoleDisplay} Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="w-full py-2.5 px-4 rounded-xl border border-[#E8E2D6] bg-[#F9F7F1] hover:bg-white text-xs sm:text-sm font-medium text-[#626B63] hover:text-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out &amp; Switch Account</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E8E2D6]/80 flex items-center justify-center gap-1.5 text-[11px] text-[#8C928D]">
            <span>TriGyna EHR Security Guard</span>
            <span>&bull;</span>
            <Link href="/" className="hover:text-[#154734] transition-colors">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
