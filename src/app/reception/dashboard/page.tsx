"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Calendar,
  UserPlus,
  Clock,
  AlertCircle,
  Plus,
  Video,
  Building,
  Loader2,
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  X,
  CreditCard,
  QrCode,
  DollarSign,
  Printer,
  UserCheck,
  RefreshCw,
  Phone,
  AlertTriangle,
  ChevronRight,
  FileText,
} from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { api } from "@/lib/api/client";

interface Patient {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  gender: string;
  age: number;
  bloodGroup?: string;
  medicalHistory?: string;
  allergies?: string[];
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
}

interface Doctor {
  _id: string;
  userId: {
    _id: string;
    fullName?: string;
    name?: string;
    phone?: string;
  };
  specialization: string[];
  consultationFee: number;
}

interface Appointment {
  _id: string;
  appointmentCode: string;
  patientId: Patient;
  doctorId: Doctor;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  mode: string;
  status: "scheduled" | "checked_in" | "in_consultation" | "completed" | "cancelled" | "no_show";
}

interface Invoice {
  _id: string;
  invoiceCode: string;
  patientId: Patient;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: "draft" | "issued" | "paid" | "partially_paid" | "void";
  paymentMethod?: string;
  createdAt: string;
}

export default function ReceptionDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [, startTransition] = useTransition();

  // Modals
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Forms
  const [patientForm, setPatientForm] = useState({
    fullName: "",
    phone: "",
    gender: "female",
    age: 28,
    bloodGroup: "O+",
    address: "Pune, Maharashtra",
    medicalHistory: "",
    allergies: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [apptForm, setApptForm] = useState({
    patientId: "",
    doctorId: "",
    serviceName: "Homoeopathic Clinical Consultation",
    appointmentDate: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    mode: "in_person",
  });
  const [slotConflictError, setSlotConflictError] = useState<string | null>(null);

  const [billingForm, setBillingForm] = useState({
    patientId: "",
    itemDescription: "Dr. Harshali Sutar Consultation Fee",
    itemQuantity: 1,
    itemPrice: 800,
    paymentMethod: "upi",
    paymentStatus: "paid",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [apptRes, patRes, docRes, invRes] = await Promise.all([
        api.get<{ appointments: Appointment[] }>("/appointments"),
        api.get<{ patients: Patient[] }>("/patients"),
        api.get<{ doctors: Doctor[] }>("/doctors"),
        api.get<{ invoices: Invoice[] }>("/billing/invoices").catch(() => ({ data: { invoices: [] } })),
      ]);

      if (apptRes.data?.appointments) setAppointments(apptRes.data.appointments);
      if (patRes.data?.patients) setPatients(patRes.data.patients);
      if (invRes.data?.invoices) setInvoices(invRes.data.invoices);
      if (docRes.data?.doctors) {
        setDoctors(docRes.data.doctors);
        if (docRes.data.doctors.length > 0) {
          setApptForm((prev) => (prev.doctorId ? prev : { ...prev, doctorId: docRes.data.doctors[0]._id }));
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check duplicate phone on change
  const handlePhoneChange = async (phoneVal: string) => {
    setPatientForm((p) => ({ ...p, phone: phoneVal }));
    setDuplicateWarning(null);
    if (phoneVal.trim().length >= 10) {
      const existing = patients.find((p) => p.phone === phoneVal.trim());
      if (existing) {
        setDuplicateWarning(`Existing record found: ${existing.fullName} (${existing.patientCode})`);
      }
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.fullName || !patientForm.phone) {
      alert("Name and phone number are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ patient: Patient }>("/patients", {
        fullName: patientForm.fullName,
        phone: patientForm.phone,
        gender: patientForm.gender,
        age: Number(patientForm.age),
        bloodGroup: patientForm.bloodGroup,
        medicalHistory: patientForm.medicalHistory,
        allergies: patientForm.allergies
          ? patientForm.allergies.split(",").map((s) => s.trim())
          : [],
        emergencyContact: patientForm.emergencyContactName
          ? {
              name: patientForm.emergencyContactName,
              phone: patientForm.emergencyContactPhone,
              relation: "Family",
            }
          : undefined,
      });

      showToast(`Patient registered! Chart ID: ${res.data?.patient?.patientCode || "PAT-NEW"}`);
      setIsPatientModalOpen(false);
      setPatientForm({
        fullName: "",
        phone: "",
        gender: "female",
        age: 28,
        bloodGroup: "O+",
        address: "Pune, Maharashtra",
        medicalHistory: "",
        allergies: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Patient registration failed";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotConflictError(null);
    if (!apptForm.patientId || !apptForm.doctorId) {
      alert("Please select both a registered patient and doctor.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/appointments", apptForm);
      showToast("Appointment confirmed & slot reserved successfully!");
      setIsApptModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Appointment booking failed";
      setSlotConflictError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (apptId: string, status: string) => {
    try {
      await api.patch(`/appointments/${apptId}/status`, { status });
      showToast(`Status updated to: ${status.replace("_", " ")}`);
      loadData();
    } catch {
      alert("Failed to update status");
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingForm.patientId) {
      alert("Please select a patient.");
      return;
    }

    setIsSubmitting(true);
    try {
      const totalAmount = billingForm.itemPrice * billingForm.itemQuantity;
      const res = await api.post<{ invoice: Invoice }>("/billing/invoices", {
        patientId: billingForm.patientId,
        items: [
          {
            description: billingForm.itemDescription,
            quantity: billingForm.itemQuantity,
            unitPrice: billingForm.itemPrice,
            total: totalAmount,
          },
        ],
        subtotal: totalAmount,
        tax: 0,
        discount: 0,
        total: totalAmount,
        status: billingForm.paymentStatus,
        paymentMethod: billingForm.paymentMethod,
      });

      showToast(`POS invoice created: ${res.data?.invoice?.invoiceCode || "INV-NEW"}`);
      setIsBillingModalOpen(false);
      loadData();
      if (res.data?.invoice) {
        setSelectedInvoice(res.data.invoice);
        setIsReceiptModalOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invoice creation failed";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === "all" || appt.status === statusFilter;
    const name = appt.patientId?.fullName?.toLowerCase() || "";
    const code = appt.appointmentCode?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return matchesStatus && (name.includes(query) || code.includes(query));
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "checked_in":
        return "bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse";
      case "in_consultation":
        return "bg-purple-50 text-purple-700 border-purple-200 font-bold";
      case "completed":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  return (
    <RoleGuard allowedRoles={["owner", "admin", "reception"]}>
      <DashboardShell role="reception">
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 bg-[#154734] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#D1E2D8] animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#154734] to-[#1E5C45] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-medium mb-3 backdrop-blur-sm border border-white/10">
                  <Building className="w-3.5 h-3.5" />
                  Front Desk Operations • TriGyna Clinic
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold">
                  Reception Desk &amp; Patient Check-In
                </h1>
                <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
                  Intake patients with mobile verification, manage waiting room queues, reserve collision-free appointments, and issue instant POS receipts.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIsPatientModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#154734] hover:bg-[#F3EFEA] text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Register Patient
                </button>
                <button
                  onClick={() => setIsApptModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  <Calendar className="w-4 h-4" />
                  Book Slot
                </button>
                <button
                  onClick={() => setIsBillingModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-2 transition-all border border-white/20 backdrop-blur-sm"
                >
                  <Receipt className="w-4 h-4" />
                  POS Billing
                </button>
              </div>
            </div>
          </div>

          {/* KPI Summary Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 shadow-sm">
              <p className="text-[11px] text-[#758277] uppercase font-bold tracking-wider">
                Total Queue
              </p>
              <p className="text-2xl font-serif font-bold text-[#154734] mt-1">
                {appointments.length}
              </p>
              <p className="text-[10px] text-[#758277] mt-0.5">Today&apos;s appointments</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 shadow-sm">
              <p className="text-[11px] text-amber-700 uppercase font-bold tracking-wider">
                Waiting / Checked In
              </p>
              <p className="text-2xl font-serif font-bold text-amber-600 mt-1">
                {appointments.filter((a) => a.status === "checked_in").length}
              </p>
              <p className="text-[10px] text-[#758277] mt-0.5">Ready for doctor</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 shadow-sm">
              <p className="text-[11px] text-purple-700 uppercase font-bold tracking-wider">
                In Consultation
              </p>
              <p className="text-2xl font-serif font-bold text-purple-600 mt-1">
                {appointments.filter((a) => a.status === "in_consultation").length}
              </p>
              <p className="text-[10px] text-[#758277] mt-0.5">With Dr. Harshali</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 shadow-sm">
              <p className="text-[11px] text-emerald-700 uppercase font-bold tracking-wider">
                Registered Patients
              </p>
              <p className="text-2xl font-serif font-bold text-[#154734] mt-1">
                {patients.length}
              </p>
              <p className="text-[10px] text-[#758277] mt-0.5">Total clinic EHRs</p>
            </div>
          </div>

          {/* Main Waiting Room Queue Table */}
          <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-sm overflow-hidden">
            {/* Table Header and Filters */}
            <div className="p-5 border-b border-[#E8E2D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#154734]" />
                  Waiting Room &amp; Encounter Queue
                </h2>
                <p className="text-xs text-[#758277] mt-0.5">
                  Manage patient check-ins and hand-offs to clinical consultation rooms
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#758277]" />
                  <input
                    type="text"
                    placeholder="Search patient or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 bg-[#FAF8F5]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8E2D6]">
                  {[
                    { key: "all", label: "All" },
                    { key: "scheduled", label: "Scheduled" },
                    { key: "checked_in", label: "Waiting" },
                    { key: "in_consultation", label: "In Room" },
                    { key: "completed", label: "Done" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                        statusFilter === f.key
                          ? "bg-[#154734] text-white shadow-xs"
                          : "text-[#758277] hover:text-[#154734]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => startTransition(() => loadData())}
                  className="p-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:text-[#154734] hover:bg-[#FAF8F5]"
                  title="Refresh Queue"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E8E2D6] text-[11px] font-bold text-[#154734] uppercase tracking-wider">
                    <th className="py-3 px-4">Code / Time</th>
                    <th className="py-3 px-4">Patient Info</th>
                    <th className="py-3 px-4">Service &amp; Mode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Quick Desk Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D6]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#758277]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#154734]" />
                        Loading waiting queue...
                      </td>
                    </tr>
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#758277]">
                        No appointments found matching this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appt) => (
                      <tr key={appt._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <p className="font-bold text-[#154734]">{appt.startTime}</p>
                          <p className="text-[10px] text-[#758277]">{appt.appointmentCode}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#17221D]">
                            {appt.patientId?.fullName || "Walk-in Patient"}
                          </p>
                          <p className="text-[11px] text-[#758277]">
                            {appt.patientId?.phone} • {appt.patientId?.patientCode || "PAT"}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#154734]">{appt.serviceName}</p>
                          <p className="text-[10px] text-[#758277] capitalize">
                            {appt.mode.replace("_", " ")}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] border ${getStatusBadge(appt.status)}`}>
                            {appt.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {appt.status === "scheduled" && (
                              <button
                                onClick={() => handleStatusUpdate(appt._id, "checked_in")}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all shadow-xs"
                              >
                                Check In
                              </button>
                            )}
                            {appt.status === "checked_in" && (
                              <button
                                onClick={() => handleStatusUpdate(appt._id, "in_consultation")}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all shadow-xs"
                              >
                                Send to Doctor
                              </button>
                            )}
                            {appt.status === "in_consultation" && (
                              <button
                                onClick={() => handleStatusUpdate(appt._id, "completed")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs"
                              >
                                Mark Completed
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setBillingForm((b) => ({
                                  ...b,
                                  patientId: appt.patientId?._id || "",
                                }));
                                setIsBillingModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-[#E8E2D6] text-[#154734] hover:bg-[#E8EFEA] text-[11px] font-semibold transition-all"
                            >
                              Bill POS
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Invoices & POS History */}
          <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#154734]" />
                  Recent POS Billing Invoices
                </h3>
                <p className="text-xs text-[#758277]">
                  Instant receipts generated at the reception desk
                </p>
              </div>
              <button
                onClick={() => setIsBillingModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#E8EFEA] hover:bg-[#D1E2D8] text-[#154734] transition-all"
              >
                + New Receipt
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {invoices.slice(0, 6).map((inv) => (
                <div
                  key={inv._id}
                  className="p-3.5 rounded-2xl border border-[#E8E2D6] bg-[#FAF8F5] text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#154734]">{inv.invoiceCode}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      {inv.status}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#17221D]">
                      {inv.patientId?.fullName || "Patient Invoice"}
                    </p>
                    <p className="text-[11px] text-[#758277]">
                      Total: ₹{inv.total} • Method: {inv.paymentMethod?.toUpperCase() || "CASH"}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-black/5 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setIsReceiptModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-[#154734] hover:underline flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      Print Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal: Register Patient */}
        {isPatientModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
                <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#154734]" />
                  Patient Intake &amp; Registration
                </h3>
                <button
                  onClick={() => setIsPatientModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {duplicateWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              <form onSubmit={handleRegisterPatient} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#154734] mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={patientForm.fullName}
                    onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })}
                    placeholder="E.g., Ananya Deshmukh"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Phone Number (10 digits) *</label>
                    <input
                      type="tel"
                      required
                      value={patientForm.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="9876543210"
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Gender</label>
                    <select
                      value={patientForm.gender}
                      onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Age (Years)</label>
                    <input
                      type="number"
                      value={patientForm.age}
                      onChange={(e) => setPatientForm({ ...patientForm, age: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Blood Group</label>
                    <select
                      value={patientForm.bloodGroup}
                      onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Allergies (comma-separated)</label>
                  <input
                    type="text"
                    value={patientForm.allergies}
                    onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                    placeholder="E.g., Penicillin, Dust, Sulfa"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Medical Background Notes</label>
                  <textarea
                    rows={2}
                    value={patientForm.medicalHistory}
                    onChange={(e) => setPatientForm({ ...patientForm, medicalHistory: e.target.value })}
                    placeholder="PCOD, Thyroid issues, hypertension..."
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Emergency Contact Person</label>
                    <input
                      type="text"
                      value={patientForm.emergencyContactName}
                      onChange={(e) => setPatientForm({ ...patientForm, emergencyContactName: e.target.value })}
                      placeholder="Spouse / Parent Name"
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Emergency Phone</label>
                    <input
                      type="tel"
                      value={patientForm.emergencyContactPhone}
                      onChange={(e) => setPatientForm({ ...patientForm, emergencyContactPhone: e.target.value })}
                      placeholder="Contact number"
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E2D6] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPatientModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:bg-[#FAF8F5] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold transition-all shadow-sm"
                  >
                    {isSubmitting ? "Registering..." : "Create Patient Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Book Appointment */}
        {isApptModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
                <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#154734]" />
                  Schedule Appointment
                </h3>
                <button
                  onClick={() => setIsApptModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {slotConflictError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{slotConflictError}</span>
                </div>
              )}

              <form onSubmit={handleBookAppointment} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#154734] mb-1">Select Patient *</label>
                  <select
                    required
                    value={apptForm.patientId}
                    onChange={(e) => setApptForm({ ...apptForm, patientId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    <option value="">-- Choose registered patient --</option>
                    {patients.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.fullName} ({p.patientCode}) • {p.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Select Practitioner *</label>
                  <select
                    required
                    value={apptForm.doctorId}
                    onChange={(e) => setApptForm({ ...apptForm, doctorId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        Dr. {d.userId?.fullName || d.userId?.name || "Consultant"} (Fee: ₹{d.consultationFee})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Appointment Date *</label>
                    <input
                      type="date"
                      required
                      value={apptForm.appointmentDate}
                      onChange={(e) => setApptForm({ ...apptForm, appointmentDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Time Slot *</label>
                    <select
                      value={apptForm.startTime}
                      onChange={(e) => setApptForm({ ...apptForm, startTime: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    >
                      {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "16:00", "16:30", "17:00", "17:30", "18:00"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Consultation Mode</label>
                  <select
                    value={apptForm.mode}
                    onChange={(e) => setApptForm({ ...apptForm, mode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    <option value="in_person">Clinic Visit (In-Person)</option>
                    <option value="video">Telemedicine Video Consult</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-[#E8E2D6] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsApptModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:bg-[#FAF8F5] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold transition-all shadow-sm"
                  >
                    {isSubmitting ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: POS Billing */}
        {isBillingModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-lg p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
                <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#154734]" />
                  POS Billing &amp; Payment Collection
                </h3>
                <button
                  onClick={() => setIsBillingModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#154734] mb-1">Select Patient *</label>
                  <select
                    required
                    value={billingForm.patientId}
                    onChange={(e) => setBillingForm({ ...billingForm, patientId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    <option value="">-- Choose patient --</option>
                    {patients.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.fullName} ({p.patientCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Service / Medication Description</label>
                  <input
                    type="text"
                    required
                    value={billingForm.itemDescription}
                    onChange={(e) => setBillingForm({ ...billingForm, itemDescription: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={billingForm.itemPrice}
                      onChange={(e) => setBillingForm({ ...billingForm, itemPrice: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#154734] mb-1">Payment Method</label>
                    <select
                      value={billingForm.paymentMethod}
                      onChange={(e) => setBillingForm({ ...billingForm, paymentMethod: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                    >
                      <option value="upi">UPI / QR Code</option>
                      <option value="cash">Cash Counter</option>
                      <option value="card">Credit / Debit Card</option>
                      <option value="net_banking">Net Banking</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E2D6] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsBillingModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:bg-[#FAF8F5] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold transition-all shadow-sm"
                  >
                    {isSubmitting ? "Generating..." : "Collect &amp; Issue Receipt"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Printable POS Receipt */}
        {isReceiptModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
                <h3 className="text-base font-serif font-bold text-[#154734]">
                  TriGyna Healthcare Receipt
                </h3>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#E8E2D6] space-y-3 text-xs font-mono">
                <div className="text-center pb-3 border-b border-dashed border-[#E8E2D6]">
                  <p className="font-serif font-bold text-base text-[#154734]">TriGyna Clinic</p>
                  <p className="text-[10px] text-[#758277]">Women | Health | Wellness</p>
                  <p className="text-[10px] text-[#758277]">Koregaon Park, Pune, MH</p>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span>Receipt No:</span>
                  <span className="font-bold text-[#154734]">{selectedInvoice.invoiceCode}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Date:</span>
                  <span>{new Date(selectedInvoice.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Patient:</span>
                  <span className="font-bold">{selectedInvoice.patientId?.fullName || "Patient"}</span>
                </div>

                <div className="py-2 border-y border-dashed border-[#E8E2D6] space-y-1">
                  {selectedInvoice.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.description} (x{item.quantity})</span>
                      <span>₹{item.total}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-bold text-sm text-[#154734] pt-1">
                  <span>TOTAL PAID:</span>
                  <span>₹{selectedInvoice.total}</span>
                </div>
                <div className="flex justify-between text-[10px] text-[#758277]">
                  <span>Method:</span>
                  <span>{selectedInvoice.paymentMethod?.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold text-xs flex items-center gap-2"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}
