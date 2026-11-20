const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../app");
const env = require("../config/env");
const User = require("../modules/users/user.model");
const Lead = require("../modules/crm/lead.model");
const Package = require("../modules/packages/package.model");

async function runTestSuite() {
  console.log("--> Starting Sales CRM Master Integration Suite...");
  await mongoose.connect(env.MONGODB_URI);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  console.log(`--> Ephemeral test server listening on port ${port}`);

  // Fetch sales user
  const salesUser = await User.findOne({ email: "sales@trigyna.test" });
  if (!salesUser) {
    throw new Error("sales@trigyna.test user not found");
  }

  const token = jwt.sign(
    {
      id: salesUser._id.toString(),
      role: salesUser.role,
      email: salesUser.email,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  async function req(method, path, body = null) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    return { status: res.status, data: json };
  }

  let passed = 0;
  let total = 0;
  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${message}`);
      throw new Error(`Failed: ${message}`);
    }
  }

  try {
    // 1. Dashboard Overview
    console.log("\n--- Testing Dashboard Overview APIs ---");
    const overview = await req("GET", "/api/v1/sales/dashboard/overview");
    assert(overview.status === 200, "GET /api/v1/sales/dashboard/overview returns 200");
    assert(overview.data?.data?.kpis?.totalLeads?.value > 0, "Dashboard overview returns totalLeads KPI");
    assert(Array.isArray(overview.data?.data?.pipeline?.new), "Dashboard overview returns pipeline.new array");
    assert(Array.isArray(overview.data?.data?.todaysTasks), "Dashboard overview returns todaysTasks");
    assert(Array.isArray(overview.data?.data?.upcomingFollowups), "Dashboard overview returns upcomingFollowups");
    assert(overview.data?.data?.targetProgress?.targetRevenue > 0, "Dashboard overview returns targetProgress");

    // 2. Granular Dashboard APIs
    const kpis = await req("GET", "/api/v1/sales/dashboard/kpis");
    assert(kpis.status === 200, "GET /api/v1/sales/dashboard/kpis returns 200");
    assert(kpis.data?.data?.kpis?.revenueGenerated !== undefined, "Granular KPIs endpoint returns revenueGenerated");

    const perf = await req("GET", "/api/v1/sales/dashboard/performance");
    assert(perf.status === 200, "GET /api/v1/sales/dashboard/performance returns 200");
    assert(Array.isArray(perf.data?.data?.trend), "Performance returns weekly trend array");

    const targets = await req("GET", "/api/v1/sales/dashboard/targets");
    assert(targets.status === 200, "GET /api/v1/sales/dashboard/targets returns 200");

    const sources = await req("GET", "/api/v1/sales/dashboard/lead-sources");
    assert(sources.status === 200, "GET /api/v1/sales/dashboard/lead-sources returns 200");
    assert(Array.isArray(sources.data?.data?.items), "Lead sources returns items array");

    // 3. Leads CRUD & Stage Management
    console.log("\n--- Testing Lead APIs ---");
    const testPhone = "98" + Math.floor(10000000 + Math.random() * 90000000);
    const newLead = await req("POST", "/api/v1/sales/leads", {
      fullName: "Pooja Test Patient",
      phone: testPhone,
      email: `pooja.${testPhone}@trigyna.test`,
      serviceInterest: "PCOD Consultation",
      priority: "high",
      notes: "Interested in 3-month comprehensive package",
    });
    assert(newLead.status === 201, "POST /api/v1/sales/leads creates new lead");
    const leadId = newLead.data?.data?.lead?._id;
    assert(!!leadId, "New lead assigned database ID");

    // Duplicate detection test
    const duplicateLead = await req("POST", "/api/v1/sales/leads", {
      fullName: "Duplicate Pooja",
      phone: testPhone,
    });
    assert(duplicateLead.data?.isDuplicate === true, "Duplicate lead phone number detected");

    // Add note
    const noteRes = await req("POST", `/api/v1/sales/leads/${leadId}/notes`, {
      body: "Spoke on phone, very positive response to treatment plan",
    });
    assert(noteRes.status === 201, "POST /api/v1/sales/leads/:id/notes adds note");

    // Update stage
    const stageRes = await req("PATCH", `/api/v1/sales/leads/${leadId}/stage`, {
      status: "contacted",
      note: "Initial contact completed",
    });
    assert(stageRes.status === 200, "PATCH /api/v1/sales/leads/:id/stage updates stage to contacted");

    // Get activities
    const actRes = await req("GET", `/api/v1/sales/leads/${leadId}/activities`);
    assert(actRes.status === 200, "GET /api/v1/sales/leads/:id/activities returns activities");
    assert(actRes.data?.data?.activities?.length >= 2, "Activities log records creation and stage change");

    // Convert lead to patient
    const convertRes = await req("POST", `/api/v1/sales/leads/${leadId}/convert`);
    assert(convertRes.status === 201 || convertRes.status === 200, "POST /api/v1/sales/leads/:id/convert converts lead");
    assert(!!convertRes.data?.data?.patient?.patientCode, "Patient code assigned to converted lead");

    // 4. Follow-up Management
    console.log("\n--- Testing Follow-ups APIs ---");
    const followupRes = await req("POST", "/api/v1/sales/followups", {
      leadId,
      title: "Call Pooja for package confirmation",
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      priority: "high",
      notes: "Follow up on consultation satisfaction",
    });
    assert(followupRes.status === 201, "POST /api/v1/sales/followups creates follow-up");
    const followupId = followupRes.data?.data?.followup?._id;

    const listFu = await req("GET", "/api/v1/sales/followups");
    assert(listFu.status === 200, "GET /api/v1/sales/followups returns followups");

    if (followupId) {
      const compFu = await req("PATCH", `/api/v1/sales/followups/${followupId}/complete`, {
        outcome: "Package agreed",
        notes: "Payment link sent",
      });
      assert(compFu.status === 200, "PATCH /api/v1/sales/followups/:id/complete marks complete");
    }

    // 5. Packages APIs
    console.log("\n--- Testing Package APIs ---");
    const pkgsRes = await req("GET", "/api/v1/sales/packages");
    assert(pkgsRes.status === 200, "GET /api/v1/sales/packages returns packages");
    assert(Array.isArray(pkgsRes.data?.data?.packages), "Packages returned as array");
    const firstPkg = pkgsRes.data?.data?.packages[0];

    if (firstPkg) {
      const shareRes = await req("POST", `/api/v1/sales/packages/${firstPkg._id}/share`, {
        leadId,
        channel: "whatsapp",
        customerPhone: testPhone,
      });
      assert(shareRes.status === 200, "POST /api/v1/sales/packages/:id/share shares package");
    }

    // 6. Appointments & Communications & Support
    console.log("\n--- Testing Appointments, Communications & Support ---");
    const apptsRes = await req("GET", "/api/v1/sales/appointments");
    assert(apptsRes.status === 200, "GET /api/v1/sales/appointments returns appointments");

    const commsRes = await req("GET", "/api/v1/sales/communications");
    assert(commsRes.status === 200, "GET /api/v1/sales/communications returns conversations");

    const supportRes = await req("POST", "/api/v1/sales/support-tickets", {
      category: "Technical & App Support",
      subject: "Assistance with Razorpay webhook link",
      description: "Payment verification delay reported on lead card",
      priority: "medium",
    });
    assert(supportRes.status === 201, "POST /api/v1/sales/support-tickets raises ticket");
    assert(!!supportRes.data?.data?.ticket?.ticketNumber, "Ticket number assigned");

    // 7. Verify /api/v1/crm/sales-dashboard compatibility
    console.log("\n--- Testing CRM Sales Dashboard Compatibility ---");
    const crmDashRes = await req("GET", "/api/v1/crm/sales-dashboard");
    assert(crmDashRes.status === 200, "GET /api/v1/crm/sales-dashboard returns 200");
    assert(crmDashRes.data?.data?.kpis?.totalLeads?.value > 0, "CRM sales-dashboard returns valid totalLeads");

    console.log(`\n========================================================`);
    console.log(`--> ALL SALES CRM MASTER INTEGRATION TESTS PASSED: ${passed}/${total}`);
    console.log(`========================================================\n`);
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  });
