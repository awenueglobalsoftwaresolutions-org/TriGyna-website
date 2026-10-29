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

async function runResourceOwnershipTests() {
  console.log("==================================================");
  console.log("TriGyna — Backend Resource Ownership & Security Scoping Tests");
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

  // 1. Authenticate test users
  const adminLogin = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "admin@trigyna.test",
    password: "TriGyna@123",
  });
  const adminToken = adminLogin.body.data.token;

  const doctor1Login = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "doctor@trigyna.test",
    password: "TriGyna@123",
  });
  const doctor1Token = doctor1Login.body.data.token;

  const doctor2Login = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "harshali.sutar@trigyna.test",
    password: "TriGyna@123",
  });
  const doctor2Token = doctor2Login.body.data.token;

  const receptionLogin = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "reception@trigyna.test",
    password: "TriGyna@123",
  });
  const receptionToken = receptionLogin.body.data.token;

  const patientLogin = await makeRequest("POST", "/api/v1/auth/login", {
    identifier: "patient@trigyna.test",
    password: "TriGyna@123",
  });
  const patientToken = patientLogin.body.data.token;

  // Retrieve patients via admin with sufficient limit
  const patientsRes = await makeRequest("GET", "/api/v1/patients?limit=200", null, adminToken);
  const allPatients = patientsRes.body?.data?.patients || [];
  let myPatient = allPatients.find((p) => p.email === "patient@trigyna.test" || p.phone === "9000000006");
  if (!myPatient) {
    const singleRes = await makeRequest("GET", "/api/v1/patients?search=9000000006", null, adminToken);
    myPatient = singleRes.body?.data?.patients?.[0];
  }
  const otherPatient = allPatients.find((p) => p.phone !== "9000000006" && p._id?.toString() !== myPatient?._id?.toString());

  // Retrieve invoices via admin
  const invoicesRes = await makeRequest("GET", "/api/v1/invoices?limit=200", null, adminToken);
  const allInvoices = invoicesRes.body?.data?.invoices || [];
  const myPatientIdStr = myPatient?._id?.toString() || "";
  const otherPatientInvoice = allInvoices.find(
    (inv) => inv.patientId && (inv.patientId._id ? inv.patientId._id.toString() : inv.patientId.toString()) !== myPatientIdStr
  );

  console.log("\n--- Suite 1: Patient Data Isolation & Cross-Patient Boundary Checks ---");

  // Patient accesses another patient's profile by ID
  if (otherPatient) {
    const crossPatientRes = await makeRequest("GET", `/api/v1/patients/${otherPatient._id}`, null, patientToken);
    assert(
      crossPatientRes.status === 403,
      `Patient is rejected with 403 Forbidden when requesting other patient profile (${crossPatientRes.status})`
    );
  }

  // Patient accesses another patient's invoice by ID
  if (otherPatientInvoice) {
    const crossInvoiceRes = await makeRequest("GET", `/api/v1/invoices/${otherPatientInvoice._id}`, null, patientToken);
    assert(
      crossInvoiceRes.status === 403,
      `Patient is rejected with 403 Forbidden when requesting other patient invoice (${crossInvoiceRes.status})`
    );
  }

  // Patient list query scoping
  const patientInvoicesList = await makeRequest("GET", "/api/v1/invoices", null, patientToken);
  assert(patientInvoicesList.status === 200, "Patient can list own invoices");
  const allBelongToPatient = patientInvoicesList.body.data.invoices.every(
    (inv) => inv.patientId && inv.patientId._id.toString() === myPatient._id.toString()
  );
  assert(allBelongToPatient, "All returned invoices strictly belong to authenticated patient");

  console.log("\n--- Suite 2: Reception Boundaries on Clinical Notes & Prescriptions ---");
  const recConsultDraftRes = await makeRequest(
    "POST",
    "/api/v1/clinical/consultations",
    { appointmentId: "671912345678901234567890", diagnosis: "Tampered" },
    receptionToken
  );
  assert(
    recConsultDraftRes.status === 403,
    `Reception is forbidden (403) from saving consultation drafts (${recConsultDraftRes.status})`
  );

  const recPrescriptionRes = await makeRequest(
    "POST",
    "/api/v1/clinical/prescriptions",
    { consultationId: "671912345678901234567890", medications: [] },
    receptionToken
  );
  assert(
    recPrescriptionRes.status === 403,
    `Reception is forbidden (403) from writing prescriptions (${recPrescriptionRes.status})`
  );

  console.log("\n--- Suite 3: Clinical Record Lock & Legal Amendment Audit ---");
  // Get an appointment for Doctor 1
  const apptsRes = await makeRequest("GET", "/api/v1/appointments", null, doctor1Token);
  const doc1Appt = apptsRes.body.data.appointments[0];

  if (doc1Appt) {
    // Check consultation for appointment
    const consultRes = await makeRequest(
      "GET",
      `/api/v1/clinical/consultations/appointment/${doc1Appt._id}`,
      null,
      doctor1Token
    );

    let consult = consultRes.body.data.consultation;
    if (!consult) {
      // Create draft
      const draftRes = await makeRequest(
        "POST",
        "/api/v1/clinical/consultations",
        {
          appointmentId: doc1Appt._id,
          chiefComplaints: "Mild allergic reaction",
          diagnosis: "Seasonal Allergies",
          treatmentPlan: "Apis Mellifica 30C",
        },
        doctor1Token
      );
      consult = draftRes.body.data.consultation;
    }

    if (consult) {
      // Finalize if not already finalized
      if (!consult.isFinalized) {
        const finRes = await makeRequest(
          "POST",
          `/api/v1/clinical/consultations/${consult._id}/finalize`,
          {},
          doctor1Token
        );
        assert(finRes.status === 200, "Doctor 1 finalizes consultation successfully");
      }

      // Attempt to edit finalized consultation directly -> must fail
      const editLockedRes = await makeRequest(
        "POST",
        "/api/v1/clinical/consultations",
        {
          appointmentId: doc1Appt._id,
          diagnosis: "Direct edit attempt on locked record",
        },
        doctor1Token
      );
      assert(
        editLockedRes.status === 409,
        `Direct edit on finalized consultation is rejected with 409 Conflict (${editLockedRes.status})`
      );

      // Documented amendment workflow
      const amendRes = await makeRequest(
        "POST",
        `/api/v1/clinical/consultations/${consult._id}/amendments`,
        {
          reason: "Patient reported new symptom onset after phone follow-up",
          newTreatmentPlan: "Apis Mellifica 200C updated dosage",
        },
        doctor1Token
      );
      assert(amendRes.status === 200, "Clinical amendment with mandatory reason recorded successfully");
      assert(
        amendRes.body.data.consultation.amendments.length >= 1,
        "Amendment addendum appended to consultation record"
      );
    }
  }

  console.log("\n--- Suite 4: Atomic Appointment Slot Concurrency Conflict ---");
  // Attempt to book the same slot twice
  const slotDate = "2026-11-15";
  const slotTime = "11:00";
  const doctorsList = await makeRequest("GET", "/api/v1/doctors", null, adminToken);
  const testDoctor = doctorsList.body.data.doctors[0];

  const booking1 = await makeRequest(
    "POST",
    "/api/v1/appointments",
    {
      patientId: myPatient._id,
      doctorId: testDoctor._id,
      appointmentDate: slotDate,
      startTime: slotTime,
      serviceName: "Homoeopathy Initial",
      mode: "In-Clinic Consultation",
    },
    adminToken
  );

  // If already booked from a previous run or newly created
  if (booking1.status === 201) {
    assert(booking1.status === 201, "First appointment booking succeeds (201 Created)");

    // Second booking attempt for identical slot
    const booking2 = await makeRequest(
      "POST",
      "/api/v1/appointments",
      {
        patientId: otherPatient ? otherPatient._id : myPatient._id,
        doctorId: testDoctor._id,
        appointmentDate: slotDate,
        startTime: slotTime,
        serviceName: "Second Booking Attempt",
      },
      adminToken
    );
    assert(
      booking2.status === 409,
      `Concurrent double-booking rejected with 409 Conflict (${booking2.status})`
    );
  } else {
    assert(
      booking1.status === 409,
      `Pre-existing slot conflict correctly rejected with 409 Conflict (${booking1.status})`
    );
  }

  console.log("\n==================================================");
  console.log(`RESOURCE OWNERSHIP TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runResourceOwnershipTests().catch((err) => {
  console.error("Resource ownership tests failed:", err);
  process.exit(1);
});
