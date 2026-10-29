"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Calendar,
  Receipt,
  X,
} from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { api } from "@/lib/api/client";

// Modular Reception Tabs
import { ReceptionOverviewTab } from "@/components/dashboard/reception/ReceptionOverviewTab";
import { QueueDeskTab, Patient, Doctor, Appointment } from "@/components/dashboard/reception/QueueDeskTab";
import { PatientsDirectoryTab } from "@/components/dashboard/reception/PatientsDirectoryTab";
import { AppointmentsScheduleTab } from "@/components/dashboard/reception/AppointmentsScheduleTab";
import { PosCashierTab, Invoice } from "@/components/dashboard/reception/PosCashierTab";
import { DoctorRosterTab } from "@/components/dashboard/reception/DoctorRosterTab";
import { EnquiriesTab, Lead } from "@/components/dashboard/reception/EnquiriesTab";

export default function ReceptionDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [, startTransition] = useTransition();

  // Core Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Non-blocking Toast Notification
  const [toastNotification, setToastNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  // Cross-Tab Pre-selections
  const [billingPreselectedPatientId, setBillingPreselectedPatientId] = useState<string | undefined>(undefined);

  const showToast = (message: string, isError = false) => {
    setToastNotification({ message, isError });
    setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  };

  // Master Data Loader
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [apptRes, patRes, docRes, invRes, leadRes] = await Promise.all([
        api.get<{ appointments: Appointment[] }>("/appointments").catch(() => ({ data: { appointments: [] } })),
        api.get<{ patients: Patient[] }>("/patients").catch(() => ({ data: { patients: [] } })),
        api.get<{ doctors: Doctor[] }>("/doctors").catch(() => ({ data: { doctors: [] } })),
        api.get<{ invoices: Invoice[] }>("/billing/invoices").catch(() => ({ data: { invoices: [] } })),
        api.get<{ leads: Lead[] }>("/crm/leads").catch(() => ({ data: { leads: [] } })),
      ]);

      if (apptRes.data?.appointments) setAppointments(apptRes.data.appointments);
      if (patRes.data?.patients) setPatients(patRes.data.patients);
      if (invRes.data?.invoices) setInvoices(invRes.data.invoices);
      if (leadRes.data?.leads) setLeads(leadRes.data.leads);
      if (docRes.data?.doctors) setDoctors(docRes.data.doctors);
    } catch {
      showToast("Notice: Some background reception feeds could not be synced.", true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isMounted) await loadAllData();
    })();
    return () => {
      isMounted = false;
    };
  }, [loadAllData]);

  // Status Progression Handler
  const handleStatusUpdate = async (apptId: string, status: string, vitals?: Record<string, unknown>) => {
    try {
      await api.patch(`/appointments/${apptId}/status`, { status, vitals });
      showToast(`Appointment status updated to '${status.replace("_", " ")}'`);
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update appointment status";
      showToast(msg, true);
    }
  };

  // Cancel Appointment Handler
  const handleCancelAppointment = async (apptId: string, reason: string) => {
    try {
      await api.patch(`/appointments/${apptId}/status`, { status: "cancelled", cancellationReason: reason });
      showToast("Appointment successfully cancelled and slot released");
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel appointment";
      showToast(msg, true);
    }
  };

  // Register Patient Handler
  const handleRegisterPatient = async (patientData: Record<string, unknown>) => {
    try {
      const res = await api.post<{ patient: Patient }>("/patients", patientData);
      const code = res.data?.patient?.patientCode || "PAT";
      showToast(`New patient registered successfully! Chart ID: ${code}`);
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Patient registration failed";
      showToast(msg, true);
      throw err;
    }
  };

  // Book Appointment Handler
  const handleBookAppointment = async (formData: Record<string, unknown>) => {
    try {
      await api.post("/appointments", formData);
      showToast("Appointment confirmed & time slot reserved successfully!");
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Appointment booking failed";
      showToast(msg, true);
      throw err;
    }
  };

  // Create POS Invoice Handler
  const handleCreateInvoice = async (invoiceData: Record<string, unknown>): Promise<Invoice | null> => {
    try {
      const res = await api.post<{ invoice: Invoice }>("/billing/invoices", invoiceData);
      const inv = res.data?.invoice || null;
      const invNum = inv?.invoiceNumber || inv?.invoiceCode || "INV-NEW";
      showToast(`POS invoice created: ${invNum}`);
      loadAllData();
      return inv;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "POS invoice creation failed";
      showToast(msg, true);
      return null;
    }
  };

  // Log CRM Enquiry Handler
  const handleLogEnquiry = async (leadData: Record<string, unknown>) => {
    try {
      await api.post("/crm/leads", leadData);
      showToast("Front-desk inquiry logged successfully");
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log enquiry";
      showToast(msg, true);
      throw err;
    }
  };

  // Update CRM Lead Stage Handler
  const handleUpdateLeadStage = async (leadId: string, stage: string) => {
    try {
      await api.patch(`/crm/leads/${leadId}/stage`, { stage });
      showToast(`Inquiry stage updated to '${stage}'`);
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update inquiry stage";
      showToast(msg, true);
    }
  };

  // Action Cross-Tab Navigations
  const handleOpenBookSlot = () => {
    setActiveTab("appointments");
  };

  const handleOpenQuickRegister = () => {
    setActiveTab("patients");
  };

  const handleOpenPosBill = (patientId?: string) => {
    setBillingPreselectedPatientId(patientId);
    setActiveTab("billing");
  };

  const handleBookWithDoctor = (doctorId: string) => {
    void doctorId;
    setActiveTab("appointments");
  };

  const handleConvertToPatient = (name: string, phone: string) => {
    void name;
    void phone;
    setActiveTab("patients");
  };

  return (
    <RoleGuard allowedRoles={["owner", "admin", "reception"]}>
      <DashboardShell
        role="reception"
        title="Reception Desk &amp; Front Office"
        subtitle="Patient intake, live waiting triage, appointment dispatch, and instant POS billing"
        activeTab={activeTab}
        onTabChange={(tabId) => startTransition(() => setActiveTab(tabId))}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => startTransition(() => loadAllData())}
              className="p-2 rounded-xl border border-[#E8E2D6] bg-white hover:bg-[#F9F7F1] text-[#154734] transition-colors cursor-pointer"
              title="Refresh All Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("patients")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Intake</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("appointments")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenPosBill()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#154734] text-[#154734] hover:bg-[#EAF5ED] text-xs font-bold cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bill</span>
            </button>
          </div>
        }
      >
        {/* Toast Notification Banner */}
        {toastNotification && (
          <div
            className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border animate-in fade-in slide-in-from-top-4 ${
              toastNotification.isError
                ? "bg-rose-900 text-white border-rose-700"
                : "bg-[#154734] text-white border-[#D1E2D8]"
            }`}
          >
            {toastNotification.isError ? (
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs font-semibold">{toastNotification.message}</span>
            <button
              onClick={() => setToastNotification(null)}
              className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary Tab: Reception Overview (Matches Reference UI) */}
        {activeTab === "overview" && (
          <ReceptionOverviewTab
            appointments={appointments}
            patients={patients}
            doctors={doctors}
            invoices={invoices}
            isLoading={isLoading}
            onRefresh={loadAllData}
            onStatusUpdate={handleStatusUpdate}
            onCancelAppointment={handleCancelAppointment}
            onOpenRegisterPatient={() => setActiveTab("patients")}
            onOpenBookAppointment={() => setActiveTab("appointments")}
            onOpenCheckInPatient={() => setActiveTab("queue")}
            onOpenFindPatient={() => setActiveTab("patients")}
            onOpenCreateBill={() => handleOpenPosBill()}
            onOpenViewReceipts={() => setActiveTab("billing")}
            onOpenCalendar={() => setActiveTab("appointments")}
          />
        )}

        {/* Tab: Waiting Room & Queue Desk */}
        {activeTab === "queue" && (
          <QueueDeskTab
            appointments={appointments}
            doctors={doctors}
            isLoading={isLoading}
            onRefresh={loadAllData}
            onStatusUpdate={handleStatusUpdate}
            onOpenQuickRegister={handleOpenQuickRegister}
            onOpenBookSlot={handleOpenBookSlot}
            onOpenPosBill={handleOpenPosBill}
          />
        )}

        {/* Tab: Patient Directory & Walk-In Intake */}
        {(activeTab === "patients" || activeTab === "registration") && (
          <PatientsDirectoryTab
            patients={patients}
            isLoading={isLoading}
            onRefresh={loadAllData}
            onRegisterPatient={handleRegisterPatient}
            onBookAppointmentForPatient={(patId) => {
              void patId;
              setActiveTab("appointments");
            }}
            onBillPatient={(patId) => {
              handleOpenPosBill(patId);
            }}
          />
        )}

        {/* Tab: Appointments & Clinic Schedule */}
        {(activeTab === "appointments" || activeTab === "calendar") && (
          <AppointmentsScheduleTab
            appointments={appointments}
            patients={patients}
            doctors={doctors}
            isLoading={isLoading}
            onRefresh={loadAllData}
            onBookAppointment={handleBookAppointment}
            onStatusUpdate={(id, status) => handleStatusUpdate(id, status)}
            onCancelAppointment={handleCancelAppointment}
            onOpenPosBill={handleOpenPosBill}
          />
        )}

        {/* Tab: POS Billing & Cashier Desk / Receipts */}
        {(activeTab === "billing" || activeTab === "receipts") && (
          <PosCashierTab
            invoices={invoices}
            patients={patients}
            isLoading={isLoading}
            onRefresh={loadAllData}
            onCreateInvoice={handleCreateInvoice}
            preselectedPatientId={billingPreselectedPatientId}
          />
        )}

        {/* Tab: Doctor OPD Roster / Services */}
        {(activeTab === "roster" || activeTab === "doctors" || activeTab === "services") && (
          <DoctorRosterTab
            doctors={doctors}
            isLoading={isLoading}
            onBookWithDoctor={handleBookWithDoctor}
          />
        )}

        {/* Tab: Front-Desk Enquiries / Patient Support */}
        {(activeTab === "enquiries" || activeTab === "support") && (
          <EnquiriesTab
            leads={leads}
            isLoading={isLoading}
            onRefresh={loadAllData}
            onLogEnquiry={handleLogEnquiry}
            onUpdateStage={handleUpdateLeadStage}
            onConvertToPatient={handleConvertToPatient}
          />
        )}

        {/* Tab: Reports & Analytics Quick View */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E4EBE7] p-6 shadow-2xs">
              <h2 className="text-lg font-bold text-[#101828]">Reception Daily Audit &amp; Operational Reports</h2>
              <p className="text-xs text-[#667085] mt-1">
                Summary of today&apos;s patient intake, consultations, queue turnaround time, and front-desk collections.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-[#EAF7F0] border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-800">Total Encounters Today</p>
                  <p className="text-2xl font-bold text-[#08784E] mt-1">{appointments.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800">Registered Patients</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{patients.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800">Total Billed Invoices</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{invoices.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
