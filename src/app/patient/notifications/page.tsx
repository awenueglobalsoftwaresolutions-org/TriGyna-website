"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Send,
  AlertTriangle,
  RotateCcw,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface EmailPreferenceData {
  transactional: boolean;
  appointments: boolean;
  billing: boolean;
  clinical: boolean;
  marketing: boolean;
  newsletter: boolean;
  unsubscribeAll: boolean;
}

interface UserEmailHistoryItem {
  _id: string;
  recipient: string;
  notificationType: string;
  templateName: string;
  subject: string;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"inbox" | "email_history">("inbox");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [emailHistory, setEmailHistory] = useState<UserEmailHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const [preferences, setPreferences] = useState<EmailPreferenceData>({
    transactional: true,
    appointments: true,
    billing: true,
    clinical: true,
    marketing: false,
    newsletter: false,
    unsubscribeAll: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showFeedback = (text: string, isError = false) => {
    setFeedbackMsg({ text, isError });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

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
      const res = await api.get<{ preferences: EmailPreferenceData }>("/email/preferences");
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

  const fetchEmailHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get<{ logs: UserEmailHistoryItem[] }>("/email/history");
      if (res.success && res.data?.logs) {
        setEmailHistory(res.data.logs || []);
      }
    } catch (err) {
      console.error("Email history fetch error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, []);

  useEffect(() => {
    if (activeTab === "email_history") {
      fetchEmailHistory();
    }
  }, [activeTab]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/patient/me/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch {
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

  const handleTogglePref = async (key: keyof EmailPreferenceData) => {
    if (key === "transactional") return; // Transactional cannot be disabled
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    setSavingPrefs(true);
    try {
      const res = await api.patch<{ preferences: EmailPreferenceData }>("/email/preferences", updated);
      if (res.success) {
        showFeedback("Notification preferences updated.");
      }
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : "Failed to update preferences", true);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    try {
      setSendingVerification(true);
      const res = await api.post<{ dispatched?: boolean; alreadyVerified?: boolean }>("/email/verification/send", {});
      if (res.success) {
        showFeedback("Verification email sent! Please check your inbox and spam folder.");
        if (refreshUser) refreshUser();
      }
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : "Failed to send verification email", true);
    } finally {
      setSendingVerification(false);
    }
  };

  const displayedList =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            feedbackMsg.isError
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-[#075B35]"
          }`}
        >
          {feedbackMsg.isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4EEE7]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
            Messages &amp; Notifications
          </h1>
          <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
            Appointment alerts, clinical updates, prescription notices, and email verification status
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "inbox" && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#D5E8DC] hover:bg-[#F2F7F4] text-[#075B35] text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Email Verification Strip */}
      <div className="p-4 rounded-2xl bg-white border border-[#E4EEE7] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            user?.isEmailVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}>
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#14251F]">{user?.email || "Registered Email"}</span>
              {user?.isEmailVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock className="w-2.5 h-2.5" /> Unverified
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#68766F] mt-0.5">
              {user?.isEmailVerified
                ? "Your email is verified to receive confidential medical receipts & appointments."
                : "Verify your email to receive clinical summaries, receipts, and consultation links."}
            </p>
          </div>
        </div>

        {!user?.isEmailVerified && (
          <button
            onClick={handleSendVerificationEmail}
            disabled={sendingVerification}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#075B35] hover:bg-[#064e2e] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {sendingVerification ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{sendingVerification ? "Sending..." : "Resend Verification Email"}</span>
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Feed and History Tabs (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-4">
          {/* Subtabs: In-app Inbox vs Email Notifications History */}
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F5F2]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("inbox")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  activeTab === "inbox" ? "bg-[#075B35] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                In-App Inbox ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab("email_history")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  activeTab === "email_history" ? "bg-[#075B35] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Email Dispatch History
              </button>
            </div>

            {activeTab === "inbox" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-lg transition ${
                    filter === "all" ? "bg-emerald-100 text-emerald-800" : "text-gray-500"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-lg transition ${
                    filter === "unread" ? "bg-emerald-100 text-emerald-800" : "text-gray-500"
                  }`}
                >
                  Unread ({notifications.filter((n) => !n.read).length})
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: In-App Inbox */}
          {activeTab === "inbox" && (
            <>
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
                              {!notif.read && <span className="w-2 h-2 rounded-full bg-[#075B35]" />}
                            </div>
                            <p className="text-xs text-[#556960] mt-1 leading-relaxed">{notif.message}</p>
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
            </>
          )}

          {/* TAB 2: Email History */}
          {activeTab === "email_history" && (
            <>
              {historyLoading ? (
                <div className="py-12 text-center text-[#68766F] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#075B35] animate-spin" />
                  <span className="text-xs">Loading email delivery history...</span>
                </div>
              ) : emailHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8C9892]">
                  No transactional email notifications recorded for your account yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {emailHistory.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 rounded-2xl border border-[#E4EEE7] hover:border-gray-300 transition flex items-start justify-between gap-3 bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#F0F5F2] text-[#075B35] flex items-center justify-center shrink-0 mt-0.5">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#14251F]">{item.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] uppercase font-semibold">
                              {item.notificationType}
                            </span>
                            <span className="text-[10px] text-[#8C9892]">
                              {new Date(item.createdAt).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === "delivered"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "sent"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Email & Notification Preferences (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-4">
          <h3 className="text-base font-serif font-bold text-[#14251F]">
            Email &amp; Notification Settings
          </h3>
          <p className="text-xs text-[#68766F] leading-relaxed">
            Manage your delivery preferences for clinical updates, invoices, and scheduling notices.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            {/* Mandatory Security & Transactional Notice */}
            <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7] flex items-center justify-between">
              <div>
                <label className="font-semibold text-[#14251F] block">Account &amp; Security Emails</label>
                <span className="text-[10px] text-[#68766F]">Password resets, verification &amp; alerts</span>
              </div>
              <span className="text-[10px] font-bold text-[#075B35] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Mandatory
              </span>
            </div>

            {/* Appointment Reminders */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7]">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#075B35]" />
                <label htmlFor="pref-appt" className="font-semibold text-[#14251F] cursor-pointer">
                  Appointment Updates
                </label>
              </div>
              <input
                id="pref-appt"
                type="checkbox"
                checked={Boolean(preferences.appointments)}
                onChange={() => handleTogglePref("appointments")}
                disabled={savingPrefs}
                className="w-4 h-4 accent-[#075B35] cursor-pointer"
              />
            </div>

            {/* Invoices and Billing */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7]">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-[#075B35]" />
                <label htmlFor="pref-billing" className="font-semibold text-[#14251F] cursor-pointer">
                  Invoices &amp; Receipts
                </label>
              </div>
              <input
                id="pref-billing"
                type="checkbox"
                checked={Boolean(preferences.billing)}
                onChange={() => handleTogglePref("billing")}
                disabled={savingPrefs}
                className="w-4 h-4 accent-[#075B35] cursor-pointer"
              />
            </div>

            {/* Clinical & Prescription Alerts */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7]">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#075B35]" />
                <label htmlFor="pref-clinical" className="font-semibold text-[#14251F] cursor-pointer">
                  Prescription Notices
                </label>
              </div>
              <input
                id="pref-clinical"
                type="checkbox"
                checked={Boolean(preferences.clinical)}
                onChange={() => handleTogglePref("clinical")}
                disabled={savingPrefs}
                className="w-4 h-4 accent-[#075B35] cursor-pointer"
              />
            </div>

            {/* Marketing & Health Tips */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7]">
              <div>
                <label htmlFor="pref-marketing" className="font-semibold text-[#14251F] block cursor-pointer">
                  Health Tips &amp; Updates
                </label>
                <span className="text-[10px] text-[#68766F]">Constitutional wellness newsletters</span>
              </div>
              <input
                id="pref-marketing"
                type="checkbox"
                checked={Boolean(preferences.marketing)}
                onChange={() => handleTogglePref("marketing")}
                disabled={savingPrefs}
                className="w-4 h-4 accent-[#075B35] cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-[#075B35] flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Healthcare privacy compliance: Medical diagnoses are never included in email subjects or unencrypted body text.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
