"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare,
  Clock,
  Calendar,
  Phone,
  MessageSquare,
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Search,
  Filter,
  User,
  ChevronRight,
  X,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { SalesLead, SalesLeadDrawer } from "../SalesLeadDrawer";

interface FollowUpItem {
  _id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadService: string;
  leadStatus: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
  notes?: string;
  assignedTo?: { name: string };
}

interface FollowUpsResponse {
  dueToday: FollowUpItem[];
  overdue: FollowUpItem[];
  upcoming: FollowUpItem[];
  completed: FollowUpItem[];
  counts: {
    dueToday: number;
    overdue: number;
    upcoming: number;
    completed: number;
  };
}

interface SalesTasksTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
  mode?: "tasks" | "followups";
}

export function SalesTasksTab({
  showNotification,
  mode = "tasks",
}: SalesTasksTabProps) {
  const [data, setData] = useState<FollowUpsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "dueToday" | "overdue" | "upcoming" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // New task form
  const [leads, setLeads] = useState<Array<{ _id: string; fullName: string; phone: string }>>([]);
  const [newTaskForm, setNewTaskForm] = useState({
    leadId: "",
    title: "",
    dueDate: "",
    priority: "medium",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      const [res, leadRes] = await Promise.allSettled([
        api.get<FollowUpsResponse>("/crm/follow-ups"),
        api.get<{ leads: Array<{ _id: string; fullName: string; phone: string }> }>("/crm/leads?limit=50"),
      ]);

      if (res.status === "fulfilled" && res.value.data) {
        setData(res.value.data);
      }
      if (leadRes.status === "fulfilled" && leadRes.value.data?.leads) {
        setLeads(leadRes.value.data.leads);
        if (leadRes.value.data.leads.length > 0 && !newTaskForm.leadId) {
          setNewTaskForm((prev) => ({ ...prev, leadId: leadRes.value.data!.leads[0]._id }));
        }
      }
    } catch {
      showNotification("Failed to load tasks and follow-ups", true);
    } finally {
      setIsLoading(false);
    }
  }, [newTaskForm.leadId, showNotification]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Complete a task
  const handleCompleteTask = async (task: FollowUpItem) => {
    try {
      await api.patch(`/crm/follow-ups/${task._id}/complete`, { status: "completed" });
      showNotification(`Task marked completed: ${task.title}`);
      fetchFollowUps();
    } catch {
      showNotification("Failed to update task status", true);
    }
  };

  // Submit new task
  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.leadId || !newTaskForm.title.trim() || !newTaskForm.dueDate) {
      showNotification("Please fill in lead, task title, and scheduled date/time", true);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/crm/follow-ups", {
        ...newTaskForm,
        dueDate: new Date(newTaskForm.dueDate).toISOString(),
      });
      showNotification("Follow-up task scheduled successfully!");
      setIsScheduleModalOpen(false);
      setNewTaskForm({
        leadId: leads[0]?._id || "",
        title: "",
        dueDate: "",
        priority: "medium",
        notes: "",
      });
      fetchFollowUps();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error scheduling task";
      showNotification(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combined and filtered task list
  const filteredTasks = useMemo(() => {
    if (!data) return [];
    let items: FollowUpItem[] = [];

    if (activeFilter === "all") {
      items = [...data.dueToday, ...data.overdue, ...data.upcoming, ...data.completed];
    } else if (activeFilter === "dueToday") {
      items = data.dueToday;
    } else if (activeFilter === "overdue") {
      items = data.overdue;
    } else if (activeFilter === "upcoming") {
      items = data.upcoming;
    } else if (activeFilter === "completed") {
      items = data.completed;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.leadName.toLowerCase().includes(q) ||
          t.leadPhone.includes(q)
      );
    }

    return items;
  }, [data, activeFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            {mode === "tasks" ? "My Tasks & Activity Schedule" : "Follow-ups & Outreach Queue"}
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Never drop a lead. Track planned callbacks, WhatsApp check-ins, and treatment package reviews.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsScheduleModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Schedule Follow-up</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Tasks", count: (data?.dueToday.length || 0) + (data?.overdue.length || 0) + (data?.upcoming.length || 0) + (data?.completed.length || 0) },
            { id: "dueToday", label: "Due Today", count: data?.dueToday.length || 0 },
            { id: "overdue", label: "Overdue", count: data?.overdue.length || 0 },
            { id: "upcoming", label: "Upcoming", count: data?.upcoming.length || 0 },
            { id: "completed", label: "Completed", count: data?.completed.length || 0 },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === f.id
                  ? "bg-[#16A34A] text-white shadow-xs font-bold"
                  : "bg-[#F8FAFC] text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <span>{f.label}</span>
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === f.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or lead..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-7 h-7 text-[#16A34A] animate-spin mb-2" />
            <p className="text-xs text-gray-500">Loading scheduled follow-up tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-16 text-center text-xs text-gray-500">
            No tasks found in this view.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const isDone = task.status === "completed";
              return (
                <div
                  key={task._id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDone
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#16A34A]/40 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(task)}
                      disabled={isDone}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors ${
                        isDone
                          ? "bg-[#16A34A] border-[#16A34A] text-white"
                          : "border-gray-300 hover:border-[#16A34A] bg-white"
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <h4 className={`text-xs sm:text-sm font-bold text-[#0F172A] ${isDone ? "line-through text-gray-400" : ""}`}>
                        {task.title}
                      </h4>
                      <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-gray-700">{task.leadName}</span>
                        <span>•</span>
                        <span>{task.leadService}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">
                          {task.dueDate ? new Date(task.dueDate).toLocaleString("en-IN") : "Scheduled"}
                        </span>
                      </p>
                      {task.notes && (
                        <p className="text-[11px] text-gray-400 mt-1 italic leading-relaxed">
                          &ldquo;{task.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        task.priority === "high"
                          ? "bg-red-50 text-red-700"
                          : task.priority === "medium"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {task.priority || "medium"}
                    </span>

                    <a
                      href={`tel:${task.leadPhone}`}
                      className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-[#16A34A] hover:bg-gray-50 shadow-2xs"
                      title="Call Lead"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        const clean = (task.leadPhone || "").replace(/[^0-9]/g, "");
                        window.open(`https://wa.me/${clean}`, "_blank");
                      }}
                      className="p-2 rounded-xl bg-[#25D366] text-white hover:bg-[#20BE5A] shadow-2xs cursor-pointer"
                      title="WhatsApp Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-[#0F172A]">Schedule Outreach Follow-up</h3>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleTask} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Target Lead *</label>
                <select
                  value={newTaskForm.leadId}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, leadId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                >
                  {leads.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.fullName} ({l.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Task Title / Action *</label>
                <input
                  type="text"
                  required
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  placeholder="e.g. Call back regarding PCOD consultation timing"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Due Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Context</label>
                <textarea
                  rows={2}
                  value={newTaskForm.notes}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, notes: e.target.value })}
                  placeholder="Additional context from previous conversation..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#16A34A] text-white rounded-xl text-xs font-bold hover:bg-[#15803D]"
                >
                  {isSubmitting ? "Scheduling..." : "Save Follow-up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

