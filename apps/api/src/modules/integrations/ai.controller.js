const aiAgentService = require("./ai-agent.service");
const { sendSuccess, sendError } = require("../../shared/response");
const { ValidationError, NotFoundError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

async function suggestReply(req, res, next) {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return next(new ValidationError("conversationId is required"));
    }

    const suggestion = await aiAgentService.generateSuggestedReply(conversationId);
    return sendSuccess(res, { suggestion }, "Suggested reply generated");
  } catch (err) {
    return next(err);
  }
}

async function summarizeConversation(req, res, next) {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return next(new ValidationError("conversationId is required"));
    }

    const summary = await aiAgentService.summarizeConversation(conversationId);
    return sendSuccess(res, { summary }, "Conversation summary generated");
  } catch (err) {
    return next(err);
  }
}

async function classifyIntent(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) {
      return next(new ValidationError("Message text is required for intent classification"));
    }

    const classification = await aiAgentService.classifyIntent(message);
    return sendSuccess(res, { classification }, "Intent classified");
  } catch (err) {
    return next(err);
  }
}

async function escalateConversation(req, res, next) {
  try {
    const { conversationId, reason } = req.body;
    if (!conversationId) {
      return next(new ValidationError("conversationId is required for escalation"));
    }

    const result = await aiAgentService.escalateToHuman(conversationId, reason, req.user);

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "CONVERSATION_ESCALATED_TO_HUMAN",
      targetEntity: "WhatsAppConversation",
      targetId: conversationId,
      details: { reason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, result, "Conversation escalated to human team successfully");
  } catch (err) {
    return next(err);
  }
}

async function getAIStatus(req, res, next) {
  try {
    const status = aiAgentService.getHealthStatus();
    return sendSuccess(res, { aiStatus: status }, "AI Agent system health retrieved");
  } catch (err) {
    return next(err);
  }
}

async function getAdminMonitorReport(req, res, next) {
  try {
    const report = await aiAgentService.getOperationalHealthSummary();
    return sendSuccess(res, { report }, "Operational health report generated");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  suggestReply,
  summarizeConversation,
  classifyIntent,
  escalateConversation,
  getAIStatus,
  getAdminMonitorReport,
};

