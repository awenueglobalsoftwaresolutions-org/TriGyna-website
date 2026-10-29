"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DoctorSidebar, DoctorTab } from "@/components/dashboard/doctor/DoctorSidebar";
import { DoctorHeader } from "@/components/dashboard/doctor/DoctorHeader";
import { DoctorOverviewTab, DashboardSummary } from "@/components/dashboard/doctor/DoctorOverviewTab";
import { DoctorAppointmentsTab } from "@/components/dashboard/doctor/DoctorAppointmentsTab";
import { DoctorPatientsTab } from "@/components/dashboard/doctor/DoctorPatientsTab";
import { DoctorConsultationsTab } from "@/components/dashboard/doctor/DoctorConsultationsTab";
import { DoctorPrescriptionsTab } from "@/components/dashboard/doctor/DoctorPrescriptionsTab";
import { DoctorFollowUpsTab } from "@/components/dashboard/doctor/DoctorFollowUpsTab";
import { DoctorMedicalHistoryTab } from "@/components/dashboard/doctor/DoctorMedicalHistoryTab";
import { DoctorReportsTab } from "@/components/dashboard/doctor/DoctorReportsTab";
import { DoctorNotificationsTab } from "@/components/dashboard/doctor/DoctorNotificationsTab";
import { DoctorProfileTab } from "@/components/dashboard/doctor/DoctorProfileTab";
import { ConsultationModal } from "@/components/dashboard/doctor/ConsultationModal";
import { api } from "@/lib/api/client";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DoctorTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);

  // Summary data for overview
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Consultation Modal State
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);

  // Patient Profile Modal
  const [selectedPatientForModal, setSelectedPatientForModal] = useState<string | null>(null);

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

  // Open consultation modal
  const handleOpenConsultation = (appointmentId: string, patientId: string) => {
    setActiveAppointmentId(appointmentId);
    setActivePatientId(patientId);
    setConsultationModalOpen(true);
  };

  // Open patient profile in patient tab
  const handleOpenPatientProfile = (patientId: string) => {
    setSelectedPatientForModal(patientId);
    setActiveTab("patients");
  };

  // Logout handler
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("trigyna_token");
      localStorage.removeItem("trigyna_user");
    }
    router.push("/login");
  };

  const doctorName = dashboardData?.doctor?.name || "Dr. Ananya Sharma";
  const doctorDesignation = dashboardData?.doctor?.designation || "Obstetrician & Gynecologist";
  const doctorInitials = dashboardData?.doctor?.initials || "AS";
  const unreadCount = dashboardData?.unreadNotifications ?? 0;

  return (
    <RoleGuard allowedRoles={["doctor", "owner", "admin"]}>
      <div className="min-h-screen bg-[#F5F8F6] text-[#17251E] flex flex-col md:flex-row antialiased selection:bg-[#154734] selection:text-white">
        {/* 1. Left Sidebar & Responsive Drawer */}
        <DoctorSidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          doctorName={doctorName}
          doctorDesignation={doctorDesignation}
          doctorInitials={doctorInitials}
          unreadNotifications={unreadCount}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          onLogout={handleLogout}
        />

        {/* 2. Main Workspace Layout */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <DoctorHeader
            doctorName={doctorName}
            doctorInitials={doctorInitials}
            unreadNotifications={unreadCount}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectPatient={handleOpenPatientProfile}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onLogout={handleLogout}
          />

          {/* Active Tab Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {activeTab === "dashboard" && (
              <DoctorOverviewTab
                data={dashboardData}
                isLoading={isLoadingSummary}
                onNavigateTab={(tab) => setActiveTab(tab)}
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

            {activeTab === "followups" && <DoctorFollowUpsTab />}

            {activeTab === "medical-history" && <DoctorMedicalHistoryTab />}

            {activeTab === "reports" && <DoctorReportsTab />}

            {activeTab === "notifications" && (
              <DoctorNotificationsTab
                onNavigateTab={(tab) => setActiveTab(tab)}
                onRefreshBadge={fetchDashboardSummary}
              />
            )}

            {activeTab === "profile" && <DoctorProfileTab />}
          </main>
        </div>

        {/* 3. Clinical Consultation Modal */}
        <ConsultationModal
          isOpen={consultationModalOpen}
          onClose={() => setConsultationModalOpen(false)}
          appointmentId={activeAppointmentId}
          patientId={activePatientId}
          onConsultationCompleted={fetchDashboardSummary}
        />
      </div>
    </RoleGuard>
  );
}
