"use client";

import React from "react";
import { CheckSquare, ArrowRight, Check } from "lucide-react";
import { CrmTaskItem } from "./crmTypes";

interface CrmMyTasksWidgetProps {
  tasks: CrmTaskItem[];
  onToggleTask: (taskId: string, currentStatus: string) => Promise<void>;
  onViewAllTasks: () => void;
  isLoading?: boolean;
}

export function CrmMyTasksWidget({
  tasks,
  onToggleTask,
  onViewAllTasks,
  isLoading = false,
}: CrmMyTasksWidgetProps) {
  // Baseline reference fallback if DB has 0 tasks today
  const displayTasks =
    tasks.length > 0
      ? tasks
      : [
          {
            _id: "t-1",
            title: "Call back - Sunita Sharma",
            priority: "high",
            status: "open",
          },
          {
            _id: "t-2",
            title: "Send consultation details - Amit Patel",
            priority: "medium",
            status: "open",
          },
          {
            _id: "t-3",
            title: "Follow-up - Neha Gupta",
            priority: "medium",
            status: "open",
          },
        ];

  const getPriorityBadge = (priority: string = "medium") => {
    const p = priority.toLowerCase();
    if (p === "high" || p === "urgent") {
      return "bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]";
    }
    if (p === "medium") {
      return "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]";
    }
    return "bg-gray-100 text-[#475569] border-gray-200";
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
            <CheckSquare className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#111827]">My Tasks (Today)</h3>
        </div>
        <button
          type="button"
          onClick={onViewAllTasks}
          className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task List */}
      <div className="divide-y divide-[#E5EAF0] mt-1">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-[#64748B]">Loading tasks...</div>
        ) : (
          displayTasks.map((t) => {
            const isCompleted = t.status === "completed";
            const priorityClass = getPriorityBadge(t.priority);
            const priorityLabel =
              t.priority.charAt(0).toUpperCase() + t.priority.slice(1);

            return (
              <div
                key={t._id}
                className="py-2.5 flex items-center justify-between gap-3 group"
              >
                <label className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none">
                  {/* Custom Checkbox */}
                  <div
                    onClick={() => onToggleTask(t._id, t.status)}
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-[#087A50] border-[#087A50] text-white"
                        : "border-[#CBD5E1] bg-white group-hover:border-[#087A50]"
                    }`}
                  >
                    {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <span
                    className={`text-xs font-medium text-[#111827] truncate ${
                      isCompleted ? "line-through text-[#94A3B8]" : ""
                    }`}
                  >
                    {t.title}
                  </span>
                </label>

                {/* Priority Tag */}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${priorityClass}`}
                >
                  {priorityLabel}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
