"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckSquare,
  Plus,
  Search,
  Loader2,
  User,
  MessageSquare,
  X,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface TaskItem {
  _id: string;
  title: string;
  description?: string;
  module: "crm" | "clinical" | "hrms" | "finance" | "general";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "completed" | "overdue";
  assignedTo?: {
    _id: string;
    name: string;
    role: string;
  };
  dueDate?: string;
  checklist?: Array<{ item: string; done: boolean }>;
  comments?: Array<{ author: string; text: string; createdAt: string }>;
  createdAt: string;
}

interface StaffUser {
  _id: string;
  name: string;
  role: string;
}

export function TasksTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [newComment, setNewComment] = useState("");

  const [form, setForm] = useState(() => ({
    title: "",
    description: "",
    module: "crm" as TaskItem["module"],
    priority: "medium" as TaskItem["priority"],
    assignedTo: "",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
  }));

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (moduleFilter !== "all") params.append("module", moduleFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);

      const res = await api.get<{ tasks: TaskItem[] }>(`/tasks?${params.toString()}`);
      if (res.data?.tasks) {
        setTasks(res.data.tasks);
      }
    } catch {
      showNotification("Failed to load staff tasks", true);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, moduleFilter, priorityFilter, showNotification]);


  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (moduleFilter !== "all") params.append("module", moduleFilter);
        if (priorityFilter !== "all") params.append("priority", priorityFilter);

        const [tasksRes, usersRes] = await Promise.all([
          api.get<{ tasks: TaskItem[] }>(`/tasks?${params.toString()}`),
          api.get<{ users: StaffUser[] }>("/users?limit=50").catch(() => null),
        ]);

        if (isMounted) {
          if (tasksRes.data?.tasks) setTasks(tasksRes.data.tasks);
          if (usersRes?.data?.users) setUsers(usersRes.data.users);
        }
      } catch {
        if (isMounted) showNotification("Failed to load staff tasks", true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, [statusFilter, moduleFilter, priorityFilter, showNotification]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showNotification("Task title is required", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ task: TaskItem }>("/tasks", {
        title: form.title,
        description: form.description,
        module: form.module,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
        dueDate: form.dueDate,
      });

      if (res.success) {
        showNotification("Operational task assigned successfully!");
        setIsAddModalOpen(false);
        setForm({
          title: "",
          description: "",
          module: "crm",
          priority: "medium",
          assignedTo: "",
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        });
        loadTasks();
      } else {
        showNotification(res.message || "Failed to create task", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error creating task", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskItem["status"]) => {
    try {
      const res = await api.patch<{ task: TaskItem }>(`/tasks/${taskId}`, {
        status: newStatus,
      });
      if (res.success) {
        showNotification(`Task status updated to ${newStatus.replace("_", " ")}`);
        loadTasks();
        if (selectedTask?._id === taskId && res.data?.task) {
          setSelectedTask(res.data.task);
        }
      }
    } catch {
      showNotification("Failed to update task status", true);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    try {
      const res = await api.patch<{ task: TaskItem }>(`/tasks/${selectedTask._id}`, {
        comment: newComment.trim(),
      });
      if (res.success && res.data?.task) {
        setSelectedTask(res.data.task);
        setNewComment("");
        loadTasks();
        showNotification("Staff note appended to task");
      }
    } catch {
      showNotification("Failed to add comment", true);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const titleMatch = t.title.toLowerCase().includes(search.toLowerCase());
    const staffMatch = t.assignedTo?.name?.toLowerCase().includes(search.toLowerCase());
    return titleMatch || staffMatch;
  });

  const getPriorityBadge = (p: TaskItem["priority"]) => {
    switch (p) {
      case "urgent":
        return "bg-red-50 text-red-900 border-red-200 font-bold";
      case "high":
        return "bg-amber-50 text-amber-900 border-amber-200";
      case "low":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-blue-50 text-blue-900 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#18231D]">Tasks &amp; Operational Workflows</h2>
              <p className="text-xs text-[#68756D] mt-0.5">
                Cross-departmental delegation: CRM follow-ups, clinical chart preps, billing checks, and compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-4 border-t border-[#E2E9E3]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search task title or assigned staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none bg-white text-[#18231D]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none font-medium"
            >
              <option value="all">All Modules</option>
              <option value="crm">CRM &amp; Inquiries</option>
              <option value="clinical">Clinical Practice</option>
              <option value="hrms">HRMS &amp; Staff</option>
              <option value="finance">Finance &amp; Billing</option>
              <option value="general">General Operations</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>

            <button
              onClick={loadTasks}
              disabled={isLoading}
              className="p-1.5 border border-[#E2E9E3] rounded-xl hover:bg-gray-50 text-[#154734] cursor-pointer transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Content */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#68756D] flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
            <span>Loading task queue...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#68756D] flex flex-col items-center gap-2">
            <CheckSquare className="w-8 h-8 text-gray-300" />
            <p className="font-semibold text-[#18231D]">No operational tasks found</p>
            <p className="text-[11px] text-[#68756D]">Adjust filter criteria or create a new assignment.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E9E3] bg-[#F7F9F7] text-[#68756D] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Title &amp; Module</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E3]">
                  {filteredTasks.map((t) => (
                    <tr key={t._id} className="hover:bg-[#F7F9F7]/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#18231D]">{t.title}</div>
                        <div className="text-[11px] text-[#68756D] flex items-center gap-1.5 mt-0.5">
                          <span className="uppercase font-mono font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]">
                            {t.module}
                          </span>
                          {t.description && <span className="truncate max-w-xs text-[#68756D]">{t.description}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#18231D] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#154734]" />
                          <span>{t.assignedTo?.name || "Unassigned"}</span>
                        </div>
                        <div className="text-[11px] text-[#68756D] capitalize">{t.assignedTo?.role}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${getPriorityBadge(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-medium text-[#18231D]">
                          {t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "Open"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            t.status === "completed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : t.status === "in_progress"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : t.status === "overdue"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status !== "completed" ? (
                            <button
                              onClick={() => handleStatusChange(t._id, "completed")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] cursor-pointer transition-colors"
                              title="Mark Completed"
                            >
                              Complete
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(t._id, "in_progress")}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-[11px] cursor-pointer transition-colors"
                              title="Re-open Task"
                            >
                              Re-open
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTask(t)}
                            className="p-1 rounded-lg hover:bg-gray-100 text-[#154734] cursor-pointer transition-colors"
                            title="Open Task Discussion"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden divide-y divide-[#E2E9E3]">
              {filteredTasks.map((t) => (
                <div key={t._id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="uppercase font-mono font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]">
                        {t.module}
                      </span>
                      <h4 className="font-semibold text-sm text-[#18231D] mt-1">{t.title}</h4>
                      {t.description && <p className="text-xs text-[#68756D] line-clamp-2 mt-0.5">{t.description}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border shrink-0 ${getPriorityBadge(t.priority)}`}>
                      {t.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#68756D] pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#154734]" />
                      <span>{t.assignedTo?.name || "Unassigned"}</span>
                    </span>
                    <span className="font-mono text-[11px]">Due: {t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "Open"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E9E3]/70">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        t.status === "completed"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : t.status === "in_progress"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : t.status === "overdue"
                          ? "bg-red-50 text-red-800 border-red-200"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>

                    <div className="flex items-center gap-2">
                      {t.status !== "completed" ? (
                        <button
                          onClick={() => handleStatusChange(t._id, "completed")}
                          className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs cursor-pointer"
                        >
                          Complete
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(t._id, "in_progress")}
                          className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 font-semibold text-xs cursor-pointer"
                        >
                          Re-open
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedTask(t)}
                        className="px-3 py-1 rounded-lg bg-[#154734] text-white font-semibold text-xs cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL: CREATE TASK */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#E2E9E3]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#18231D]">Create New Task</h3>
                  <p className="text-xs text-[#68756D]">Assign action items to clinic staff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">Task Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Follow up on Meta Ads PCOS lead callback"
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none text-[#18231D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1.5">Department / Module</label>
                  <select
                    value={form.module}
                    onChange={(e) => setForm({ ...form, module: e.target.value as TaskItem["module"] })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none"
                  >
                    <option value="crm">CRM &amp; Inquiries</option>
                    <option value="clinical">Clinical Practice</option>
                    <option value="hrms">HRMS &amp; Staff</option>
                    <option value="finance">Finance &amp; Billing</option>
                    <option value="general">General Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as TaskItem["priority"] })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">Assignee</label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none"
                >
                  <option value="">-- Assign to Myself / Unassigned --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none text-[#18231D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">Detailed Instructions</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Steps required, expected deliverables, reference links..."
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none text-[#18231D]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E2E9E3]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-[#68756D] hover:bg-gray-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer disabled:opacity-60 flex items-center gap-2 shadow-xs transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{isSubmitting ? "Assigning..." : "Assign Task"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TASK DETAIL & DISCUSSION */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedTask(null)} />
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#E2E9E3]">
              <div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${getPriorityBadge(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
                <h3 className="text-base font-serif font-bold text-[#18231D] mt-1.5">{selectedTask.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl space-y-1.5">
                <p className="text-[#68756D] leading-relaxed">{selectedTask.description || "No description provided."}</p>
                <div className="pt-2 flex items-center justify-between font-mono text-[11px] text-[#154734] font-semibold border-t border-[#E2E9E3]">
                  <span>Assigned: {selectedTask.assignedTo?.name || "Unassigned"}</span>
                  <span>Due: {selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split("T")[0] : "Open"}</span>
                </div>
              </div>

              {/* Status Switcher */}
              <div>
                <h4 className="font-semibold text-[#18231D] mb-1.5">Change Progress Status</h4>
                <div className="flex items-center gap-2">
                  {(["open", "in_progress", "completed"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(selectedTask._id, st)}
                      className={`px-3 py-1.5 rounded-xl capitalize font-semibold text-[11px] border cursor-pointer transition-colors ${
                        selectedTask.status === st
                          ? "bg-[#154734] text-white border-[#154734]"
                          : "bg-gray-50 text-[#68756D] border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments / Notes */}
              <div>
                <h4 className="font-semibold text-[#18231D] mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#154734]" />
                  <span>Activity Comments &amp; Notes</span>
                </h4>

                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between text-[10px] text-[#68756D] mb-0.5">
                          <strong className="text-[#18231D]">{c.author}</strong>
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[#18231D]">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 italic text-[11px]">No staff comments logged yet.</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add an update note..."
                    className="flex-1 px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none text-[#18231D]"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="px-3.5 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer shadow-xs transition-colors"
                  >
                    Post
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-[#68756D] hover:bg-gray-50 cursor-pointer font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
