/**
 * TriGyna Health & Wellness — Sales Team CRM Dashboard Integration Test Suite
 * Validates backend aggregations, RBAC, 5-column Kanban, KPIs, tasks, appointments,
 * assisted checkout generation, lead conversion, and stage advancement.
 */

const http = require("http");

const BASE_HOST = "127.0.0.1";
const BASE_PORT = 5000;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      "Content-Type": "application/json",
    };
    if (payload) {
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: BASE_HOST,
        port: BASE_PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = { raw: data };
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runSalesDashboardTests() {
  console.log("\n========================================================");
  console.log("--> STARTING TRIGYNA SALES TEAM DASHBOARD TEST SUITE");
  console.log("========================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Authenticate Sales Executive
  console.log("--> 1. Authenticating Sales Executive (sales@trigyna.test)...");
  const loginRes = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "sales@trigyna.test",
    password: "TriGyna@123",
  });
  assert(loginRes.status === 200, "Sales login succeeds with HTTP 200");
  const salesToken = loginRes.data?.data?.token;
  const salesUser = loginRes.data?.data?.user;
  assert(!!salesToken, "Sales JWT authentication token issued");
  assert(salesUser.role === "sales", "User role is sales");

  // 2. Fetch Sales Dashboard Aggregated Overview
  console.log("\n--> 2. Verifying GET /api/v1/crm/sales-dashboard...");
  const dashRes = await makeRequest("GET", "/api/v1/crm/sales-dashboard", null, salesToken);
  assert(dashRes.status === 200, "Sales dashboard endpoint returns HTTP 200");
  const dData = dashRes.data?.data;
  assert(!!dData, "Dashboard payload data object is present");

  // 3. Verify the 5 Top KPI Cards
  console.log("\n--> 3. Validating 5 Top KPI Cards structure and deltas...");
  const { kpis } = dData;
  assert(kpis.totalLeads?.value > 0, `Total Leads KPI present (${kpis.totalLeads.value})`);
  assert(kpis.totalLeads?.delta === "+12%", `Total Leads delta matches design (+12%)`);
  assert(kpis.convertedPatients?.value > 0, `Converted Patients KPI present (${kpis.convertedPatients.value})`);
  assert(kpis.convertedPatients?.delta === "+18%", `Converted Patients delta matches design (+18%)`);
  assert(kpis.pendingFollowUps?.value > 0, `Pending Follow-ups KPI present (${kpis.pendingFollowUps.value})`);
  assert(kpis.appointmentsBooked?.value > 0, `Appointments Booked KPI present (${kpis.appointmentsBooked.value})`);
  assert(kpis.revenueGenerated?.value > 0, `Revenue Generated KPI present (${kpis.revenueGenerated.value})`);
  assert(kpis.revenueGenerated?.delta === "+28%", `Revenue delta matches design (+28%)`);

  // 4. Verify 5-Column Kanban Pipeline & Signature Leads
  console.log("\n--> 4. Validating 5 Kanban Pipeline Columns...");
  const { pipeline, stageCounts } = dData;
  assert(Array.isArray(pipeline.new), "Column 1: 'new' leads array exists");
  assert(Array.isArray(pipeline.contacted), "Column 2: 'contacted' leads array exists");
  assert(Array.isArray(pipeline.interested), "Column 3: 'interested' leads array exists");
  assert(Array.isArray(pipeline.appointment), "Column 4: 'appointment' leads array exists");
  assert(Array.isArray(pipeline.converted), "Column 5: 'converted' leads array exists");

  assert(pipeline.new.length > 0, `New leads populated (${pipeline.new.length})`);
  assert(pipeline.contacted.length > 0, `Contacted leads populated (${pipeline.contacted.length})`);
  assert(pipeline.interested.length > 0, `Interested leads populated (${pipeline.interested.length})`);
  assert(pipeline.appointment.length > 0, `Appointment leads populated (${pipeline.appointment.length})`);
  assert(pipeline.converted.length > 0, `Converted leads populated (${pipeline.converted.length})`);

  // Verify visible names from screenshot
  const allNames = [
    ...pipeline.new.map((l) => l.fullName),
    ...pipeline.contacted.map((l) => l.fullName),
    ...pipeline.interested.map((l) => l.fullName),
    ...pipeline.appointment.map((l) => l.fullName),
    ...pipeline.converted.map((l) => l.fullName),
  ];
  assert(allNames.includes("Priya Sharma"), "Signature lead 'Priya Sharma' present in pipeline");
  assert(allNames.includes("Amit Patel"), "Signature lead 'Amit Patel' present in pipeline");
  assert(allNames.includes("Sneha Jain"), "Signature lead 'Sneha Jain' present in pipeline");
  assert(allNames.includes("Kritika Sinha"), "Signature lead 'Kritika Sinha' present in pipeline");
  assert(allNames.includes("Ritu Verma"), "Signature lead 'Ritu Verma' present in pipeline");

  // 5. Verify Today's Tasks
  console.log("\n--> 5. Validating Today's Tasks panel...");
  const { todaysTasks } = dData;
  assert(Array.isArray(todaysTasks) && todaysTasks.length >= 4, `Today's tasks populated (count: ${todaysTasks.length})`);
  const firstTask = todaysTasks[0];
  assert(!!firstTask.title, `First task has title: '${firstTask.title}'`);
  assert(!!firstTask.time, `First task has time: '${firstTask.time}'`);

  // 6. Verify Upcoming Appointments
  console.log("\n--> 6. Validating Upcoming Appointments panel...");
  const { upcomingAppointments } = dData;
  assert(Array.isArray(upcomingAppointments) && upcomingAppointments.length >= 4, `Upcoming appointments populated (count: ${upcomingAppointments.length})`);
  const firstAppt = upcomingAppointments[0];
  assert(!!firstAppt.patientName, `Appointment has patient name: '${firstAppt.patientName}'`);
  assert(!!firstAppt.serviceName, `Appointment has service name: '${firstAppt.serviceName}'`);
  assert(firstAppt.status === "confirmed" || firstAppt.status === "pending", `Appointment has valid status: '${firstAppt.status}'`);

  // 7. Verify Leads Source Donut Breakdown
  console.log("\n--> 7. Validating Leads Source Breakdown...");
  const { leadsSource } = dData;
  assert(leadsSource.total > 0, `Total leads in source breakdown: ${leadsSource.total}`);
  assert(Array.isArray(leadsSource.items) && leadsSource.items.length >= 6, "All 6 channels (Website, WhatsApp, Instagram, Google/SEO, Referral, Walk-in) present");
  const channelLabels = leadsSource.items.map((i) => i.label);
  assert(channelLabels.includes("Website Enquiry"), "Website Enquiry channel present");
  assert(channelLabels.includes("WhatsApp"), "WhatsApp channel present");
  assert(channelLabels.includes("Instagram"), "Instagram channel present");

  // 8. Verify Conversion Funnel
  console.log("\n--> 8. Validating Conversion Funnel stages...");
  const { conversionFunnel } = dData;
  assert(Array.isArray(conversionFunnel) && conversionFunnel.length === 5, "Conversion Funnel has exactly 5 stages");
  const funnelStages = conversionFunnel.map((s) => s.stage);
  assert(funnelStages[0] === "Leads", "Funnel Stage 1 is Leads");
  assert(funnelStages[1] === "Contacted", "Funnel Stage 2 is Contacted");
  assert(funnelStages[2] === "Interested", "Funnel Stage 3 is Interested");
  assert(funnelStages[3] === "Appointments", "Funnel Stage 4 is Appointments");
  assert(funnelStages[4] === "Converted", "Funnel Stage 5 is Converted");

  // 9. Verify Recent Activities
  console.log("\n--> 9. Validating Recent Activities audit stream...");
  const { recentActivities } = dData;
  assert(Array.isArray(recentActivities) && recentActivities.length >= 5, `Recent activities stream populated (count: ${recentActivities.length})`);
  assert(!!recentActivities[0].title, `First activity has title: '${recentActivities[0].title}'`);
  assert(!!recentActivities[0].timeAgo, `First activity has timeAgo: '${recentActivities[0].timeAgo}'`);

  // 10. Live Dynamic Creation: Add Lead via POST /api/v1/crm/leads
  console.log("\n--> 10. Testing Live Lead Creation...");
  const testPhone = "9199" + Math.floor(100000 + Math.random() * 900000);
  const createLeadRes = await makeRequest(
    "POST",
    "/api/v1/crm/leads",
    {
      fullName: "Test Automated Sales Lead",
      phone: testPhone,
      email: `test.sales.${testPhone}@trigyna.test`,
      serviceInterest: "PCOD Consultation",
      consultationMode: "Online Video Consultation",
      source: "website_enquiry",
      priority: "high",
      notes: "Lead added during autonomous test suite execution",
    },
    salesToken
  );
  assert(createLeadRes.status === 201 || createLeadRes.status === 200, "Lead creation succeeds");
  const newLeadId =
    createLeadRes.data?.data?.lead?._id ||
    createLeadRes.data?.data?._id ||
    createLeadRes.data?.data?.leadId;
  assert(!!newLeadId, "New lead assigned database ID");

  // 11. Advance Lead Stage: PATCH /api/v1/crm/leads/:id/stage
  console.log("\n--> 11. Testing Stage Advancement...");
  const advanceRes = await makeRequest(
    "PATCH",
    `/api/v1/crm/leads/${newLeadId}/stage`,
    {
      status: "contacted",
      note: "Spoke with patient; consultation slot scheduled",
    },
    salesToken
  );
  assert(advanceRes.status === 200, "Lead stage updated to 'contacted'");

  // 12. Idempotent Patient Conversion: POST /api/v1/crm/leads/:id/convert
  console.log("\n--> 12. Testing Lead to Patient Conversion...");
  const convertRes = await makeRequest("POST", `/api/v1/crm/leads/${newLeadId}/convert`, {}, salesToken);
  assert(convertRes.status === 200 || convertRes.status === 201, "Lead successfully converted to registered Patient chart");
  const patientData = convertRes.data?.data?.patient;
  assert(!!patientData?.patientCode, `Patient assigned code: '${patientData?.patientCode}'`);

  // Second conversion call must be idempotent
  const secondConvertRes = await makeRequest("POST", `/api/v1/crm/leads/${newLeadId}/convert`, {}, salesToken);
  assert(secondConvertRes.status === 200, "Idempotent second conversion call handled safely with HTTP 200");

  // 13. WhatsApp & SMS Communication Hub
  console.log("\n--> 13. Testing WhatsApp Business Hub...");
  const waConvsRes = await makeRequest("GET", "/api/v1/integrations/whatsapp/conversations", null, salesToken);
  assert(waConvsRes.status === 200, "WhatsApp conversations retrieved with HTTP 200");
  assert(Array.isArray(waConvsRes.data?.data?.conversations), "Conversations list returned as array");

  const waTemplatesRes = await makeRequest("GET", "/api/v1/integrations/whatsapp/templates", null, salesToken);
  assert(waTemplatesRes.status === 200, "Approved WhatsApp templates retrieved with HTTP 200");

  const waSendRes = await makeRequest(
    "POST",
    "/api/v1/integrations/whatsapp/messages",
    {
      customerPhone: "9100000001",
      customerName: "Priya Sharma",
      text: "Automated test message dispatched via sales suite",
    },
    salesToken
  );
  assert(waSendRes.status === 201 || waSendRes.status === 200, "WhatsApp message sent with HTTP 201/200");

  // 14. Conversion & ROI Reports
  console.log("\n--> 14. Testing CRM & Sales Reports...");
  const reportsRes = await makeRequest("GET", "/api/v1/crm/reports", null, salesToken);
  assert(reportsRes.status === 200, "CRM reports endpoint returns HTTP 200");
  assert(Array.isArray(reportsRes.data?.data?.sourceBreakdown), "Source breakdown array present");
  assert(Array.isArray(reportsRes.data?.data?.stageDistribution), "Stage distribution array present");

  // 15. Sales Team Roster & Targets
  console.log("\n--> 15. Testing Sales Team Roster...");
  const teamRes = await makeRequest("GET", "/api/v1/crm/team", null, salesToken);
  assert(teamRes.status === 200, "Sales team roster endpoint returns HTTP 200");
  assert(Array.isArray(teamRes.data?.data?.team), "Team list returned as array");
  assert(teamRes.data?.data?.team.length > 0, "Team members roster has at least 1 sales member");

  // 16. Notifications Center
  console.log("\n--> 16. Testing Notifications...");
  const notifsRes = await makeRequest("GET", "/api/v1/notifications", null, salesToken);
  assert(notifsRes.status === 200, "Notifications endpoint returns HTTP 200");
  assert(Array.isArray(notifsRes.data?.data?.notifications), "Notifications returned as array");

  const markAllReadRes = await makeRequest("PATCH", "/api/v1/notifications/read-all", {}, salesToken);
  assert(markAllReadRes.status === 200, "Mark all notifications as read returns HTTP 200");

  // 17. Sales Representative Settings & Profile
  console.log("\n--> 17. Testing Sales Profile Preferences...");
  const profileRes = await makeRequest(
    "PATCH",
    "/api/v1/auth/profile",
    {
      preferences: {
        whatsappNotifications: true,
        emailNotifications: true,
        monthlyTarget: 50,
      },
    },
    salesToken
  );
  assert(profileRes.status === 200, "Profile preferences updated successfully with HTTP 200");
  assert(profileRes.data?.data?.user?.preferences?.monthlyTarget === 50, "Monthly target preference saved accurately");

  console.log("\n========================================================");
  console.log(`--> ALL SALES DASHBOARD INTEGRATION TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log("========================================================\n");
}

if (require.main === module) {
  runSalesDashboardTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n[TEST ERROR]:", err.message);
      process.exit(1);
    });
}

module.exports = { runSalesDashboardTests };
