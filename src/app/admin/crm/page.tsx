"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RoleGuard from "@/components/dashboard/RoleGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { CrmExactTab, CrmViewType } from "@/components/dashboard/admin/CrmExactTab";

function AdminCrmContent() {
  const searchParams = useSearchParams();
  const rawView = searchParams.get("view");
  const initialView = (rawView as CrmViewType) || "pipeline";

  const [notification, setNotification] = React.useState<{ message: string; isError?: boolean } | null>(null);

  const showNotification = (msg: string, isErr?: boolean) => {
    setNotification({ message: msg, isError: isErr });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <RoleGuard allowedRoles={["owner", "admin", "crm", "reception"]}>
      <DashboardShell
        role="admin"
        activeTab="crm"
        title="CRM &amp; Patient Pipeline"
      >
        {notification && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              notification.isError
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-emerald-50 text-[#154734] border-emerald-200"
            }`}
          >
            <span>{notification.message}</span>
          </div>
        )}
        <CrmExactTab
          initialView={initialView}
          showNotification={showNotification}
        />
      </DashboardShell>
    </RoleGuard>
  );
}

export default function AdminCrmPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[#68746D]">Loading CRM Pipeline Workspace...</div>}>
      <AdminCrmContent />
    </Suspense>
  );
}
