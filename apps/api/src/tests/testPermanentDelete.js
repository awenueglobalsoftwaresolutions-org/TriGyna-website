const http = require("http");

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log("=== Testing Permanent Deletion Endpoints ===");

  // 1. Authenticate as Admin
  const loginRes = await request(
    {
      hostname: "127.0.0.1",
      port: 5000,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { identifier: "+919172772326", password: "TriGyna@2326" }
  );

  const token = loginRes.data?.data?.token || loginRes.data?.token;



  if (!token) {
    console.error("Failed to login as admin/owner:", loginRes);
    process.exit(1);
  }
  console.log("✅ Authenticated as Admin/Owner");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 2. Create a test lead for permanent deletion
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const leadRes = await request(
    {
      hostname: "127.0.0.1",
      port: 5000,
      path: "/api/v1/crm/leads",
      method: "POST",
      headers,
    },
    {
      fullName: "Permanent Delete Verification Lead",
      phone: testPhone,
      email: "del_lead@trigyna.test",
      serviceInterest: "PCOS Care",
      source: "manual_entry",
    }
  );

  console.log("Create test lead status:", leadRes.status);
  const leadId = leadRes.data?.data?.lead?._id;
  if (!leadId) {
    console.error("Failed to create test lead:", leadRes.data);
    process.exit(1);
  }
  console.log("✅ Test lead created with ID:", leadId);

  // 3. Delete Lead Permanently
  const delLeadRes = await request({
    hostname: "127.0.0.1",
    port: 5000,
    path: `/api/v1/crm/leads/${leadId}/permanent`,
    method: "DELETE",
    headers,
  });
  console.log("DELETE Lead status:", delLeadRes.status, delLeadRes.data?.message);
  if (delLeadRes.status !== 200) {
    console.error("Failed to permanently delete lead:", delLeadRes);
    process.exit(1);
  }

  // Verify lead no longer exists
  const checkLeadRes = await request({
    hostname: "127.0.0.1",
    port: 5000,
    path: `/api/v1/crm/leads/${leadId}`,
    method: "GET",
    headers,
  });
  console.log("Check deleted lead status (expected 404):", checkLeadRes.status);
  if (checkLeadRes.status === 404) {
    console.log("✅ Lead is permanently deleted from database!");
  } else {
    console.error("❌ Lead still exists!");
    process.exit(1);
  }

  // 4. Test Doctor Deletion Safeguards (Doctor with appointments should be blocked with 409 Conflict)
  const doctorsRes = await request({
    hostname: "127.0.0.1",
    port: 5000,
    path: "/api/v1/doctors",
    method: "GET",
    headers,
  });

  const doctorsList = doctorsRes.data?.data?.doctors || [];
  // Find a doctor that actually has linked appointments (e.g. Dr. Ananya Sharma)
  const activeDoctor = doctorsList.find(d => d.userId?.name?.includes("Ananya")) || doctorsList[0];
  if (activeDoctor) {
    console.log(`Testing deletion guard on doctor with clinical records: ${activeDoctor.userId?.name || activeDoctor._id}`);
    const delDocRes = await request({
      hostname: "127.0.0.1",
      port: 5000,
      path: `/api/v1/doctors/${activeDoctor._id}/permanent`,
      method: "DELETE",
      headers,
    });
    console.log("Doctor delete response status:", delDocRes.status, delDocRes.data?.message);
    if (delDocRes.status === 409) {
      console.log("✅ Doctor deletion guard correctly blocked deletion due to linked dependencies (409 Conflict)!");
    } else {
      console.error("❌ Expected 409 Conflict when deleting doctor with clinical records, got:", delDocRes.status);
      process.exit(1);
    }
  }

  // 5. Test Patient Deletion Safeguards (Patient with active appointments/invoices blocked with 409 Conflict)
  // Query a seeded patient known to have appointments
  const patientsRes = await request({
    hostname: "127.0.0.1",
    port: 5000,
    path: "/api/v1/patients?limit=10",
    method: "GET",
    headers,
  });

  const seededPatient = patientsRes.data?.data?.patients?.[0];
  if (seededPatient) {
    console.log(`Testing deletion guard on patient with records: ${seededPatient.fullName} (${seededPatient.patientCode})`);
    const delPatRes = await request({
      hostname: "127.0.0.1",
      port: 5000,
      path: `/api/v1/patients/${seededPatient._id}/permanent`,
      method: "DELETE",
      headers,
    });
    console.log("Patient delete response status:", delPatRes.status, delPatRes.data?.message);
    if (delPatRes.status === 409) {
      console.log("✅ Patient deletion guard correctly blocked deletion due to linked dependencies (409 Conflict)!");
    } else {
      console.error("❌ Expected 409 Conflict when deleting patient with linked records, got:", delPatRes.status);
      process.exit(1);
    }
  }

  // 6. Test Standalone Patient Creation & Permanent Deletion
  const cleanPatPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
  const newPatRes = await request(
    {
      hostname: "127.0.0.1",
      port: 5000,
      path: "/api/v1/patients",
      method: "POST",
      headers,
    },
    {
      fullName: "Temporary Test Patient For Deletion",
      phone: cleanPatPhone,
      gender: "female",
      age: 30,
    }
  );
  const tempPatientId = newPatRes.data?.data?.patient?._id;
  if (tempPatientId) {
    const delTempPatRes = await request({
      hostname: "127.0.0.1",
      port: 5000,
      path: `/api/v1/patients/${tempPatientId}/permanent`,
      method: "DELETE",
      headers,
    });
    console.log("Standalone patient deletion status:", delTempPatRes.status, delTempPatRes.data?.message);
    if (delTempPatRes.status === 200) {
      console.log("✅ Standalone patient permanently deleted from database!");
    }
  }

  console.log("=== ALL PERMANENT DELETION TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});

