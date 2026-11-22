"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  Bell,
  Lock,
  Smartphone,
  Mail,
  CheckCircle2,
  Save,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

export const SalesSettingsTab: React.FC = () => {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    role: "sales",
  });

  const [preferences, setPreferences] = useState({
    whatsappNotifications: true,
    emailNotifications: true,
    inAppPopups: true,
    acceptNewInboundLeads: true,
    monthlyTarget: 50,
  });

  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ user: any }>("/auth/me");
        if (res.data?.user) {
          const u = res.data.user;
          setProfile({
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            role: u.role || "sales",
          });
          if (u.preferences) {
            setPreferences((prev) => ({ ...prev, ...u.preferences }));
          }
        }
      } catch (err) {
        console.error("Error loading profile context", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const body: any = {
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        preferences,
      };

      if (passwordState.newPassword) {
        if (passwordState.newPassword !== passwordState.confirmPassword) {
          setStatusMessage({ type: "error", text: "New password and confirmation do not match." });
          setSaving(false);
          return;
        }
        body.currentPassword = passwordState.currentPassword;
        body.newPassword = passwordState.newPassword;
      }

      const res = await api.patch<{ user: any }>("/auth/profile", body);
      if (res.success || res.data) {
        setStatusMessage({ type: "success", text: "Profile and preferences updated successfully!" });
        setPasswordState({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setStatusMessage({ type: "error", text: res.message || "Failed to update profile." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "A network error occurred while updating profile.";
      console.error("Error updating profile", err);
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Sales Representative Profile & Preferences</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage your personal details, inbound lead routing preferences, notification channels, and security.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Personal Details Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">{profile.name}</h3>
              <p className="text-xs text-gray-500">
                Designation: Sales Executive &bull; Role:{" "}
                <span className="uppercase font-semibold text-emerald-700">{profile.role}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Direct Phone / WhatsApp</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Monthly Target Packages
              </label>
              <input
                type="number"
                value={preferences.monthlyTarget}
                onChange={(e) =>
                  setPreferences({ ...preferences, monthlyTarget: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Lead Routing & Notification Preferences */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-gray-900">Lead Routing & Notification Alerts</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100/60 transition cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-gray-800 block">
                  Accept Inbound Lead Allocations
                </span>
                <span className="text-[11px] text-gray-500">
                  Allow CRM auto-assignment algorithm to route incoming website & WhatsApp leads to you.
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.acceptNewInboundLeads}
                onChange={(e) =>
                  setPreferences({ ...preferences, acceptNewInboundLeads: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100/60 transition cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-gray-800 block">
                  WhatsApp Instant Message Alerts
                </span>
                <span className="text-[11px] text-gray-500">
                  Receive WhatsApp dispatch when high-priority leads or paid package confirmations arrive.
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.whatsappNotifications}
                onChange={(e) =>
                  setPreferences({ ...preferences, whatsappNotifications: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100/60 transition cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-gray-800 block">
                  Email Follow-up Reminders
                </span>
                <span className="text-[11px] text-gray-500">
                  Receive daily morning digest of scheduled call tasks and pending consultations.
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) =>
                  setPreferences({ ...preferences, emailNotifications: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
            </label>
          </div>
        </div>

        {/* Password / Security */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Lock className="w-4 h-4 text-[#0C2925]" />
            <h3 className="font-bold text-sm text-gray-900">Security & Password</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordState.currentPassword}
                onChange={(e) =>
                  setPasswordState({ ...passwordState, currentPassword: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordState.newPassword}
                onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordState.confirmPassword}
                onChange={(e) =>
                  setPasswordState({ ...passwordState, confirmPassword: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0C2925] hover:bg-[#164e45] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
};

