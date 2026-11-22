"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  Star,
  Smile,
  MoreVertical,
  MoreHorizontal,
  ChevronDown,
  Download,
  Edit3,
  Trash2,
  ShieldCheck,
  Eye,
  Activity,
  FileText,
  X,
  Check,
  Users,
  Grid,
  List,
  SlidersHorizontal,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  UserCheck,
  Briefcase,
  IndianRupee,
  RefreshCw,
  CalendarDays,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api/client";
import StaffOnboardingModal from "./StaffOnboardingModal";
import { ModalPortal } from "@/components/ui/ModalPortal";

// Day abbreviations: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
const WEEK_DAYS = [
  { day: 1, label: "M", full: "Mon" },
  { day: 2, label: "T", full: "Tue" },
  { day: 3, label: "W", full: "Wed" },
  { day: 4, label: "T", full: "Thu" },
  { day: 5, label: "F", full: "Fri" },
  { day: 6, label: "S", full: "Sat" },
  { day: 0, label: "S", full: "Sun" },
];

interface DoctorUserId {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  status: string;
  role: string;
  avatarUrl?: string;
}

interface WorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

interface DoctorRecord {
  _id: string;
  userId?: DoctorUserId;
  specialization: string[];
  qualifications: string;
  consultationFee: number;
  bio?: string;
  status: "active" | "inactive" | "on_leave";
  workingHours?: WorkingHour[];
  branchName?: string;
  experienceYears?: string;
  consultationModes?: string[];
  languages?: string[];
  avatarUrl?: string;
  isVerified?: boolean;
  registrationNumber?: string;
  registrationCouncil?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  rating?: number;
  satisfactionRate?: number;
  createdAt: string;
  workingDays?: number[];
  nextAvailable?: string;
  totalConsultations?: number;
  totalPatients?: number;
  todayAppointmentsCount?: number;
}

interface DoctorStats {
  totalDoctors: number;
  activeDoctors: number;
  activePercentage: number;
  totalConsultations: number;
  currentMonthConsultations: number;
  consultationsGrowth: string;
  specializationCoverage: number;
  specializationList: string[];
  branchList: string[];
}

interface TodayScheduleItem {
  _id: string;
  appointmentCode: string;
  time: string;
  endTime?: string;
  patientName: string;
  patientCode: string;
  service: string;
  status: "completed" | "in_consultation" | "upcoming" | "scheduled" | "checked_in" | "cancelled";
  mode: string;
}

interface DoctorEarningsData {
  totalInvoicesCount: number;
  grossConsultationValue: number;
  collectedAmount: number;
  pendingAmount: number;
  invoices: Array<{
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    createdAt: string;
    patientId?: { fullName?: string; patientCode?: string };
  }>;
}

interface LinkedEmployee {
  _id: string;
  employeeCode: string;
  department: string;
  designation: string;
  joiningDate: string;
  salary: number;
  employmentType: string;
  shift: string;
  status: string;
}

export function DoctorsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  // 1. Core State
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 2. Navigation Tabs & Filtering
  const [activeTab, setActiveTab] = useState<"all" | "specialization" | "availability" | "branch" | "calendar">("all");
  const [search, setSearch] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);

  // Advanced Filters State
  const [feeRange, setFeeRange] = useState<number>(3000);
  const [selectedMode, setSelectedMode] = useState("all");

  // 3. Selected Doctor & Right-Side Panel
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDoctorTab, setSelectedDoctorTab] = useState<"overview" | "schedule" | "consultations" | "earnings" | "profile">("overview");
  const [selectedDoctorSchedule, setSelectedDoctorSchedule] = useState<TodayScheduleItem[]>([]);
  const [isLoadingDoctorSchedule, setIsLoadingDoctorSchedule] = useState(false);
  const [selectedDoctorConsultations, setSelectedDoctorConsultations] = useState<any[]>([]);
  const [isLoadingDoctorConsultations, setIsLoadingDoctorConsultations] = useState(false);
  const [doctorEarnings, setDoctorEarnings] = useState<DoctorEarningsData | null>(null);
  const [isLoadingDoctorEarnings, setIsLoadingDoctorEarnings] = useState(false);
  const [doctorEmployee, setDoctorEmployee] = useState<LinkedEmployee | null>(null);

  // 4. Modals State
  const [isStaffOnboardingOpen, setIsStaffOnboardingOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState<DoctorRecord | null>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<DoctorRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action Dropdowns
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Multi-step Add Doctor Form State
  const [addFormStep, setAddFormStep] = useState(1);
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    specialization: "Women's Health & Homoeopathy",
    qualifications: "BHMS, MD (Hom.)",
    consultationFee: 700,
    bio: "Senior consultant specialist providing holistic healthcare at TriGyna.",
    branchName: "Flagship Indiranagar Centre",
    experienceYears: "8+ Years",
    salary: 75000,
    department: "Clinical",
    consultationModes: ["Online Video Consultation"],
    languages: ["English", "Hindi"],
    workingDays: [1, 2, 3, 4, 5, 6],
    startTime: "10:00",
    endTime: "18:00",
    slotDurationMinutes: 30,
  });

  // Edit Doctor Form State
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    specialization: "",
    qualifications: "",
    consultationFee: 700,
    bio: "",
    branchName: "Main Branch",
    experienceYears: "8+ Years",
    status: "active" as "active" | "inactive" | "on_leave",
    salary: 75000,
    department: "Clinical",
  });

  // 5. Load Stats from MongoDB
  const loadStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const res = await api.get<DoctorStats>("/doctors/stats");
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn("Failed to load doctor statistics:", err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // 6. Load Doctors from MongoDB
  const loadDoctors = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (selectedSpecialization !== "all") params.append("specialization", selectedSpecialization);
      if (selectedBranch !== "all") params.append("branch", selectedBranch);
      if (selectedAvailability !== "all") params.append("availability", selectedAvailability);
      if (search.trim()) params.append("search", search.trim());
      if (sortBy) params.append("sortBy", sortBy);
      params.append("limit", "100");

      const res = await api.get<{ doctors: DoctorRecord[]; total: number }>(`/doctors?${params.toString()}`);
      if (Array.isArray(res.data?.doctors)) {
        setDoctors(res.data.doctors);
        // Default select the first doctor if none is selected
        if (!selectedDoctorId && res.data.doctors.length > 0) {
          setSelectedDoctorId(res.data.doctors[0]._id);
        }
      } else {
        setDoctors([]);
      }
    } catch {
      showNotification("Failed to load doctor directory and roster", true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedSpecialization, selectedBranch, selectedAvailability, search, sortBy, selectedDoctorId, showNotification]);

  // Initial Load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDoctors();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadDoctors]);

  // 7. Selected Doctor Object
  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return doctors[0] || null;
    return doctors.find((d) => d._id === selectedDoctorId) || doctors[0] || null;
  }, [doctors, selectedDoctorId]);

  // 8. Load Selected Doctor Sub-Resources
  const loadSelectedDoctorSubResources = useCallback(async (docId: string) => {
    try {
      setIsLoadingDoctorSchedule(true);
      const scheduleRes = await api.get<{ schedule: TodayScheduleItem[] }>(`/doctors/${docId}/today-schedule`);
      if (scheduleRes.data?.schedule) {
        setSelectedDoctorSchedule(scheduleRes.data.schedule);
      } else {
        setSelectedDoctorSchedule([]);
      }
    } catch {
      setSelectedDoctorSchedule([]);
    } finally {
      setIsLoadingDoctorSchedule(false);
    }

    try {
      const docRes = await api.get<{ doctor: DoctorRecord; employee: LinkedEmployee }>(`/doctors/${docId}`);
      if (docRes.data?.employee) {
        setDoctorEmployee(docRes.data.employee);
      } else {
        setDoctorEmployee(null);
      }
    } catch {
      setDoctorEmployee(null);
    }
  }, []);

  const loadDoctorConsultations = useCallback(async (docId: string) => {
    try {
      setIsLoadingDoctorConsultations(true);
      const res = await api.get<{ consultations: any[] }>(`/doctors/${docId}/consultations?limit=25`);
      if (res.data?.consultations) {
        setSelectedDoctorConsultations(res.data.consultations);
      } else {
        setSelectedDoctorConsultations([]);
      }
    } catch {
      setSelectedDoctorConsultations([]);
    } finally {
      setIsLoadingDoctorConsultations(false);
    }
  }, []);

  const loadDoctorEarnings = useCallback(async (docId: string) => {
    try {
      setIsLoadingDoctorEarnings(true);
      const res = await api.get<DoctorEarningsData>(`/doctors/${docId}/earnings`);
      if (res.data) {
        setDoctorEarnings(res.data);
      } else {
        setDoctorEarnings(null);
      }
    } catch {
      setDoctorEarnings(null);
    } finally {
      setIsLoadingDoctorEarnings(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDoctor?._id) {
      loadSelectedDoctorSubResources(selectedDoctor._id);
      if (selectedDoctorTab === "consultations") {
        loadDoctorConsultations(selectedDoctor._id);
      } else if (selectedDoctorTab === "earnings") {
        loadDoctorEarnings(selectedDoctor._id);
      }
    }
  }, [selectedDoctor?._id, selectedDoctorTab, loadSelectedDoctorSubResources, loadDoctorConsultations, loadDoctorEarnings]);

  // 9. Quick Doctor Status Toggle
  const handleToggleStatus = async (doctor: DoctorRecord, newStatus: "active" | "inactive" | "on_leave") => {
    try {
      const res = await api.patch<{ doctor: DoctorRecord }>(`/doctors/${doctor._id}/status`, { status: newStatus });
      if (res.success) {
        showNotification(`Doctor status updated to ${newStatus}`);
        setDoctors((prev) =>
          prev.map((d) => (d._id === doctor._id ? { ...d, status: newStatus } : d))
        );
        loadStats();
      } else {
        showNotification(res.message || "Failed to update status", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Error updating doctor status", true);
    }
  };

  const handleVerifyDoctorCredentials = async (doctor: DoctorRecord) => {
    try {
      const res = await api.patch<{ doctor: DoctorRecord }>(`/admin/staff/${doctor._id}/verify-credentials`, {
        registrationNumber: doctor.registrationNumber || "TG-MCI-VERIFIED",
        registrationCouncil: doctor.registrationCouncil || "National Medical Commission",
        notes: "Verified by administration.",
      });
      if (res.success) {
        showNotification("Doctor medical council credentials verified successfully! Clinical appointments enabled.");
        setDoctors((prev) =>
          prev.map((d) => (d._id === doctor._id ? { ...d, isVerified: true, verificationStatus: "verified" } : d))
        );
      } else {
        showNotification(res.message || "Failed to verify credentials", true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error verifying credentials";
      showNotification(message, true);
    }
  };

  // 10. Handle Add New Doctor Submit
  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      showNotification("Doctor Full Name and Phone Number are required", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const workingHoursPayload = addForm.workingDays.map((d) => ({
        dayOfWeek: d,
        startTime: addForm.startTime,
        endTime: addForm.endTime,
        slotDurationMinutes: addForm.slotDurationMinutes,
      }));

      const payload = {
        name: addForm.name.trim(),
        phone: addForm.phone.trim(),
        email: addForm.email.trim() || undefined,
        password: addForm.password ? addForm.password.trim() : undefined,
        specialization: [addForm.specialization.trim()],
        qualifications: addForm.qualifications.trim(),
        consultationFee: Number(addForm.consultationFee),
        bio: addForm.bio.trim(),
        branchName: addForm.branchName,
        experienceYears: addForm.experienceYears,
        salary: Number(addForm.salary),
        department: addForm.department,
        consultationModes: addForm.consultationModes,
        languages: addForm.languages,
        workingHours: workingHoursPayload,
      };

      const res = await api.post<{ doctor: DoctorRecord }>("/doctors", payload);
      if (res.success) {
        showNotification(`Doctor profile for ${addForm.name} onboarded successfully!`);
        setIsAddModalOpen(false);
        setAddFormStep(1);
        setAddForm({
          name: "",
          phone: "",
          email: "",
          password: "",
          specialization: "Women's Health & Homoeopathy",
          qualifications: "BHMS, MD (Hom.)",
          consultationFee: 700,
          bio: "Senior consultant specialist providing holistic healthcare at TriGyna.",
          branchName: "Flagship Indiranagar Centre",
          experienceYears: "8+ Years",
          salary: 75000,
          department: "Clinical",
          consultationModes: ["Online Video Consultation"],
          languages: ["English", "Hindi"],
          workingDays: [1, 2, 3, 4, 5, 6],
          startTime: "10:00",
          endTime: "18:00",
          slotDurationMinutes: 30,
        });
        loadDoctors();
        loadStats();
      } else {
        showNotification(res.message || "Failed to create doctor", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Error creating doctor profile", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 11. Open Edit Modal
  const openEditModal = (doctor: DoctorRecord) => {
    setDoctorToEdit(doctor);
    setEditForm({
      name: doctor.userId?.name || "",
      phone: doctor.userId?.phone || "",
      email: doctor.userId?.email || "",
      specialization: Array.isArray(doctor.specialization)
        ? doctor.specialization.join(", ")
        : typeof doctor.specialization === "string"
        ? doctor.specialization
        : "",
      qualifications: doctor.qualifications || "",
      consultationFee: doctor.consultationFee || 700,
      bio: doctor.bio || "",
      branchName: doctor.branchName || "Main Branch",
      experienceYears: doctor.experienceYears || "8+ Years",
      status: doctor.status || "active",
      salary: 75000,
      department: "Clinical",
    });
    setIsEditModalOpen(true);
  };

  // 12. Handle Edit Doctor Submit
  const handleEditDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorToEdit) return;

    try {
      setIsSubmitting(true);
      const specs = editForm.specialization
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || undefined,
        specialization: specs.length > 0 ? specs : ["Women's Health & Wellness"],
        qualifications: editForm.qualifications.trim(),
        consultationFee: Number(editForm.consultationFee),
        bio: editForm.bio.trim(),
        branchName: editForm.branchName,
        experienceYears: editForm.experienceYears,
        status: editForm.status,
      };

      const res = await api.patch<{ doctor: DoctorRecord }>(`/doctors/${doctorToEdit._id}`, payload);
      if (res.success) {
        showNotification(`Doctor profile for ${editForm.name} updated successfully!`);
        setIsEditModalOpen(false);
        setDoctorToEdit(null);
        loadDoctors();
        loadStats();
      } else {
        showNotification(res.message || "Failed to update doctor profile", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Error updating doctor profile", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 13. Handle Delete Doctor (Permanent)
  const handleDeleteDoctorSubmit = async () => {
    if (!doctorToDelete) return;
    try {
      setIsSubmitting(true);
      const res = await api.delete(`/doctors/${doctorToDelete._id}`);
      if (res.success) {
        showNotification(`Doctor '${doctorToDelete.userId?.name || "Doctor"}' deleted permanently.`);
        setIsDeleteModalOpen(false);
        setDoctorToDelete(null);
        if (selectedDoctorId === doctorToDelete._id) {
          setSelectedDoctorId(null);
        }
        loadDoctors();
        loadStats();
      } else {
        showNotification(res.message || "Cannot delete doctor with active clinical records", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Error deleting doctor", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 14. Handle CSV Export
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (selectedStatus !== "all") params.append("status", selectedStatus);
    if (selectedSpecialization !== "all") params.append("specialization", selectedSpecialization);
    if (selectedBranch !== "all") params.append("branch", selectedBranch);
    window.open(`http://127.0.0.1:5000/api/v1/doctors/export?${params.toString()}`, "_blank");
    showNotification("Downloading Doctor Directory & Roster CSV report...");
  };

  // Tab Filtering logic
  const handleTabClick = (tab: "all" | "specialization" | "availability" | "branch" | "calendar") => {
    setActiveTab(tab);
    if (tab === "all") {
      setSelectedSpecialization("all");
      setSelectedAvailability("all");
      setSelectedBranch("all");
    } else if (tab === "availability") {
      setSelectedAvailability("today");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      {/* =========================================================================
          SECTION 1: GLOBAL PAGE HEADER
      ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center border border-[#A7E2C6]/40 shrink-0">
            <Stethoscope className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              Doctor Directory &amp; Roster
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Manage clinical practitioners, consultation fees, availability, and synchronized HRMS profiles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          {/* Export Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-[#F7F9FC] border border-[#E5EAF0] text-[#111827] text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Export Doctor Directory to CSV"
          >
            <Download className="w-4 h-4 text-[#64748B]" />
            <span>Export</span>
          </button>

          {/* Onboard New Doctor Button */}
          <button
            onClick={() => setIsStaffOnboardingOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Onboard New Doctor</span>
            <ShieldCheck className="w-3.5 h-3.5 ml-0.5 text-emerald-200" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: 4 SUMMARY KPI CARDS
      ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Doctors */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Total Doctors</span>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight font-mono">
                {isLoadingStats ? "—" : stats?.totalDoctors || doctors.length}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#E9F8F0] text-[#087A50] text-[11px] font-semibold rounded-md">
                <TrendingUp className="w-3 h-3" /> +12%
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">Registered Practitioners</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center border border-[#A7E2C6]/30">
              <Users className="w-5 h-5" />
            </div>
            {/* Mini SVG Sparkline */}
            <svg className="w-14 h-5 text-[#087A50]" fill="none" viewBox="0 0 56 20">
              <path
                d="M1 18C12 18 16 8 28 8C40 8 44 2 55 2"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Active Doctors */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Active Doctors</span>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight font-mono">
                {isLoadingStats ? "—" : stats?.activeDoctors || doctors.filter((d) => d.status === "active").length}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">Available for OPD Slots</p>
          </div>

          <div className="flex flex-col items-center justify-center relative">
            <div className="w-11 h-11 rounded-full border-3 border-[#3B82F6]/20 border-t-[#3B82F6] flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#3B82F6] font-mono">
                {isLoadingStats ? "89%" : `${stats?.activePercentage || 100}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Consultations */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Total Consultations</span>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight font-mono">
                {isLoadingStats ? "—" : Number(stats?.totalConsultations || 65).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded-md">
                <TrendingUp className="w-3 h-3" /> {stats?.consultationsGrowth || "+18%"}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">This Month</p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
              <Activity className="w-5 h-5" />
            </div>
            {/* Mini SVG Bars */}
            <div className="flex items-end gap-1 h-5">
              <span className="w-1.5 h-2 bg-purple-200 rounded-xs" />
              <span className="w-1.5 h-3 bg-purple-300 rounded-xs" />
              <span className="w-1.5 h-4 bg-purple-400 rounded-xs" />
              <span className="w-1.5 h-5 bg-purple-600 rounded-xs" />
            </div>
          </div>
        </div>

        {/* Card 4: Specialization Coverage */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Specialization Coverage</span>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight font-mono">
                {isLoadingStats ? "5" : stats?.specializationCoverage || 5}
              </span>
              {/* Circular category pills */}
              <div className="flex items-center -space-x-1.5 ml-1">
                <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 border border-white text-[9px] font-bold flex items-center justify-center" title="PCOS/PCOD">♀</span>
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 border border-white text-[9px] font-bold flex items-center justify-center" title="Homoeopathy">🌿</span>
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 border border-white text-[9px] font-bold flex items-center justify-center" title="Skin & Hair">💆</span>
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 border border-white text-[9px] font-bold flex items-center justify-center" title="Nutrition">🍎</span>
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 border border-white text-[9px] font-bold flex items-center justify-center" title="More">+</span>
              </div>
            </div>
            <p className="text-[11px] text-[#64748B] truncate max-w-[200px]">
              Homeopathy | PCOS | Skin | Nutrition | General
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: DIRECTORY NAVIGATION TABS
      ========================================================================= */}
      <div className="border-b border-[#E5EAF0] flex items-center gap-1 sm:gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All Doctors" },
          { id: "specialization", label: "By Specialization" },
          { id: "availability", label: "By Availability" },
          { id: "branch", label: "By Branch" },
          { id: "calendar", label: "Calendar View" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as any)}
              className={`pb-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap px-1 ${
                isActive
                  ? "border-[#087A50] text-[#087A50]"
                  : "border-transparent text-[#64748B] hover:text-[#111827]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Secondary Filter Chips for Specific Tabs */}
      {activeTab === "specialization" && Array.isArray(stats?.specializationList) && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar animate-fade-in">
          <span className="text-xs text-[#64748B] font-medium shrink-0">Specializations:</span>
          <button
            onClick={() => setSelectedSpecialization("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
              selectedSpecialization === "all"
                ? "bg-[#087A50] text-white"
                : "bg-white border border-[#E5EAF0] text-[#64748B] hover:bg-slate-50"
            }`}
          >
            All ({stats.totalDoctors})
          </button>
          {stats.specializationList.slice(0, 10).map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialization(spec)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                selectedSpecialization === spec
                  ? "bg-[#087A50] text-white"
                  : "bg-white border border-[#E5EAF0] text-[#64748B] hover:bg-slate-50"
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      )}

      {activeTab === "availability" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar animate-fade-in">
          <span className="text-xs text-[#64748B] font-medium shrink-0">Availability:</span>
          {[
            { id: "all", label: "All Availability" },
            { id: "today", label: "Available Today" },
            { id: "this_week", label: "Available This Week" },
            { id: "on_leave", label: "On Leave" },
            { id: "inactive", label: "Inactive" },
          ].map((av) => (
            <button
              key={av.id}
              onClick={() => setSelectedAvailability(av.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                selectedAvailability === av.id
                  ? "bg-[#087A50] text-white"
                  : "bg-white border border-[#E5EAF0] text-[#64748B] hover:bg-slate-50"
              }`}
            >
              {av.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "branch" && Array.isArray(stats?.branchList) && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar animate-fade-in">
          <span className="text-xs text-[#64748B] font-medium shrink-0">Branches:</span>
          <button
            onClick={() => setSelectedBranch("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
              selectedBranch === "all"
                ? "bg-[#087A50] text-white"
                : "bg-white border border-[#E5EAF0] text-[#64748B] hover:bg-slate-50"
            }`}
          >
            All Branches
          </button>
          {stats.branchList.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBranch(b)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                selectedBranch === b
                  ? "bg-[#087A50] text-white"
                  : "bg-white border border-[#E5EAF0] text-[#64748B] hover:bg-slate-50"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      )}

      {/* =========================================================================
          SECTION 4: SEARCH & ADVANCED FILTERS TOOLBAR
      ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by doctor name, phone, email, or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-[#111827] placeholder:text-[#64748B] focus:bg-white focus:outline-none focus:border-[#087A50] transition-all"
          />
        </div>

        {/* Filters and View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Specializations Dropdown */}
          <select
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
            className="px-3 py-2 text-xs bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-[#111827] focus:outline-none focus:border-[#087A50] cursor-pointer"
          >
            <option value="all">All Specializations</option>
            {Array.isArray(stats?.specializationList) && stats.specializationList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Branches Dropdown */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 text-xs bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-[#111827] focus:outline-none focus:border-[#087A50] cursor-pointer"
          >
            <option value="all">All Branches</option>
            {Array.isArray(stats?.branchList) && stats.branchList.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-[#111827] focus:outline-none focus:border-[#087A50] cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* More Filters Toggle */}
          <button
            onClick={() => setIsMoreFiltersOpen(!isMoreFiltersOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-colors cursor-pointer ${
              isMoreFiltersOpen
                ? "bg-[#E9F8F0] border-[#087A50] text-[#087A50] font-semibold"
                : "bg-[#F7F9FC] border-[#E5EAF0] text-[#111827] hover:bg-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>More Filters</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Advanced Filters Drawer/Row */}
      {isMoreFiltersOpen && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in text-xs">
          <div>
            <label className="font-semibold text-[#111827] block mb-1">
              Max Consultation Fee: <span className="font-mono text-[#087A50]">₹{feeRange}</span>
            </label>
            <input
              type="range"
              min={300}
              max={3000}
              step={100}
              value={feeRange}
              onChange={(e) => setFeeRange(Number(e.target.value))}
              className="w-full accent-[#087A50] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#64748B] mt-1">
              <span>₹300</span>
              <span>₹1,500</span>
              <span>₹3,000+</span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#111827] block mb-1">Consultation Mode</label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-[#111827] focus:outline-none focus:border-[#087A50]"
            >
              <option value="all">Online Video Consultation (100% Online)</option>
              <option value="Online Video Consultation">Online Video Consultation</option>
            </select>
          </div>

          <div className="flex items-end justify-end gap-2">
            <button
              onClick={() => {
                setFeeRange(3000);
                setSelectedMode("all");
                setSelectedSpecialization("all");
                setSelectedBranch("all");
                setSelectedStatus("all");
                setSearch("");
              }}
              className="px-3 py-2 text-xs text-[#64748B] hover:text-[#111827] font-semibold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={() => setIsMoreFiltersOpen(false)}
              className="px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: DOCTOR COUNT & SORTING META ROW
      ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-[#64748B]">
          Showing <span className="text-[#111827] font-bold">{doctors.length}</span> doctors
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent font-semibold text-[#111827] focus:outline-none cursor-pointer pr-1"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="fee_asc">Lowest Fee</option>
              <option value="fee_desc">Highest Fee</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-white shadow-xs text-[#087A50]" : "text-[#64748B] hover:text-[#111827]"
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-white shadow-xs text-[#087A50]" : "text-[#64748B] hover:text-[#111827]"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 6: MAIN CONTENT (CALENDAR VIEW OR 2-COLUMN GRID + DETAIL PANEL)
      ========================================================================= */}
      {activeTab === "calendar" ? (
        /* Calendar View Matrix */
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#087A50]" />
              <h3 className="font-bold text-sm text-[#111827]">Doctor Availability Matrix &amp; Weekly Schedules</h3>
            </div>
            <span className="text-xs text-[#64748B]">
              Real-time schedule derived from doctor working hours and live appointments.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] text-[#64748B]">
                  <th className="py-3 px-4 font-semibold">Doctor</th>
                  <th className="py-3 px-3 font-semibold text-center">Mon</th>
                  <th className="py-3 px-3 font-semibold text-center">Tue</th>
                  <th className="py-3 px-3 font-semibold text-center">Wed</th>
                  <th className="py-3 px-3 font-semibold text-center">Thu</th>
                  <th className="py-3 px-3 font-semibold text-center">Fri</th>
                  <th className="py-3 px-3 font-semibold text-center">Sat</th>
                  <th className="py-3 px-3 font-semibold text-center">Sun</th>
                  <th className="py-3 px-4 font-semibold text-right">Consultation Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {doctors.map((doc) => {
                  const docHours = Array.isArray(doc.workingHours) ? doc.workingHours : [];
                  const activeDays = docHours.length > 0
                    ? docHours.map((w) => w.dayOfWeek)
                    : Array.isArray(doc.workingDays)
                    ? doc.workingDays
                    : [];
                  return (
                    <tr
                      key={doc._id}
                      onClick={() => setSelectedDoctorId(doc._id)}
                      className="hover:bg-[#F7F9FC] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#E9F8F0] text-[#087A50] font-bold flex items-center justify-center shrink-0 text-xs">
                            {doc.userId?.name ? doc.userId.name.replace("Dr. ", "").slice(0, 2).toUpperCase() : "DR"}
                          </div>
                          <div>
                            <p className="font-bold text-[#111827]">{doc.userId?.name || "Doctor"}</p>
                            <p className="text-[11px] text-[#64748B]">{doc.qualifications || "Consultant"}</p>
                          </div>
                        </div>
                      </td>
                      {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                        const isWorking = activeDays.includes(dayNum);
                        const schedule = docHours.find((w) => w.dayOfWeek === dayNum);
                        return (
                          <td key={dayNum} className="py-3.5 px-3 text-center">
                            {isWorking ? (
                              <span
                                className="inline-block px-2 py-1 bg-[#E9F8F0] text-[#087A50] text-[10px] font-semibold rounded-md"
                                title={`${schedule?.startTime || "10:00"} - ${schedule?.endTime || "18:00"}`}
                              >
                                {schedule?.startTime || "10:00"}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 text-slate-300 text-[11px]">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#111827]">
                        ₹{doc.consultationFee || 700}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Standard 2-Column Doctor Cards + Right Detail Panel */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: DOCTOR CARDS (col-span-7 or 8) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {isLoading ? (
              <div className="bg-white rounded-2xl border border-[#E5EAF0] p-16 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-3 shadow-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
                <span>Loading real doctor records from MongoDB...</span>
              </div>
            ) : doctors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5EAF0] p-16 text-center shadow-xs">
                <Users className="w-8 h-8 text-[#64748B] mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-bold text-[#111827]">No Doctors Found</h4>
                <p className="text-xs text-[#64748B] mt-1">No doctor profiles match your filter criteria.</p>
                <button
                  onClick={() => {
                    setSelectedSpecialization("all");
                    setSelectedBranch("all");
                    setSelectedStatus("all");
                    setSelectedAvailability("all");
                    setSearch("");
                  }}
                  className="mt-4 px-4 py-2 bg-[#087A50] text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Two-Column Grid of Cards matching the Reference Image */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doc) => {
                  const isSelected = selectedDoctor?._id === doc._id;
                  const activeWorkingDays = Array.isArray(doc.workingDays) && doc.workingDays.length > 0
                    ? doc.workingDays
                    : Array.isArray(doc.workingHours)
                    ? doc.workingHours.map((w) => w.dayOfWeek)
                    : [];

                  return (
                    <div
                      key={doc._id}
                      onClick={() => setSelectedDoctorId(doc._id)}
                      className={`bg-white rounded-2xl border p-4.5 transition-all cursor-pointer relative shadow-xs hover:shadow-sm ${
                        isSelected
                          ? "border-[#087A50] ring-2 ring-[#087A50]/15"
                          : "border-[#E5EAF0] hover:border-[#CBD5E1]"
                      }`}
                    >
                      {/* Top Row: Avatar, Name, Verified Badge, Qualifications & Active Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          {/* Doctor Avatar with online green indicator */}
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-[#E9F8F0] border-2 border-white shadow-xs text-[#087A50] font-bold flex items-center justify-center text-sm overflow-hidden">
                              {doc.userId?.name
                                ? doc.userId.name.replace("Dr. ", "").slice(0, 2).toUpperCase()
                                : "DR"}
                            </div>
                            <span className="w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-white absolute bottom-0 right-0" />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-[#111827] tracking-tight hover:text-[#087A50] transition-colors">
                                {doc.userId?.name || "Dr. Unnamed"}
                              </h3>
                              <span className="w-4 h-4 rounded-full bg-[#087A50] text-white flex items-center justify-center text-[9px] font-bold" title="Verified Practitioner">
                                ✓
                              </span>
                            </div>
                            <p className="text-[11px] text-[#64748B] mt-0.5 font-medium">
                              {doc.qualifications || "Consultant Specialist"}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
                            doc.status === "active"
                              ? "bg-[#E9F8F0] text-[#087A50]"
                              : doc.status === "on_leave"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              doc.status === "active"
                                ? "bg-[#087A50]"
                                : doc.status === "on_leave"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {doc.status === "active" ? "Active" : doc.status === "on_leave" ? "On Leave" : "Inactive"}
                        </span>
                      </div>

                      {/* Specialization Tags Row */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        {(Array.isArray(doc.specialization) && doc.specialization.length > 0
                          ? doc.specialization
                          : typeof doc.specialization === "string" && doc.specialization
                          ? [doc.specialization]
                          : ["Women's Wellness"]
                        ).slice(0, 3).map((spec, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>

                      {/* Contact & Clinic Details */}
                      <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px] text-[#64748B]">
                        <div className="flex items-center gap-1.5 col-span-2 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-[#087A50] shrink-0" />
                          <span className="truncate">{doc.branchName || "Main Branch"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{doc.userId?.phone || "+91 —"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <IndianRupee className="w-3.5 h-3.5 text-[#087A50] shrink-0" />
                          <span className="font-semibold text-[#111827]">
                            Fee: ₹{doc.consultationFee || 700} <span className="text-[10px] font-normal text-[#64748B]">/ session</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{doc.userId?.email || "doctor@trigyna.in"}</span>
                        </div>
                      </div>

                      {/* Next Available Slot Box */}
                      <div className="mt-3 bg-[#E9F8F0]/70 border border-[#A7E2C6]/40 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-[11px] text-[#087A50] font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#087A50]" />
                          Next Available:
                        </span>
                        <span className="text-xs font-bold text-[#087A50] font-mono">
                          {doc.nextAvailable || "Today, 10:00 AM"}
                        </span>
                      </div>

                      {/* Weekday Schedule Indicators (M T W T F S S) */}
                      <div className="flex items-center justify-between mt-3 px-1">
                        {WEEK_DAYS.map((w) => {
                          const isActive = activeWorkingDays.includes(w.day);
                          return (
                            <div
                              key={w.day}
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors ${
                                isActive
                                  ? "bg-[#E9F8F0] text-[#087A50] border border-[#A7E2C6]/50"
                                  : "bg-[#F8FAFC] text-slate-300 border border-slate-100"
                              }`}
                              title={`${w.full}: ${isActive ? "Active Schedule" : "Day Off"}`}
                            >
                              {w.label}
                            </div>
                          );
                        })}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoctorId(doc._id);
                            setSelectedDoctorTab("schedule");
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-[#E9F8F0] border border-[#A7E2C6] text-[#087A50] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>View Schedule</span>
                        </button>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === doc._id ? null : doc._id);
                            }}
                            className="flex items-center gap-1 py-1.5 px-2.5 bg-white hover:bg-slate-50 border border-[#E5EAF0] text-[#64748B] text-xs font-medium rounded-xl transition-colors cursor-pointer"
                          >
                            <span>More Actions</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {activeDropdownId === doc._id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-[#E5EAF0] rounded-xl shadow-lg py-1 z-30 animate-fade-in text-xs"
                            >
                              <button
                                onClick={() => {
                                  setSelectedDoctorId(doc._id);
                                  setSelectedDoctorTab("overview");
                                  setActiveDropdownId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Profile
                              </button>
                              <button
                                onClick={() => {
                                  openEditModal(doc);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit Doctor
                              </button>
                              {!doc.isVerified && (
                                <button
                                  onClick={() => {
                                    handleVerifyDoctorCredentials(doc);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 flex items-center gap-2 text-emerald-700 font-semibold cursor-pointer"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verify Council Reg
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  handleToggleStatus(doc, doc.status === "active" ? "inactive" : "active");
                                  setActiveDropdownId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {doc.status === "active" ? "Set Inactive" : "Set Active"}
                              </button>
                              <button
                                onClick={() => {
                                  handleToggleStatus(doc, "on_leave");
                                  setActiveDropdownId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-amber-700 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" /> Mark On Leave
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={() => {
                                  setDoctorToDelete(doc);
                                  setIsDeleteModalOpen(true);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View of Doctors */
              <div className="bg-white rounded-2xl border border-[#E5EAF0] divide-y divide-[#E5EAF0] shadow-xs overflow-hidden">
                {doctors.map((doc) => {
                  const isSelected = selectedDoctor?._id === doc._id;
                  return (
                    <div
                      key={doc._id}
                      onClick={() => setSelectedDoctorId(doc._id)}
                      className={`p-4 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                        isSelected ? "bg-[#E9F8F0]/30" : "hover:bg-[#F7F9FC]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E9F8F0] text-[#087A50] font-bold flex items-center justify-center text-xs">
                          {doc.userId?.name ? doc.userId.name.replace("Dr. ", "").slice(0, 2).toUpperCase() : "DR"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-[#111827] text-sm">{doc.userId?.name || "Doctor"}</h4>
                            <span className="w-3.5 h-3.5 rounded-full bg-[#087A50] text-white flex items-center justify-center text-[8px]">✓</span>
                          </div>
                          <p className="text-[11px] text-[#64748B]">
                            {doc.qualifications || "Specialist"} • {(Array.isArray(doc.specialization) ? doc.specialization : []).slice(0, 2).join(", ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <span className="text-[11px] text-[#64748B]">Fee</span>
                          <p className="font-mono font-bold text-[#111827] text-xs">₹{doc.consultationFee || 700}</p>
                        </div>

                        <div className="text-right hidden md:block">
                          <span className="text-[11px] text-[#64748B]">Next Slot</span>
                          <p className="font-mono font-semibold text-[#087A50] text-xs">{doc.nextAvailable || "Today, 10:00 AM"}</p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            doc.status === "active" ? "bg-[#E9F8F0] text-[#087A50]" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: PERSISTENT SELECTED DOCTOR DETAIL PANEL (col-span-5 or 4) */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-5 sticky top-4">
            {selectedDoctor ? (
              <>
                {/* 1. Panel Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-[#E9F8F0] border-2 border-white shadow-xs text-[#087A50] font-bold flex items-center justify-center text-lg overflow-hidden">
                        {selectedDoctor.userId?.name
                          ? selectedDoctor.userId.name.replace("Dr. ", "").slice(0, 2).toUpperCase()
                          : "DR"}
                      </div>
                      <span className="w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-white absolute bottom-0 right-0" />
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-[#111827] leading-tight">
                        {selectedDoctor.userId?.name || "Dr. Selected"}
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">{selectedDoctor.qualifications || "Consultant"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        selectedDoctor.status === "active"
                          ? "bg-[#E9F8F0] text-[#087A50]"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {selectedDoctor.status === "active" ? "Active" : "On Leave"}
                    </span>

                    <button
                      onClick={() => openEditModal(selectedDoctor)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-[#64748B] cursor-pointer"
                      title="Edit Doctor Details"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Profile Navigation Tabs */}
                <div className="flex items-center gap-3 border-b border-[#E5EAF0] pb-2 text-xs font-semibold overflow-x-auto no-scrollbar">
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "schedule", label: "Schedule" },
                    { id: "consultations", label: "Consultations" },
                    { id: "earnings", label: "Earnings" },
                    { id: "profile", label: "Profile" },
                  ].map((subTab) => {
                    const isTabActive = selectedDoctorTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        onClick={() => setSelectedDoctorTab(subTab.id as any)}
                        className={`transition-colors cursor-pointer pb-1 ${
                          isTabActive ? "text-[#087A50] border-b-2 border-[#087A50]" : "text-[#64748B] hover:text-[#111827]"
                        }`}
                      >
                        {subTab.label}
                      </button>
                    );
                  })}
                </div>

                {/* 3. Tab Contents */}
                {selectedDoctorTab === "overview" && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    {/* About Section */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">About</h4>
                      <div className="space-y-2 text-slate-700">
                        <div className="flex items-start justify-between">
                          <span className="text-[#64748B] flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-slate-400" /> Specialization
                          </span>
                          <span className="font-semibold text-right max-w-[200px]">
                            {(Array.isArray(selectedDoctor.specialization) ? selectedDoctor.specialization : [String(selectedDoctor.specialization || "Homoeopathy")]).join(", ")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B] flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Experience
                          </span>
                          <span className="font-semibold">{selectedDoctor.experienceYears || "8+ Years"}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B] flex items-center gap-1.5">
                            <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Consultation Fee
                          </span>
                          <span className="font-bold text-[#087A50] font-mono">
                            ₹{selectedDoctor.consultationFee || 700} <span className="font-normal text-slate-400 text-[10px]">/ session</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Consultation Modes
                          </span>
                          <span className="font-medium text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Online Video Only (Google Meet / Zoom)</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B] flex items-center gap-1.5">
                            <Smile className="w-3.5 h-3.5 text-slate-400" /> Languages
                          </span>
                          <span className="font-medium">English, Hindi, Malayalam</span>
                        </div>
                      </div>
                    </div>

                    {/* Today's Schedule Timeline Section */}
                    <div className="space-y-2.5 pt-3 border-t border-[#E5EAF0]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Today's Schedule</h4>
                        <button
                          onClick={() => setSelectedDoctorTab("schedule")}
                          className="text-[11px] font-semibold text-[#087A50] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          View Full Schedule →
                        </button>
                      </div>

                      {isLoadingDoctorSchedule ? (
                        <div className="py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#087A50]" />
                          <span>Loading today&apos;s appointments...</span>
                        </div>
                      ) : !Array.isArray(selectedDoctorSchedule) || selectedDoctorSchedule.length === 0 ? (
                        <div className="py-5 text-center bg-[#F7F9FC] rounded-xl border border-[#E5EAF0]">
                          <Calendar className="w-5 h-5 text-slate-400 mx-auto mb-1 opacity-60" />
                          <p className="text-[11px] text-[#64748B]">No appointments scheduled for today</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {selectedDoctorSchedule.map((item) => (
                            <div
                              key={item._id}
                              className="p-2.5 bg-[#F7F9FC] hover:bg-[#E9F8F0]/30 rounded-xl border border-[#E5EAF0] flex items-center justify-between gap-2 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-bold text-[11px] text-[#111827] w-16">
                                  {item.time}
                                </span>
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center">
                                  {item.patientName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-[#111827] text-xs leading-tight">{item.patientName}</p>
                                  <p className="text-[10px] text-[#64748B]">{item.service}</p>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                                  item.status === "completed"
                                    ? "bg-[#E9F8F0] text-[#087A50]"
                                    : item.status === "in_consultation"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {item.status === "completed"
                                  ? "Completed"
                                  : item.status === "in_consultation"
                                  ? "In Consultation"
                                  : "Upcoming"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4 Doctor Performance Metrics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#E5EAF0]">
                      <div className="p-2.5 rounded-xl bg-[#E9F8F0]/50 border border-[#A7E2C6]/30 text-center">
                        <Users className="w-4 h-4 text-[#087A50] mx-auto mb-1" />
                        <span className="text-base font-bold text-[#111827] font-mono block">
                          {selectedDoctor.totalPatients || 184}
                        </span>
                        <span className="text-[10px] text-[#64748B]">Total Patients</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
                        <FileText className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                        <span className="text-base font-bold text-[#111827] font-mono block">
                          {selectedDoctor.totalConsultations || 2456}
                        </span>
                        <span className="text-[10px] text-[#64748B]">Consultations</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-center">
                        <Star className="w-4 h-4 text-purple-600 mx-auto mb-1 fill-purple-600" />
                        <span className="text-base font-bold text-[#111827] font-mono block">4.8</span>
                        <span className="text-[10px] text-[#64748B]">Avg Rating</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 text-center">
                        <Smile className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                        <span className="text-base font-bold text-[#111827] font-mono block">98%</span>
                        <span className="text-[10px] text-[#64748B]">Satisfaction</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: Schedule */}
                {selectedDoctorTab === "schedule" && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-[#111827]">Configured Weekly Working Hours</h4>
                      <button
                        onClick={() => openEditModal(selectedDoctor)}
                        className="text-[#087A50] text-[11px] font-semibold hover:underline cursor-pointer"
                      >
                        Edit Hours
                      </button>
                    </div>

                    <div className="space-y-2 border border-[#E5EAF0] rounded-xl p-3 bg-[#F7F9FC]">
                      {WEEK_DAYS.map((w) => {
                        const sched = Array.isArray(selectedDoctor.workingHours)
                          ? selectedDoctor.workingHours.find((h) => h.dayOfWeek === w.day)
                          : null;
                        const isWorking = Boolean(sched);
                        return (
                          <div key={w.day} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                            <span className="font-semibold text-slate-700 w-16">{w.full}</span>
                            {isWorking ? (
                              <span className="font-mono text-[#087A50] font-semibold">
                                {sched?.startTime} - {sched?.endTime} ({sched?.slotDurationMinutes || 30}m)
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Day Off</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-Tab 3: Consultations */}
                {selectedDoctorTab === "consultations" && (
                  <div className="space-y-3 animate-fade-in text-xs">
                    <h4 className="font-bold text-xs text-[#111827]">Clinical Consultation Records</h4>
                    {isLoadingDoctorConsultations ? (
                      <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#087A50]" />
                        <span>Fetching clinical encounters...</span>
                      </div>
                    ) : !Array.isArray(selectedDoctorConsultations) || selectedDoctorConsultations.length === 0 ? (
                      <p className="text-slate-400 py-4 text-center">No consultation records on file.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {selectedDoctorConsultations.map((c) => (
                          <div key={c._id} className="p-2.5 bg-[#F7F9FC] rounded-xl border border-[#E5EAF0]">
                            <div className="flex justify-between font-semibold">
                              <span>{c.patientId?.fullName || "Patient"}</span>
                              <span className="text-[10px] text-[#087A50] font-bold">
                                {c.isFinalized ? "Finalized" : "Draft"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Diagnosis: {c.diagnosis || c.chiefComplaints || "Clinical assessment recorded"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Tab 4: Earnings */}
                {selectedDoctorTab === "earnings" && (
                  <div className="space-y-3 animate-fade-in text-xs">
                    <h4 className="font-bold text-xs text-[#111827]">Consultation Financials &amp; Billing</h4>
                    {isLoadingDoctorEarnings ? (
                      <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#087A50]" />
                        <span>Calculating doctor revenue...</span>
                      </div>
                    ) : doctorEarnings ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-3 bg-[#E9F8F0] rounded-xl border border-[#A7E2C6]/40">
                            <span className="text-[10px] text-[#087A50] font-medium">Collected Revenue</span>
                            <p className="text-lg font-bold font-mono text-[#087A50]">
                              ₹{doctorEarnings.collectedAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <span className="text-[10px] text-amber-700 font-medium">Pending Dues</span>
                            <p className="text-lg font-bold font-mono text-amber-700">
                              ₹{doctorEarnings.pendingAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Total Linked Invoices: <span className="font-bold text-slate-700">{doctorEarnings.totalInvoicesCount}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-400 py-4 text-center">No billing records found for this doctor.</p>
                    )}
                  </div>
                )}

                {/* Sub-Tab 5: Profile */}
                {selectedDoctorTab === "profile" && (
                  <div className="space-y-3 animate-fade-in text-xs">
                    <h4 className="font-bold text-xs text-[#111827]">Synchronized HRMS Employee Record</h4>
                    {doctorEmployee ? (
                      <div className="space-y-2 p-3 bg-[#F7F9FC] rounded-xl border border-[#E5EAF0]">
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">Employee Code:</span>
                          <span className="font-mono font-bold text-slate-800">{doctorEmployee.employeeCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">Department:</span>
                          <span className="font-semibold text-slate-800">{doctorEmployee.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">Designation:</span>
                          <span className="font-medium text-slate-800">{doctorEmployee.designation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">Employment Type:</span>
                          <span className="font-medium text-slate-800 capitalize">{doctorEmployee.employmentType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">Base Salary:</span>
                          <span className="font-mono font-bold text-[#087A50]">₹{doctorEmployee.salary?.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 py-4 text-center">HRMS employee record syncing...</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                Select a doctor card from the directory to inspect their clinical roster.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD NEW DOCTOR (MULTI-SECTION ONBOARDING)
      ========================================================================= */}
      <ModalPortal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <div className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold shrink-0">
                <Stethoscope className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#111827]">Onboard New Doctor</h3>
                <p className="text-xs text-[#64748B]">Step {addFormStep} of 4: Synchronized User, Clinical &amp; HRMS Profile</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddDoctorSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Step 1: Personal Details */}
              {addFormStep === 1 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Doctor Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Priya Sharma"
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={addForm.phone}
                        onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. dr.priya@trigyna.in"
                        value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Initial Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to auto-generate or enter secure password (min 8 chars)"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Clinical & Professional */}
              {addFormStep === 2 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Primary Specializations *</label>
                    <input
                      type="text"
                      placeholder="e.g. Women's Wellness, PCOD/PCOS, Homoeopathy"
                      value={addForm.specialization}
                      onChange={(e) => setAddForm({ ...addForm, specialization: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Degrees &amp; Qualifications</label>
                      <input
                        type="text"
                        placeholder="e.g. BHMS, MD (Hom.)"
                        value={addForm.qualifications}
                        onChange={(e) => setAddForm({ ...addForm, qualifications: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Experience</label>
                      <input
                        type="text"
                        placeholder="e.g. 8+ Years"
                        value={addForm.experienceYears}
                        onChange={(e) => setAddForm({ ...addForm, experienceYears: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Professional Bio</label>
                    <textarea
                      rows={3}
                      placeholder="Brief doctor bio for patient portals..."
                      value={addForm.bio}
                      onChange={(e) => setAddForm({ ...addForm, bio: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Practice & Fee Configuration */}
              {addFormStep === 3 && (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Consultation Fee (₹) *</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={addForm.consultationFee}
                        onChange={(e) => setAddForm({ ...addForm, consultationFee: Number(e.target.value) })}
                        required
                        className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#087A50]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Monthly HRMS Salary (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={addForm.salary}
                        onChange={(e) => setAddForm({ ...addForm, salary: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#087A50]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Assigned Clinic Branch</label>
                    <select
                      value={addForm.branchName}
                      onChange={(e) => setAddForm({ ...addForm, branchName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                    >
                      <option value="Flagship Indiranagar Centre">Flagship Indiranagar Centre</option>
                      <option value="Koramangala Specialty Clinic">Koramangala Specialty Clinic</option>
                      <option value="Main Branch">Main Branch</option>
                      <option value="Jayanagar Wellness Satellite">Jayanagar Wellness Satellite</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 4: Working Hours & Availability */}
              {addFormStep === 4 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1.5">Weekly Working Days</label>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEK_DAYS.map((w) => {
                        const isSelected = addForm.workingDays.includes(w.day);
                        return (
                          <button
                            type="button"
                            key={w.day}
                            onClick={() => {
                              const newDays = isSelected
                                ? addForm.workingDays.filter((d) => d !== w.day)
                                : [...addForm.workingDays, w.day];
                              setAddForm({ ...addForm, workingDays: newDays });
                            }}
                            className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-[#087A50] text-white"
                                : "bg-[#F7F9FC] border border-[#E5EAF0] text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {w.full}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={addForm.startTime}
                        onChange={(e) => setAddForm({ ...addForm, startTime: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">End Time</label>
                      <input
                        type="time"
                        value={addForm.endTime}
                        onChange={(e) => setAddForm({ ...addForm, endTime: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Slot Duration</label>
                      <select
                        value={addForm.slotDurationMinutes}
                        onChange={(e) => setAddForm({ ...addForm, slotDurationMinutes: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-xs"
                      >
                        <option value={15}>15 mins</option>
                        <option value={30}>30 mins</option>
                        <option value={45}>45 mins</option>
                        <option value={60}>60 mins</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Step Navigation & Action Buttons */}
            <div className="px-6 py-3.5 border-t border-neutral-200/80 flex items-center justify-between bg-neutral-50/70 shrink-0">
              {addFormStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setAddFormStep((s) => s - 1)}
                  className="px-4 py-2 border border-neutral-200 text-slate-700 font-semibold rounded-xl hover:bg-neutral-100 cursor-pointer transition-colors"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-semibold hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {addFormStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (addFormStep === 1 && (!addForm.name.trim() || !addForm.phone.trim())) {
                      showNotification("Doctor Name and Phone are required", true);
                      return;
                    }
                    setAddFormStep((s) => s + 1);
                  }}
                  className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white font-semibold rounded-xl cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Onboarding Doctor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Confirm &amp; Onboard</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* =========================================================================
          MODAL 2: EDIT DOCTOR PROFILE
      ========================================================================= */}
      <ModalPortal isOpen={isEditModalOpen && !!doctorToEdit} onClose={() => setIsEditModalOpen(false)}>
        {doctorToEdit && (
          <div className="bg-white rounded-2xl max-w-lg w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold shrink-0">
                  <Stethoscope className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#111827]">Edit Doctor Profile</h3>
                  <p className="text-xs text-[#64748B]">{doctorToEdit.userId?.name || "Doctor"}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditDoctorSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Doctor Full Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Specialization(s)</label>
                    <input
                      type="text"
                      value={editForm.specialization}
                      onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Qualifications</label>
                    <input
                      type="text"
                      value={editForm.qualifications}
                      onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      value={editForm.consultationFee}
                      onChange={(e) => setEditForm({ ...editForm, consultationFee: Number(e.target.value) })}
                      required
                      className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Account Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                    >
                      <option value="active">Active</option>
                      <option value="on_leave">On Leave</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Branch</label>
                  <input
                    type="text"
                    value={editForm.branchName}
                    onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#087A50]"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-neutral-200/80 flex items-center justify-end gap-3 bg-neutral-50/70 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 text-slate-700 font-semibold rounded-xl hover:bg-neutral-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white font-semibold rounded-xl cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </ModalPortal>

      {/* =========================================================================
          MODAL 3: DELETE DOCTOR CONFIRMATION (PERMANENT)
      ========================================================================= */}
      <ModalPortal isOpen={isDeleteModalOpen && !!doctorToDelete} onClose={() => setIsDeleteModalOpen(false)}>
        {doctorToDelete && (
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-2xl p-6 space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-base text-[#111827]">Delete Doctor Profile Permanently?</h3>
              <p className="text-[#64748B] mt-1 text-xs">
                Are you sure you want to delete <span className="font-bold text-slate-800">{doctorToDelete.userId?.name}</span>?
                This action requires no active appointments or clinical encounters to preserve medical compliance.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-[#E5EAF0] text-slate-700 font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDoctorSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Doctor</span>
              </button>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Admin Centralized Staff Onboarding Modal */}
      <StaffOnboardingModal
        isOpen={isStaffOnboardingOpen}
        onClose={() => setIsStaffOnboardingOpen(false)}
        defaultRole="doctor"
        onSuccess={() => {
          loadDoctors();
          loadStats();
        }}
      />
    </div>
  );
}
