"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Briefcase,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { SalesUser, ServiceItem } from "./crmTypes";

interface CrmAddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: () => void;
  showNotification: (msg: string, isError?: boolean) => void;
  preselectedStage?: string;
}

export function CrmAddLeadModal({
  isOpen,
  onClose,
  onLeadCreated,
  showNotification,
  preselectedStage = "new",
}: CrmAddLeadModalProps) {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Female");

  const [serviceInterest, setServiceInterest] = useState("Skin & Hair");
  const [consultationMode, setConsultationMode] = useState("Online Video Consultation");
  const [source, setSource] = useState("website_enquiry");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [message, setMessage] = useState("");

  const [assignedTo, setAssignedTo] = useState("");
  const [branch, setBranch] = useState("Main Clinic");

  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("10:30");
  const [followUpType, setFollowUpType] = useState("Phone Call");
  const [followUpNotes, setFollowUpNotes] = useState("");

  // Live options from backend
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    // Load live services
    api
      .get<{ services?: ServiceItem[]; total?: number }>("/services")
      .then((res) => {
        const sList = res.data?.services || [];
        if (sList.length > 0) {
          setServices(sList);
          if (!serviceInterest) setServiceInterest(sList[0].name);
        }
      })
      .catch(() => {});

    // Load live sales team
    api
      .get<{ team?: SalesUser[] }>("/crm/team")
      .then((res) => {
        const tList = res.data?.team || [];
        if (tList.length > 0) {
          setSalesUsers(tList);
          if (!assignedTo) setAssignedTo(tList[0]._id);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Check duplicate when phone changes
  const checkDuplicatePhone = async (val: string) => {
    const clean = val.replace(/[^0-9+]/g, "").trim();
    if (clean.length >= 10) {
      try {
        const res = await api.get<{ hasDuplicate: boolean; lead?: { fullName: string; status: string } }>(
          `/crm/check-duplicates?phone=${encodeURIComponent(clean)}`
        );
        if (res.data?.hasDuplicate && res.data.lead) {
          setDuplicateWarning(
            `A lead already exists for this phone: "${res.data.lead.fullName}" (Stage: ${res.data.lead.status}). Submission will flag candidate link.`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showNotification("Full name is required", true);
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, "").trim();
    if (!cleanPhone || cleanPhone.replace(/\D/g, "").length < 10) {
      showNotification("A valid 10-digit phone number is required", true);
      return;
    }

    setIsSubmitting(true);
    try {
      let combinedFollowUpDate = undefined;
      if (followUpDate) {
        combinedFollowUpDate = new Date(`${followUpDate}T${followUpTime || "10:30"}:00`).toISOString();
      }

      const payload = {
        fullName: fullName.trim(),
        phone: cleanPhone,
        whatsappNumber: whatsappNumber ? whatsappNumber.trim() : undefined,
        email: email ? email.trim().toLowerCase() : undefined,
        age: age ? Number(age) : undefined,
        gender,
        serviceInterest,
        consultationMode,
        source,
        priority,
        status: preselectedStage || "new",
        message: message.trim(),
        assignedTo: assignedTo || undefined,
        followUpDate: combinedFollowUpDate,
        notes: followUpNotes ? `[Initial Intake] ${followUpNotes}` : undefined,
      };

      const res = await api.post<{ lead: { _id: string; fullName: string } }>("/crm/leads", payload);
      if (res.success) {
        showNotification(`Lead "${fullName}" created successfully in pipeline!`);
        onLeadCreated();
        onClose();
      } else {
        showNotification(res.message || "Failed to create lead", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Failed to create lead record", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E5EAF0] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-[#E9F8F0]/50 border-b border-[#E5EAF0] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#087A50] text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#111827]">Add New Lead</h2>
              <p className="text-xs text-[#64748B]">
                Capture prospective patient enquiry into TriGyna CRM workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white text-[#64748B] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-step Navigation Pills */}
        <div className="px-6 py-3 bg-[#F7F9FC] border-b border-[#E5EAF0] flex items-center justify-between overflow-x-auto text-xs font-semibold text-[#64748B]">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeStep === 1 ? "bg-[#087A50] text-white shadow-2xs" : "hover:text-[#111827]"
            }`}
          >
            <span>1. Personal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeStep === 2 ? "bg-[#087A50] text-white shadow-2xs" : "hover:text-[#111827]"
            }`}
          >
            <span>2. Enquiry</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeStep === 3 ? "bg-[#087A50] text-white shadow-2xs" : "hover:text-[#111827]"
            }`}
          >
            <span>3. Assignment</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(4)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeStep === 4 ? "bg-[#087A50] text-white shadow-2xs" : "hover:text-[#111827]"
            }`}
          >
            <span>4. Follow-up</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(5)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeStep === 5 ? "bg-[#087A50] text-white shadow-2xs" : "hover:text-[#111827]"
            }`}
          >
            <span>5. Review</span>
          </button>
        </div>

        {/* Duplicate warning alert */}
        {duplicateWarning && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* STEP 1: Personal Information */}
            {activeStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunita Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        checkDuplicatePhone(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      WhatsApp Number (if different)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. sunita@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 28"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Enquiry Information */}
            {activeStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Interested Healthcare Service <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={serviceInterest}
                      onChange={(e) => setServiceInterest(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    >
                      {services.length > 0 ? (
                        services.map((s) => (
                          <option key={s._id} value={s.name}>
                            {s.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Skin & Hair">Skin &amp; Hair</option>
                          <option value="PCOD/PCOS Management">PCOD/PCOS Management</option>
                          <option value="Homoeopathy Consultation">Homoeopathy Consultation</option>
                          <option value="Diet & Nutrition">Diet &amp; Nutrition</option>
                          <option value="Fertility & Conception">Fertility &amp; Conception</option>
                          <option value="General Medicine">General Medicine</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Lead Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    >
                      <option value="website_enquiry">Website Enquiry</option>
                      <option value="whatsapp">WhatsApp Inbound</option>
                      <option value="meta_lead_ad">Meta Ads (Facebook/Instagram)</option>
                      <option value="referral">Doctor / Patient Referral</option>
                      <option value="phone">Phone Call Direct</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Consultation Mode
                    </label>
                    <div className="w-full px-3 py-2 text-xs border border-emerald-200 bg-emerald-50/60 text-[#087A50] font-semibold rounded-xl flex items-center justify-between">
                      <span>Online Video Consultation</span>
                      <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Online</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Initial Enquiry Message / Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe symptoms, concerns, or special requests..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Assignment */}
            {activeStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Assigned Sales / CRM Representative
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                  >
                    <option value="">Auto-Assign (Round Robin)</option>
                    {salesUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    The assigned representative will receive task notifications and pipeline updates.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Clinic Branch / Center
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                  >
                    <option value="Main Clinic">TriGyna Main Wellness Center (Kalyani Nagar)</option>
                    <option value="Branch 2">TriGyna Baner Clinic</option>
                    <option value="Virtual">Virtual / Telehealth Hub</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 4: Follow-up Scheduling */}
            {activeStep === 4 && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      First Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Scheduled Time
                    </label>
                    <input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Follow-up Action Type
                  </label>
                  <select
                    value={followUpType}
                    onChange={(e) => setFollowUpType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                  >
                    <option value="Phone Call">Phone Call</option>
                    <option value="WhatsApp Message">WhatsApp Message</option>
                    <option value="Email">Email Details</option>
                    <option value="Video Call">Video Call Consultation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Follow-up Instructions / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Call patient to confirm ultrasound reports and discuss doctor slot"
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                  />
                </div>
              </div>
            )}

            {/* STEP 5: Review & Submit */}
            {activeStep === 5 && (
              <div className="space-y-4 animate-in fade-in duration-100 text-xs">
                <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-2.5">
                  <h4 className="font-bold text-[#111827] border-b border-[#E5EAF0] pb-2 text-sm">
                    Lead Summary Review
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#64748B]">Name:</span>{" "}
                      <span className="font-semibold text-[#111827]">{fullName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Phone:</span>{" "}
                      <span className="font-semibold text-[#111827]">{phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Service:</span>{" "}
                      <span className="font-semibold text-[#111827]">{serviceInterest}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Source:</span>{" "}
                      <span className="font-semibold text-[#111827]">{source}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Priority:</span>{" "}
                      <span className="font-semibold uppercase text-[#087A50]">{priority}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Stage:</span>{" "}
                      <span className="font-semibold text-[#111827]">{preselectedStage || "New"}</span>
                    </div>
                    {followUpDate && (
                      <div className="col-span-2">
                        <span className="text-[#64748B]">Scheduled Follow-up:</span>{" "}
                        <span className="font-semibold text-[#111827]">
                          {followUpDate} at {followUpTime} ({followUpType})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-[#64748B] italic">
                  Submitting will persist this lead directly to MongoDB, trigger auto-assignment, and dispatch appropriate staff notifications.
                </p>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="bg-[#F7F9FC] border-t border-[#E5EAF0] px-6 py-4 flex items-center justify-between">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep - 1)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] bg-white text-[#111827] text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#111827] transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            {activeStep < 5 ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-sm transition disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to MongoDB...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Create Lead</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
