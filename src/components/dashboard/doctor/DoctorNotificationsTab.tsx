"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Filter,
  CheckCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { DoctorTab } from "./DoctorSidebar";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: {
    appointmentId?: string;
    patientId?: string;
  };
}

interface DoctorNotificationsTabProps {
  onNavigateTab: (tab: DoctorTab) => void;
  onRefreshBadge?: () => void;
}

export function DoctorNotificationsTab({
  onNavigateTab,
  onRefreshBadge,
}: DoctorNotificationsTabProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ data?: NotificationItem[]; notifications?: NotificationItem[] }>(
        `/api/v1/doctor/notifications`
      );
      const list = (res as any).data?.notifications || (Array.isArray((res as any).data) ? (res as any).data : ((res as any).notifications || []));
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/api/v1/doctor/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      onRefreshBadge?.();
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch(`/api/v1/doctor/notifications/read-all`, {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onRefreshBadge?.();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const filtered = notifications.filter((n) => (filter === "unread" ? !n.read : true));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[#154734]" /> Clinical Alerts & Workflow Notifications
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Real-time updates regarding assigned patient arrivals, follow-up deadlines, and clinical queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#F5F8F6] p-1 rounded-xl border border-[#E1E9E3] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === "all" ? "bg-white text-[#154734] shadow-sm" : "text-[#65746B]"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === "unread" ? "bg-white text-[#154734] shadow-sm" : "text-[#65746B]"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#154734] border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-[#E1E9E3] shadow-sm divide-y divide-[#E1E9E3] overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#65746B]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">
            No notifications matching current filter.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item._id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                !item.read ? "bg-[#F9FCFA]" : "hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    !item.read ? "bg-[#E7F3EA] text-[#154734]" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-[#17251E]">{item.title}</h4>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-[#154734]"></span>
                    )}
                  </div>
                  <p className="text-xs text-[#65746B] mt-0.5">{item.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(item._id)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-[#154734] hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                  >
                    Mark read
                  </button>
                )}
                {item.data?.appointmentId && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab("appointments")}
                    className="px-3 py-1 bg-[#154734] text-white text-[11px] font-semibold rounded-lg hover:bg-[#0E3828] transition-colors"
                  >
                    View Appt
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
