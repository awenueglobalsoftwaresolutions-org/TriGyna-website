const mongoose = require("mongoose");
const env = require("../config/env");
const salesTeamService = require("../modules/sales-team/sales-team.service");

async function testBackend() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("--> Testing Sales Team Backend Services...");

  // 1. Overview
  const overview = await salesTeamService.getSalesOverview({});
  console.log("1. Overview KPIs:", JSON.stringify(overview, null, 2));

  // 2. Trend
  const trend = await salesTeamService.getPerformanceTrend({});
  console.log("2. Trend Chart:", {
    labels: trend.labels,
    leads: trend.leadsSeries,
    conversions: trend.conversionsSeries,
  });

  // 3. Quota Progress
  const quota = await salesTeamService.getQuotaProgress({});
  console.log("3. Quota Progress:", JSON.stringify(quota, null, 2));

  // 4. Members
  const members = await salesTeamService.getMembers({});
  console.log(`4. Members Count: ${members.length}`);
  members.forEach((m) => {
    console.log(`- ${m.name} (${m.designation}) | Branch: ${m.branchName} | Leads: ${m.totalLeads} | Conv: ${m.converted} (${m.conversionRate}%) | Target: ${m.monthlyTarget} | Status: ${m.status}`);
  });

  // 5. Eligible Candidates
  const candidates = await salesTeamService.getEligibleStaffCandidates();
  console.log(`5. Eligible Candidates for Add Member: ${candidates.length}`);

  // 6. Distribution
  const dist = await salesTeamService.getLeadDistribution({});
  console.log(`6. Lead Distribution: Assigned ${dist.totalAssigned}, Unassigned ${dist.unassignedCount}, Reps ${dist.reps.length}`);

  // 7. Activity Logs
  const logs = await salesTeamService.getActivityLogs({ limit: 5 });
  console.log(`7. Activity Logs (${logs.length}):`, logs.map((l) => `${l.action} by ${l.actorName}`));

  // 8. Settings
  const settings = await salesTeamService.getTeamSettings();
  console.log("8. Team Settings:", {
    teamName: settings.teamName,
    monthlyTarget: settings.monthlyTeamTarget,
    branch: settings.branch,
  });

  // 9. Export CSV
  const csv = await salesTeamService.exportSalesCsv({});
  console.log("9. Export CSV preview (lines):", csv.split("\n").length);

  await mongoose.disconnect();
  console.log("--> ALL SALES TEAM BACKEND TESTS PASSED!");
}

testBackend().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
