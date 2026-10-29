"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Phone,
  Search,
  Plus,
  UserPlus,
  X,
  Loader2,
  PhoneCall,
  RefreshCw,
} from "lucide-react";

export interface Lead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  serviceInterest?: string;
  source?: string;
  stage: string;
  notes?: string;
  createdAt: string;
}

interface EnquiriesTabProps {
  leads: Lead[];
  isLoading: boolean;
  onRefresh: () => void;
  onLogEnquiry: (leadData: Record<string, unknown>) => Promise<void>;
  onUpdateStage: (leadId: string, stage: string) => Promise<void>;
  onConvertToPatient: (name: string, phone: string) => void;
}

export function EnquiriesTab({
  leads,
  isLoading,
  onRefresh,
  onLogEnquiry,
  onUpdateStage,
  onConvertToPatient,
}: EnquiriesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  // Log Enquiry Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    phone: "",
    email: "",
    serviceInterest: "Homoeopathic Clinical Consultation",
    source: "phone",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryForm.name || !enquiryForm.phone) return;
    setIsSubmitting(true);
    try {
      await onLogEnquiry({
        name: enquiryForm.name,
        phone: enquiryForm.phone,
        email: enquiryForm.email || undefined,
        serviceInterest: enquiryForm.serviceInterest,
        source: enquiryForm.source,
        notes: enquiryForm.notes,
        stage: "new",
      });
      setIsModalOpen(false);
      setEnquiryForm({
        name: "",
        phone: "",
        email: "",
        serviceInterest: "Homoeopathic Clinical Consultation",
        source: "phone",
        notes: "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesStage = stageFilter === "all" || l.stage === stageFilter;
    const name = l.name?.toLowerCase() || "";
    const phone = l.phone || "";
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || phone.includes(query);
    return matchesStage && matchesSearch;
  });

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "new":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "contacted":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "converted":
        return "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5ED] text-[#154734] text-xs font-semibold mb-2 border border-[#D1E2D8]">
            <PhoneCall className="w-3.5 h-3.5" />
            Front Desk Telephone Calls &amp; Walk-In Inquiries
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17221D]">
            Patient Enquiries &amp; Call Register
          </h2>
          <p className="text-xs text-[#758277] mt-0.5 max-w-xl">
            Log phone enquiries, walk-in queries regarding PCOD and fertility protocols, track callback status, and convert callers into registered patients.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] hover:bg-[#F3EFEA] text-[#17221D] transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-4 h-4 text-[#154734] ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4.5 py-2.5 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log Front-Desk Call / Enquiry
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4.5 shadow-xs">
          <p className="text-[11px] text-[#758277] uppercase font-bold tracking-wider">
            Total Enquiries
          </p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#154734] mt-1">
            {leads.length}
          </p>
          <p className="text-[10px] text-[#758277] mt-0.5">Calls &amp; walk-in queries</p>
        </div>

        <div className="bg-white rounded-2xl border border-blue-200/80 bg-blue-50/20 p-4.5 shadow-xs">
          <p className="text-[11px] text-blue-800 uppercase font-bold tracking-wider">
            New / Untriaged
          </p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-blue-600 mt-1">
            {leads.filter((l) => l.stage === "new").length}
          </p>
          <p className="text-[10px] text-blue-700/80 mt-0.5">Awaiting initial call back</p>
        </div>

        <div className="bg-white rounded-2xl border border-purple-200/80 bg-purple-50/20 p-4.5 shadow-xs">
          <p className="text-[11px] text-purple-800 uppercase font-bold tracking-wider">
            In Follow-Up
          </p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-purple-600 mt-1">
            {leads.filter((l) => l.stage === "contacted").length}
          </p>
          <p className="text-[10px] text-purple-700/80 mt-0.5">Counselled by reception</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4.5 shadow-xs">
          <p className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">
            Converted to Patient
          </p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#154734] mt-1">
            {leads.filter((l) => l.stage === "converted").length}
          </p>
          <p className="text-[10px] text-emerald-700/80 mt-0.5">Booked consultation</p>
        </div>
      </div>

      {/* Enquiries Table Card */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-xs overflow-hidden">
        <div className="p-4.5 sm:p-5 border-b border-[#E8E2D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#758277]" />
            <input
              type="text"
              placeholder="Search by caller name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 bg-[#FAF8F5]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8E2D6]">
            {[
              { key: "all", label: "All" },
              { key: "new", label: "New" },
              { key: "contacted", label: "Contacted" },
              { key: "converted", label: "Converted" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStageFilter(f.key)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  stageFilter === f.key
                    ? "bg-[#154734] text-white shadow-xs"
                    : "text-[#758277] hover:text-[#154734]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E2D6] text-[11px] font-bold text-[#154734] uppercase tracking-wider">
                <th className="py-3 px-4">Caller / Enquirer</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Service of Interest</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Reception Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D6]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[#758277]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2.5 text-[#154734]" />
                    <p className="font-semibold text-xs text-[#154734]">Loading enquiries...</p>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[#758277]">
                    <MessageSquare className="w-8 h-8 text-[#758277]/40 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-[#17221D]">No enquiries logged</p>
                    <p className="text-xs text-[#758277] mt-0.5">Log new telephone or walk-in calls at the desk.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#17221D]">{lead.name}</p>
                      <p className="text-[10px] text-[#758277]">{new Date(lead.createdAt).toLocaleDateString()}</p>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <p className="text-[#154734] font-semibold flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#758277]" />
                        <span>{lead.phone}</span>
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#17221D]">{lead.serviceInterest || "General Inquiry"}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF8F5] text-[#17221D] border border-[#E8E2D6] uppercase">
                        {lead.source || "Phone"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border capitalize ${getStageBadge(lead.stage)}`}>
                        {lead.stage}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs text-[#758277] truncate">
                      {lead.notes || "Call logged at front desk"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {lead.stage === "new" && (
                          <button
                            onClick={() => onUpdateStage(lead._id, "contacted")}
                            className="px-2 py-1 rounded-lg border border-[#E8E2D6] text-[#758277] hover:text-[#154734] hover:bg-[#FAF8F5] text-[11px] font-semibold cursor-pointer"
                          >
                            Mark Contacted
                          </button>
                        )}

                        <button
                          onClick={() => onConvertToPatient(lead.name, lead.phone)}
                          className="px-2.5 py-1 rounded-lg bg-[#154734] hover:bg-[#1E5C45] text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          title="Register as Patient"
                        >
                          <UserPlus className="w-3 h-3" />
                          Register Patient
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

      {/* Modal: Log New Call / Enquiry */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
              <div>
                <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-[#154734]" />
                  Log Front-Desk Enquiry
                </h3>
                <p className="text-xs text-[#758277] mt-0.5">
                  Record caller inquiry for tracking and follow-up
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#154734] mb-1">Caller Name *</label>
                <input
                  type="text"
                  required
                  value={enquiryForm.name}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                  placeholder="E.g., Pooja Sharma"
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#154734] mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={enquiryForm.phone}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#154734] mb-1">Inquiry Source</label>
                  <select
                    value={enquiryForm.source}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, source: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    <option value="phone">Inbound Telephone</option>
                    <option value="walk_in">Clinic Walk-In</option>
                    <option value="whatsapp">WhatsApp Query</option>
                    <option value="referral">Friend / Family Referral</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Service Interest</label>
                  <select
                    value={enquiryForm.serviceInterest}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, serviceInterest: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    <option value="Homoeopathic Clinical Consultation">Homoeopathic Consultation</option>
                    <option value="PCOD & Hormonal Health Protocol">PCOD Care</option>
                    <option value="Fertility Counselling & Workup">Fertility Guidance</option>
                    <option value="Postnatal Wellness Review">Postnatal Care</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#154734] mb-1">Notes / Specific Queries</label>
                <textarea
                  rows={2}
                  value={enquiryForm.notes}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, notes: e.target.value })}
                  placeholder="Enquired about doctor timings, consultation fees, and medicines..."
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8E2D6] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:bg-[#FAF8F5] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Logging...
                    </>
                  ) : (
                    "Save Enquiry"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
