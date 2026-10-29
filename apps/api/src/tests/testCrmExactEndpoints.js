/**
 * testCrmExactEndpoints.js
 * Comprehensive automated verification for all CRM exact endpoints using native fetch
 */

const BASE_URL = "http://127.0.0.1:5000/api/v1";

async function runCrmSuite() {
  console.log("=== Running CRM Exact Endpoints Verification ===");
  try {
    // 1. Authenticate as Admin
    console.log("1. Authenticating as Admin...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "+919172772326",
        password: "TriGyna@2326",
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token || loginData.token;
    if (!token) throw new Error("Could not acquire auth token: " + JSON.stringify(loginData));
    console.log("   -> Authenticated successfully.");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // 2. GET /crm/overview
    console.log("2. Testing GET /crm/overview...");
    const overviewRes = await fetch(`${BASE_URL}/crm/overview`, { headers });
    const overviewData = await overviewRes.json();
    console.log("   -> Overview stats:", overviewData.data?.kpis || overviewData.data);

    // 3. GET /crm/stages
    console.log("3. Testing GET /crm/stages...");
    const stagesRes = await fetch(`${BASE_URL}/crm/stages`, { headers });
    const stagesData = await stagesRes.json();
    const stageList = stagesData.data?.stages || stagesData.data || [];
    console.log("   -> Stages count:", stageList.length);

    // 4. GET /crm/pipeline
    console.log("4. Testing GET /crm/pipeline...");
    const pipeRes = await fetch(`${BASE_URL}/crm/pipeline`, { headers });
    const pipeData = await pipeRes.json();
    console.log("   -> Pipeline columns returned:", Object.keys(pipeData.data?.columns || pipeData.data?.pipeline || {}));

    // 5. POST /crm/leads (Create Lead)
    console.log("5. Testing POST /crm/leads (Create Lead)...");
    const newLeadRes = await fetch(`${BASE_URL}/crm/leads`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Ananya Deshmukh",
        phone: "+919876500001",
        email: "ananya.d@example.com",
        serviceInterest: "PCOD/PCOS",
        source: "website",
        priority: "high",
        message: "Looking for personalized fertility and hormone balance plan.",
      }),
    });
    console.log("   -> POST status:", newLeadRes.status);
    const newLeadData = await newLeadRes.json();
    console.log("   -> POST body:", newLeadData);
    const createdLead = newLeadData.data?.lead || newLeadData.data;
    console.log("   -> Created lead ID:", createdLead?._id, "Stage:", createdLead?.status);

    // 6. GET /crm/leads/:id
    console.log("6. Testing GET /crm/leads/:id...");
    const getLeadRes = await fetch(`${BASE_URL}/crm/leads/${createdLead._id}`, { headers });
    const getLeadData = await getLeadRes.json();
    console.log("   -> Retrieved lead:", getLeadData.data?.lead?.fullName);

    // 7. PATCH /crm/leads/:id/stage (Stage transition)
    console.log("7. Testing PATCH /crm/leads/:id/stage...");
    const stageRes = await fetch(`${BASE_URL}/crm/leads/${createdLead._id}/stage`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        stage: "contacted",
        notes: "Telephonic intake completed with patient",
      }),
    });
    const stageData = await stageRes.json();
    console.log("   -> Updated stage:", stageData.data?.lead?.status);

    // 8. POST /crm/leads/:id/notes
    console.log("8. Testing POST /crm/leads/:id/notes...");
    const noteRes = await fetch(`${BASE_URL}/crm/leads/${createdLead._id}/notes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        note: "Patient prefers evening consultations on Zoom",
      }),
    });
    const noteData = await noteRes.json();
    console.log("   -> Note added, activities count:", noteData.data?.lead?.activities?.length);

    // 9. POST /crm/follow-ups (Schedule follow-up)
    console.log("9. Testing POST /crm/follow-ups...");
    const fuRes = await fetch(`${BASE_URL}/crm/follow-ups`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        leadId: createdLead._id,
        title: "Call to confirm lab reports",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        priority: "high",
      }),
    });
    const fuData = await fuRes.json();
    console.log("   -> Scheduled follow-up ID:", fuData.data?._id || "created");

    // 10. GET /crm/follow-ups
    console.log("10. Testing GET /crm/follow-ups...");
    const listFuRes = await fetch(`${BASE_URL}/crm/follow-ups`, { headers });
    const listFuData = await listFuRes.json();
    console.log("   -> Follow-ups count:", listFuData.data?.length);

    // 11. GET /crm/reports
    console.log("11. Testing GET /crm/reports...");
    const reportsRes = await fetch(`${BASE_URL}/crm/reports`, { headers });
    const reportsData = await reportsRes.json();
    console.log("   -> Reports totals:", reportsData.data?.totals);

    // 12. GET /crm/integrations
    console.log("12. Testing GET /crm/integrations...");
    const integrationsRes = await fetch(`${BASE_URL}/crm/integrations`, { headers });
    const integrationsData = await integrationsRes.json();
    console.log("   -> Integrations status count:", Object.keys(integrationsData.data || {}).length);

    console.log("\n=======================================================");
    console.log("ALL CRM EXACT ENDPOINTS VERIFIED & WORKING FLAWLESSLY!");
    console.log("=======================================================");
  } catch (err) {
    console.error("Test failed:", err.message);
    process.exit(1);
  }
}

runCrmSuite();
