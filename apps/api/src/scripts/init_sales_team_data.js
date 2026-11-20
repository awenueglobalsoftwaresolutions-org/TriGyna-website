const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../modules/users/user.model");
const Employee = require("../modules/hrms/employee.model");
const Lead = require("../modules/crm/lead.model");
const Organization = require("../modules/organization/organization.model");
const SalesTeamMember = require("../modules/sales-team/sales-team-member.model");
const SalesTarget = require("../modules/sales-team/sales-target.model");
const SalesTeamSettings = require("../modules/sales-team/sales-team-settings.model");

async function init() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB for Sales Team initialization...");

  // 1. Get or create Sales Team Settings
  let settings = await SalesTeamSettings.findOne({});
  const sushilAdmin = await User.findOne({ email: "admin@trigyna.test" });
  if (!settings) {
    settings = await SalesTeamSettings.create({
      teamName: "TriGyna Sales & Growth Team",
      teamDescription: "Manage sales representatives, track performance, targets and conversions.",
      teamLeaderId: sushilAdmin ? sushilAdmin._id : undefined,
      branch: "All Branches",
      monthlyTeamTarget: 100,
      defaultIndividualTarget: 30,
      assignmentRules: "manual",
    });
    console.log("Created Sales Team Settings");
  }

  // 2. Map existing 8 users into SalesTeamMember
  const memberSpecs = [
    {
      email: "admin@trigyna.test",
      salesRole: "Team Lead",
      isTeamLead: true,
      branchName: "Main Clinic",
      monthlyTarget: 30,
      status: "active",
    },
    {
      email: "crm@trigyna.test",
      salesRole: "Sales Executive",
      isTeamLead: false,
      branchName: "South Branch",
      monthlyTarget: 30,
      status: "active",
    },
    {
      email: "hrms@trigyna.test",
      salesRole: "Sales Executive",
      isTeamLead: false,
      branchName: "Main Clinic",
      monthlyTarget: 30,
      status: "inactive",
    },
    {
      email: "databo9514@playfine.com",
      salesRole: "Sales Executive",
      isTeamLead: false,
      branchName: "North Branch",
      monthlyTarget: 30,
      status: "inactive",
    },
    {
      email: "admin_master@trigyna.test",
      salesRole: "Sales Executive",
      isTeamLead: false,
      branchName: "Main Clinic",
      monthlyTarget: 30,
      status: "inactive",
    },
    {
      email: "trigyna.health@gmail.com",
      salesRole: "Sales Executive",
      isTeamLead: false,
      branchName: "South Branch",
      monthlyTarget: 30,
      status: "active",
    },
    {
      email: "sales@trigyna.test",
      salesRole: "Senior Sales Executive",
      isTeamLead: false,
      branchName: "Main Clinic",
      monthlyTarget: 30,
      status: "active",
    },
    {
      email: "sales_master@trigyna.test",
      salesRole: "Sales Executive",
      isTeamLead: false,
      branchName: "North Branch",
      monthlyTarget: 30,
      status: "active",
    },
  ];

  for (const spec of memberSpecs) {
    const user = await User.findOne({ email: spec.email });
    if (!user) continue;

    const emp = await Employee.findOne({ userId: user._id });

    let member = await SalesTeamMember.findOne({ userId: user._id });
    if (!member) {
      member = await SalesTeamMember.create({
        userId: user._id,
        employeeId: emp ? emp._id : undefined,
        salesRole: spec.salesRole,
        isTeamLead: spec.isTeamLead,
        branchName: spec.branchName,
        monthlyTarget: spec.monthlyTarget,
        membershipStatus: spec.status,
        startDate: new Date("2026-01-01"),
      });
      console.log(`Initialized SalesTeamMember for ${user.name} (${spec.email})`);
    } else {
      member.salesRole = spec.salesRole;
      member.isTeamLead = spec.isTeamLead;
      member.branchName = spec.branchName;
      member.monthlyTarget = spec.monthlyTarget;
      member.membershipStatus = spec.status;
      if (emp && !member.employeeId) member.employeeId = emp._id;
      await member.save();
      console.log(`Updated SalesTeamMember for ${user.name}`);
    }
  }

  // 3. Initialize Sales Targets for October 2026
  const targetYear = 2026;
  const targetMonth = 10;
  const periodStart = new Date(2026, 9, 1);
  const periodEnd = new Date(2026, 9, 31, 23, 59, 59);

  let teamTarget = await SalesTarget.findOne({
    targetType: "team",
    periodYear: targetYear,
    periodMonth: targetMonth,
  });

  if (!teamTarget) {
    teamTarget = await SalesTarget.create({
      title: "October 2026 Team Conversion Quota",
      targetType: "team",
      targetMetric: "conversions",
      targetValue: 100,
      periodMonth: targetMonth,
      periodYear: targetYear,
      periodStart,
      periodEnd,
      status: "active",
    });
    console.log("Created Team Sales Target: 100 conversions");
  }

  // 4. Distribute leads across May-October 2026 for authentic historical trend aggregation
  // Total leads is 250.
  // We want:
  // May (month 5): ~15 leads (6 converted)
  // Jun (month 6): ~20 leads (8 converted)
  // Jul (month 7): ~30 leads (10 converted)
  // Aug (month 8): ~40 leads (14 converted)
  // Sep (month 9): ~50 leads (18 converted)
  // Oct (month 10): remainder (~95 leads, 23 converted)
  const allLeads = await Lead.find({}).sort({ _id: 1 });
  console.log(`Distributing ${allLeads.length} existing leads across May-Oct 2026...`);

  const monthRanges = [
    { month: 4, count: 20 }, // May
    { month: 5, count: 25 }, // Jun
    { month: 6, count: 35 }, // Jul
    { month: 7, count: 45 }, // Aug
    { month: 8, count: 55 }, // Sep
  ];

  let leadIndex = 0;
  for (const { month, count } of monthRanges) {
    for (let i = 0; i < count && leadIndex < allLeads.length; i++) {
      const lead = allLeads[leadIndex];
      // Keep Sushil Kumar's 59 leads in October so his numbers stay 59 leads / 47 converted!
      if (lead.assignedTo?.toString() === sushilAdmin?._id.toString()) {
        leadIndex++;
        continue;
      }
      const day = (i % 28) + 1;
      const targetDate = new Date(2026, month, day, 10 + (i % 8), (i * 7) % 60);
      lead.createdAt = targetDate;
      if (lead.status === "converted") {
        lead.updatedAt = new Date(targetDate.getTime() + 2 * 24 * 3600 * 1000);
      }
      await lead.save();
      leadIndex++;
    }
  }
  console.log("Lead distribution across historical months updated.");

  await mongoose.disconnect();
  console.log("Initialization complete!");
}

init().catch(console.error);
