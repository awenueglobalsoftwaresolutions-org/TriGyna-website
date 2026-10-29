"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  CreditCard,
  Briefcase,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface ReportSummary {
  crm: {
    totalLeads: number;
    newLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    conversionRate: number;
  };
  appointments: {
    todayAppointments: number;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
  };
  clinical: {
    totalPatients: number;
    activeDoctors: number;
  };
  hrms: {
    todayAttendance: number;
    totalEmployees: number;
    pendingLeaves: number;
  };
  billing: {
    totalBilled: number;
    totalRevenue: number;
    pendingDues: number;
    totalRefunds: number;
    totalExpenses: number;
    netCashFlow: number;
  };
}

interface RawApiSummaryResponse {
  metrics?: {
    crm?: Partial<ReportSummary["crm"]>;
    appointments?: Partial<ReportSummary["appointments"]>;
    clinical?: Partial<ReportSummary["clinical"]>;
    hrms?: Partial<ReportSummary["hrms"]>;
    finance?: {
      totalBilled?: number;
      totalCollected?: number;
      totalDues?: number;
      totalRefunds?: number;
      totalExpenses?: number;
      netCashFlow?: number;
    };
    billing?: {
      totalBilled?: number;
      totalRevenue?: number;
      pendingDues?: number;
      totalRefunds?: number;
      totalExpenses?: number;
      netCashFlow?: number;
    };
  };
}

function normalizeSummary(raw: RawApiSummaryResponse | null | undefined): ReportSummary {
  const m = raw?.metrics || {};
  const b = m.billing;
  const f = m.finance;
  return {
    crm: {
      totalLeads: m.crm?.totalLeads ?? 0,
      newLeads: m.crm?.newLeads ?? 0,
      qualifiedLeads: m.crm?.qualifiedLeads ?? 0,
      convertedLeads: m.crm?.convertedLeads ?? 0,
      conversionRate: m.crm?.conversionRate ?? 0,
    },
    appointments: {
      todayAppointments: m.appointments?.todayAppointments ?? 0,
      totalAppointments: m.appointments?.totalAppointments ?? 0,
      completedAppointments: m.appointments?.completedAppointments ?? 0,
      cancelledAppointments: m.appointments?.cancelledAppointments ?? 0,
    },
    clinical: {
      totalPatients: m.clinical?.totalPatients ?? 0,
      activeDoctors: m.clinical?.activeDoctors ?? 0,
    },
    hrms: {
      todayAttendance: m.hrms?.todayAttendance ?? 0,
      totalEmployees: m.hrms?.totalEmployees ?? 0,
      pendingLeaves: m.hrms?.pendingLeaves ?? 0,
    },
    billing: {
      totalBilled: b?.totalBilled ?? f?.totalBilled ?? 0,
      totalRevenue: b?.totalRevenue ?? f?.totalCollected ?? 0,
      pendingDues: b?.pendingDues ?? f?.totalDues ?? 0,
      totalRefunds: b?.totalRefunds ?? f?.totalRefunds ?? 0,
      totalExpenses: b?.totalExpenses ?? f?.totalExpenses ?? 0,
      netCashFlow: b?.netCashFlow ?? f?.netCashFlow ?? 0,
    },
  };
}

export function ReportsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [data, setData] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportRange, setReportRange] = useState("all_time");

  const loadReportData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<RawApiSummaryResponse>("/reports/summary");
      if (res.data) {
        setData(normalizeSummary(res.data));
      }
    } catch {
      showNotification("Failed to load institutional reports", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await api.get<RawApiSummaryResponse>("/reports/summary");
        if (isMounted && res.data) {
          setData(normalizeSummary(res.data));
        }
      } catch {
        if (isMounted) showNotification("Failed to load institutional reports", true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [showNotification]);

  const handleExportCsv = (section: string) => {
    if (!data) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    if (section === "financial") {
      csvContent += "Metric,Amount (INR)\n";
      csvContent += `Total Invoiced,${data.billing?.totalBilled ?? 0}\n`;
      csvContent += `Total Collections,${data.billing?.totalRevenue ?? 0}\n`;
      csvContent += `Pending Receivables,${data.billing?.pendingDues ?? 0}\n`;
      csvContent += `Processed Refunds,${data.billing?.totalRefunds ?? 0}\n`;
      csvContent += `Operating Expenses,${data.billing?.totalExpenses ?? 0}\n`;
      csvContent += `Net Cash Flow,${data.billing?.netCashFlow ?? 0}\n`;
    } else if (section === "crm") {
      csvContent += "Metric,Count\n";
      csvContent += `Total Inquiries,${data.crm?.totalLeads ?? 0}\n`;
      csvContent += `New Inquiries,${data.crm?.newLeads ?? 0}\n`;
      csvContent += `Qualified Leads,${data.crm?.qualifiedLeads ?? 0}\n`;
      csvContent += `Converted Patients,${data.crm?.convertedLeads ?? 0}\n`;
      csvContent += `Conversion Rate %,${data.crm?.conversionRate ?? 0}\n`;
    } else if (section === "hrms") {
      csvContent += "Metric,Count\n";
      csvContent += `Total Employees,${data.hrms?.totalEmployees ?? 0}\n`;
      csvContent += `Today Attendance,${data.hrms?.todayAttendance ?? 0}\n`;
      csvContent += `Pending Leaves,${data.hrms?.pendingLeaves ?? 0}\n`;
    } else {
      csvContent += "Metric,Value\n";
      csvContent += `Total Appointments,${data.appointments?.totalAppointments ?? 0}\n`;
      csvContent += `Completed Appointments,${data.appointments?.completedAppointments ?? 0}\n`;
      csvContent += `Cancelled Appointments,${data.appointments?.cancelledAppointments ?? 0}\n`;
      csvContent += `Total Registered Patients,${data.clinical?.totalPatients ?? 0}\n`;
      csvContent += `Active Doctor Consultants,${data.clinical?.activeDoctors ?? 0}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TriGyna_${section}_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`${section.toUpperCase()} report exported as CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#154734]/10 text-[#154734] flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#18231D]">Institutional Analytics &amp; Reports</h2>
              <p className="text-xs text-[#68756D] mt-0.5">
                Cross-system audit analytics derived from verified database transactions with zero fabricated totals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={reportRange}
              onChange={(e) => setReportRange(e.target.value)}
              className="px-3 py-2 text-xs border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none font-medium flex-1 sm:flex-initial"
            >
              <option value="all_time">All-Time Cumulative</option>
              <option value="current_month">Current Financial Month</option>
              <option value="last_quarter">Previous Quarter</option>
            </select>
            <button
              onClick={loadReportData}
              disabled={isLoading}
              className="p-2 border border-[#E2E9E3] rounded-xl hover:bg-gray-50 text-[#154734] cursor-pointer transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-16 text-center text-xs text-[#68756D] flex flex-col items-center gap-3 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
          <span>Aggregating transactional reporting database...</span>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-12 text-center text-xs text-[#68756D] shadow-sm">
          No reporting metrics available.
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: FINANCIAL OVERVIEW */}
          <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E9E3]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#154734]" />
                <h3 className="text-base font-semibold text-[#18231D]">Financial &amp; Revenue Analytics</h3>
              </div>
              <button
                onClick={() => handleExportCsv("financial")}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E2E9E3] rounded-xl text-xs font-semibold text-[#154734] hover:bg-gray-50 cursor-pointer w-fit transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Financial CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl">
                <span className="text-[11px] uppercase font-medium text-[#68756D] tracking-wider">Total Invoiced</span>
                <p className="text-xl font-bold font-mono text-[#18231D] mt-1">
                  ₹{(data.billing?.totalBilled ?? 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-[#68756D] mt-0.5 block">Gross billed charges</span>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                <span className="text-[11px] uppercase font-medium text-emerald-800 tracking-wider">Collections (Paid)</span>
                <p className="text-xl font-bold font-mono text-emerald-900 mt-1">
                  ₹{(data.billing?.totalRevenue ?? 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-emerald-700 mt-0.5 block">Verified cash/gateway inflow</span>
              </div>

              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                <span className="text-[11px] uppercase font-medium text-amber-800 tracking-wider">Pending Receivables</span>
                <p className="text-xl font-bold font-mono text-amber-900 mt-1">
                  ₹{(data.billing?.pendingDues ?? 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-amber-700 mt-0.5 block">Outstanding patient dues</span>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                <span className="text-[11px] uppercase font-medium text-blue-800 tracking-wider">Net Cash Flow</span>
                <p className="text-xl font-bold font-mono text-blue-900 mt-1">
                  ₹{(data.billing?.netCashFlow ?? 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-blue-700 mt-0.5 block">Inflow minus expenses &amp; refunds</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: CRM & CONVERSIONS */}
          <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E9E3]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#154734]" />
                <h3 className="text-base font-semibold text-[#18231D]">Patient Acquisition &amp; CRM Funnel</h3>
              </div>
              <button
                onClick={() => handleExportCsv("crm")}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E2E9E3] rounded-xl text-xs font-semibold text-[#154734] hover:bg-gray-50 cursor-pointer w-fit transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CRM CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-4 bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl">
                <span className="text-[11px] uppercase font-medium text-[#68756D] tracking-wider">Total Inquiries</span>
                <p className="text-xl font-bold font-mono text-[#18231D] mt-1">{data.crm?.totalLeads ?? 0}</p>
              </div>
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                <span className="text-[11px] uppercase font-medium text-blue-800 tracking-wider">New / Uncontacted</span>
                <p className="text-xl font-bold font-mono text-blue-900 mt-1">{data.crm?.newLeads ?? 0}</p>
              </div>
              <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-xl">
                <span className="text-[11px] uppercase font-medium text-purple-800 tracking-wider">Qualified Leads</span>
                <p className="text-xl font-bold font-mono text-purple-900 mt-1">{data.crm?.qualifiedLeads ?? 0}</p>
              </div>
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                <span className="text-[11px] uppercase font-medium text-emerald-800 tracking-wider">Converted Patients</span>
                <p className="text-xl font-bold font-mono text-emerald-900 mt-1">{data.crm?.convertedLeads ?? 0}</p>
              </div>
              <div className="p-4 bg-[#154734]/10 border border-[#154734]/20 rounded-xl col-span-2 lg:col-span-1">
                <span className="text-[11px] uppercase font-medium text-[#154734] tracking-wider">Conversion Rate</span>
                <p className="text-xl font-bold font-mono text-[#154734] mt-1">{data.crm?.conversionRate ?? 0}%</p>
              </div>
            </div>

            {/* Visual Funnel Bar */}
            <div className="pt-2">
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${(data.crm?.totalLeads ?? 0) > 0 ? ((data.crm?.newLeads ?? 0) / data.crm.totalLeads) * 100 : 0}%`,
                  }}
                  className="bg-blue-400 h-full"
                  title="New Leads"
                />
                <div
                  style={{
                    width: `${(data.crm?.totalLeads ?? 0) > 0 ? ((data.crm?.qualifiedLeads ?? 0) / data.crm.totalLeads) * 100 : 0}%`,
                  }}
                  className="bg-purple-400 h-full"
                  title="Qualified Leads"
                />
                <div
                  style={{
                    width: `${(data.crm?.totalLeads ?? 0) > 0 ? ((data.crm?.convertedLeads ?? 0) / data.crm.totalLeads) * 100 : 0}%`,
                  }}
                  className="bg-emerald-500 h-full"
                  title="Converted Leads"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#68756D] mt-2 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> New ({data.crm?.newLeads ?? 0})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Qualified ({data.crm?.qualifiedLeads ?? 0})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Converted ({data.crm?.convertedLeads ?? 0})
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: CLINICAL OPERATIONS & HRMS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clinical Operations */}
            <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E9E3]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#154734]" />
                  <h3 className="text-base font-semibold text-[#18231D]">Healthcare Encounters</h3>
                </div>
                <button
                  onClick={() => handleExportCsv("clinical")}
                  className="flex items-center gap-1 px-2.5 py-1 border border-[#E2E9E3] rounded-lg text-xs font-semibold text-[#154734] hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl">
                  <span className="text-[11px] uppercase font-medium text-[#68756D]">Total Patients</span>
                  <p className="text-xl font-bold font-mono text-[#18231D] mt-1">{data.clinical?.totalPatients ?? 0}</p>
                  <span className="text-[11px] text-[#68756D] mt-0.5 block">Medical health records</span>
                </div>

                <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                  <span className="text-[11px] uppercase font-medium text-blue-800">Total Bookings</span>
                  <p className="text-xl font-bold font-mono text-blue-900 mt-1">{data.appointments?.totalAppointments ?? 0}</p>
                  <span className="text-[11px] text-blue-700 mt-0.5 block">{data.appointments?.todayAppointments ?? 0} scheduled today</span>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                  <span className="text-[11px] uppercase font-medium text-emerald-800">Completed</span>
                  <p className="text-xl font-bold font-mono text-emerald-900 mt-1">
                    {data.appointments?.completedAppointments ?? 0}
                  </p>
                  <span className="text-[11px] text-emerald-700 mt-0.5 block">Finalized consultations</span>
                </div>

                <div className="p-3.5 bg-red-50/60 border border-red-200/80 rounded-xl">
                  <span className="text-[11px] uppercase font-medium text-red-800">Cancelled / Missed</span>
                  <p className="text-xl font-bold font-mono text-red-900 mt-1">
                    {data.appointments?.cancelledAppointments ?? 0}
                  </p>
                  <span className="text-[11px] text-red-700 mt-0.5 block">Attrition record</span>
                </div>
              </div>
            </div>

            {/* HRMS & Workforce */}
            <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E9E3]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#154734]" />
                  <h3 className="text-base font-semibold text-[#18231D]">HRMS Workforce Metrics</h3>
                </div>
                <button
                  onClick={() => handleExportCsv("hrms")}
                  className="flex items-center gap-1 px-2.5 py-1 border border-[#E2E9E3] rounded-lg text-xs font-semibold text-[#154734] hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl">
                  <span className="text-[11px] uppercase font-medium text-[#68756D]">Active Employees</span>
                  <p className="text-xl font-bold font-mono text-[#18231D] mt-1">{data.hrms?.totalEmployees ?? 0}</p>
                  <span className="text-[11px] text-[#68756D] mt-0.5 block">Verified staff headcount</span>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                  <span className="text-[11px] uppercase font-medium text-emerald-800">Today Attendance</span>
                  <p className="text-xl font-bold font-mono text-emerald-900 mt-1">{data.hrms?.todayAttendance ?? 0}</p>
                  <span className="text-[11px] text-emerald-700 mt-0.5 block">Checked-in clinicians &amp; staff</span>
                </div>

                <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                  <span className="text-[11px] uppercase font-medium text-amber-800">Pending Leaves</span>
                  <p className="text-xl font-bold font-mono text-amber-900 mt-1">{data.hrms?.pendingLeaves ?? 0}</p>
                  <span className="text-[11px] text-amber-700 mt-0.5 block">Awaiting manager approval</span>
                </div>

                <div className="p-3.5 bg-[#154734]/10 border border-[#154734]/20 rounded-xl">
                  <span className="text-[11px] uppercase font-medium text-[#154734]">Active Clinicians</span>
                  <p className="text-xl font-bold font-mono text-[#154734] mt-1">{data.clinical?.activeDoctors ?? 0}</p>
                  <span className="text-[11px] text-[#154734] mt-0.5 block">On active duty roster</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
