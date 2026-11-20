"use client";

import React, { useState } from "react";
import {
  Settings,
  ShieldCheck,
  Zap,
  Bell,
  Save,
  Users,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface MarketingSettingsWorkspaceProps {
  onOpenAutomationBuilder: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function MarketingSettingsWorkspace({
  onOpenAutomationBuilder,
  showNotification,
}: MarketingSettingsWorkspaceProps) {
  const [defaultModel, setDefaultModel] = useState("first_touch");
  const [lookbackDays, setLookbackDays] = useState(30);
  const [assignmentMode, setAssignmentMode] = useState("round_robin");
  const [cplAlertThreshold, setCplAlertThreshold] = useState(250);
  const [budgetAlertPct, setBudgetAlertPct] = useState(85);

  const handleSave = () => {
    showNotification("Marketing & Ads configurations successfully updated in database");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#111827]">Marketing &amp; Advertising Settings</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure attribution models, automated lead assignment rules, spending limits, and compliance guards.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition-all cursor-pointer shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Attribution & Lookback */}
        <div className="bg-white rounded-2xl p-6 border border-[#E5EAF0] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E5EAF0]">
            <Settings className="w-4 h-4 text-[#087A50]" />
            <h3 className="text-sm font-bold text-[#111827]">Attribution Engine Settings</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1">
              Default Attribution Model
            </label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white"
            >
              <option value="first_touch">First Touch (Acquiring Marketing Source)</option>
              <option value="last_touch">Last Touch (Direct Converting Campaign)</option>
              <option value="linear">Linear (Equal Distribution across Touchpoints)</option>
              <option value="position_based">Position Based (40% First, 20% Middle, 40% Last)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1">
              Attribution Lookback Window (Days)
            </label>
            <input
              type="number"
              value={lookbackDays}
              onChange={(e) => setLookbackDays(parseInt(e.target.value))}
              className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3 py-2"
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              Touchpoints older than {lookbackDays} days will be marked as historic baseline.
            </p>
          </div>
        </div>

        {/* Card 2: Automatic Sales Lead Assignment */}
        <div className="bg-white rounded-2xl p-6 border border-[#E5EAF0] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E5EAF0]">
            <Users className="w-4 h-4 text-[#087A50]" />
            <h3 className="text-sm font-bold text-[#111827]">Automated Lead Assignment</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1">
              Sales Routing Strategy
            </label>
            <select
              value={assignmentMode}
              onChange={(e) => setAssignmentMode(e.target.value)}
              className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white"
            >
              <option value="round_robin">Round Robin (Even Distribution across Sales Team)</option>
              <option value="workload_based">Workload Based (Assign to Rep with Lowest Active Leads)</option>
              <option value="service_specialist">Specialist Based (Match by PCOS, Skin, Fertility)</option>
            </select>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Active sales representatives will receive real-time assignment notifications via in-app alerts and WhatsApp alerts.</span>
          </div>
        </div>

        {/* Card 3: Healthcare Advertising Compliance */}
        <div className="bg-white rounded-2xl p-6 border border-[#E5EAF0] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E5EAF0]">
            <ShieldCheck className="w-4 h-4 text-[#087A50]" />
            <h3 className="text-sm font-bold text-[#111827]">Healthcare Privacy &amp; Ad Safety</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-medium text-[#111827]">Sensitive Clinical Data Sanitization</span>
              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800">
                LOCKED ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-medium text-[#111827]">Audience Custom List Hashing &amp; Opt-In Verification</span>
              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800">
                COMPLIANT
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-medium text-[#111827]">Disallowed Medical Outcome Claims Filter</span>
              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800">
                ENFORCED
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Marketing Automations Engine */}
        <div className="bg-white rounded-2xl p-6 border border-[#E5EAF0] shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5EAF0]">
              <Zap className="w-4 h-4 text-[#087A50]" />
              <h3 className="text-sm font-bold text-[#111827]">Automated Marketing Pipelines</h3>
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Launch the visual no-code builder to configure multi-step workflows connecting webhooks, CRM leads, appointment bookings, and ROAS.
            </p>
          </div>

          <button
            onClick={onOpenAutomationBuilder}
            className="w-full py-3 bg-[#E9F8F0] hover:bg-[#D1F2E2] text-[#087A50] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#16A36A]/20"
          >
            <Zap className="w-4 h-4" />
            <span>Launch Visual Automation Builder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
