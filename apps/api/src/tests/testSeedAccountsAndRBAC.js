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

async function verifyAllSeedAccounts() {
  console.log("==================================================");
  console.log("TriGyna — Test Accounts Authentication & RBAC Verification");
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

  const testAccounts = [
    { role: "owner", email: "trigyna.health@gmail.com", identifier: "+919172772326", password: "TriGyna@2326", name: "Sushil Kushwaha", expectedDashboard: "/admin/dashboard" },
    { role: "admin", email: "admin@trigyna.test", identifier: "admin@trigyna.test", password: "TriGyna@123", name: "Sushil Kumar", expectedDashboard: "/admin/dashboard" },
    { role: "doctor", email: "doctor@trigyna.test", identifier: "doctor@trigyna.test", password: "TriGyna@123", name: "Dr. Aarav Sharma", expectedDashboard: "/doctor/dashboard" },
    { role: "reception", email: "reception@trigyna.test", identifier: "reception@trigyna.test", password: "TriGyna@123", name: "Rahul Gupta", expectedDashboard: "/reception/dashboard" },
    { role: "patient", email: "patient@trigyna.test", identifier: "patient@trigyna.test", password: "TriGyna@123", name: "Ananya Mishra", expectedDashboard: "/patient/dashboard" },
    // CRM and HRMS are modules of Admin, test users authenticate with role 'admin'
    { role: "admin", email: "crm@trigyna.test", identifier: "crm@trigyna.test", password: "TriGyna@123", name: "Priya Verma", expectedDashboard: "/admin/dashboard", label: "crm_manager" },
    { role: "admin", email: "hrms@trigyna.test", identifier: "hrms@trigyna.test", password: "TriGyna@123", name: "Neha Singh", expectedDashboard: "/admin/dashboard", label: "hrms_manager" }
  ];

  const tokens = {};

  console.log("\n--- Suite 1: Authentication of Canonical Accounts & Role Verification ---");
  for (const acc of testAccounts) {
    const key = acc.label || acc.role;
    const res = await makeRequest("POST", "/api/v1/auth/login", {
      identifier: acc.identifier,
      password: acc.password,
    });

    assert(res.status === 200, `Login for ${key} (${acc.identifier}) returned 200 OK`);
    assert(res.body && res.body.success === true, `Login response indicated success for ${key}`);
    assert(!!(res.body && res.body.data && res.body.data.token), `JWT token received for ${key}`);
    assert(res.body.data.user.role === acc.role, `Account role for ${key} matches expected '${acc.role}'`);
    assert(!res.body.data.user.passwordHash, `Password hash is NOT exposed in login response for ${key}`);

    // Store token for subsequent RBAC tests
    tokens[key] = res.body.data.token;

    // Test /auth/me
    const meRes = await makeRequest("GET", "/api/v1/auth/me", null, tokens[key]);
    assert(meRes.status === 200, `/auth/me returned 200 OK for ${key}`);
    assert(meRes.body.data.user.email === acc.email, `/auth/me returned correct email ${acc.email}`);
    assert(!meRes.body.data.user.passwordHash, `Password hash is NOT exposed in /auth/me for ${key}`);
  }

  console.log("\n--- Suite 2: Role-Based Access Control (Permitted & Forbidden Endpoints) ---");

  // Admin access across all core and sub-modules
  const adminUsersRes = await makeRequest("GET", "/api/v1/users", null, tokens["admin"]);
  assert(adminUsersRes.status === 200, "Admin can access /api/v1/users");

  const adminReportRes = await makeRequest("GET", "/api/v1/reports/summary", null, tokens["admin"]);
  assert(adminReportRes.status === 200, "Admin can access /api/v1/reports/summary");

  const adminInvoicesRes = await makeRequest("GET", "/api/v1/invoices", null, tokens["admin"]);
  assert(adminInvoicesRes.status === 200, "Admin can access /api/v1/invoices");
  assert(Array.isArray(adminInvoicesRes.body.data.invoices) && adminInvoicesRes.body.data.invoices.length >= 8, "Admin sees all seeded invoices");

  const adminCrmRes = await makeRequest("GET", "/api/v1/crm/leads", null, tokens["admin"]);
  assert(adminCrmRes.status === 200, "Admin can access CRM leads module (/api/v1/crm/leads)");
  assert(Array.isArray(adminCrmRes.body.data.leads) && adminCrmRes.body.data.leads.length >= 12, "Admin sees all seeded CRM leads");

  const adminHrmsRes = await makeRequest("GET", "/api/v1/hrms/employees", null, tokens["admin"]);
  assert(adminHrmsRes.status === 200, "Admin can access HRMS employees module (/api/v1/hrms/employees)");
  assert(Array.isArray(adminHrmsRes.body.data.employees) && adminHrmsRes.body.data.employees.length >= 5, "Admin sees all seeded employees");

  // Owner (Super Admin) unified access
  const ownerUsersRes = await makeRequest("GET", "/api/v1/users", null, tokens["owner"]);
  assert(ownerUsersRes.status === 200, "Super Admin (Owner) has full access to /api/v1/users");

  // Patient RBAC restrictions
  const patientUsersRes = await makeRequest("GET", "/api/v1/users", null, tokens["patient"]);
  assert(patientUsersRes.status === 403, "Patient is forbidden (403) from accessing /api/v1/users");

  const patientCrmRes = await makeRequest("GET", "/api/v1/crm/leads", null, tokens["patient"]);
  assert(patientCrmRes.status === 403, "Patient is forbidden (403) from accessing /api/v1/crm/leads");

  const patientHrmsRes = await makeRequest("GET", "/api/v1/hrms/employees", null, tokens["patient"]);
  assert(patientHrmsRes.status === 403, "Patient is forbidden (403) from accessing /api/v1/hrms/employees");

  const patientInvoicesRes = await makeRequest("GET", "/api/v1/invoices", null, tokens["patient"]);
  assert(patientInvoicesRes.status === 200, "Patient can access /api/v1/invoices (scoped to self)");

  // Reception access
  const receptionAppointmentsRes = await makeRequest("GET", "/api/v1/appointments", null, tokens["reception"]);
  assert(receptionAppointmentsRes.status === 200, "Reception can access /api/v1/appointments");

  const receptionPatientsRes = await makeRequest("GET", "/api/v1/patients", null, tokens["reception"]);
  assert(receptionPatientsRes.status === 200, "Reception can access /api/v1/patients");

  const receptionInvoicesRes = await makeRequest("GET", "/api/v1/invoices", null, tokens["reception"]);
  assert(receptionInvoicesRes.status === 200, "Reception can access /api/v1/invoices (POS billing)");

  const receptionUsersRes = await makeRequest("GET", "/api/v1/users", null, tokens["reception"]);
  assert(receptionUsersRes.status === 403, "Reception is forbidden (403) from accessing /api/v1/users");

  const receptionCreateEmpRes = await makeRequest("POST", "/api/v1/hrms/employees", { name: "Test" }, tokens["reception"]);
  assert(receptionCreateEmpRes.status === 403, "Reception is forbidden (403) from creating employees");

  // Doctor access
  const doctorAppointmentsRes = await makeRequest("GET", "/api/v1/appointments", null, tokens["doctor"]);
  assert(doctorAppointmentsRes.status === 200, "Doctor can access /api/v1/appointments");

  const doctorPatientsRes = await makeRequest("GET", "/api/v1/patients", null, tokens["doctor"]);
  assert(doctorPatientsRes.status === 200, "Doctor can access /api/v1/patients");

  const doctorHrmsRes = await makeRequest("GET", "/api/v1/hrms/employees", null, tokens["doctor"]);
  assert(doctorHrmsRes.status === 403, "Doctor is forbidden (403) from accessing /api/v1/hrms/employees");

  const doctorUsersRes = await makeRequest("GET", "/api/v1/users", null, tokens["doctor"]);
  assert(doctorUsersRes.status === 403, "Doctor is forbidden (403) from accessing /api/v1/users");

  console.log("\n--- Suite 3: Notifications Feed ---");
  const notificationsRes = await makeRequest("GET", "/api/v1/notifications", null, tokens["admin"]);
  assert(notificationsRes.status === 200, "Admin can retrieve notifications feed");
  assert(Array.isArray(notificationsRes.body.data.notifications) && notificationsRes.body.data.notifications.length >= 1, "Notifications received");

  console.log("\n==================================================");
  console.log(`AUTH & RBAC TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAllSeedAccounts().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
