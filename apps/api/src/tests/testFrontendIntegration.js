const http = require("http");

const BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5000";

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDashboardIntegrationTests() {
  console.log("==================================================");
  console.log("TriGyna — Frontend Role Portals & Live Data Verification");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Admin Dashboard Flow
  console.log("\n--- Role 1: Admin (Sushil Kumar -> /portal/admin) ---");
  const adminLogin = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "admin@trigyna.test",
    password: "TriGyna@123",
  });
  assert(adminLogin.status === 200, "Admin login successful");
  const adminToken = adminLogin.body.data.token;

  const adminUsers = await makeRequest("GET", "/api/v1/users", null, adminToken);
  assert(adminUsers.status === 200, "Admin loads live user directory (/api/v1/users)");
  assert(adminUsers.body.data.users.length >= 8, `Live users retrieved: ${adminUsers.body.data.users.length}`);

  const adminSummary = await makeRequest("GET", "/api/v1/reports/summary", null, adminToken);
  assert(adminSummary.status === 200, "Admin loads real database summary metrics (/api/v1/reports/summary)");
  assert(adminSummary.body.data.metrics.appointments.totalAppointments >= 10, "Summary displays real seeded appointments count");
  assert(adminSummary.body.data.metrics.crm.totalLeads >= 12, "Summary displays real seeded CRM leads count");

  // 2. Doctor Dashboard Flow
  console.log("\n--- Role 2: Doctor (Dr. Aarav Sharma -> /portal/doctor) ---");
  const doctorLogin = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "doctor@trigyna.test",
    password: "TriGyna@123",
  });
  assert(doctorLogin.status === 200, "Doctor login successful");
  const doctorToken = doctorLogin.body.data.token;

  const doctorAppts = await makeRequest("GET", "/api/v1/appointments", null, doctorToken);
  assert(doctorAppts.status === 200, "Doctor loads live appointments list (/api/v1/appointments)");
  assert(doctorAppts.body.data.appointments.length >= 1, `Live assigned appointments retrieved for doctor: ${doctorAppts.body.data.appointments.length}`);

  const doctorPatients = await makeRequest("GET", "/api/v1/patients", null, doctorToken);
  assert(doctorPatients.status === 200, "Doctor loads patient records list (/api/v1/patients)");
  assert(doctorPatients.body.data.patients.length >= 10, `Live patient records retrieved: ${doctorPatients.body.data.patients.length}`);

  // 3. CRM Dashboard Flow
  console.log("\n--- Role 3: CRM (Priya Verma -> /portal/crm) ---");
  const crmLogin = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "crm@trigyna.test",
    password: "TriGyna@123",
  });
  assert(crmLogin.status === 200, "CRM login successful");
  const crmToken = crmLogin.body.data.token;

  const crmLeads = await makeRequest("GET", "/api/v1/crm/leads", null, crmToken);
  assert(crmLeads.status === 200, "CRM loads live sales leads (/api/v1/crm/leads)");
  assert(crmLeads.body.data.leads.length >= 12, `Live CRM leads retrieved: ${crmLeads.body.data.leads.length}`);

  // Check converted leads linked to patients
  const convertedLeads = crmLeads.body.data.leads.filter((l) => l.status === "converted");
  assert(convertedLeads.length >= 3, `Converted leads with patient links verified: ${convertedLeads.length}`);

  // 4. HRMS Dashboard Flow
  console.log("\n--- Role 4: HRMS (Neha Singh -> /portal/hrms) ---");
  const hrmsLogin = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "hrms@trigyna.test",
    password: "TriGyna@123",
  });
  assert(hrmsLogin.status === 200, "HRMS login successful");
  const hrmsToken = hrmsLogin.body.data.token;

  const hrmsEmployees = await makeRequest("GET", "/api/v1/hrms/employees", null, hrmsToken);
  assert(hrmsEmployees.status === 200, "HRMS loads live employee roster (/api/v1/hrms/employees)");
  assert(hrmsEmployees.body.data.employees.length >= 5, `Live employees retrieved: ${hrmsEmployees.body.data.employees.length}`);

  const hrmsAttendance = await makeRequest("GET", "/api/v1/hrms/attendance", null, hrmsToken);
  assert(hrmsAttendance.status === 200, "HRMS loads real staff attendance (/api/v1/hrms/attendance)");
  assert(hrmsAttendance.body.data.records.length >= 15, `Live attendance records retrieved: ${hrmsAttendance.body.data.records.length}`);

  const hrmsLeaves = await makeRequest("GET", "/api/v1/hrms/leave-requests", null, hrmsToken);
  assert(hrmsLeaves.status === 200, "HRMS loads leave requests (/api/v1/hrms/leave-requests)");
  assert(hrmsLeaves.body.data.leaves.length >= 2, `Live leave requests retrieved: ${hrmsLeaves.body.data.leaves.length}`);

  // 5. Reception Dashboard Flow
  console.log("\n--- Role 5: Reception (Rahul Gupta -> /portal/reception) ---");
  const receptionLogin = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "reception@trigyna.test",
    password: "TriGyna@123",
  });
  assert(receptionLogin.status === 200, "Reception login successful");
  const receptionToken = receptionLogin.body.data.token;

  const recAppts = await makeRequest("GET", "/api/v1/appointments", null, receptionToken);
  assert(recAppts.status === 200, "Reception loads daily appointments (/api/v1/appointments)");
  assert(recAppts.body.data.appointments.length >= 10, "Daily appointments loaded");

  const recPatients = await makeRequest("GET", "/api/v1/patients", null, receptionToken);
  assert(recPatients.status === 200, "Reception loads patient queue (/api/v1/patients)");

  // 6. Patient Portal Flow
  console.log("\n--- Role 6: Patient (Ananya Mishra -> /portal/patient) ---");
  const patientLogin = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "patient@trigyna.test",
    password: "TriGyna@123",
  });
  assert(patientLogin.status === 200, "Patient login successful");
  const patientToken = patientLogin.body.data.token;

  const patientInvoices = await makeRequest("GET", "/api/v1/invoices", null, patientToken);
  assert(patientInvoices.status === 200, "Patient loads own invoices (/api/v1/invoices)");
  assert(patientInvoices.body.data.invoices.length >= 1, `Patient invoices retrieved: ${patientInvoices.body.data.invoices.length}`);

  console.log("\n==================================================");
  console.log(`DASHBOARD INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runDashboardIntegrationTests().catch((err) => {
  console.error("Dashboard integration tests failed:", err);
  process.exit(1);
});
