const mongoose = require("mongoose");
const Lead = require("../crm/lead.model");
const Patient = require("../patients/patient.model");
const Doctor = require("../doctors/doctor.model");
const Appointment = require("../appointments/appointment.model");
const Package = require("../packages/package.model");
const Service = require("../services/service.model");
const Invoice = require("../billing/invoice.model");
const Payment = require("../billing/payment.model");
const Order = require("../billing/order.model");
const WhatsAppConversation = require("../integrations/whatsapp.model");
const SupportTicket = require("../support/support-ticket.model");
const { sendSuccess, sendError } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { generateAtomicPatientCode, generateAtomicOrderNumber, generateAtomicInvoiceNumber } = require("../../shared/counter.service");
const { safeRegex } = require("../../shared/regex.utils");
const { createOrder } = require("../billing/order.controller");
const env = require("../../config/env");
const { canAccessLead } = require("../auth/authorization.service");
const { hasPermission, PERMISSIONS } = require("../../config/permissions");

/**
 * ----------------------------------------------------------------------
 * 1. LEADS APIS
 * ----------------------------------------------------------------------
 */

// GET /api/v1/sales/leads
async function listLeads(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      stage,
      status,
      source,
      priority,
      assignedTo,
      scope,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Role-based data isolation
    if (req.user && (req.user.role === "sales" || req.user.role === "crm")) {
      const canViewAll = hasPermission(req.user, PERMISSIONS.LEADS_VIEW_ALL);
      if (!canViewAll) {
        if (!assignedTo) {
          query.$or = [{ assignedTo: req.user._id }, { assignedTo: null }];
        } else if (assignedTo.toString() !== req.user._id.toString()) {
          return sendSuccess(res, { leads: [], total: 0, page: parseInt(page, 10) }, "Leads retrieved");
        } else {
          query.assignedTo = req.user._id;
        }
      } else if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
        query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
      }
    } else if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
      query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    } else if (req.user.role === "sales" && scope === "me") {
      query.assignedTo = req.user._id;
    }

    const st = stage || status;
    if (st && st !== "all") {
      query.status = st;
    }

    if (source && source !== "all") {
      query.source = source;
    }

    if (priority && priority !== "all") {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        query.$or = [
          { fullName: regex },
          { phone: regex },
          { email: regex },
          { serviceInterest: regex },
        ];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate("assignedTo", "name email phone")
        .populate("convertedPatientId", "patientCode fullName phone")
        .populate("convertedAppointmentId", "appointmentCode appointmentDate startTime status"),
      Lead.countDocuments(query),
    ]);

    return sendSuccess(
      res,
      {
        leads,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
      "Leads retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/leads
async function createLead(req, res, next) {
  try {
    const {
      fullName,
      phone,
      email,
      serviceInterest,
      consultationMode = "Online Video Consultation",
      source = "website_enquiry",
      priority = "medium",
      notes,
      assignedTo,
    } = req.body;

    if (!fullName || !phone) {
      return next(new ValidationError("Full name and phone number are required"));
    }

    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return next(new ValidationError("Please provide a valid 10-digit phone number"));
    }

    // Duplicate detection
    const existingLead = await Lead.findOne({
      phone: { $regex: cleanPhone.slice(-10) },
    });

    if (existingLead && req.body.force !== true) {
      return res.status(200).json({
        success: false,
        isDuplicate: true,
        message: `A lead already exists with phone number ${phone} (${existingLead.fullName})`,
        data: {
          existingLead: {
            _id: existingLead._id,
            fullName: existingLead.fullName,
            status: existingLead.status,
            createdAt: existingLead.createdAt,
          },
        },
      });
    }

    const assignee = assignedTo && mongoose.isValidObjectId(assignedTo)
      ? assignedTo
      : req.user._id;

    const initialTasks = [];
    if (notes && notes.trim()) {
      initialTasks.push({
        title: `Follow up with ${fullName.trim()}`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority,
        status: "open",
        assignedTo: assignee,
        notes: notes.trim(),
      });
    }

    const newLead = await Lead.create({
      fullName: fullName.trim(),
      phone: cleanPhone.slice(-10),
      email: email ? email.trim().toLowerCase() : undefined,
      serviceInterest: serviceInterest || "General Consultation",
      consultationMode,
      source,
      priority,
      status: "new",
      assignedTo: assignee,
      notes: notes ? [{ body: notes.trim(), createdBy: req.user._id }] : [],
      tasks: initialTasks,
      activities: [
        {
          action: "LEAD_CREATED",
          details: `Lead created manually by ${req.user.name || "Sales Executive"}`,
          performedBy: req.user._id,
          createdAt: new Date(),
        },
      ],
      stageHistory: [
        {
          toStage: "new",
          changedBy: req.user._id,
          reason: "Initial lead capture",
          changedAt: new Date(),
        },
      ],
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "LEAD_CREATED",
      targetEntity: "Lead",
      targetId: newLead._id.toString(),
      details: { fullName: newLead.fullName, phone: newLead.phone },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { lead: newLead }, "Lead created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/sales/leads/:leadId
async function getLeadById(req, res, next) {
  try {
    const { leadId } = req.params;
    if (!mongoose.isValidObjectId(leadId)) {
      return next(new ValidationError("Invalid lead ID format"));
    }

    const lead = await Lead.findById(leadId)
      .populate("assignedTo", "name email phone")
      .populate("convertedPatientId")
      .populate("convertedAppointmentId");

    if (!lead) {
      return next(new NotFoundError("Lead record not found"));
    }

    if (!canAccessLead(req.user, lead)) {
      return next(new ForbiddenError("Access denied: You are not authorized to view this lead"));
    }

    return sendSuccess(res, { lead }, "Lead details retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/v1/sales/leads/:leadId
async function updateLead(req, res, next) {
  try {
    const { leadId } = req.params;
    const updates = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return next(new NotFoundError("Lead record not found"));
    }

    if (!canAccessLead(req.user, lead)) {
      return next(new ForbiddenError("Access denied: You are not authorized to modify this lead"));
    }

    const allowedFields = [
      "fullName",
      "phone",
      "email",
      "serviceInterest",
      "consultationMode",
      "priority",
      "source",
      "assignedTo",
      "followUpDate",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        lead[field] = updates[field];
      }
    });

    lead.activities.push({
      action: "LEAD_UPDATED",
      details: `Lead details updated by ${req.user.name || "Sales Executive"}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();
    return sendSuccess(res, { lead }, "Lead updated successfully");
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/v1/sales/leads/:leadId/stage
async function updateLeadStage(req, res, next) {
  try {
    const { leadId } = req.params;
    const { status, note, lostReason } = req.body;

    if (!status) {
      return next(new ValidationError("Target stage status is required"));
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return next(new NotFoundError("Lead record not found"));
    }

    if (!canAccessLead(req.user, lead)) {
      return next(new ForbiddenError("Access denied: You are not authorized to modify this lead"));
    }

    const prevStage = lead.status;
    lead.status = status;
    if (lostReason) {
      lead.lostReason = lostReason;
    }

    lead.stageHistory.push({
      fromStage: prevStage,
      toStage: status,
      changedBy: req.user._id,
      reason: note || lostReason || `Stage updated from ${prevStage} to ${status}`,
      changedAt: new Date(),
    });

    lead.activities.push({
      action: "STAGE_CHANGED",
      details: `Moved from ${prevStage} to ${status}${note ? `: ${note}` : ""}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();
    return sendSuccess(res, { lead }, `Lead stage updated to ${status}`);
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/leads/:leadId/notes
async function addLeadNote(req, res, next) {
  try {
    const { leadId } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return next(new ValidationError("Note content cannot be empty"));
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return next(new NotFoundError("Lead record not found"));
    }

    const newNote = {
      body: body.trim(),
      createdBy: req.user._id,
      createdAt: new Date(),
    };

    lead.notes.push(newNote);
    lead.activities.push({
      action: "NOTE_ADDED",
      details: `Note added: "${body.trim().slice(0, 50)}..."`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();
    return sendSuccess(res, { note: newNote, notes: lead.notes }, "Note added successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/sales/leads/:leadId/activities
async function getLeadActivities(req, res, next) {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId).select("fullName activities");
    if (!lead) {
      return next(new NotFoundError("Lead record not found"));
    }

    const activities = (lead.activities || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return sendSuccess(res, { activities }, "Lead activities retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/leads/:leadId/convert
async function convertLead(req, res, next) {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return next(new NotFoundError("Lead record not found"));
    }

    if (lead.convertedPatientId) {
      const existingPatient = await Patient.findById(lead.convertedPatientId);
      return sendSuccess(
        res,
        { patient: existingPatient, lead },
        "Lead has already been converted to a registered patient"
      );
    }

    let patient = await Patient.findOne({ phone: lead.phone });
    if (!patient) {
      const patientCode = await generateAtomicPatientCode();
      patient = await Patient.create({
        patientCode,
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        registrationDate: new Date(),
        status: "active",
      });
    }

    lead.status = "converted";
    lead.convertedPatientId = patient._id;
    lead.activities.push({
      action: "CONVERTED_TO_PATIENT",
      details: `Lead converted to Patient Record ${patient.patientCode || patient._id}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();
    return sendSuccess(res, { patient, lead }, "Lead converted to patient successfully", 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * ----------------------------------------------------------------------
 * 2. FOLLOW-UPS APIS
 * ----------------------------------------------------------------------
 */

// GET /api/v1/sales/followups
async function listFollowups(req, res, next) {
  try {
    const { filter = "all" } = req.query;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const leadsWithFollowups = await Lead.find({
      $or: [{ "tasks.0": { $exists: true } }, { followUpDate: { $exists: true } }],
    }).populate("assignedTo", "name email phone");

    const dueToday = [];
    const upcoming = [];
    const overdue = [];
    const completed = [];

    leadsWithFollowups.forEach((lead) => {
      (lead.tasks || []).forEach((t) => {
        const item = {
          _id: t._id,
          leadId: lead._id,
          leadName: lead.fullName,
          leadPhone: lead.phone,
          serviceInterest: lead.serviceInterest,
          title: t.title,
          dueDate: t.dueDate,
          priority: t.priority,
          status: t.status,
          notes: t.notes,
          assignedTo: lead.assignedTo,
        };

        const dStr = t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : null;

        if (t.status === "completed") {
          completed.push(item);
        } else if (dStr === todayStr) {
          dueToday.push(item);
        } else if (t.dueDate && new Date(t.dueDate) < now) {
          overdue.push(item);
        } else {
          upcoming.push(item);
        }
      });
    });

    let result = [];
    if (filter === "today") result = dueToday;
    else if (filter === "upcoming") result = upcoming;
    else if (filter === "overdue") result = overdue;
    else if (filter === "completed") result = completed;
    else result = [...dueToday, ...upcoming, ...overdue, ...completed];

    return sendSuccess(
      res,
      {
        followups: result,
        counts: {
          dueToday: dueToday.length,
          upcoming: upcoming.length,
          overdue: overdue.length,
          completed: completed.length,
          total: result.length,
        },
      },
      "Follow-ups retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/followups
async function createFollowup(req, res, next) {
  try {
    const { leadId, title, dueDate, priority = "medium", notes } = req.body;
    if (!leadId || !title || !dueDate) {
      return next(new ValidationError("Lead ID, title, and due date are required"));
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return next(new NotFoundError("Lead record not found"));
    }

    const parsedDue = new Date(dueDate);
    const newTask = {
      title: title.trim(),
      dueDate: parsedDue,
      priority,
      status: "open",
      assignedTo: req.user._id,
      notes: notes ? notes.trim() : "",
      createdAt: new Date(),
    };

    lead.tasks.push(newTask);
    lead.followUpDate = parsedDue;
    lead.activities.push({
      action: "FOLLOWUP_SCHEDULED",
      details: `Scheduled follow-up: "${title}" for ${parsedDue.toLocaleString("en-IN")}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();
    return sendSuccess(res, { followup: newTask, lead }, "Follow-up scheduled successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/sales/followups/:followupId
async function getFollowupById(req, res, next) {
  try {
    const { followupId } = req.params;
    const lead = await Lead.findOne({ "tasks._id": followupId });
    if (!lead) {
      return next(new NotFoundError("Follow-up task not found"));
    }
    const task = lead.tasks.id(followupId);
    return sendSuccess(res, { followup: task, leadId: lead._id, leadName: lead.fullName }, "Follow-up retrieved");
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/v1/sales/followups/:followupId
async function updateFollowup(req, res, next) {
  try {
    const { followupId } = req.params;
    const { title, dueDate, priority, notes, status } = req.body;

    const lead = await Lead.findOne({ "tasks._id": followupId });
    if (!lead) {
      return next(new NotFoundError("Follow-up task not found"));
    }

    const task = lead.tasks.id(followupId);
    if (title !== undefined) task.title = title.trim();
    if (dueDate !== undefined) {
      task.dueDate = new Date(dueDate);
      lead.followUpDate = task.dueDate;
    }
    if (priority !== undefined) task.priority = priority;
    if (notes !== undefined) task.notes = notes.trim();
    if (status !== undefined) task.status = status;

    await lead.save();
    return sendSuccess(res, { followup: task }, "Follow-up updated successfully");
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/v1/sales/followups/:followupId/complete
async function completeFollowup(req, res, next) {
  try {
    const { followupId } = req.params;
    const { notes, outcome, nextAction, nextFollowUpDate } = req.body;

    const lead = await Lead.findOne({ "tasks._id": followupId });
    if (!lead) {
      return next(new NotFoundError("Follow-up task not found"));
    }

    const task = lead.tasks.id(followupId);
    task.status = "completed";

    lead.activities.push({
      action: "FOLLOWUP_COMPLETED",
      details: `Completed follow-up: "${task.title}". ${outcome ? `Outcome: ${outcome}. ` : ""}${notes ? `Notes: ${notes}` : ""}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    if (nextFollowUpDate) {
      lead.followUpDate = new Date(nextFollowUpDate);
      if (nextAction) {
        lead.tasks.push({
          title: nextAction,
          dueDate: new Date(nextFollowUpDate),
          priority: "medium",
          status: "open",
          assignedTo: req.user._id,
        });
      }
    }

    await lead.save();
    return sendSuccess(res, { followup: task }, "Follow-up marked as completed");
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/v1/sales/followups/:followupId/reschedule
async function rescheduleFollowup(req, res, next) {
  try {
    const { followupId } = req.params;
    const { dueDate, reason } = req.body;
    if (!dueDate) {
      return next(new ValidationError("New due date is required"));
    }

    const lead = await Lead.findOne({ "tasks._id": followupId });
    if (!lead) {
      return next(new NotFoundError("Follow-up task not found"));
    }

    const task = lead.tasks.id(followupId);
    const oldDue = task.dueDate;
    task.dueDate = new Date(dueDate);
    lead.followUpDate = task.dueDate;

    lead.activities.push({
      action: "FOLLOWUP_RESCHEDULED",
      details: `Rescheduled "${task.title}" to ${new Date(dueDate).toLocaleString("en-IN")}${reason ? ` Reason: ${reason}` : ""}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();
    return sendSuccess(res, { followup: task }, "Follow-up rescheduled successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * ----------------------------------------------------------------------
 * 3. TASKS APIS
 * ----------------------------------------------------------------------
 */

// GET /api/v1/sales/tasks
async function listTasks(req, res, next) {
  try {
    const { status, priority } = req.query;
    const query = { module: "crm" };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query).sort({ dueDate: 1 }).populate("assignedTo", "name email");
    return sendSuccess(res, { tasks }, "Tasks retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/tasks
async function createTask(req, res, next) {
  try {
    const { title, description, dueDate, priority = "medium", assignedTo } = req.body;
    if (!title || !dueDate) {
      return next(new ValidationError("Title and due date are required"));
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      dueDate: new Date(dueDate),
      priority,
      status: "open",
      module: "crm",
      assignedTo: assignedTo || req.user._id,
      createdBy: req.user._id,
    });

    return sendSuccess(res, { task }, "Task created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/v1/sales/tasks/:taskId
async function updateTask(req, res, next) {
  try {
    const { taskId } = req.params;
    const task = await Task.findByIdAndUpdate(taskId, req.body, { new: true });
    if (!task) {
      return next(new NotFoundError("Task not found"));
    }
    return sendSuccess(res, { task }, "Task updated successfully");
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/v1/sales/tasks/:taskId/complete
async function completeTask(req, res, next) {
  try {
    const { taskId } = req.params;
    let task = await Task.findById(taskId);
    if (!task) {
      // Check if it's a lead embedded task
      const lead = await Lead.findOne({ "tasks._id": taskId });
      if (lead) {
        const embeddedTask = lead.tasks.id(taskId);
        embeddedTask.status = embeddedTask.status === "completed" ? "open" : "completed";
        await lead.save();
        return sendSuccess(res, { task: embeddedTask }, "Task status updated");
      }
      return next(new NotFoundError("Task not found"));
    }

    task.status = task.status === "completed" ? "open" : "completed";
    await task.save();
    return sendSuccess(res, { task }, "Task status updated");
  } catch (err) {
    return next(err);
  }
}

/**
 * ----------------------------------------------------------------------
 * 4. APPOINTMENT APIS
 * ----------------------------------------------------------------------
 */

// GET /api/v1/sales/appointments
async function listAppointments(req, res, next) {
  try {
    const { status, date } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;
    if (date) {
      query.appointmentDate = date;
    }

    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: 1, startTime: 1 })
      .populate("patientId", "fullName phone email")
      .populate("doctorId", "specialization fee");

    return sendSuccess(res, { appointments, total: appointments.length }, "Appointments retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/appointments
async function createAppointment(req, res, next) {
  try {
    const { patientId, doctorId, appointmentDate, startTime, serviceName, notes } = req.body;
    if (!patientId || !appointmentDate || !startTime) {
      return next(new ValidationError("Patient, date, and start time are required"));
    }

    const appt = await Appointment.create({
      patientId,
      doctorId: doctorId || undefined,
      appointmentDate,
      startTime,
      serviceName: serviceName || "Online Video Consultation",
      consultationType: "online_video",
      status: "scheduled",
      notes: notes || "Scheduled via Sales Team CRM",
      meetingLink: "https://meet.google.com/tg-care-meet",
    });

    return sendSuccess(res, { appointment: appt }, "Appointment scheduled successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/sales/appointments/:appointmentId
async function getAppointmentById(req, res, next) {
  try {
    const { appointmentId } = req.params;
    const appt = await Appointment.findById(appointmentId)
      .populate("patientId")
      .populate("doctorId");
    if (!appt) return next(new NotFoundError("Appointment not found"));
    return sendSuccess(res, { appointment: appt }, "Appointment retrieved");
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/v1/sales/appointments/:appointmentId
async function updateAppointment(req, res, next) {
  try {
    const { appointmentId } = req.params;
    const appt = await Appointment.findByIdAndUpdate(appointmentId, req.body, { new: true });
    if (!appt) return next(new NotFoundError("Appointment not found"));
    return sendSuccess(res, { appointment: appt }, "Appointment updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * ----------------------------------------------------------------------
 * 5. PACKAGE APIS
 * ----------------------------------------------------------------------
 */

// GET /api/v1/sales/packages
async function listPackages(req, res, next) {
  try {
    const packages = await Package.find({ isActive: { $ne: false } }).sort({ pricePaise: 1 });
    const formatted = packages.map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      description: p.description,
      priceRupees: p.pricePaise ? p.pricePaise / 100 : 0,
      originalPriceRupees: p.originalPricePaise ? p.originalPricePaise / 100 : 0,
      totalSessions: p.totalSessions,
      sessionDurationMinutes: p.sessionDurationMinutes,
      validityDays: p.validityDays,
      features: p.features || [],
    }));

    return sendSuccess(res, { packages: formatted, total: formatted.length }, "Packages retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/sales/packages/:packageId
async function getPackageById(req, res, next) {
  try {
    const { packageId } = req.params;
    const p = await Package.findById(packageId);
    if (!p) return next(new NotFoundError("Package not found"));
    return sendSuccess(
      res,
      {
        package: {
          ...p.toObject(),
          priceRupees: p.pricePaise ? p.pricePaise / 100 : 0,
        },
      },
      "Package details retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/packages/:packageId/share
async function sharePackage(req, res, next) {
  try {
    const { packageId } = req.params;
    const { leadId, channel = "whatsapp", customerPhone, customerEmail } = req.body;

    const pkg = await Package.findById(packageId);
    if (!pkg) return next(new NotFoundError("Package not found"));

    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        lead.activities.push({
          action: "PACKAGE_SHARED",
          details: `Shared package "${pkg.name}" (₹${pkg.pricePaise / 100}) via ${channel}`,
          performedBy: req.user._id,
          createdAt: new Date(),
        });
        await lead.save();
      }
    }

    return sendSuccess(
      res,
      {
        package: pkg.name,
        channel,
        recipient: customerPhone || customerEmail,
        shareText: `Hello! TriGyna offers our specialized package: ${pkg.name} for ₹${pkg.pricePaise / 100}. Includes ${pkg.totalSessions} clinical sessions.`,
      },
      `Package details dispatched via ${channel}`
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * ----------------------------------------------------------------------
 * 6. PAYMENTS & INVOICES APIS
 * ----------------------------------------------------------------------
 */

// GET /api/v1/sales/payments
async function listPayments(req, res, next) {
  try {
    const payments = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("patientId", "fullName phone email")
      .populate("orderId", "orderNumber serviceName");

    return sendSuccess(res, { payments, total: payments.length }, "Payment records retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/payments/payment-link
async function createPaymentLink(req, res, next) {
  try {
    // Delegates directly to verified Order creation with official Razorpay payment link
    return createOrder(req, res, next);
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/sales/invoices
async function listInvoices(req, res, next) {
  try {
    const invoices = await Invoice.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("patientId", "fullName phone email");

    return sendSuccess(res, { invoices, total: invoices.length }, "Invoices retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/sales/invoices/:invoiceId
async function getInvoiceById(req, res, next) {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId).populate("patientId");
    if (!invoice) return next(new NotFoundError("Invoice not found"));
    return sendSuccess(res, { invoice }, "Invoice details retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * ----------------------------------------------------------------------
 * 7. COMMUNICATION APIS
 * ----------------------------------------------------------------------
 */

// GET /api/v1/sales/communications
async function listCommunications(req, res, next) {
  try {
    const conversations = await WhatsAppConversation.find({})
      .sort({ updatedAt: -1 })
      .populate("leadId", "fullName phone serviceInterest")
      .populate("assignedStaff", "name email");

    return sendSuccess(res, { conversations, total: conversations.length }, "Conversations retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/communications/whatsapp/send
async function sendWhatsAppMessage(req, res, next) {
  try {
    const { customerPhone, customerName, text, leadId } = req.body;
    if (!customerPhone || !text) {
      return next(new ValidationError("Customer phone and message text are required"));
    }

    let conv = await WhatsAppConversation.findOne({ customerPhone });
    if (!conv) {
      conv = await WhatsAppConversation.create({
        conversationId: `WA-${customerPhone}`,
        customerPhone,
        customerName: customerName || "Customer",
        leadId: leadId || undefined,
        assignedStaff: req.user._id,
        status: "active",
        unreadCount: 0,
        messages: [],
      });
    }

    const newMessage = {
      messageId: `WAM-${Date.now()}`,
      sender: "staff",
      senderName: req.user.name || "Sales Executive",
      text: text.trim(),
      status: "delivered",
      timestamp: new Date(),
    };

    conv.messages.push(newMessage);
    conv.lastMessage = {
      text: text.trim(),
      sender: "staff",
      timestamp: new Date(),
    };
    await conv.save();

    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        lead.activities.push({
          action: "WHATSAPP_MESSAGE_SENT",
          details: `WhatsApp sent to ${customerPhone}: "${text.trim().slice(0, 50)}..."`,
          performedBy: req.user._id,
          createdAt: new Date(),
        });
        await lead.save();
      }
    }

    return sendSuccess(res, { message: newMessage, conversation: conv }, "Message dispatched via WhatsApp Cloud API", 201);
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/sales/communications/:conversationId
async function getConversationMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const conv = await WhatsAppConversation.findOne({
      $or: [{ conversationId }, { _id: mongoose.isValidObjectId(conversationId) ? conversationId : null }],
    });
    if (!conv) return next(new NotFoundError("Conversation not found"));
    return sendSuccess(res, { conversation: conv, messages: conv.messages }, "Messages retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * ----------------------------------------------------------------------
 * 8. SUPPORT TICKET APIS
 * ----------------------------------------------------------------------
 */

// GET /api/v1/sales/support-tickets
async function listSupportTickets(req, res, next) {
  try {
    const query = req.user.role === "sales" ? { userId: req.user._id } : {};
    const tickets = await SupportTicket.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, { tickets, total: tickets.length }, "Support tickets retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/sales/support-tickets
async function createSupportTicket(req, res, next) {
  try {
    const { category, subject, description, priority = "medium" } = req.body;
    if (!subject || !description) {
      return next(new ValidationError("Subject and description are required"));
    }

    const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const ticket = await SupportTicket.create({
      ticketNumber,
      userId: req.user._id,
      category: category || "General Inquiry",
      subject: subject.trim(),
      description: description.trim(),
      priority,
      status: "open",
      replies: [],
    });

    return sendSuccess(res, { ticket }, "Support ticket raised successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/sales/support-tickets/:ticketId
async function getSupportTicketById(req, res, next) {
  try {
    const { ticketId } = req.params;
    const ticket = await SupportTicket.findOne({
      $or: [{ ticketNumber: ticketId }, { _id: mongoose.isValidObjectId(ticketId) ? ticketId : null }],
    });
    if (!ticket) return next(new NotFoundError("Support ticket not found"));
    return sendSuccess(res, { ticket }, "Ticket details retrieved");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  // Leads
  listLeads,
  createLead,
  getLeadById,
  updateLead,
  updateLeadStage,
  addLeadNote,
  getLeadActivities,
  convertLead,
  // Followups
  listFollowups,
  createFollowup,
  getFollowupById,
  updateFollowup,
  completeFollowup,
  rescheduleFollowup,
  // Tasks
  listTasks,
  createTask,
  updateTask,
  completeTask,
  // Appointments
  listAppointments,
  createAppointment,
  getAppointmentById,
  updateAppointment,
  // Packages
  listPackages,
  getPackageById,
  sharePackage,
  // Payments
  listPayments,
  createPaymentLink,
  listInvoices,
  getInvoiceById,
  // Communications
  listCommunications,
  sendWhatsAppMessage,
  getConversationMessages,
  // Support
  listSupportTickets,
  createSupportTicket,
  getSupportTicketById,
};
