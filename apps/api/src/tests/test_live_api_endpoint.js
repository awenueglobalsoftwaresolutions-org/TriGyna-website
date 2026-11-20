const jwt = require("jsonwebtoken");
const env = require("../config/env");
const mongoose = require("mongoose");
const User = require("../modules/users/user.model");

async function testHttpEndpoints() {
  await mongoose.connect(env.MONGODB_URI);
  const adminUser = await User.findOne({ email: "admin@trigyna.test" });
  await mongoose.disconnect();

  console.log("Found admin user:", adminUser._id.toString());

  // Generate test admin token with { id: adminUser._id }
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

  console.log("--> Testing live HTTP endpoints on http://127.0.0.1:5000...");

  // 1. Overview
  const overviewRes = await fetch("http://127.0.0.1:5000/api/v1/sales-team/overview", { headers });
  console.log("Overview HTTP Status:", overviewRes.status);
  const overviewBody = await overviewRes.json();
  console.log("Overview Response:", JSON.stringify(overviewBody, null, 2));

  // 2. Members
  const membersRes = await fetch("http://127.0.0.1:5000/api/v1/sales-team/members", { headers });
  console.log("Members HTTP Status:", membersRes.status);
  const membersBody = await membersRes.json();
  console.log(`Members count: ${membersBody.data?.members?.length}`);
  membersBody.data?.members?.forEach((m) => {
    console.log(`- ${m.name} | ${m.designation} | ${m.branchName} | Leads: ${m.totalLeads} | Conv: ${m.converted} (${m.conversionRate}%) | Status: ${m.status}`);
  });

  // 3. Quota Progress
  const quotaRes = await fetch("http://127.0.0.1:5000/api/v1/sales-team/quota-progress", { headers });
  console.log("Quota HTTP Status:", quotaRes.status);
  const quotaBody = await quotaRes.json();
  console.log("Quota Response:", JSON.stringify(quotaBody, null, 2));

  // 4. Trend
  const trendRes = await fetch("http://127.0.0.1:5000/api/v1/sales-team/performance-trend", { headers });
  console.log("Trend HTTP Status:", trendRes.status);
  const trendBody = await trendRes.json();
  console.log("Trend Response labels:", trendBody.data?.labels);
  console.log("Trend Response leadsSeries:", trendBody.data?.leadsSeries);
  console.log("Trend Response conversionsSeries:", trendBody.data?.conversionsSeries);
}

testHttpEndpoints().catch(console.error);
