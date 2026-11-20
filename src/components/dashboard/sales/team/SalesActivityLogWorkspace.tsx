"use client";

import React, { useState, useEffect } from "react";
import { Clock, Shield, UserCheck, Target, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { SalesActivityItem } from "./salesTeamTypes";

export const SalesActivityLogWorkspace: React.FC = () => {
  const [logs, setLogs] = useState<SalesActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ logs: SalesActivityItem[] }>("/sales-team/activity-logs");
        if (res.success && res.data?.logs) {
          setLogs(res.data.logs);
        }
      } catch (err: any) {
        console.error("Error fetching sales activity logs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[#E5EAF0] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
            <Clock className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111827]">Sales Team Activity Audit Trail</h3>
            <p className="text-[11px] text-[#64748B]">
              Immutable audit log of all lead allocations, member changes, and quota configurations
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#E5EAF0]/70 text-xs">
        {loading ? (
          <div className="py-16 text-center text-[#64748B]">
            <Loader2 className="w-5 h-5 animate-spin text-[#087A50] mx-auto mb-2" />
            <span>Loading activity audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-[#64748B]">
            No recent sales team administrative activities recorded.
          </div>
        ) : (
          logs.map((log) => {
            const isAssign = log.type === "ASSIGNMENT";
            return (
              <div
                key={log.id}
                className="p-4 sm:px-6 hover:bg-gray-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isAssign
                        ? "bg-blue-50 text-blue-600"
                        : "bg-[#E9F8F0] text-[#087A50]"
                    }`}
                  >
                    {isAssign ? <UserCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#111827]">{log.action}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold bg-gray-100 text-[#64748B]">
                        {log.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      {isAssign && log.details ? (
                        <>
                          Lead <span className="font-semibold text-[#111827]">{log.details.leadName}</span>{" "}
                          reassigned from <span className="font-semibold">{log.details.previousOwner}</span> to{" "}
                          <span className="font-semibold text-[#087A50]">{log.details.newOwner}</span>
                          {log.details.reason ? ` (${log.details.reason})` : ""}
                        </>
                      ) : (
                        JSON.stringify(log.details)
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:shrink-0 text-[11px] text-[#64748B] pl-11 sm:pl-0">
                  <div>By <span className="font-medium text-[#111827]">{log.actorName}</span></div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
