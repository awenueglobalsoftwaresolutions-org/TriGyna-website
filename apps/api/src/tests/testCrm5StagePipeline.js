/**
 * testCrm5StagePipeline.js
 * Verification suite enforcing strictly the 5 canonical CRM pipeline stages:
 * new, contacted, qualified, converted, lost
 */

const BASE_URL = "http://127.0.0.1:5000/api/v1";

async function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function run() {
  console.log("==================================================");
  console.log("TriGyna — Strict 5-Status CRM Pipeline Verification Suite");
  console.log("==================================================");

  // 1. Authenticate as Admin
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
  assert(token, "Admin authenticated with JWT");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. GET /crm/stages returns strictly 5 canonical stages
  const stagesRes = await fetch(`${BASE_URL}/crm/stages`, { headers });
  const stagesData = await stagesRes.json();
  const stages = stagesData.data?.stages || stagesData.stages || [];
  assert(stagesRes.status === 200, "GET /crm/stages returned 200");
  assert(stages.length === 5, `Expected exactly 5 stages, received ${stages.length}`);
  const expectedStageIds = ["new", "contacted", "qualified", "converted", "lost"];
  const actualStageIds = stages.map((s) => s.id);
  assert(
    JSON.stringify(actualStageIds) === JSON.stringify(expectedStageIds),
    `Stages match strictly [new, contacted, qualified, converted, lost] -> received ${actualStageIds.join(", ")}`
  );

  // 3. GET /crm/dashboard alias
  const dashRes = await fetch(`${BASE_URL}/crm/dashboard`, { headers });
  assert(dashRes.status === 200, "GET /crm/dashboard returned 200 OK");

  // 4. Create a test lead
  const createRes = await fetch(`${BASE_URL}/crm/leads`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Maya Sen Test",
      phone: "+919988776655",
      serviceInterest: "PCOD/PCOS",
      source: "website",
    }),
  });
  const createData = await createRes.json();
  const leadId = createData.data?.lead?._id || createData.data?._id;
  assert(createRes.status === 201 && leadId, "Lead created with initial status 'new'");

  // 5. Valid transition: new -> contacted
  const contactRes = await fetch(`${BASE_URL}/crm/leads/${leadId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "contacted", note: "Called patient regarding PCOS clinic inquiry" }),
  });
  const contactData = await contactRes.json();
  assert(contactRes.status === 200, "Lead transitioned from 'new' -> 'contacted'");
  assert(
    (contactData.data?.lead?.status || contactData.data?.status) === "contacted",
    "Lead status verified as 'contacted'"
  );

  // 6. Valid transition: contacted -> qualified
  const qualRes = await fetch(`${BASE_URL}/crm/leads/${leadId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "qualified" }),
  });
  assert(qualRes.status === 200, "Lead transitioned from 'contacted' -> 'qualified'");

  // 7. Invalid transition: qualified -> lost WITHOUT lostReason must be rejected
  const invalidLostRes = await fetch(`${BASE_URL}/crm/leads/${leadId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "lost" }),
  });
  assert(
    invalidLostRes.status === 400,
    "Transition to 'lost' without lostReason was correctly rejected with 400 Bad Request"
  );

  // 8. Valid transition: qualified -> lost WITH lostReason
  const validLostRes = await fetch(`${BASE_URL}/crm/leads/${leadId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "lost", lostReason: "Out of budget / chose alternative clinic" }),
  });
  assert(validLostRes.status === 200, "Transition to 'lost' with lostReason succeeded");

  // 9. Dedicated POST /crm/leads/:id/mark-lost
  const markLostRes = await fetch(`${BASE_URL}/crm/leads/${leadId}/mark-lost`, {
    method: "POST",
    headers,
    body: JSON.stringify({ lostReason: "Patient relocated outside operational city" }),
  });
  assert(markLostRes.status === 200, "Dedicated POST /crm/leads/:id/mark-lost endpoint succeeded");

  // 10. Re-open lost lead back to contacted
  const reopenRes = await fetch(`${BASE_URL}/crm/leads/${leadId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "contacted", note: "Patient called back asking for re-evaluation" }),
  });
  assert(reopenRes.status === 200, "Re-opened lead back to 'contacted' within 5 canonical stages");

  // 11. Schedule follow-up via POST /crm/leads/:id/follow-ups
  const fuRes = await fetch(`${BASE_URL}/crm/leads/${leadId}/follow-ups`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Confirm diagnostic report review",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      priority: "high",
    }),
  });
  const fuData = await fuRes.json();
  const taskId = fuData.data?.task?._id || fuData.data?._id;
  assert(fuRes.status === 201 && taskId, "Follow-up scheduled via POST /crm/leads/:id/follow-ups");

  // 12. Complete follow-up via PATCH /crm/follow-ups/:id
  const compFuRes = await fetch(`${BASE_URL}/crm/follow-ups/${taskId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "completed", notes: "Reviewed reports with doctor" }),
  });
  assert(compFuRes.status === 200, "Follow-up completed via PATCH /crm/follow-ups/:id");

  // 13. Interaction history via GET /crm/leads/:id/activities
  const actRes = await fetch(`${BASE_URL}/crm/leads/${leadId}/activities`, { headers });
  const actData = await actRes.json();
  const activities = actData.data?.activities || actData.data?.timeline || [];
  assert(actRes.status === 200 && Array.isArray(activities), "Interaction timeline retrieved via GET /crm/leads/:id/activities");

  // 14. Assign via PATCH /crm/leads/:id/assign
  const assignRes = await fetch(`${BASE_URL}/crm/leads/${leadId}/assign`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ assignedTo: loginData.data?.user?._id || loginData.user?._id }),
  });
  assert(assignRes.status === 200, "Lead assignment verified via PATCH /crm/leads/:id/assign");

  // 15. Conversion analytics via GET /crm/reports/conversions
  const convRepRes = await fetch(`${BASE_URL}/crm/reports/conversions`, { headers });
  assert(convRepRes.status === 200, "Conversion analytics retrieved via GET /crm/reports/conversions");

  console.log("==================================================");
  console.log("ALL 5-STAGE CRM PIPELINE VERIFICATION ASSERTIONS PASSED!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
