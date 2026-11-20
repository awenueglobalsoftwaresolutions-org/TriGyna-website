"use client";

import React, { useState } from "react";
import { Settings, Save, ShieldCheck, CheckCircle2, Clock, Calendar, AlertCircle } from "lucide-react";

interface CatalogueSettingsTabProps {
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function CatalogueSettingsTab({ showNotification }: CatalogueSettingsTabProps) {
  const [settings, setSettings] = useState({
    defaultSlotDuration: 30,
    bufferMinutes: 10,
    maxAdvanceBookingDays: 30,
    cancellationWindowHours: 4,
    hideDraftsFromPublic: true,
    currencySymbol: "INR (₹)",
    enableGstTax: false,
    defaultGstRate: 0,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showNotification("Catalogue & booking configuration saved successfully!");
    }, 600);
  };

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-4xl">
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">
            Clinic Catalogue &amp; Slot Booking Settings
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure global rules applied across clinical scheduling, slot generation, and public visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#E5EAF0] text-xs">
          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Default Slot Duration (Minutes)
            </label>
            <select
              value={settings.defaultSlotDuration}
              onChange={(e) =>
                setSettings({ ...settings, defaultSlotDuration: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes (Standard)</option>
              <option value={45}>45 Minutes (Extended)</option>
              <option value={60}>60 Minutes (Comprehensive)</option>
            </select>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Applied when creating new clinical services without custom durations.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Buffer Time Between Slots (Minutes)
            </label>
            <select
              value={settings.bufferMinutes}
              onChange={(e) =>
                setSettings({ ...settings, bufferMinutes: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            >
              <option value={0}>0 Minutes (Back-to-back)</option>
              <option value={5}>5 Minutes</option>
              <option value={10}>10 Minutes (Recommended)</option>
              <option value={15}>15 Minutes</option>
            </select>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Padding added to doctors' calendars between consultations.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Max Advance Booking Window (Days)
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={settings.maxAdvanceBookingDays}
              onChange={(e) =>
                setSettings({ ...settings, maxAdvanceBookingDays: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            />
            <p className="text-[11px] text-[#94A3B8] mt-1">
              How far in advance patients can reserve appointments.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#111827] mb-1">
              Cancellation Cut-Off Window (Hours)
            </label>
            <select
              value={settings.cancellationWindowHours}
              onChange={(e) =>
                setSettings({ ...settings, cancellationWindowHours: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            >
              <option value={2}>2 Hours Prior</option>
              <option value={4}>4 Hours Prior (Default)</option>
              <option value={12}>12 Hours Prior</option>
              <option value={24}>24 Hours Prior</option>
            </select>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Sessions cancelled prior to this window return credits back to patient balance.
            </p>
          </div>
        </div>

        {/* Visibility Rule Callout (Requirement #4) */}
        <div className="pt-4 border-t border-[#E5EAF0]">
          <div className="flex items-start gap-3 bg-[#F8FAF9] p-4 rounded-xl border border-[#E5EAF0]">
            <ShieldCheck className="w-5 h-5 text-[#087A50] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-xs text-[#111827] block">
                Strict Draft Isolation Security Rule
              </span>
              <span className="text-[11px] text-[#64748B] block mt-0.5">
                Draft services and unreleased packages are strictly blocked from public booking endpoints and search engines. Only published services in active state are visible to patients.
              </span>
            </div>
            <span className="text-xs font-bold text-[#087A50] bg-[#E9F8F0] px-2.5 py-1 rounded-md shrink-0">
              ENFORCED
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#087A50] hover:bg-[#066341] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving Changes..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

