const salesTeamService = require("./sales-team.service");
const { sendSuccess, sendError } = require("../../shared/response");

async function getOverview(req, res, next) {
  try {
    const stats = await salesTeamService.getSalesOverview(req.query);
    return sendSuccess(res, stats, "Sales overview retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function getPerformanceTrend(req, res, next) {
  try {
    const trend = await salesTeamService.getPerformanceTrend(req.query);
    return sendSuccess(res, trend, "Performance trend retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function getQuotaProgress(req, res, next) {
  try {
    const quota = await salesTeamService.getQuotaProgress(req.query);
    return sendSuccess(res, quota, "Monthly quota progress retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function getMembers(req, res, next) {
  try {
    const members = await salesTeamService.getMembers(req.query);
    return sendSuccess(res, { members, total: members.length }, "Sales team members retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function getMemberDetails(req, res, next) {
  try {
    const details = await salesTeamService.getMemberDetails(req.params.memberId);
    return sendSuccess(res, details, "Member details retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const member = await salesTeamService.addMember(req.body, req.user._id);
    return sendSuccess(res, { member }, "Sales team member added successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function updateMember(req, res, next) {
  try {
    const member = await salesTeamService.updateMember(req.params.memberId, req.body, req.user._id);
    return sendSuccess(res, { member }, "Sales team member updated successfully");
  } catch (err) {
    return next(err);
  }
}

async function activateMember(req, res, next) {
  try {
    const member = await salesTeamService.toggleMemberStatus(req.params.memberId, "active", req.user._id);
    return sendSuccess(res, { member }, "Member activated successfully");
  } catch (err) {
    return next(err);
  }
}

async function deactivateMember(req, res, next) {
  try {
    const member = await salesTeamService.toggleMemberStatus(req.params.memberId, "inactive", req.user._id);
    return sendSuccess(res, { member }, "Member deactivated successfully");
  } catch (err) {
    return next(err);
  }
}

async function getTargets(req, res, next) {
  try {
    const targets = await salesTeamService.getTargets(req.query);
    return sendSuccess(res, { targets }, "Sales targets retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function createTarget(req, res, next) {
  try {
    const target = await salesTeamService.createTarget(req.body, req.user._id);
    return sendSuccess(res, { target }, "Sales target created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function getLeadDistribution(req, res, next) {
  try {
    const distribution = await salesTeamService.getLeadDistribution(req.query);
    return sendSuccess(res, distribution, "Lead distribution retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function bulkAssignLeads(req, res, next) {
  try {
    const result = await salesTeamService.bulkAssignLeads(req.body, req.user._id);
    return sendSuccess(res, result, "Leads successfully assigned");
  } catch (err) {
    return next(err);
  }
}

async function getPerformanceAnalytics(req, res, next) {
  try {
    const analytics = await salesTeamService.getPerformanceAnalytics(req.query);
    return sendSuccess(res, analytics, "Performance analytics retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function getActivityLogs(req, res, next) {
  try {
    const logs = await salesTeamService.getActivityLogs(req.query);
    return sendSuccess(res, { logs }, "Activity logs retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function getTeamSettings(req, res, next) {
  try {
    const settings = await salesTeamService.getTeamSettings();
    return sendSuccess(res, { settings }, "Team settings retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function updateTeamSettings(req, res, next) {
  try {
    const settings = await salesTeamService.updateTeamSettings(req.body, req.user._id);
    return sendSuccess(res, { settings }, "Team settings updated successfully");
  } catch (err) {
    return next(err);
  }
}

async function getEligibleStaffCandidates(req, res, next) {
  try {
    const candidates = await salesTeamService.getEligibleStaffCandidates();
    return sendSuccess(res, { candidates }, "Eligible staff candidates retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function exportSalesCsv(req, res, next) {
  try {
    const csvContent = await salesTeamService.exportSalesCsv(req.query);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="trigyna_sales_team_performance.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getOverview,
  getPerformanceTrend,
  getQuotaProgress,
  getMembers,
  getMemberDetails,
  addMember,
  updateMember,
  activateMember,
  deactivateMember,
  getTargets,
  createTarget,
  getLeadDistribution,
  bulkAssignLeads,
  getPerformanceAnalytics,
  getActivityLogs,
  getTeamSettings,
  updateTeamSettings,
  getEligibleStaffCandidates,
  exportSalesCsv,
};
