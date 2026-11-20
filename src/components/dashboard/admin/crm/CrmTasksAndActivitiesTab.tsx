"use client";

import React, { useState } from "react";
import { CheckSquare, Calendar, Plus, Clock, User, Check } from "lucide-react";
import { CrmTaskItem } from "./crmTypes";

interface CrmTasksAndActivitiesTabProps {
  tasks: CrmTaskItem[];
  activities: Array<{
    _id: string;
    leadName?: string;
    action: string;
    details?: string;
    performedBy?: { name: string };
    createdAt: string;
  }>;
  onToggleTask: (taskId: string, currentStatus: string) => Promise<void>;
  onAddTask: (title: string, priority: string, dueDate: string) => Promise<void>;
  isLoading?: boolean;
}

export function CrmTasksAndActivitiesTab({
  tasks,
  activities,
  onToggleTask,
  onAddTask,
  isLoading = false,
}: CrmTasksAndActivitiesTabProps) {
  const [filter, setFilter] = useState<"all" | "open" | "completed">("all");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDueDate, setNewDueDate] = useState("");

  const filteredTasks = tasks.filter((t) => {
    if (filter === "open") return t.status === "open";
    if (filter === "completed") return t.status === "completed";
    return true;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await onAddTask(newTitle.trim(), newPriority, newDueDate);
    setNewTitle("");
    setNewDueDate("");
    setIsAdding(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Column 1: CRM Tasks */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">CRM Action Tasks</h3>
              <p className="text-xs text-[#64748B]">Operational to-dos and team assignments</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Add Task Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateTask}
            className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-2.5 text-xs animate-in fade-in duration-100"
          >
            <input
              type="text"
              required
              placeholder="Task description (e.g. Call patient to confirm ultrasound)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E5EAF0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#E5EAF0] rounded-xl"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-[#E5EAF0] rounded-xl"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-xs text-[#64748B] hover:text-[#111827]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 rounded-xl bg-[#087A50] text-white font-semibold shadow-2xs"
              >
                Save Task
              </button>
            </div>
          </form>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "all" ? "bg-[#087A50] text-white shadow-2xs" : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("open")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "open" ? "bg-[#087A50] text-white shadow-2xs" : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            Pending ({tasks.filter((t) => t.status === "open").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "completed" ? "bg-[#087A50] text-white shadow-2xs" : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            Completed ({tasks.filter((t) => t.status === "completed").length})
          </button>
        </div>

        {/* Tasks List */}
        <div className="divide-y divide-[#E5EAF0] border border-[#E5EAF0] rounded-xl overflow-hidden text-xs">
          {isLoading ? (
            <div className="py-8 text-center text-[#64748B]">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-8 text-center text-[#64748B]">No tasks found in this section.</div>
          ) : (
            filteredTasks.map((t) => {
              const isDone = t.status === "completed";
              return (
                <div
                  key={t._id}
                  className="p-3 bg-white hover:bg-[#F7F9FC] flex items-center justify-between gap-3 transition-colors"
                >
                  <label className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                    <div
                      onClick={() => onToggleTask(t._id, t.status)}
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isDone
                          ? "bg-[#087A50] border-[#087A50] text-white"
                          : "border-[#CBD5E1] bg-white hover:border-[#087A50]"
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`font-semibold text-[#111827] block truncate ${
                          isDone ? "line-through text-[#94A3B8]" : ""
                        }`}
                      >
                        {t.title}
                      </span>
                      {t.leadName && (
                        <span className="text-[11px] text-[#64748B]">Lead: {t.leadName}</span>
                      )}
                    </div>
                  </label>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                      t.priority === "high"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Column 2: Activity Stream Timeline */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5EAF0]">
          <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111827]">Live Activity Stream</h3>
            <p className="text-xs text-[#64748B]">Real-time operational audit trail across all leads</p>
          </div>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {activities.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              No activity logs recorded yet.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5EAF0]">
              {activities.map((act) => (
                <div key={act._id} className="relative group text-xs">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#087A50] ring-4 ring-white" />
                  <div className="bg-[#F7F9FC] p-3 rounded-xl border border-[#E5EAF0]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111827]">{act.action}</span>
                      <span className="text-[10px] text-[#64748B]">
                        {new Date(act.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {act.leadName && (
                      <span className="text-[11px] font-semibold text-[#087A50] block mt-0.5">
                        {act.leadName}
                      </span>
                    )}
                    {act.details && <p className="text-[#475569] mt-1">{act.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
