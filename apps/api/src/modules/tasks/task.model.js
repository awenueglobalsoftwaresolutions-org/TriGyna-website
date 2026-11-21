const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    isDone: { type: Boolean, default: false },
  },
  { _id: true }
);

const taskCommentSchema = new mongoose.Schema(
  {
    author: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
    },
    module: {
      type: String,
      enum: ["crm", "hrms", "clinical", "finance", "operations", "general"],
      default: "general",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "overdue", "cancelled"],
      default: "open",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dueDate: {
      type: Date,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    checklist: [checklistItemSchema],
    comments: [taskCommentSchema],
  },
  { timestamps: true }
);

taskSchema.index({ dueDate: 1, status: 1 });

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
