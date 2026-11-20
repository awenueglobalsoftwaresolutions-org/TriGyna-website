"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DoctorSidebar, DoctorTab } from "@/components/dashboard/doctor/DoctorSidebar";
import { DoctorHeader } from "@/components/dashboard/doctor/DoctorHeader";
import { DoctorOverviewTab, DashboardSummary } from "@/components/dashboard/doctor/DoctorOverviewTab";
import { DoctorAppointmentsTab } from "@/components/dashboard/doctor/DoctorAppointmentsTab";
import { DoctorPatientsTab } from "@/components/dashboard/doctor/DoctorPatientsTab";
import { DoctorConsultationsTab } from "@/components/dashboard/doctor/DoctorConsultationsTab";
import { DoctorPrescriptionsTab } from "@/components/dashboard/doctor/DoctorPrescriptionsTab";
import { DoctorFollowUpsTab } from "@/components/dashboard/doctor/DoctorFollowUpsTab";
import { DoctorCommunicationsTab } from "@/components/dashboard/doctor/DoctorCommunicationsTab";
import { DoctorMedicalHistoryTab } from "@/components/dashboard/doctor/DoctorMedicalHistoryTab";
import { DoctorReportsTab } from "@/components/dashboard/doctor/DoctorReportsTab";
import { DoctorBillingTab } from "@/components/dashboard/doctor/DoctorBillingTab";
import { DoctorNotificationsTab } from "@/components/dashboard/doctor/DoctorNotificationsTab";
import { DoctorProfileTab } from "@/components/dashboard/doctor/DoctorProfileTab";
import { ConsultationModal } from "@/components/dashboard/doctor/ConsultationModal";
import { PatientProfileModal } from "@/components/dashboard/doctor/PatientProfileModal";
import { api, getBaseUrl, getToken } from "@/lib/api/client";
import { Loader2 } from "lucide-react";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const VALID_TABS: DoctorTab[] = [
  "dashboard",
  "appointments",
  "patients",
  "consultations",
  "prescriptions",
  "medical-history",
  "followups",
  "reports",
  "notifications",
  "profile",
  "communications",
  "billing",
];

function DoctorDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as DoctorTab;

  const [activeTab, setActiveTab] = useState<DoctorTab>(() => {
    return tabParam && VALID_TABS.includes(tabParam) ? tabParam : "dashboard";
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);

  // Summary data for overview
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Consultation Modal State
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(null);

  // Patient Profile Modal
  const [selectedPatientForModal, setSelectedPatientForModal] = useState<string | null>(null);
  const [patientProfileModalOpen, setPatientProfileModalOpen] = useState(false);

  // Keep state strictly synced with URL tab param (including returning to /doctor/dashboard)
  useEffect(() => {
    const param = searchParams.get("tab") as DoctorTab;
    const resolvedTab = param && VALID_TABS.includes(param) ? param : "dashboard";
    setActiveTab((prev) => (prev !== resolvedTab ? resolvedTab : prev));
  }, [searchParams]);

  // Fast 1-click tab switch handler with router synchronization
  const handleTabChange = useCallback((tab: DoctorTab) => {
    setActiveTab(tab);
    const targetUrl = tab === "dashboard" ? "/doctor/dashboard" : `/doctor/dashboard?tab=${tab}`;
    router.replace(targetUrl, { scroll: false });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [router]);

  // Fetch dashboard summary
  const fetchDashboardSummary = useCallback(async () => {
    try {
      setIsLoadingSummary(true);
      const res = await api.get<{ data?: DashboardSummary; summary?: DashboardSummary }>(
        `/api/v1/doctor/dashboard?date=${selectedDate}`
      );
      const payload = (res as any).data || (res as any).summary || null;
      if (payload) {
        setDashboardData(payload);
      }
    } catch (err) {
      console.error("Failed to load doctor dashboard summary", err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  // SSE Real-Time Stream Integration
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getToken();
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const setupSSE = () => {
      try {
        const baseUrl = getBaseUrl().replace(/\/+$/, "");
        const sseUrl = `${baseUrl}/doctor/realtime/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "heartbeat" || data.type === "connected") return;
            // Refreshes dashboard summary on any clinical or schedule event
            fetchDashboardSummary();
          } catch {
            // Comment ping
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimer = setTimeout(setupSSE, 5000);
        };
      } catch (err) {
        console.warn("SSE connection error", err);
      }
    };

    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [fetchDashboardSummary]);

  // Open consultation modal
  const handleOpenConsultation = (appointmentId: string, patientId: string, consultationId?: string) => {
    setActiveAppointmentId(appointmentId);
    setActivePatientId(patientId);
    setActiveConsultationId(consultationId || null);
    setConsultationModalOpen(true);
  };

  // Open patient profile in-place without redirecting away from current dashboard
  const handleOpenPatientProfile = (patientId: string) => {
    if (!patientId) return;
    setSelectedPatientForModal(patientId);
    setPatientProfileModalOpen(true);
  };

  // Cached logged-in user for instant hydration
  const [cachedUser, setCachedUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("trigyna_user");
        if (raw) setCachedUser(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }, []);

  // Logout handler
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("trigyna_token");
      localStorage.removeItem("trigyna_user");
    }
    router.push("/login");
  };

  const doctorName = dashboardData?.doctor?.name || cachedUser?.name || "Doctor";
  const doctorDesignation =
    dashboardData?.doctor?.designation || cachedUser?.specialization || "Consultant";
  const doctorInitials =
    dashboardData?.doctor?.initials ||
    (doctorName ? doctorName.replace(/^Dr\.\s*/i, "").slice(0, 2).toUpperCase() : "DR");
  const unreadCount = dashboardData?.unreadNotifications ?? 0;

  return (
    <RoleGuard allowedRoles={["doctor", "owner", "admin"]}>
      <div className="h-screen h-[100dvh] w-full bg-[#F5F8F6] text-[#17251E] flex flex-col md:flex-row antialiased selection:bg-[#154734] selection:text-white overflow-hidden">
        {/* 1. Left Sidebar & Responsive Drawer */}
        <DoctorSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          doctorName={doctorName}
          doctorDesignation={doctorDesignation}
          doctorInitials={doctorInitials}
          unreadNotifications={unreadCount}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          onLogout={handleLogout}
        />

        {/* 2. Main Workspace Layout */}
        <div className="flex-1 h-screen h-[100dvh] flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <DoctorHeader
            doctorName={doctorName}
            doctorInitials={doctorInitials}
            doctorSpecialization={doctorDesignation}
            unreadNotifications={unreadCount}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onNavigateTab={handleTabChange}
            onSelectPatient={handleOpenPatientProfile}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onLogout={handleLogout}
          />

          {/* Active Tab Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto overflow-x-hidden min-w-0 scrollbar-thin">
            {activeTab === "dashboard" && (
              <DoctorOverviewTab
                data={dashboardData}
                isLoading={isLoadingSummary}
                onNavigateTab={handleTabChange}
                onOpenConsultation={handleOpenConsultation}
                onOpenPatientProfile={handleOpenPatientProfile}
                onRefresh={fetchDashboardSummary}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {activeTab === "appointments" && (
              <DoctorAppointmentsTab
                onOpenConsultation={handleOpenConsultation}
                onOpenPatientProfile={handleOpenPatientProfile}
              />
            )}

            {activeTab === "patients" && (
              <DoctorPatientsTab
                onOpenConsultation={handleOpenConsultation}
                initialSelectedPatientId={selectedPatientForModal}
              />
            )}

            {activeTab === "consultations" && (
              <DoctorConsultationsTab onOpenConsultation={handleOpenConsultation} />
            )}

            {activeTab === "prescriptions" && <DoctorPrescriptionsTab />}

            {activeTab === "followups" && (
              <DoctorFollowUpsTab
                onOpenConsultation={handleOpenConsultation}
                onOpenPatientProfile={handleOpenPatientProfile}
              />
            )}

            {activeTab === "communications" && <DoctorCommunicationsTab />}

            {activeTab === "medical-history" && <DoctorMedicalHistoryTab />}

            {activeTab === "reports" && <DoctorReportsTab />}

            {activeTab === "billing" && <DoctorBillingTab />}

            {activeTab === "notifications" && (
              <DoctorNotificationsTab
                onNavigateTab={handleTabChange}
                onRefreshBadge={fetchDashboardSummary}
              />
            )}

            {activeTab === "profile" && <DoctorProfileTab />}
          </main>
        </div>

        {/* 3. Clinical Consultation Modal */}
        <ConsultationModal
          isOpen={consultationModalOpen}
          onClose={() => {
            setConsultationModalOpen(false);
            setActiveConsultationId(null);
          }}
          appointmentId={activeAppointmentId}
          patientId={activePatientId}
          consultationId={activeConsultationId}
          onConsultationCompleted={fetchDashboardSummary}
        />

        {/* 4. Patient Clinical Profile Modal (In-place view without redirecting) */}
        <PatientProfileModal
          isOpen={patientProfileModalOpen}
          patientId={selectedPatientForModal}
          onClose={() => {
            setPatientProfileModalOpen(false);
            setSelectedPatientForModal(null);
          }}
          onOpenConsultation={(appointmentId, patientId) => {
            handleOpenConsultation(appointmentId || "", patientId);
          }}
        />
      </div>
    </RoleGuard>
  );
}

export default function DoctorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#F5F8F6]">
          <Loader2 className="w-8 h-8 animate-spin text-[#07543D]" />
        </div>
      }
    >
      <DoctorDashboardInner />
    </Suspense>
  );
}
