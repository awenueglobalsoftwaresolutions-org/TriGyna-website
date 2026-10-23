"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PortalAdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#154734] mb-3" />
      <p className="text-sm font-semibold text-[#154734]">Redirecting to Admin Dashboard...</p>
    </div>
  );
}
