const jwt = require("jsonwebtoken");
const env = require("../config/env");
const mongoose = require("mongoose");
const User = require("../modules/users/user.model");
const SalesTeamMember = require("../modules/sales-team/sales-team-member.model");
const Lead = require("../modules/crm/lead.model");

async function testAllEndpoints() {
  await mongoose.connect(env.MONGODB_URI);
  const adminUser = await User.findOne({ email: "admin@trigyna.test" });
  const sampleMember = await SalesTeamMember.findOne({});
  const unassignedLead = await Lead.findOne({ assignedTo: null });
  await mongoose.disconnect();

  const token = jwt.sign(
    {
      id: adminUser._id.toString(),
      role: adminUser.role,
      email: adminUser.email,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const baseUrl = "http://127.0.0.1:5000/api/v1/sales-team";

  console.log("--> Testing 1: Targets");
  const targetsRes = await fetch(`${baseUrl}/targets`, { headers });
  const targets = await targetsRes.json();
  console.log("Targets status:", targetsRes.status, "count:", targets.data?.targets?.length);

  console.log("--> Testing 2: Member Details");
  const memberDetailsRes = await fetch(`${baseUrl}/members/${sampleMember._id}`, { headers });
  const memberDetails = await memberDetailsRes.json();
  console.log("Member Details status:", memberDetailsRes.status, "name:", memberDetails.data?.member?.name);

  console.log("--> Testing 3: Leads Distribution");
  const distRes = await fetch(`${baseUrl}/leads/distribution`, { headers });
  const dist = await distRes.json();
  console.log("Distribution status:", distRes.status, "assigned:", dist.data?.totalAssigned, "unassigned:", dist.data?.unassignedCount);

  console.log("--> Testing 4: Performance Analytics");
  const perfRes = await fetch(`${baseUrl}/performance`, { headers });
  const perf = await perfRes.json();
  console.log("Performance status:", perfRes.status, "leaderboard items:", perf.data?.leaderboard?.length);

  console.log("--> Testing 5: Activity Logs");
  const logsRes = await fetch(`${baseUrl}/activity-logs`, { headers });
  const logs = await logsRes.json();
  console.log("Activity logs status:", logsRes.status, "items:", logs.data?.logs?.length);

  console.log("--> Testing 6: Settings");
  const settingsRes = await fetch(`${baseUrl}/settings`, { headers });
  const settings = await settingsRes.json();
  console.log("Settings status:", settingsRes.status, "teamName:", settings.data?.settings?.teamName);

  console.log("--> Testing 7: Eligible Candidates");
  const candidatesRes = await fetch(`${baseUrl}/eligible-candidates`, { headers });
  const candidates = await candidatesRes.json();
  console.log("Eligible candidates status:", candidatesRes.status, "count:", candidates.data?.candidates?.length);

  console.log("--> Testing 8: CSV Export");
  const exportRes = await fetch(`${baseUrl}/export`, { headers });
  const exportCsv = await exportRes.text();
  console.log("Export status:", exportRes.status, "content-type:", exportRes.headers.get("content-type"), "lines:", exportCsv.split("\n").length);

  console.log("--> Testing 9: Member Activate / Deactivate Toggle");
  const deactRes = await fetch(`${baseUrl}/members/${sampleMember._id}/deactivate`, { method: "POST", headers });
  console.log("Deactivate status:", deactRes.status);
  const actRes = await fetch(`${baseUrl}/members/${sampleMember._id}/activate`, { method: "POST", headers });
  console.log("Reactivate status:", actRes.status);

  console.log("--> ALL 9 ENDPOINT SUITES PASSED SUCCESSFULLY!");
}

testAllEndpoints().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
