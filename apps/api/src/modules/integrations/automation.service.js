const AutomationRule = require("./automation-rule.model");
const AutomationExecution = require("./automation-execution.model");
const ContactConsent = require("./contact-consent.model");
const whatsappService = require("./whatsapp.service");
const WhatsAppConversation = require("./whatsapp.model");
const Lead = require("../crm/lead.model");
const Task = require("../tasks/task.model");

class AutomationService {
  /**
   * Helper to evaluate dot-notation fields on payload (e.g. "lead.status" or "appointment.mode")
   */
  resolveField(obj, path) {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  }

  /**
   * Evaluate a single condition against the event payload
   */
  matchesCondition(condition, payload) {
    const actualVal = this.resolveField(payload, condition.field);
    const targetVal = condition.value;

    switch (condition.operator) {
      case "equals":
        return String(actualVal ?? "").toLowerCase() === String(targetVal ?? "").toLowerCase();
      case "not_equals":
        return String(actualVal ?? "").toLowerCase() !== String(targetVal ?? "").toLowerCase();
      case "contains":
        if (Array.isArray(actualVal)) {
          return actualVal.map((v) => String(v).toLowerCase()).includes(String(targetVal).toLowerCase());
        }
        return String(actualVal ?? "").toLowerCase().includes(String(targetVal ?? "").toLowerCase());
      case "in":
        if (Array.isArray(targetVal)) {
          return targetVal.map((v) => String(v).toLowerCase()).includes(String(actualVal ?? "").toLowerCase());
        }
        return false;
      case "exists":
        return Boolean(actualVal) === Boolean(targetVal);
      case "greater_than":
        return Number(actualVal) > Number(targetVal);
      default:
        return false;
    }
  }

  /**
   * Check if current time falls within configured quiet hours
   */
  isQuietHour(quietHours) {
    if (!quietHours || !quietHours.enabled) return false;
    try {
      const now = new Date();
      // Format current time in configured timezone (default Asia/Kolkata)
      const options = { timeZone: quietHours.timezone || "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" };
      const timeStr = new Intl.DateTimeFormat("en-GB", options).format(now);
      const [currH, currM] = timeStr.split(":").map(Number);
      const currentMinutes = currH * 60 + currM;

      const [startH, startM] = (quietHours.start || "21:00").split(":").map(Number);
      const startMinutes = startH * 60 + startM;

      const [endH, endM] = (quietHours.end || "09:00").split(":").map(Number);
      const endMinutes = endH * 60 + endM;

      if (startMinutes > endMinutes) {
        // Spans midnight (e.g. 21:00 to 09:00)
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch {
      return false;
    }
  }

  /**
   * Main trigger entrypoint for business events
   */
  async trigger(event, payload = {}) {
    try {
      // Find all active rules registered for this trigger event
      const rules = await AutomationRule.find({ enabled: true, triggerEvent: event });
      if (!rules || rules.length === 0) return [];

      const results = [];
      for (const rule of rules) {
        const executionResult = await this._processRule(rule, event, payload);
        results.push(executionResult);
      }
      return results;
    } catch (err) {
      console.warn(`[Automation Service] Error processing event '${event}':`, err.message);
      return [];
    }
  }

  async _processRule(rule, event, payload) {
    const contactPhone =
      payload.phone ||
      payload.customerPhone ||
      payload.lead?.phone ||
      payload.patient?.phone ||
      payload.appointment?.patientPhone ||
      "";
    const cleanPhone = whatsappService.normalizePhoneNumber(contactPhone);

    const idempotencyKey =
      payload.idempotencyKey ||
      `${rule._id}_${event}_${payload.eventId || payload.messageId || payload.appointment?._id || payload.lead?._id || payload._id || cleanPhone}_${new Date().toISOString().slice(0, 10)}`;

    // 1. Deduplication / Idempotency Check
    const existing = await AutomationExecution.findOne({ idempotencyKey });
    if (existing) {
      return { status: "skipped", reason: "Idempotent: duplicate trigger ignored", executionId: existing._id };
    }

    // 2. Evaluate Rule Conditions
    let conditionsMet = true;
    if (rule.conditions && rule.conditions.length > 0) {
      for (const cond of rule.conditions) {
        if (!this.matchesCondition(cond, payload)) {
          conditionsMet = false;
          break;
        }
      }
    }

    if (!conditionsMet) {
      const skipExec = await AutomationExecution.create({
        ruleId: rule._id,
        ruleName: rule.name,
        idempotencyKey,
        triggerEvent: event,
        contactPhone: cleanPhone,
        leadId: payload.lead?._id || payload.leadId,
        patientId: payload.patient?._id || payload.patientId,
        status: "skipped",
        skipReason: "Conditions not met",
      });
      return { status: "skipped", reason: "Conditions not met", executionId: skipExec._id };
    }

    // 3. Quiet Hours Check
    if (this.isQuietHour(rule.quietHours)) {
      const skipExec = await AutomationExecution.create({
        ruleId: rule._id,
        ruleName: rule.name,
        idempotencyKey,
        triggerEvent: event,
        contactPhone: cleanPhone,
        leadId: payload.lead?._id || payload.leadId,
        patientId: payload.patient?._id || payload.patientId,
        status: "skipped",
        skipReason: "Execution postponed: In quiet hours policy",
      });
      return { status: "skipped", reason: "Quiet hours policy active", executionId: skipExec._id };
    }

    // 4. Frequency Cap Check
    if (cleanPhone && rule.frequencyCap?.maxExecutionsPerContact > 0) {
      const periodHours = rule.frequencyCap.periodHours || 24;
      const sinceDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);
      const recentCount = await AutomationExecution.countDocuments({
        ruleId: rule._id,
        contactPhone: cleanPhone,
        status: "success",
        executedAt: { $gte: sinceDate },
      });

      if (recentCount >= rule.frequencyCap.maxExecutionsPerContact) {
        const skipExec = await AutomationExecution.create({
          ruleId: rule._id,
          ruleName: rule.name,
          idempotencyKey,
          triggerEvent: event,
          contactPhone: cleanPhone,
          leadId: payload.lead?._id || payload.leadId,
          patientId: payload.patient?._id || payload.patientId,
          status: "skipped",
          skipReason: `Frequency cap of ${rule.frequencyCap.maxExecutionsPerContact} per ${periodHours}h reached for contact`,
        });
        return { status: "skipped", reason: "Frequency cap exceeded", executionId: skipExec._id };
      }
    }

    // 5. Contact Consent Check (for messaging actions)
    const hasMessagingAction = rule.actions.some((a) => a.type.startsWith("send_whatsapp"));
    if (hasMessagingAction && cleanPhone) {
      const isEligible = await ContactConsent.isEligibleForTransactional(cleanPhone);
      if (!isEligible) {
        const skipExec = await AutomationExecution.create({
          ruleId: rule._id,
          ruleName: rule.name,
          idempotencyKey,
          triggerEvent: event,
          contactPhone: cleanPhone,
          leadId: payload.lead?._id || payload.leadId,
          patientId: payload.patient?._id || payload.patientId,
          status: "skipped",
          skipReason: "Contact has opted out of WhatsApp communications",
        });
        return { status: "skipped", reason: "Contact opted out", executionId: skipExec._id };
      }
    }

    // 6. Execute Actions
    const actionResults = [];
    let overallSuccess = true;
    let executionError = null;

    for (const act of rule.actions) {
      try {
        const actRes = await this._executeAction(act, payload, cleanPhone, rule);
        actionResults.push({
          actionType: act.type,
          status: "success",
          result: actRes,
          timestamp: new Date(),
        });
      } catch (actErr) {
        overallSuccess = false;
        executionError = { message: actErr.message, actionType: act.type };
        actionResults.push({
          actionType: act.type,
          status: "failed",
          error: actErr.message,
          timestamp: new Date(),
        });
        // Stop sequential action execution on failure
        break;
      }
    }

    // 7. Persist Execution Record
    const execution = await AutomationExecution.create({
      ruleId: rule._id,
      ruleName: rule.name,
      idempotencyKey,
      triggerEvent: event,
      contactPhone: cleanPhone,
      leadId: payload.lead?._id || payload.leadId,
      patientId: payload.patient?._id || payload.patientId,
      status: overallSuccess ? "success" : "failed",
      actionResults,
      error: executionError,
      executedAt: new Date(),
    });

    // Update rule metrics
    rule.executionCount = (rule.executionCount || 0) + 1;
    rule.lastExecutedAt = new Date();
    await rule.save();

    return {
      status: overallSuccess ? "success" : "failed",
      executionId: execution._id,
      ruleName: rule.name,
      actionsCount: actionResults.length,
    };
  }

  async _executeAction(action, payload, cleanPhone, rule) {
    const params = action.params || {};

    switch (action.type) {
      case "send_whatsapp_template": {
        const targetPhone = cleanPhone || whatsappService.normalizePhoneNumber(params.to);
        if (!targetPhone) throw new Error("No valid recipient phone for template dispatch");

        // Interpolate dynamic template variables
        const variables = (params.variables || []).map((v) => {
          if (typeof v === "string" && v.startsWith("{{") && v.endsWith("}}")) {
            const fieldPath = v.slice(2, -2).trim();
            return this.resolveField(payload, fieldPath) || "";
          }
          return v;
        });

        return await whatsappService.sendTemplateMessage({
          to: targetPhone,
          templateName: params.templateName,
          languageCode: params.languageCode || "en_IN",
          variables,
          leadId: payload.lead?._id || payload.leadId,
          patientId: payload.patient?._id || payload.patientId,
          conversationId: payload.conversationId,
          initiator: { type: "automation", ruleId: rule._id, name: rule.name },
        });
      }

      case "send_whatsapp_text": {
        const targetPhone = cleanPhone || whatsappService.normalizePhoneNumber(params.to);
        if (!targetPhone) throw new Error("No valid recipient phone for text dispatch");

        return await whatsappService.sendTextMessage({
          to: targetPhone,
          text: params.text || "Hello from TriGyna Care Desk.",
          leadId: payload.lead?._id || payload.leadId,
          patientId: payload.patient?._id || payload.patientId,
          conversationId: payload.conversationId,
          initiator: { type: "automation", ruleId: rule._id, name: rule.name },
        });
      }

      case "create_crm_activity": {
        const targetLeadId = payload.lead?._id || payload.leadId;
        if (targetLeadId) {
          await Lead.findByIdAndUpdate(targetLeadId, {
            $push: {
              activities: {
                action: params.action || "Automation Rule Triggered",
                details: params.details || `Rule: ${rule.name}`,
                createdAt: new Date(),
              },
            },
          });
        }
        return { activityLogged: true };
      }

      case "create_task": {
        const taskTitle = params.title || `Follow-up for ${payload.fullName || cleanPhone}`;
        const taskDueDate = params.dueHours
          ? new Date(Date.now() + params.dueHours * 3600 * 1000)
          : new Date(Date.now() + 24 * 3600 * 1000);

        const createdTask = await Task.create({
          title: taskTitle,
          description: params.description || `Automated follow-up triggered by rule '${rule.name}'`,
          priority: params.priority || "medium",
          dueDate: taskDueDate,
          category: params.category || "clinical",
          assignedTo: params.assignedTo || payload.lead?.assignedTo || undefined,
          status: "pending",
        });
        return { taskId: createdTask._id };
      }

      case "notify_staff": {
        const { dispatchNotificationEvent } = require("../notifications/notification.service");
        await dispatchNotificationEvent("system.alert", {
          title: params.title || "WhatsApp Automation Alert",
          message: params.message || `Rule '${rule.name}' completed action for ${cleanPhone}`,
          role: params.role || "sales",
          userId: params.userId,
        });
        return { notified: true };
      }

      case "escalate_human": {
        if (cleanPhone) {
          const conv = await WhatsAppConversation.findOne({ customerPhone: cleanPhone });
          if (conv) {
            conv.isEscalated = true;
            conv.escalationReason = params.reason || `Automated escalation rule: ${rule.name}`;
            conv.escalatedAt = new Date();
            conv.status = "waiting";
            conv.internalNotes.push({
              note: `[Escalation] ${conv.escalationReason}`,
              author: "Automation System",
              createdAt: new Date(),
            });
            await conv.save();
          }
        }
        return { escalated: true };
      }

      case "stop_automation": {
        if (cleanPhone) {
          await ContactConsent.recordOptOut(cleanPhone, params.reason || "Automated stop condition triggered");
        }
        return { automationStopped: true };
      }

      default:
        return { skipped: true, reason: `Unknown action type: ${action.type}` };
    }
  }
}

module.exports = new AutomationService();
