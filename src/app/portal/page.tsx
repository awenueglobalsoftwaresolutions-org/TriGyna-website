"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { Loader2 } from "lucide-react";

export default function PortalRedirectPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const role = user.role?.toLowerCase();
    if (role === "doctor") {
      router.replace("/doctor/dashboard");
    } else if (role === "reception") {
      router.replace("/reception/dashboard");
    } else if (role === "patient") {
      router.replace("/patient/dashboard");
    } else {
      router.replace("/admin/dashboard");
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#154734] mb-3" />
      <p className="text-sm font-semibold text-[#154734]">Redirecting to your canonical dashboard...</p>
      <p className="text-xs text-[#758277] mt-1">Please wait while your verified clinical session is loaded.</p>
    </div>
  );
}
