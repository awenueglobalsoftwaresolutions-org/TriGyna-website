const AutomationRule = require("./automation-rule.model");
const AutomationExecution = require("./automation-execution.model");
const automationService = require("./automation.service");
const { sendSuccess, sendError } = require("../../shared/response");
const { ValidationError, NotFoundError } = require("../../shared/errors");

async function listAutomationRules(req, res, next) {
  try {
    const { triggerEvent, enabled } = req.query;
    const query = {};
    if (triggerEvent) query.triggerEvent = triggerEvent;
    if (enabled !== undefined) query.enabled = enabled === "true";

    let rules = await AutomationRule.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name role");

    // Auto-seed default canonical rules if empty and no specific filters
    if (rules.length === 0 && Object.keys(query).length === 0) {
      const defaultRules = [
        {
          name: "New Enquiry Lead Auto-Assignment & Queue Rule",
          description: "When an inbound lead is ingested, evaluates team workload and auto-assigns an active sales rep or routes to triage queue.",
          triggerEvent: "crm.lead.created",
          enabled: true,
          conditions: [],
          actions: [
            { type: "assign_lead", params: { strategy: "round_robin_lowest_load" } },
            { type: "notify_staff", params: { title: "New Inbound Lead Assigned", role: "sales" } },
          ],
        },
        {
          name: "Instant Multi-Channel Enquiry Acknowledgement",
          description: "Dispatches instant WhatsApp and email acknowledgement to patient confirming enquiry receipt and providing next steps.",
          triggerEvent: "crm.lead.created",
          enabled: true,
          actions: [{ type: "send_whatsapp_template", params: { templateName: "lead_welcome_v1" } }],
        },
        {
          name: "Consultation Booking & Google Meet Link",
          description: "Alerts physician, generates secure telemedicine meeting link, and dispatches patient confirmation.",
          triggerEvent: "appointment.booked",
          enabled: true,
          actions: [{ type: "notify_staff" }, { type: "send_whatsapp_text", params: { template: "appointment_confirmed" } }],
        },
        {
          name: "Assisted Checkout & Payment Link Dispatch",
          description: "Generates secure checkout link and alerts patient via WhatsApp & SMS with itemized service details.",
          triggerEvent: "crm.lead.stage_changed",
          enabled: true,
          actions: [{ type: "send_whatsapp_text", params: { template: "checkout_link_ready" } }],
        },
        {
          name: "Payment Verified & Automated Patient Onboarding Trigger",
          description: "Reconciles invoice, activates session allowances in ledger, and provisions patient portal credentials.",
          triggerEvent: "payment.captured",
          enabled: true,
          actions: [{ type: "create_crm_activity" }, { type: "notify_staff" }],
        },
        {
          name: "First-Contact SLA & Due Follow-up Alert",
          description: "Monitors response times and escalates unassigned or overdue prospective patient leads.",
          triggerEvent: "crm.followup.due",
          enabled: true,
          actions: [{ type: "create_task" }, { type: "notify_staff" }],
        },
      ];
      await AutomationRule.insertMany(defaultRules);
      rules = await AutomationRule.find(query).sort({ createdAt: -1 }).populate("createdBy", "name role");
    }

    return sendSuccess(res, { rules, total: rules.length }, "Automation rules retrieved");
  } catch (err) {
    return next(err);
  }
}

async function createAutomationRule(req, res, next) {
  try {
    const {
      name,
      description,
      triggerEvent,
      conditions,
      actions,
      quietHours,
      frequencyCap,
      stopConditions,
    } = req.body;

    if (!name || !triggerEvent || !actions || actions.length === 0) {
      return next(new ValidationError("Rule name, triggerEvent, and at least one action are required."));
    }

    const rule = await AutomationRule.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      triggerEvent,
      conditions: conditions || [],
      actions,
      quietHours: quietHours || { enabled: false },
      frequencyCap: frequencyCap || { maxExecutionsPerContact: 3, periodHours: 24 },
      stopConditions: stopConditions || [],
      createdBy: req.user._id,
      enabled: true,
    });

    return sendSuccess(res, { rule }, "Automation rule created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function updateAutomationRule(req, res, next) {
  try {
    const { id } = req.params;
    const rule = await AutomationRule.findById(id);
    if (!rule) return next(new NotFoundError("Automation rule not found"));

    const allowedUpdates = [
      "name",
      "description",
      "triggerEvent",
      "conditions",
      "actions",
      "quietHours",
      "frequencyCap",
      "stopConditions",
      "enabled",
    ];

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        rule[key] = req.body[key];
      }
    }

    await rule.save();
    return sendSuccess(res, { rule }, "Automation rule updated");
  } catch (err) {
    return next(err);
  }
}

async function toggleAutomationRule(req, res, next) {
  try {
    const { id } = req.params;
    const rule = await AutomationRule.findById(id);
    if (!rule) return next(new NotFoundError("Automation rule not found"));

    rule.enabled = req.body.enabled !== undefined ? Boolean(req.body.enabled) : !rule.enabled;
    await rule.save();

    return sendSuccess(
      res,
      { rule },
      `Automation rule '${rule.name}' is now ${rule.enabled ? "enabled" : "disabled"}`
    );
  } catch (err) {
    return next(err);
  }
}

async function testAutomationRule(req, res, next) {
  try {
    const { id } = req.params;
    const rule = await AutomationRule.findById(id);
    if (!rule) return next(new NotFoundError("Automation rule not found"));

    const samplePayload = req.body.payload || {
      phone: req.user?.phone || "919172772326",
      fullName: req.user?.name || "Test Lead",
      serviceInterest: "Women's Health Care",
      source: "whatsapp",
    };

    const result = await automationService._processRule(rule, rule.triggerEvent, samplePayload);
    return sendSuccess(res, { testResult: result }, "Rule test execution completed");
  } catch (err) {
    return next(err);
  }
}

async function listAutomationExecutions(req, res, next) {
  try {
    const { ruleId, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (ruleId) query.ruleId = ruleId;
    if (status) query.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [executions, total] = await Promise.all([
      AutomationExecution.find(query)
        .sort({ executedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("leadId", "fullName phone status")
        .lean(),
      AutomationExecution.countDocuments(query),
    ]);

    return sendSuccess(res, { executions, total, page: parseInt(page, 10) }, "Execution history retrieved");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  toggleAutomationRule,
  testAutomationRule,
  listAutomationExecutions,
};

