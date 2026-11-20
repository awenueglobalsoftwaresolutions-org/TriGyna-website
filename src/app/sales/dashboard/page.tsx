"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { SalesDashboardShell } from "@/components/dashboard/sales/SalesDashboardShell";
import { SalesDashboardOverview } from "@/components/dashboard/sales/SalesDashboardOverview";
import { SalesPipelineTab } from "@/components/dashboard/sales/tabs/SalesPipelineTab";
import { SalesTasksTab } from "@/components/dashboard/sales/tabs/SalesTasksTab";
import { SalesAppointmentsTab } from "@/components/dashboard/sales/tabs/SalesAppointmentsTab";
import { SalesPatientsTab } from "@/components/dashboard/sales/tabs/SalesPatientsTab";
import { SalesPackagesTab } from "@/components/dashboard/sales/tabs/SalesPackagesTab";
import { SalesInvoicesTab } from "@/components/dashboard/sales/tabs/SalesInvoicesTab";
import { SalesWhatsAppTab } from "@/components/dashboard/sales/tabs/SalesWhatsAppTab";
import { SalesReportsTab } from "@/components/dashboard/sales/tabs/SalesReportsTab";
import { SalesTeamTab } from "@/components/dashboard/sales/tabs/SalesTeamTab";
import { SalesNotificationsTab } from "@/components/dashboard/sales/tabs/SalesNotificationsTab";
import { SalesSettingsTab } from "@/components/dashboard/sales/tabs/SalesSettingsTab";

function SalesDashboardContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(urlTab || "dashboard");

  // Search & Date Range filters from Top Bar
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("month");
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  // Toast Notifications
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);
  const showNotification = useCallback((message: string, isError = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 4500);
  }, []);

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  return (
    <RoleGuard allowedRoles={["owner", "admin", "crm", "sales"]}>
      <SalesDashboardShell
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (typeof window !== "undefined") {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("tab", tab);
            window.history.pushState({}, "", newUrl.toString());
          }
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateRange={dateRange}
        setDateRange={setDateRange}
        onOpenAddLeadModal={() => setIsAddLeadModalOpen(true)}
      >
        {/* Toast Notification Alert */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold border shadow-sm transition-all duration-300 animate-slide-down ${
              notification.isError
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-emerald-50 text-[#154734] border-emerald-200"
            }`}
          >
            {notification.isError ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#154734] shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* 1. Main Signature Dashboard View */}
        {activeTab === "dashboard" && (
          <SalesDashboardOverview
            showNotification={showNotification}
            dateRange={dateRange}
            searchQuery={searchQuery}
            onOpenAddLeadModal={() => setIsAddLeadModalOpen(true)}
            isAddLeadModalOpen={isAddLeadModalOpen}
            onCloseAddLeadModal={() => setIsAddLeadModalOpen(false)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* 2. Leads & Pipeline Tab */}
        {activeTab === "leads" && (
          <SalesPipelineTab
            showNotification={showNotification}
            onOpenAddLeadModal={() => setIsAddLeadModalOpen(true)}
          />
        )}

        {/* 3. My Tasks Tab */}
        {activeTab === "tasks" && (
          <SalesTasksTab
            mode="tasks"
            showNotification={showNotification}
          />
        )}

        {/* 4. Follow-ups Tab */}
        {activeTab === "followups" && (
          <SalesTasksTab
            mode="followups"
            showNotification={showNotification}
          />
        )}

        {/* 5. Appointments Tab */}
        {activeTab === "appointments" && (
          <SalesAppointmentsTab
            showNotification={showNotification}
          />
        )}

        {/* 6. Patients Tab */}
        {activeTab === "patients" && (
          <SalesPatientsTab
            showNotification={showNotification}
          />
        )}

        {/* 7. Healthcare Packages & Assisted Checkout Tab */}
        {activeTab === "packages" && (
          <SalesPackagesTab
            showNotification={showNotification}
          />
        )}

        {/* 8. Payments & Invoices Tab */}
        {activeTab === "invoices" && (
          <SalesInvoicesTab
            showNotification={showNotification}
          />
        )}

        {/* 9. WhatsApp & SMS Tab */}
        {activeTab === "whatsapp" && (
          <SalesWhatsAppTab />
        )}

        {/* 10. Reports Tab */}
        {activeTab === "reports" && (
          <SalesReportsTab />
        )}

        {/* 11. Team Tab */}
        {activeTab === "team" && (
          <SalesTeamTab showNotification={showNotification} />
        )}

        {/* 12. Notifications Tab */}
        {activeTab === "notifications" && (
          <SalesNotificationsTab
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* 13. Settings Tab */}
        {activeTab === "settings" && (
          <SalesSettingsTab />
        )}
      </SalesDashboardShell>
    </RoleGuard>
  );
}

export default function SalesDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-center">
          <Loader2 className="w-8 h-8 text-[#16A34A] animate-spin mb-3" />
          <p className="text-xs text-[#64748B]">Loading Sales &amp; CRM Workspace...</p>
        </div>
      }
    >
      <SalesDashboardContent />
    </Suspense>
  );
}
