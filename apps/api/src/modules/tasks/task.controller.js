const Task = require("./task.model");
const User = require("../users/user.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

async function listTasks(req, res, next) {
  try {
    const { status, module: taskModule, priority, assignedTo } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (taskModule && taskModule !== "all") query.module = taskModule;
    if (priority && priority !== "all") query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate("assignedTo", "name phone email role")
      .populate("createdBy", "name")
      .sort({ dueDate: 1, createdAt: -1 });

    return sendSuccess(res, { tasks, total: tasks.length }, "Tasks retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const { title, description, module: taskModule, priority, assignedTo, dueDate, checklist } = req.body;

    if (!title || !title.trim()) {
      return next(new ValidationError("Task title is required"));
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || "",
      module: taskModule || "general",
      priority: priority || "medium",
      assignedTo: assignedTo || req.user._id,
      createdBy: req.user._id,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 86400000 * 2), // Default 2 days
      checklist: Array.isArray(checklist) ? checklist : [],
      status: "open",
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "TASK_CREATED",
      targetEntity: "Task",
      targetId: task._id.toString(),
      details: { title: task.title, module: task.module, priority: task.priority },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { task }, "Task created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { status, priority, description, checklist, comment } = req.body;

    const task = await Task.findById(id);
    if (!task) return next(new NotFoundError("Task not found"));

    if (status) {
      task.status = status;
      if (status === "completed") {
        task.completedAt = new Date();
      }
    }
    if (priority) task.priority = priority;
    if (description !== undefined) task.description = description;
    if (checklist) task.checklist = checklist;
    if (comment && comment.trim()) {
      task.comments.push({
        author: req.user.name || "Staff",
        text: comment.trim(),
        createdAt: new Date(),
      });
    }

    await task.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "TASK_UPDATED",
      targetEntity: "Task",
      targetId: task._id.toString(),
      details: { status: task.status },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { task }, "Task updated successfully");
  } catch (err) {
    return next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndDelete(id);
    if (!task) return next(new NotFoundError("Task not found"));

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "TASK_DELETED",
      targetEntity: "Task",
      targetId: id,
      ipAddress: req.ip,
    });

    return sendSuccess(res, { deletedId: id }, "Task deleted successfully");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
};
