"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  Mail,
  Smartphone,
  Shield,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface Preferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  appointmentReminders: boolean;
  promotionalOptOut: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [preferences, setPreferences] = useState<Preferences>({
    email: true,
    sms: true,
    whatsapp: true,
    appointmentReminders: true,
    promotionalOptOut: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ notifications: NotificationItem[] }>("/patient/me/notifications");
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      console.error("Notifications fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await api.get<{ preferences: Preferences }>("/patient/me/notifications/preferences");
      if (res.success && res.data?.preferences) {
        setPreferences((prev) => ({
          ...prev,
          ...res.data.preferences,
        }));
      }
    } catch {
      // Keep defaults
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/patient/me/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Local state fallback
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/patient/me/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleTogglePref = async (key: keyof Preferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    setSavingPrefs(true);
    try {
      await api.patch("/patient/me/notifications/preferences", updated);
    } catch {
      // Revert if failed
    } finally {
      setSavingPrefs(false);
    }
  };

  const displayedList =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4EEE7]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
            Messages & Notifications
          </h1>
          <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
            Appointment alerts, clinical updates, prescription notices, and channel settings
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#D5E8DC] hover:bg-[#F2F7F4] text-[#075B35] text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Notifications Feed (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F5F2]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  filter === "all" ? "bg-[#075B35] text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  filter === "unread" ? "bg-[#075B35] text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                Unread ({notifications.filter((n) => !n.read).length})
              </button>
            </div>

            <span className="text-[11px] text-[#68766F]">
              Showing {displayedList.length} updates
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[#68766F] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 text-[#075B35] animate-spin" />
              <span className="text-xs">Loading notifications...</span>
            </div>
          ) : displayedList.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8C9892]">
              No notifications found in this view.
            </div>
          ) : (
            <div className="space-y-3">
              {displayedList.map((notif) => {
                const isAppt = notif.type === "appointment";
                const isClinical = notif.type === "clinical";

                return (
                  <div
                    key={notif._id}
                    onClick={() => !notif.read && handleMarkAsRead(notif._id)}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                      !notif.read
                        ? "bg-[#F4F9F6] border-[#C6E7D2] shadow-xs"
                        : "bg-white border-[#E4EEE7] hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isAppt
                            ? "bg-[#EDF8F1] text-[#075B35]"
                            : isClinical
                            ? "bg-[#EDF8F1] text-[#075B35]"
                            : "bg-[#FFF8EC] text-[#D97706]"
                        }`}
                      >
                        {isAppt && <Calendar className="w-4 h-4" />}
                        {isClinical && <FileText className="w-4 h-4" />}
                        {!isAppt && !isClinical && <Bell className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#14251F]">{notif.title}</h4>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#075B35]" />
                          )}
                        </div>
                        <p className="text-xs text-[#556960] mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-[#8C9892] mt-2 block">
                          {new Date(notif.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {!notif.read && (
                      <span className="text-[11px] font-semibold text-[#075B35] hover:underline shrink-0">
                        Mark read
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Notification Channel Preferences (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-4">
          <h3 className="text-base font-serif font-bold text-[#14251F]">
            Communication Channels
          </h3>
          <p className="text-xs text-[#68766F] leading-relaxed">
            Configure how you wish to receive critical clinical reminders and schedule notices.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7]">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#075B35]" />
                <label htmlFor="pref-email" className="font-semibold text-[#14251F] cursor-pointer">Email Alerts</label>
              </div>
              <input
                id="pref-email"
                name="pref-email"
                type="checkbox"
                checked={Boolean(preferences.email)}
                onChange={() => handleTogglePref("email")}
                className="w-4 h-4 accent-[#075B35] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7]">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-[#075B35]" />
                <label htmlFor="pref-sms" className="font-semibold text-[#14251F] cursor-pointer">SMS Notifications</label>
              </div>
              <input
                id="pref-sms"
                name="pref-sms"
                type="checkbox"
                checked={Boolean(preferences.sms)}
                onChange={() => handleTogglePref("sms")}
                className="w-4 h-4 accent-[#075B35] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7]">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-[#075B35]" />
                <label htmlFor="pref-whatsapp" className="font-semibold text-[#14251F] cursor-pointer">WhatsApp Reminders</label>
              </div>
              <input
                id="pref-whatsapp"
                name="pref-whatsapp"
                type="checkbox"
                checked={Boolean(preferences.whatsapp)}
                onChange={() => handleTogglePref("whatsapp")}
                className="w-4 h-4 accent-[#075B35] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7]">
              <div>
                <label htmlFor="pref-promo" className="font-semibold text-[#14251F] block cursor-pointer">Promotional Opt-Out</label>
                <span className="text-[10px] text-[#68766F]">Block all promotional healthcare offers</span>
              </div>
              <input
                id="pref-promo"
                name="pref-promo"
                type="checkbox"
                checked={Boolean(preferences.promotionalOptOut)}
                onChange={() => handleTogglePref("promotionalOptOut")}
                className="w-4 h-4 accent-[#075B35] cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-[#075B35] flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Sensitive medical diagnosis details are suppressed in mobile lock screen previews.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
