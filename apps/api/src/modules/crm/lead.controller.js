const mongoose = require("mongoose");
const Lead = require("./lead.model");
const Patient = require("../patients/patient.model");
const Appointment = require("../appointments/appointment.model");
const Doctor = require("../doctors/doctor.model");
const Invoice = require("../billing/invoice.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const {
  generateAtomicPatientCode,
  generateAtomicAppointmentCode,
  generateAtomicInvoiceNumber,
} = require("../../shared/counter.service");
const { bookAppointmentAtomic } = require("../appointments/booking.service");

// Public enquiry endpoint
async function submitPublicEnquiry(req, res, next) {
  try {
    const { fullName, phone, email, serviceInterest, consultationMode, message, consent } = req.body;

    if (!fullName || !fullName.trim()) {
      return next(new ValidationError("Full name is required"));
    }

    const cleanPhone = (phone || "").replace(/[^0-9+]/g, "").trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      return next(new ValidationError("A valid 10-digit phone number is required"));
    }

    if (!consent) {
      return next(new ValidationError("Privacy and terms consent is required"));
    }

    // Check for identical recent submission within 10 minutes to prevent duplicate clicks
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingRecent = await Lead.findOne({
      phone: cleanPhone,
      createdAt: { $gte: tenMinutesAgo },
    });

    if (existingRecent) {
      return sendSuccess(
        res,
        {
          leadId: existingRecent._id,
          isDuplicate: true,
        },
        "Enquiry already received recently. Our team will contact you shortly.",
        200
      );
    }

    const newLead = await Lead.create({
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email ? email.trim().toLowerCase() : undefined,
      serviceInterest: serviceInterest || "Skin & Hair",
      consultationMode: consultationMode || "Online Video Consultation",
      message: message ? message.trim() : "",
      source: "website_enquiry",
      status: "new",
    });

    await recordAudit({
      actorRole: "public_visitor",
      action: "LEAD_ENQUIRY_SUBMITTED",
      targetEntity: "Lead",
      targetId: newLead._id.toString(),
      details: { service: newLead.serviceInterest, phone: cleanPhone },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        leadId: newLead._id,
        fullName: newLead.fullName,
        service: newLead.serviceInterest,
      },
      "Enquiry received successfully. Our team will reach out to you shortly.",
      201
    );
  } catch (err) {
    return next(err);
  }
}

// CRM Staff: List Leads
async function listLeads(req, res, next) {
  try {
    const { status, search, assignedTo, source, limit = 50, page = 1 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (source) query.source = source;
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ fullName: regex }, { phone: regex }, { serviceInterest: regex }, { email: regex }];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("assignedTo", "name email phone")
        .populate("convertedPatientId", "patientCode fullName phone")
        .populate("convertedAppointmentId", "appointmentCode appointmentDate startTime"),
      Lead.countDocuments(query),
    ]);

    return sendSuccess(res, { leads, total, page: parseInt(page, 10) }, "Leads retrieved");
  } catch (err) {
    return next(err);
  }
}

// CRM Staff: Get Single Lead
async function getLeadById(req, res, next) {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email phone")
      .populate("notes.createdBy", "name role")
      .populate("convertedPatientId")
      .populate("convertedAppointmentId");

    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    return sendSuccess(res, { lead }, "Lead retrieved");
  } catch (err) {
    return next(err);
  }
}

// CRM Staff: Update Lead Status/Details
async function updateLead(req, res, next) {
  try {
    const { status, assignedTo, followUpDate, serviceInterest, consultationMode, lostReason } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    if (status && status !== lead.status) {
      const prevStage = lead.status;
      lead.status = status;
      if (!lead.stageHistory) lead.stageHistory = [];
      lead.stageHistory.push({
        fromStage: prevStage,
        toStage: status,
        changedBy: req.user._id,
        reason: lostReason ? lostReason.trim() : "Stage updated via lead edit",
        changedAt: new Date(),
      });
      if (!lead.activities) lead.activities = [];
      lead.activities.push({
        action: "STAGE_CHANGED",
        details: `Stage updated from ${prevStage} to ${status}${lostReason ? `: ${lostReason}` : ""}`,
        performedBy: req.user._id,
        createdAt: new Date(),
      });
    }
    if (lostReason !== undefined) lead.lostReason = lostReason ? lostReason.trim() : "";
    if (assignedTo !== undefined) lead.assignedTo = assignedTo || null;
    if (followUpDate !== undefined) lead.followUpDate = followUpDate ? new Date(followUpDate) : null;
    if (serviceInterest) lead.serviceInterest = serviceInterest;
    if (consultationMode) lead.consultationMode = consultationMode;

    await lead.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "LEAD_UPDATED",
      targetEntity: "Lead",
      targetId: lead._id.toString(),
      details: { status: lead.status, assignedTo: lead.assignedTo, lostReason: lead.lostReason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { lead }, "Lead updated successfully");
  } catch (err) {
    return next(err);
  }
}

// CRM Staff: Add Note
async function addLeadNote(req, res, next) {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return next(new ValidationError("Note content cannot be empty"));
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    lead.notes.push({
      body: body.trim(),
      createdBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();

    return sendSuccess(res, { notes: lead.notes }, "Note added successfully");
  } catch (err) {
    return next(err);
  }
}

// CRM Staff: Add Scheduled Task
async function addLeadTask(req, res, next) {
  try {
    const { title, dueDate, priority = "medium", notes } = req.body;
    if (!title || !dueDate) {
      return next(new ValidationError("Task title and due date are required"));
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    lead.tasks.push({
      title: title.trim(),
      dueDate: new Date(dueDate),
      priority,
      status: "open",
      assignedTo: req.user._id,
      notes: notes ? notes.trim() : "",
      createdAt: new Date(),
    });

    // Update follow up date on lead to earliest pending task
    lead.followUpDate = new Date(dueDate);
    await lead.save();
    const createdTask = lead.tasks[lead.tasks.length - 1];
    return sendSuccess(res, { task: createdTask, tasks: lead.tasks }, "Follow-up task scheduled successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// CRM Staff: Update Task
async function updateLeadTask(req, res, next) {
  try {
    const { status, notes } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    const task = lead.tasks.id(req.params.taskId);
    if (!task) {
      return next(new NotFoundError("Task not found"));
    }

    if (status) task.status = status;
    if (notes !== undefined) task.notes = notes;

    await lead.save();
    return sendSuccess(res, { tasks: lead.tasks }, "Task updated successfully");
  } catch (err) {
    return next(err);
  }
}

// CRM Staff: Convert Lead to Patient & Optional Appointment
async function convertLeadToPatient(req, res, next) {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    // Idempotent: if already converted and patient exists, return existing
    if (lead.status === "converted" && lead.convertedPatientId) {
      const existingPatient = await Patient.findById(lead.convertedPatientId);
      const existingAppointment = lead.convertedAppointmentId ? await Appointment.findById(lead.convertedAppointmentId) : null;
      return sendSuccess(
        res,
        {
          lead,
          patient: existingPatient,
          appointment: existingAppointment,
          alreadyConverted: true,
        },
        "Lead has already been converted."
      );
    }

    const cleanPhone = lead.phone.replace(/[^0-9+]/g, "").trim();

    let session = null;
    let inTransaction = false;
    const supportsTransactions =
      mongoose.connection.client?.topology?.description?.type &&
      mongoose.connection.client.topology.description.type !== "Single";

    if (supportsTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        inTransaction = true;
      } catch (sessionErr) {
        if (session) await session.endSession().catch(() => {});
        session = null;
        inTransaction = false;
      }
    }

    let patient = null;
    let appointment = null;
    let invoice = null;
    let isNewPatient = false;

    try {
      // 1. Check for duplicate patient record by phone or email
      const query = Patient.findOne({
        $or: [{ phone: cleanPhone }, ...(lead.email ? [{ email: lead.email.toLowerCase() }] : [])],
      });
      patient = session ? await query.session(session) : await query;

      if (!patient) {
        const patientCode = await generateAtomicPatientCode(session);
        const [createdPatient] = await Patient.create(
          [
            {
              patientCode,
              fullName: lead.fullName,
              phone: cleanPhone,
              email: lead.email || undefined,
              gender: "female",
              age: req.body.age || 28,
              medicalHistory: lead.message || "Initiated via CRM Lead intake",
              allergies: ["None reported"],
            },
          ],
          { session }
        );
        patient = createdPatient;
        isNewPatient = true;
      }

      // 2. Handle optional appointment booking
      const { bookAppointment, doctorId, appointmentDate, startTime, consultationType } = req.body;

      if (bookAppointment && doctorId && appointmentDate && startTime) {
        const doctor = await Doctor.findById(doctorId).session(session);
        if (!doctor || doctor.status !== "active") {
          throw new ValidationError("Selected doctor is not active or available");
        }

        const consultationMode =
          req.body.mode ||
          (lead.consultationMode && lead.consultationMode.includes("In-Clinic")
            ? "In-Clinic Consultation"
            : "Online Video Consultation");

        const createdAppointment = await bookAppointmentAtomic(
          {
            patientId: patient._id,
            doctorId: doctor._id,
            serviceName: lead.serviceInterest || "Gynecology & Wellness Consultation",
            appointmentDate,
            startTime,
            endTime: req.body.endTime,
            mode: consultationMode,
            bookingSource: "crm_conversion",
            notes: `Converted from CRM Lead (${lead._id})`,
          },
          req.user
        );
        appointment = createdAppointment;

        // Generate invoice atomically
        const consultationFee = Number(req.body.consultationFee) || Number(doctor.consultationFee) || 500;
        const invoiceNumber = await generateAtomicInvoiceNumber("INV", session);
        const [createdInvoice] = await Invoice.create(
          [
            {
              invoiceNumber,
              patientId: patient._id,
              appointmentId: appointment._id,
              doctorId: doctor._id,
              totalAmount: consultationFee,
              paidAmount: 0,
              balanceAmount: consultationFee,
              taxAmount: 0,
              status: "pending",
              items: [
                {
                  description: appointment.serviceName,
                  amount: consultationFee,
                  quantity: 1,
                },
              ],
            },
          ],
          { session }
        );
        invoice = createdInvoice;
        lead.convertedAppointmentId = appointment._id;
      }

      // 3. Mark Lead converted with stageHistory tracking
      const previousStage = lead.status;
      lead.status = "converted";
      lead.convertedPatientId = patient._id;

      if (!lead.stageHistory) lead.stageHistory = [];
      lead.stageHistory.push({
        fromStage: previousStage,
        toStage: "converted",
        changedBy: req.user._id,
        reason: `Converted to Patient [${patient.patientCode}]`,
        changedAt: new Date(),
      });

      lead.notes.push({
        body: `Lead converted to Patient [${patient.patientCode}] ${patient.fullName}${appointment ? ` with Appointment [${appointment.appointmentCode}]` : ""}`,
        createdBy: req.user._id,
        createdAt: new Date(),
      });

      if (session) {
        await lead.save({ session });
        await session.commitTransaction();
      } else {
        await lead.save();
      }
    } catch (err) {
      if (inTransaction && session) {
        await session.abortTransaction().catch(() => {});
      }
      throw err;
    } finally {
      if (session) {
        await session.endSession().catch(() => {});
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "LEAD_CONVERTED",
      targetEntity: "Lead",
      targetId: lead._id.toString(),
      details: {
        patientId: patient._id.toString(),
        isNewPatient,
        appointmentId: appointment ? appointment._id.toString() : null,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        lead,
        patient,
        appointment,
        invoice,
        isNewPatient,
      },
      "Lead successfully converted to registered patient."
    );
  } catch (err) {
    return next(err);
  }
}

// CSV Export for authorized staff
async function exportLeadsCsv(req, res, next) {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).populate("assignedTo", "name");

    const headers = [
      "Lead ID",
      "Full Name",
      "Phone",
      "Email",
      "Service Interest",
      "Consultation Mode",
      "Source",
      "Status",
      "Assigned To",
      "Follow Up Date",
      "Created At",
    ];

    const rows = leads.map((l) => [
      `"${l._id}"`,
      `"${(l.fullName || "").replace(/"/g, '""')}"`,
      `"${l.phone || ""}"`,
      `"${l.email || ""}"`,
      `"${(l.serviceInterest || "").replace(/"/g, '""')}"`,
      `"${l.consultationMode || ""}"`,
      `"${l.source || ""}"`,
      `"${l.status || ""}"`,
      `"${l.assignedTo?.name || "Unassigned"}"`,
      `"${l.followUpDate ? l.followUpDate.toISOString().split("T")[0] : ""}"`,
      `"${l.createdAt ? l.createdAt.toISOString() : ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="trigyna-crm-leads.csv"');
    return res.status(200).send("\uFEFF" + csvContent);
  } catch (err) {
    return next(err);
  }
}

// Admin / Staff: Create Lead with Duplicate Check & Initial Activity
async function createLead(req, res, next) {
  try {
    const {
      fullName,
      phone,
      email,
      serviceInterest,
      consultationMode,
      message,
      source,
      campaign,
      priority = "medium",
      assignedTo,
      followUpDate,
      notes,
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return next(new ValidationError("Full name is required"));
    }

    const cleanPhone = (phone || "").replace(/[^0-9+]/g, "").trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      return next(new ValidationError("A valid 10-digit phone number is required"));
    }

    // Duplicate detection check
    const existingLead = await Lead.findOne({
      $or: [{ phone: cleanPhone }, ...(email ? [{ email: email.trim().toLowerCase() }] : [])],
    });

    const newLead = await Lead.create({
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email ? email.trim().toLowerCase() : undefined,
      serviceInterest: serviceInterest || "Gynecology & Wellness Consultation",
      consultationMode: consultationMode || "Online Video Consultation",
      message: message ? message.trim() : "",
      source: source || "direct_intake",
      campaign: campaign ? campaign.trim() : undefined,
      priority,
      status: "new",
      assignedTo: assignedTo || req.user._id,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      notes: notes
        ? [
            {
              body: notes.trim(),
              createdBy: req.user._id,
              createdAt: new Date(),
            },
          ]
        : [],
      activities: [
        {
          action: "LEAD_CREATED",
          details: `Lead created manually via CRM console from source: ${source || "direct_intake"}${existingLead ? " (Potential duplicate flagged)" : ""}`,
          performedBy: req.user._id,
          createdAt: new Date(),
        },
      ],
      stageHistory: [
        {
          fromStage: "",
          toStage: "new",
          changedBy: req.user._id,
          reason: "Initial lead intake",
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
      details: { fullName: newLead.fullName, phone: cleanPhone, source: newLead.source },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        lead: newLead,
        isDuplicateFlagged: !!existingLead,
        existingLeadId: existingLead ? existingLead._id : null,
      },
      "Lead created successfully",
      201
    );
  } catch (err) {
    return next(err);
  }
}

// Update Stage with Transition Validation & History (Strict 5 Canonical Stages)
async function updateLeadStage(req, res, next) {
  try {
    const stage = req.body.status || req.body.stage;
    const { reason, lostReason, note } = req.body;
    if (!stage) {
      return next(new ValidationError("New stage/status is required"));
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    const previousStage = lead.status;

    // Strict validation: moving to lost requires lostReason
    if (stage === "lost" && !lostReason && !reason) {
      return next(new ValidationError("A reason is required when marking a lead as Lost"));
    }

    lead.status = stage;
    if (lostReason) lead.lostReason = lostReason.trim();

    const changeReason = reason || lostReason || note || `Moved from ${previousStage} to ${stage}`;

    lead.stageHistory.push({
      fromStage: previousStage,
      toStage: stage,
      changedBy: req.user._id,
      reason: changeReason,
      changedAt: new Date(),
    });

    lead.activities.push({
      action: "STAGE_CHANGED",
      details: `Pipeline stage moved from ${previousStage} to ${stage}${changeReason ? `: ${changeReason}` : ""}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "LEAD_STAGE_CHANGED",
      targetEntity: "Lead",
      targetId: lead._id.toString(),
      details: { from: previousStage, to: stage, reason: changeReason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { lead }, `Lead stage updated to ${stage}`);
  } catch (err) {
    return next(err);
  }
}

// Dedicated endpoint: Mark Lead as Lost with required reason
async function markLeadLost(req, res, next) {
  try {
    const { lostReason, reason } = req.body;
    const finalReason = lostReason || reason;
    if (!finalReason || !finalReason.trim()) {
      return next(new ValidationError("A reason is required when marking a lead as Lost"));
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    const previousStage = lead.status;
    lead.status = "lost";
    lead.lostReason = finalReason.trim();

    lead.stageHistory.push({
      fromStage: previousStage,
      toStage: "lost",
      changedBy: req.user._id,
      reason: finalReason.trim(),
      changedAt: new Date(),
    });

    lead.activities.push({
      action: "LEAD_MARKED_LOST",
      details: `Lead marked as Lost. Reason: ${finalReason.trim()}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "LEAD_MARKED_LOST",
      targetEntity: "Lead",
      targetId: lead._id.toString(),
      details: { from: previousStage, to: "lost", reason: finalReason.trim() },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { lead }, "Lead marked as Lost");
  } catch (err) {
    return next(err);
  }
}

// Get Lead Interaction Timeline & Activities
async function getLeadActivities(req, res, next) {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email phone")
      .populate("notes.createdBy", "name role")
      .populate("activities.performedBy", "name role")
      .populate("stageHistory.changedBy", "name role");

    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    const events = [];
    (lead.notes || []).forEach((n) => {
      events.push({
        type: "note",
        title: "Staff Note",
        description: n.body,
        user: n.createdBy,
        timestamp: n.createdAt,
      });
    });

    (lead.activities || []).forEach((act) => {
      events.push({
        type: "activity",
        title: act.action ? act.action.replace(/_/g, " ") : "Activity",
        description: act.details,
        user: act.performedBy,
        timestamp: act.createdAt,
      });
    });

    (lead.stageHistory || []).forEach((sh) => {
      events.push({
        type: "stage_change",
        title: `Status: ${sh.toStage}`,
        description: `Moved from ${sh.fromStage || "None"} -> ${sh.toStage}${sh.reason ? ` (${sh.reason})` : ""}`,
        user: sh.changedBy,
        timestamp: sh.changedAt,
      });
    });

    (lead.tasks || []).forEach((t) => {
      events.push({
        type: "task",
        title: `Task: ${t.title}`,
        description: `Due: ${t.dueDate ? t.dueDate.toISOString().split("T")[0] : "N/A"} | Status: ${t.status}`,
        user: null,
        timestamp: t.createdAt,
      });
    });

    (lead.communications || []).forEach((comm) => {
      events.push({
        type: "communication",
        title: `${(comm.channel || "call").toUpperCase()} (${comm.direction || "outbound"})`,
        description: comm.content,
        user: comm.recordedBy,
        timestamp: comm.timestamp,
      });
    });

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return sendSuccess(res, { activities: events, timeline: events }, "Lead activities retrieved");
  } catch (err) {
    return next(err);
  }
}

// Assign Lead Owner
async function assignLead(req, res, next) {
  try {
    const { assignedTo } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    lead.assignedTo = assignedTo || null;
    lead.activities.push({
      action: "OWNER_ASSIGNED",
      details: assignedTo ? `Lead assigned to staff member ID: ${assignedTo}` : "Lead unassigned",
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();

    return sendSuccess(res, { lead }, "Lead ownership updated");
  } catch (err) {
    return next(err);
  }
}

// Get Lead Complete Chronological Timeline
async function getLeadTimeline(req, res, next) {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("notes.createdBy", "name role")
      .populate("activities.performedBy", "name role")
      .populate("stageHistory.changedBy", "name role")
      .populate("communications.recordedBy", "name role")
      .populate("assignedTo", "name role")
      .populate("convertedPatientId", "patientCode fullName phone")
      .populate("convertedAppointmentId", "appointmentCode appointmentDate startTime status");

    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    // Merge notes, activities, tasks, stageHistory, communications into a unified timeline
    const events = [];

    (lead.activities || []).forEach((act) => {
      events.push({
        type: "activity",
        title: act.action.replace(/_/g, " "),
        description: act.details,
        user: act.performedBy,
        timestamp: act.createdAt,
      });
    });

    (lead.notes || []).forEach((note) => {
      events.push({
        type: "note",
        title: "Internal Note",
        description: note.body,
        user: note.createdBy,
        timestamp: note.createdAt,
      });
    });

    (lead.stageHistory || []).forEach((sh) => {
      events.push({
        type: "stage_change",
        title: `Stage: ${sh.toStage}`,
        description: `Moved from ${sh.fromStage || "None"} -> ${sh.toStage}${sh.reason ? ` (${sh.reason})` : ""}`,
        user: sh.changedBy,
        timestamp: sh.changedAt,
      });
    });

    (lead.tasks || []).forEach((t) => {
      events.push({
        type: "task",
        title: `Task: ${t.title}`,
        description: `Due: ${t.dueDate ? t.dueDate.toISOString().split("T")[0] : "N/A"} | Status: ${t.status}`,
        user: null,
        timestamp: t.createdAt,
      });
    });

    (lead.communications || []).forEach((comm) => {
      events.push({
        type: "communication",
        title: `${comm.channel.toUpperCase()} (${comm.direction})`,
        description: comm.content,
        user: comm.recordedBy,
        timestamp: comm.timestamp,
      });
    });

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return sendSuccess(res, { lead, timeline: events }, "Lead timeline retrieved");
  } catch (err) {
    return next(err);
  }
}

// Add Custom Activity (Call, WhatsApp, Email, Meeting)
async function addLeadActivity(req, res, next) {
  try {
    const { action, details } = req.body;
    if (!action || !action.trim()) {
      return next(new ValidationError("Activity action type is required"));
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    lead.activities.push({
      action: action.trim().toUpperCase(),
      details: details ? details.trim() : "",
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();

    return sendSuccess(res, { activities: lead.activities }, "Activity logged successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// CRM Overview KPIs & Summary
async function getCrmOverview(req, res, next) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalLeads,
      newLeads,
      convertedLeads,
      consultationsBooked,
      followUpsDue,
      stageCounts,
      sourceCounts,
      recentLeads,
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ status: "new" }),
      Lead.countDocuments({ status: "converted" }),
      Lead.countDocuments({ status: { $in: ["consultation_booked", "consultation_completed", "appointment_booked"] } }),
      Lead.countDocuments({
        followUpDate: { $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
        status: { $nin: ["converted", "lost", "closed"] },
      }),
      Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Lead.aggregate([{ $group: { _id: "$source", count: { $sum: 1 } } }]),
      Lead.find()
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate("assignedTo", "name email phone")
        .select("fullName phone serviceInterest status source priority createdAt updatedAt followUpDate"),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    return sendSuccess(
      res,
      {
        kpis: {
          totalLeads,
          newLeads,
          followUpsDue,
          consultationsBooked,
          convertedLeads,
          conversionRate,
        },
        stageCounts: stageCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        sourceCounts: sourceCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        recentLeads,
      },
      "CRM overview metrics retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

// CRM Pipeline View: All 7 Stages + Nurture + Lost
async function getCrmPipeline(req, res, next) {
  try {
    const { search, source, assignedTo, priority } = req.query;
    const filter = {};

    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (priority) filter.priority = priority;
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ fullName: regex }, { phone: regex }, { serviceInterest: regex }, { email: regex }];
    }

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email phone")
      .populate("convertedPatientId", "patientCode fullName phone")
      .populate("convertedAppointmentId", "appointmentCode appointmentDate startTime status");

    const pipelineStages = [
      { id: "new", name: "New Lead", order: 1, color: "#3B82F6" },
      { id: "contacted", name: "Contacted", order: 2, color: "#8B5CF6" },
      { id: "qualified", name: "Qualified", order: 3, color: "#10B981" },
      { id: "converted", name: "Converted", order: 4, color: "#154734" },
      { id: "lost", name: "Lost", order: 5, color: "#EF4444" },
    ];

    const grouped = {};
    pipelineStages.forEach((st) => {
      grouped[st.id] = [];
    });

    leads.forEach((l) => {
      let stageKey = l.status;
      // Map legacy statuses into the 5 canonical stages
      if (stageKey === "interested") stageKey = "qualified";
      else if (stageKey === "consultation_booked" || stageKey === "consultation_completed" || stageKey === "appointment_booked") stageKey = "converted";
      else if (stageKey === "nurture" || stageKey === "assigned" || stageKey === "contact_attempted") stageKey = "contacted";
      else if (stageKey === "closed" || stageKey === "not_interested" || stageKey === "invalid") stageKey = "lost";

      if (!grouped[stageKey]) {
        stageKey = "new";
      }
      grouped[stageKey].push(l);
    });

    return sendSuccess(
      res,
      {
        stages: pipelineStages,
        columns: grouped,
        totalLeads: leads.length,
      },
      "Pipeline retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

// Follow-ups Hub: dueToday, overdue, upcoming, completed
async function listFollowUps(req, res, next) {
  try {
    const leadsWithTasks = await Lead.find({
      $or: [{ "tasks.0": { $exists: true } }, { followUpDate: { $exists: true } }],
    }).populate("assignedTo", "name email phone");

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const dueToday = [];
    const overdue = [];
    const upcoming = [];
    const completed = [];

    leadsWithTasks.forEach((lead) => {
      // 1. Process tasks subdocuments
      (lead.tasks || []).forEach((task) => {
        const dueStr = task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : null;
        const item = {
          _id: task._id,
          leadId: lead._id,
          leadName: lead.fullName,
          leadPhone: lead.phone,
          leadService: lead.serviceInterest,
          leadStatus: lead.status,
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority,
          status: task.status,
          notes: task.notes,
          assignedTo: lead.assignedTo,
        };

        if (task.status === "completed") {
          completed.push(item);
        } else if (dueStr === todayStr) {
          dueToday.push(item);
        } else if (task.dueDate && new Date(task.dueDate) < now) {
          overdue.push(item);
        } else {
          upcoming.push(item);
        }
      });

      // 2. If lead has followUpDate but no matching task, add as synthesized follow-up item
      if (lead.followUpDate && (!lead.tasks || lead.tasks.length === 0)) {
        const dueStr = new Date(lead.followUpDate).toISOString().split("T")[0];
        const item = {
          _id: `fu-${lead._id}`,
          leadId: lead._id,
          leadName: lead.fullName,
          leadPhone: lead.phone,
          leadService: lead.serviceInterest,
          leadStatus: lead.status,
          title: `Follow up with ${lead.fullName}`,
          dueDate: lead.followUpDate,
          priority: lead.priority || "medium",
          status: "open",
          notes: lead.message || "Scheduled follow up call",
          assignedTo: lead.assignedTo,
        };

        if (lead.status === "converted" || lead.status === "lost") {
          completed.push(item);
        } else if (dueStr === todayStr) {
          dueToday.push(item);
        } else if (new Date(lead.followUpDate) < now) {
          overdue.push(item);
        } else {
          upcoming.push(item);
        }
      }
    });

    return sendSuccess(
      res,
      {
        dueToday,
        overdue,
        upcoming,
        completed,
        counts: {
          dueToday: dueToday.length,
          overdue: overdue.length,
          upcoming: upcoming.length,
          completed: completed.length,
        },
      },
      "Follow-ups retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

// Add Follow-Up Task
async function addFollowUp(req, res, next) {
  try {
    const { leadId, title, dueDate, priority = "medium", notes } = req.body;
    if (!leadId || !title || !dueDate) {
      return next(new ValidationError("Lead ID, title, and due date are required"));
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return next(new NotFoundError("Lead not found"));
    }

    lead.tasks.push({
      title: title.trim(),
      dueDate: new Date(dueDate),
      priority,
      status: "open",
      assignedTo: req.user._id,
      notes: notes ? notes.trim() : "",
      createdAt: new Date(),
    });

    lead.followUpDate = new Date(dueDate);

    lead.activities.push({
      action: "FOLLOWUP_SCHEDULED",
      details: `Scheduled follow-up: "${title}" for ${new Date(dueDate).toLocaleString("en-IN")}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();

    return sendSuccess(res, { tasks: lead.tasks }, "Follow-up created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// Complete or Update Follow-Up (Supports PATCH /crm/follow-ups/:id and /complete)
async function completeFollowUp(req, res, next) {
  try {
    const { taskId, notes, status, dueDate } = req.body;
    const targetId = req.params.id || taskId;
    const lead = await Lead.findOne({ "tasks._id": targetId });

    if (!lead) {
      return next(new NotFoundError("Task or associated lead not found"));
    }

    const task = lead.tasks.id(targetId);
    if (!task) {
      return next(new NotFoundError("Task not found in lead record"));
    }

    task.status = status || "completed";
    if (dueDate) task.dueDate = new Date(dueDate);
    if (notes) task.notes = (task.notes ? task.notes + "\n" : "") + notes;

    lead.activities.push({
      action: "FOLLOWUP_UPDATED",
      details: `Updated follow-up: "${task.title}" (Status: ${task.status})${notes ? ` - ${notes}` : ""}`,
      performedBy: req.user._id,
      createdAt: new Date(),
    });

    await lead.save();

    return sendSuccess(res, { task }, "Follow-up updated successfully");
  } catch (err) {
    return next(err);
  }
}

// Get CRM Stages configuration (Strictly 5 Canonical Stages)
async function getCrmStages(req, res, next) {
  try {
    const stages = [
      { id: "new", name: "New Lead", order: 1, color: "#3B82F6", description: "Fresh enquiry awaiting initial triage" },
      { id: "contacted", name: "Contacted", order: 2, color: "#8B5CF6", description: "Outreach initiated via call or WhatsApp" },
      { id: "qualified", name: "Qualified", order: 3, color: "#10B981", description: "Clinical need and budget verified" },
      { id: "converted", name: "Converted", order: 4, color: "#154734", description: "Registered active clinical patient" },
      { id: "lost", name: "Lost", order: 5, color: "#EF4444", description: "Not proceeding with reason recorded" },
    ];
    return sendSuccess(res, { stages }, "CRM stages retrieved");
  } catch (err) {
    return next(err);
  }
}

// CRM Reports & Analytics
async function getCrmReports(req, res, next) {
  try {
    const [sourceAgg, stageAgg, staffAgg, lossAgg] = await Promise.all([
      Lead.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: { assignedTo: { $ne: null } } },
        {
          $group: {
            _id: "$assignedTo",
            totalAssigned: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } },
          },
        },
      ]),
      Lead.aggregate([
        { $match: { status: "lost", lostReason: { $exists: true, $ne: "" } } },
        { $group: { _id: "$lostReason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Populate staff details
    const populatedStaff = await Lead.populate(staffAgg, { path: "_id", model: "User", select: "name role email" });

    return sendSuccess(
      res,
      {
        sourceBreakdown: sourceAgg,
        stageDistribution: stageAgg,
        staffPerformance: populatedStaff.map((s) => ({
          staff: s._id,
          totalAssigned: s.totalAssigned,
          converted: s.converted,
          conversionRate: s.totalAssigned > 0 ? Math.round((s.converted / s.totalAssigned) * 100) : 0,
        })),
        lossReasons: lossAgg,
      },
      "CRM reports retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

// Check Duplicates by phone or email
async function checkDuplicates(req, res, next) {
  try {
    const { phone, email } = req.query;
    if (!phone && !email) {
      return next(new ValidationError("Phone or email is required to check for duplicates"));
    }

    const cleanPhone = (phone || "").replace(/[^0-9+]/g, "").trim();
    const query = [];
    if (cleanPhone) query.push({ phone: cleanPhone });
    if (email) query.push({ email: email.trim().toLowerCase() });

    const [matchedLead, matchedPatient] = await Promise.all([
      Lead.findOne({ $or: query }).select("fullName phone email status source createdAt"),
      Patient.findOne({ $or: query }).select("patientCode fullName phone email createdAt"),
    ]);

    return sendSuccess(
      res,
      {
        hasDuplicate: !!(matchedLead || matchedPatient),
        lead: matchedLead,
        patient: matchedPatient,
      },
      "Duplicate check evaluated"
    );
  } catch (err) {
    return next(err);
  }
}

// Permanent Deletion with Audit Trail & Retention Compliance
async function deleteLeadPermanently(req, res, next) {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return next(new NotFoundError("Lead record not found"));
    }

    const leadSummary = {
      fullName: lead.fullName,
      phone: lead.phone,
      serviceInterest: lead.serviceInterest,
      status: lead.status,
      source: lead.source,
      convertedPatientId: lead.convertedPatientId ? lead.convertedPatientId.toString() : null,
    };

    // Execute permanent deletion from MongoDB
    await Lead.findByIdAndDelete(id);

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "LEAD_PERMANENTLY_DELETED",
      targetEntity: "Lead",
      targetId: id,
      details: leadSummary,
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { deletedId: id, fullName: leadSummary.fullName },
      "Lead permanently deleted from database"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  submitPublicEnquiry,
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  updateLeadStage,
  markLeadLost,
  assignLead,
  getLeadTimeline,
  getLeadActivities,
  addLeadActivity,
  getCrmOverview,
  getCrmPipeline,
  listFollowUps,
  addFollowUp,
  completeFollowUp,
  getCrmStages,
  getCrmReports,
  checkDuplicates,
  addLeadNote,
  addLeadTask,
  updateLeadTask,
  convertLeadToPatient,
  exportLeadsCsv,
  deleteLeadPermanently,
};


