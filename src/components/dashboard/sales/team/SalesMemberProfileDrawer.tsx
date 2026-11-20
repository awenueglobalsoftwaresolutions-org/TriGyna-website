"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Target,
  CheckCircle2,
  Clock,
  Briefcase,
  TrendingUp,
  FileText,
  UserCheck,
  AlertCircle,
  ExternalLink,
  Shield,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { SalesRepresentativeItem } from "./salesTeamTypes";

interface SalesMemberProfileDrawerProps {
  member: SalesRepresentativeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadClick?: (leadId: string) => void;
  showNotification?: (msg: string, isError?: boolean) => void;
}

export const SalesMemberProfileDrawer: React.FC<SalesMemberProfileDrawerProps> = ({
  member,
  isOpen,
  onClose,
  onLeadClick,
  showNotification,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "leads" | "performance" | "followups" | "activities" | "targets"
  >("overview");

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !member) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await api.get<any>(`/sales-team/members/${member._id}`);
        if (res.success && res.data) {
          setDetails(res.data);
        }
      } catch (err: any) {
        console.error("Error loading sales member details:", err);
        if (showNotification) {
          showNotification(err.message || "Failed to load member profile", true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, member, showNotification]);

  if (!isOpen || !member) return null;

  const stats = details?.stats || {
    totalLeads: member.totalLeads,
    convertedLeads: member.converted,
    conversionRate: member.conversionRate,
    activeLeads: Math.max(member.totalLeads - member.converted, 0),
    pendingFollowups: 0,
    monthlyTarget: member.monthlyTarget,
  };

  const assignedLeads = details?.assignedLeads || [];
  const followups = details?.followups || [];
  const targetHistory = details?.targetHistory || [];
  const assignmentHistory = details?.assignmentHistory || [];

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-[#E5EAF0]">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[#E5EAF0] bg-gray-50/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E9F8F0] text-[#087A50] font-bold text-lg flex items-center justify-center border border-[#16A36A]/20 shadow-xs">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#111827]">{member.name}</h2>
                    {member.isTeamLead && (
                      <span className="text-amber-500" title="Team Lead">
                        👑
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        member.membershipStatus === "active"
                          ? "bg-[#E9F8F0] text-[#087A50]"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {member.membershipStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#64748B] mt-1">
                    <span className="font-medium text-[#111827]">{member.designation}</span>
                    <span>•</span>
                    <span>{member.branchName}</span>
                    <span>•</span>
                    <span className="font-mono">{member.employeeCode || "TG-SALES"}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-5">
              <div className="bg-white p-2.5 rounded-xl border border-[#E5EAF0] text-center shadow-2xs">
                <div className="text-[10px] text-[#64748B] font-medium">Total Leads</div>
                <div className="text-base font-bold text-[#111827] mt-0.5">{stats.totalLeads}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#E5EAF0] text-center shadow-2xs">
                <div className="text-[10px] text-[#087A50] font-semibold">Converted</div>
                <div className="text-base font-bold text-[#087A50] mt-0.5">
                  {stats.convertedLeads}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#E5EAF0] text-center shadow-2xs">
                <div className="text-[10px] text-[#9333EA] font-semibold">Win Rate</div>
                <div className="text-base font-bold text-[#9333EA] mt-0.5">
                  {stats.conversionRate}%
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#E5EAF0] text-center shadow-2xs">
                <div className="text-[10px] text-[#2563EB] font-semibold">Active</div>
                <div className="text-base font-bold text-[#2563EB] mt-0.5">{stats.activeLeads}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#E5EAF0] text-center shadow-2xs">
                <div className="text-[10px] text-[#D97706] font-semibold">Follow-ups</div>
                <div className="text-base font-bold text-[#D97706] mt-0.5">
                  {stats.pendingFollowups}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#E5EAF0] text-center shadow-2xs">
                <div className="text-[10px] text-[#64748B] font-medium">Target</div>
                <div className="text-base font-bold text-[#111827] mt-0.5">
                  {stats.monthlyTarget}
                </div>
              </div>
            </div>

            {/* Subtabs Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto mt-5 border-b border-[#E5EAF0] scrollbar-none">
              {[
                { key: "overview", label: "Overview", icon: FileText },
                { key: "leads", label: `Assigned Leads (${assignedLeads.length})`, icon: UserCheck },
                { key: "performance", label: "Performance", icon: TrendingUp },
                { key: "followups", label: `Follow-ups (${followups.length})`, icon: Clock },
                { key: "activities", label: "Activities", icon: Briefcase },
                { key: "targets", label: "Target History", icon: Target },
              ].map((tab) => {
                const Icon = tab.icon;
                const isTabActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isTabActive
                        ? "border-[#087A50] text-[#087A50]"
                        : "border-transparent text-[#64748B] hover:text-[#111827]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-xs text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin text-[#087A50] mb-2" />
                <span>Loading authorized representative telemetry...</span>
              </div>
            ) : (
              <>
                {/* 1. OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <div className="space-y-5 text-xs">
                    <div className="bg-gray-50/70 p-4 rounded-xl border border-[#E5EAF0] space-y-3">
                      <h3 className="font-bold text-[#111827] text-sm">Account & Employment Details</h3>
                      <div className="grid grid-cols-2 gap-3 text-gray-700">
                        <div>
                          <span className="text-[#64748B] block">Email Address:</span>
                          <span className="font-semibold">{member.email || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block">Phone Number:</span>
                          <span className="font-semibold">{member.phone}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block">Department:</span>
                          <span className="font-semibold">{member.department || "CRM"}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block">Sales Role:</span>
                          <span className="font-semibold">{member.salesRole}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block">Clinic Branch:</span>
                          <span className="font-semibold">{member.branchName}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block">Quota Target:</span>
                          <span className="font-semibold">{member.monthlyTarget} conversions / mo</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#E9F8F0]/30 p-4 rounded-xl border border-[#16A36A]/20">
                      <div className="flex items-center gap-2 text-[#087A50] font-bold mb-1">
                        <Award className="w-4 h-4" />
                        <span>Sales Performance Status: {member.status}</span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        Representative is currently linked to the official TriGyna CRM. Conversions and
                        leads are calculated live from MongoDB records without simulated projections.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. ASSIGNED LEADS TAB */}
                {activeTab === "leads" && (
                  <div className="space-y-3">
                    {assignedLeads.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[#64748B] bg-gray-50 rounded-xl border border-[#E5EAF0]">
                        No active CRM leads are currently assigned to this representative.
                      </div>
                    ) : (
                      assignedLeads.map((lead: any) => (
                        <div
                          key={lead._id}
                          onClick={() => onLeadClick && onLeadClick(lead._id)}
                          className="p-3.5 rounded-xl border border-[#E5EAF0] hover:border-[#087A50] hover:bg-gray-50/50 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#111827]">{lead.fullName}</span>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase ${
                                  lead.status === "converted"
                                    ? "bg-[#E9F8F0] text-[#087A50]"
                                    : lead.status === "new"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-purple-50 text-purple-600"
                                }`}
                              >
                                {lead.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[#64748B] mt-1">
                              <span>{lead.phone}</span>
                              <span>•</span>
                              <span>{lead.serviceInterest}</span>
                              {lead.followUpDate && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600 font-medium">
                                    Next: {new Date(lead.followUpDate).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <ExternalLink className="w-4 h-4 text-[#94A3B8] shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. PERFORMANCE TAB */}
                {activeTab === "performance" && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-xl bg-gray-50 border border-[#E5EAF0] space-y-2">
                      <h4 className="font-bold text-[#111827]">Attribution & Conversion Summary</h4>
                      <div className="grid grid-cols-2 gap-3 text-gray-700">
                        <div>
                          <span className="text-[#64748B]">Total Assigned:</span>{" "}
                          <span className="font-bold">{stats.totalLeads}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B]">Verified Converted:</span>{" "}
                          <span className="font-bold text-[#087A50]">{stats.convertedLeads}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B]">Conversion Win Rate:</span>{" "}
                          <span className="font-bold text-[#9333EA]">{stats.conversionRate}%</span>
                        </div>
                        <div>
                          <span className="text-[#64748B]">Target Progress:</span>{" "}
                          <span className="font-bold">{member.progress}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#E5EAF0] space-y-2">
                      <h4 className="font-bold text-[#111827]">Monthly Quota Progress</h4>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#087A50] h-full rounded-full transition-all"
                          style={{ width: `${Math.min(member.progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-[#64748B]">
                        <span>{stats.convertedLeads} achieved</span>
                        <span>Target: {stats.monthlyTarget}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. FOLLOW-UPS TAB */}
                {activeTab === "followups" && (
                  <div className="space-y-3">
                    {followups.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[#64748B] bg-gray-50 rounded-xl border border-[#E5EAF0]">
                        No follow-up tasks currently assigned for this representative.
                      </div>
                    ) : (
                      followups.map((f: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-[#E5EAF0] bg-white flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-[#111827]">{f.title}</div>
                            <div className="text-[11px] text-[#64748B] mt-0.5">
                              Lead: {f.leadName} ({f.leadPhone})
                            </div>
                            <div className="text-[10px] text-amber-600 font-medium mt-1">
                              Due: {new Date(f.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              f.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {f.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 5. ACTIVITIES TAB */}
                {activeTab === "activities" && (
                  <div className="space-y-3">
                    {assignmentHistory.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[#64748B] bg-gray-50 rounded-xl border border-[#E5EAF0]">
                        No recorded lead assignment history found for this representative.
                      </div>
                    ) : (
                      assignmentHistory.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-[#E5EAF0] bg-gray-50/50 text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-[#111827]">
                              Lead Assigned: {item.leadId?.fullName || "Lead"}
                            </div>
                            <div className="text-[11px] text-[#64748B] mt-0.5">
                              Assigned by {item.assignedBy?.name || "Admin"} • {item.assignmentReason}
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {new Date(item.assignedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 6. TARGET HISTORY TAB */}
                {activeTab === "targets" && (
                  <div className="space-y-3">
                    {targetHistory.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[#64748B] bg-gray-50 rounded-xl border border-[#E5EAF0]">
                        No historical target records found. Default target is {member.monthlyTarget}{" "}
                        conversions.
                      </div>
                    ) : (
                      targetHistory.map((t: any) => (
                        <div
                          key={t._id}
                          className="p-3.5 rounded-xl border border-[#E5EAF0] bg-white flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#111827]">{t.title}</div>
                            <div className="text-[11px] text-[#64748B]">
                              Period: {t.periodMonth}/{t.periodYear} • Target: {t.targetValue}{" "}
                              conversions
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E9F8F0] text-[#087A50]">
                            {t.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
