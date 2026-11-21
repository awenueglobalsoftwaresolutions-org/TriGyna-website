"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  Calendar,
  Clock,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { CrmLead } from "./crmTypes";

interface CrmConvertPatientModalProps {
  lead: CrmLead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isError?: boolean) => void;
}

interface DoctorItem {
  _id: string;
  userId?: { name: string };
  specialization?: string[];
  consultationFee?: number;
  status?: string;
}

export function CrmConvertPatientModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: CrmConvertPatientModalProps) {
  const [bookAppointment, setBookAppointment] = useState(true);
  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [mode, setMode] = useState("Online Video Consultation");
  const [consultationFee, setConsultationFee] = useState<number>(500);
  const [age, setAge] = useState<number>(28);

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [duplicatePatient, setDuplicatePatient] = useState<{
    _id: string;
    patientCode: string;
    fullName: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !lead) return;

    // Set default date to today
    const today = new Date().toISOString().split("T")[0];
    setAppointmentDate(today);

    // Fetch active doctors
    api
      .get<{ doctors?: DoctorItem[] }>("/doctors")
      .then((res) => {
        const dList = res.data?.doctors || [];
        if (dList.length > 0) {
          setDoctors(dList);
          setDoctorId(dList[0]._id);
          if (dList[0].consultationFee) {
            setConsultationFee(dList[0].consultationFee);
          }
        }
      })
      .catch(() => {});

    // Check duplicate patient
    api
      .get<{ patient?: { _id: string; patientCode: string; fullName: string } }>(
        `/crm/check-duplicates?phone=${encodeURIComponent(lead.phone)}`
      )
      .then((res) => {
        if (res.data?.patient) {
          setDuplicatePatient(res.data.patient);
        } else {
          setDuplicatePatient(null);
        }
      })
      .catch(() => {});
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const handleDoctorChange = (docId: string) => {
    setDoctorId(docId);
    const doc = doctors.find((d) => d._id === docId);
    if (doc?.consultationFee) {
      setConsultationFee(doc.consultationFee);
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConverting(true);
    try {
      const payload: any = {
        age: age || 28,
        bookAppointment,
      };

      if (bookAppointment) {
        if (!doctorId) {
          showNotification("Please select an active doctor", true);
          setIsConverting(false);
          return;
        }
        payload.doctorId = doctorId;
        payload.appointmentDate = appointmentDate;
        payload.startTime = startTime;
        payload.mode = mode;
        payload.consultationFee = consultationFee;
      }

      const res = await api.post(`/crm/leads/${lead._id}/convert`, payload);
      if (res.success) {
        showNotification(
          `Lead successfully converted to Patient! Assigned code: ${(res.data as any)?.patient?.patientCode || "Active"}`
        );
        onSuccess();
        onClose();
      } else {
        showNotification(res.message || "Failed to convert lead", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Error converting lead to patient", true);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E5EAF0] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#E9F8F0] border-b border-[#D1F2E0] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#087A50] text-white flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Convert Lead to Patient</h3>
              <p className="text-xs text-[#075B3D]">
                Register verified patient record &amp; initiate clinical onboarding
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

        {/* Existing Patient Match Notice */}
        {duplicatePatient && (
          <div className="m-5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Existing Patient Record Matched:</span>
              <p className="mt-0.5">
                A patient record already exists for this phone:{" "}
                <span className="font-semibold text-[#111827]">
                  {duplicatePatient.fullName} [{duplicatePatient.patientCode}]
                </span>
                . Converting will link this enquiry to their existing health record without duplicate identity creation.
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleConvert}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
            {/* Lead Summary */}
            <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-1">
              <div className="flex items-center justify-between font-bold text-[#111827]">
                <span>{lead.fullName}</span>
                <span className="text-[#087A50] font-mono">{lead.phone}</span>
              </div>
              <p className="text-[#64748B]">Service: {lead.serviceInterest}</p>
            </div>

            {/* Patient Age */}
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Patient Age (Years)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#087A50]"
              />
            </div>

            {/* Optional Appointment Checkbox */}
            <div className="pt-2 border-t border-[#E5EAF0]">
              <label className="flex items-center gap-2 font-semibold text-[#111827] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bookAppointment}
                  onChange={(e) => setBookAppointment(e.target.checked)}
                  className="w-4 h-4 text-[#087A50] rounded focus:ring-0 cursor-pointer"
                />
                <span>Book Initial Clinical Consultation Appointment</span>
              </label>
            </div>

            {bookAppointment && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-100">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Select Doctor
                  </label>
                  <select
                    value={doctorId}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                  >
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.userId?.name || "Dr. TriGyna Specialist"}{" "}
                        {d.specialization ? `(${d.specialization.join(", ")})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required={bookAppointment}
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Time Slot
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10:30 AM"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Consultation Mode
                    </label>
                    <div className="w-full px-3 py-2 border border-[#C5DDBB] bg-[#EBF3E8] rounded-xl text-xs font-semibold text-[#154734]">
                      Online Video Consultation
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Consultation Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#F7F9FC] border-t border-[#E5EAF0] px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#111827] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConverting}
              className="px-5 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-xs transition disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Converting in MongoDB...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Conversion</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
