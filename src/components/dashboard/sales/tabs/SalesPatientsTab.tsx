"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Phone,
  Mail,
  HeartPulse,
  Calendar,
  Layers,
  Loader2,
  ExternalLink,
  MessageSquare,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface PatientRecord {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  age?: number;
  bloodGroup?: string;
  createdAt: string;
}

interface SalesPatientsTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
}

export function SalesPatientsTab({ showNotification }: SalesPatientsTabProps) {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ patients: PatientRecord[] }>("/patients?limit=100");
      if (res.data?.patients) {
        setPatients(res.data.patients);
      }
    } catch {
      showNotification("Failed to load registered patients directory", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = p.patientCode?.toLowerCase() || "";
        const name = p.fullName?.toLowerCase() || "";
        const phone = p.phone || "";
        if (!code.includes(q) && !name.includes(q) && !phone.includes(q)) return false;
      }
      return true;
    });
  }, [patients, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">Converted Patient Directory</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Patients who converted from sales leads into registered clinical records.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient code, name, phone..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-7 h-7 text-[#16A34A] animate-spin mb-2" />
            <p className="text-xs text-gray-500">Loading converted patients from MongoDB...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-16 text-center text-xs text-gray-500">
            No patient records found matching search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F172A]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Patient Code</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Demographics</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4 text-right">Quick Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredPatients.map((patient) => (
                  <tr key={patient._id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-5">
                      <span className="font-mono font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full text-[11px]">
                        {patient.patientCode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {patient.fullName.charAt(0)}
                        </div>
                        <span>{patient.fullName}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <a
                          href={`tel:${patient.phone}`}
                          className="font-medium text-gray-700 hover:text-[#16A34A] flex items-center gap-1 text-[11px]"
                        >
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{patient.phone}</span>
                        </a>
                        {patient.email && (
                          <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">
                            {patient.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-gray-600">
                      <span className="capitalize">{patient.gender || "Female"}</span>
                      {patient.age ? ` • ${patient.age} yrs` : ""}
                      {patient.bloodGroup ? ` • ${patient.bloodGroup}` : ""}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {new Date(patient.createdAt).toLocaleDateString("en-IN")}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`tel:${patient.phone}`}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const clean = (patient.phone || "").replace(/[^0-9]/g, "");
                            window.open(`https://wa.me/${clean}`, "_blank");
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

