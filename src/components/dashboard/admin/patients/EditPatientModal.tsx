"use client";

import React, { useState } from "react";
import { X, Loader2, Save, User, Phone, Mail, HeartPulse } from "lucide-react";
import { api } from "@/lib/api/client";
import { PatientRecord } from "./PatientDetailPanel";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface EditPatientModalProps {
  patient: PatientRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: PatientRecord) => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function EditPatientModal({
  patient,
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: EditPatientModalProps) {
  const [formData, setFormData] = useState({
    fullName: patient.fullName || "",
    phone: patient.phone || "",
    email: patient.email || "",
    gender: patient.gender || "female",
    age: patient.age || 30,
    address: patient.address || "",
    bloodGroup: patient.bloodGroup || "B+",
    medicalHistory: patient.medicalHistory || "",
    allergies: Array.isArray(patient.allergies) ? patient.allergies.join(", ") : (patient.allergies || ""),
    emergencyContactName: patient.emergencyContact?.name || "",
    emergencyContactPhone: patient.emergencyContact?.phone || "",
    emergencyContactRelation: patient.emergencyContact?.relationship || "Spouse",
    status: patient.status || "active",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      showNotification("Name and phone number are required", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const allergyArr = formData.allergies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        gender: formData.gender,
        age: Number(formData.age),
        address: formData.address.trim(),
        bloodGroup: formData.bloodGroup,
        medicalHistory: formData.medicalHistory.trim(),
        allergies: allergyArr,
        status: formData.status,
      };

      if (formData.emergencyContactName.trim() || formData.emergencyContactPhone.trim()) {
        payload.emergencyContact = {
          name: formData.emergencyContactName.trim(),
          phone: formData.emergencyContactPhone.trim(),
          relationship: formData.emergencyContactRelation,
        };
      }

      const res = await api.patch<{ patient: PatientRecord }>(`/patients/${patient._id}`, payload);
      if (res.success && res.data?.patient) {
        showNotification("Patient profile updated successfully");
        onSuccess(res.data.patient);
        onClose();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to update patient", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl border border-[#E5EAF0] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAF0] px-6 py-4 bg-[#F8FAFC] shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[#087A50] text-[10px] font-bold font-mono">
              {patient.patientCode}
            </div>
            <h3 className="font-sans font-bold text-base text-[#111827] mt-1">Edit Patient Profile</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-[#111827] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          <div>
            <label className="block font-semibold text-[#111827] mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#111827] mb-1">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none font-mono"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">Clinical Intake / Medical Concerns</label>
            <textarea
              rows={2}
              value={formData.medicalHistory}
              onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">Allergies (comma-separated)</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl focus:border-[#087A50] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">Account Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white focus:outline-none capitalize"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5EAF0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-[#64748B] hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}

