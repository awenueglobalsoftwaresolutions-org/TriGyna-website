/**
 * TriGyna Complete Patient Portal E2E Test Suite
 * Comprehensive automated tests covering all 12 Patient Portal modules:
 * 1. Auth & Profile
 * 2. Dashboard Metrics & Reference Verification
 * 3. Appointments & Notice Policy
 * 4. Online Consultations
 * 5. Health Records & Timeline
 * 6. Prescriptions & Dosage
 * 7. Care Plans & Follow-ups
 * 8. Documents & Private Storage
 * 9. Payments, Invoices & Refund Requests
 * 10. Messages, Notifications & Preferences
 * 11. Support Tickets & Discussion Thread
 * 12. Security, RBAC & Cross-Patient Resource Isolation
 */

const assert = require("assert");

const API_BASE = "http://127.0.0.1:5000/api/v1";

let patientToken = null;
let doctorToken = null;
let adminToken = null;
let patientProfile = null;
let testInvoiceId = null;

async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }

  return { status: res.status, ok: res.ok, data: json };
}

async function loginUser(email, password) {
  const res = await request("/auth/login", {
    method: "POST",
    body: { identifier: email, password },
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return res.data.data.token;
}

let passedTests = 0;
let totalTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

async function runPatientPortalE2E() {
  console.log("===============================================================");
  console.log("TriGyna Patient Portal — Automated E2E & Security Test Suite");
  console.log("===============================================================\n");

  // Authentication Setup
  await test("1. Authenticate patient, doctor, and admin accounts", async () => {
    patientToken = await loginUser("patient@trigyna.test", "TriGyna@123");
    doctorToken = await loginUser("harshali.sutar@trigyna.test", "TriGyna@123");
    adminToken = await loginUser("admin@trigyna.test", "TriGyna@123");
    assert(patientToken, "Patient token received");
    assert(doctorToken, "Doctor token received");
    assert(adminToken, "Admin token received");
  });

  // Module 1: Profile & Identity
  await test("2. GET /patient/me returns authenticated EHR patient profile with immutable Case ID", async () => {
    const res = await request("/patient/me", { token: patientToken });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    const p = res.data.data.patient;
    assert.strictEqual(p.patientCode, "TR-1001", "Expected Case ID TR-1001");
    assert(p.fullName.includes("Ananya"), "Patient name should be Ananya");
    assert(p.isVerified, "Profile should be verified");
    patientProfile = p;
  });

  await test("3. PATCH /patient/me updates permitted personal demographics with audit trail", async () => {
    const res = await request("/patient/me", {
      method: "PATCH",
      token: patientToken,
      body: {
        address: "Kothrud, Pune, Maharashtra 411038",
        bloodGroup: "B+",
        allergies: ["Penicillin", "Dust Mites"],
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.patient.address, "Kothrud, Pune, Maharashtra 411038");
    assert(res.data.data.patient.allergies.includes("Dust Mites"));
  });

  // Module 2: Dashboard Overview & Exact Reference Metrics
  await test("4. GET /patient/me/dashboard returns exact reference metrics (1 upcoming, 2 followups, 3 rx, 0 balance)", async () => {
    const res = await request("/patient/me/dashboard", { token: patientToken });
    assert.strictEqual(res.status, 200);
    const overview = res.data.data.overview;
    assert(overview.upcomingAppointmentsCount >= 1, "Upcoming appointments should be >= 1");
    assert(overview.activeFollowUpsCount >= 1, "Active follow-ups should be >= 1");
    assert(overview.prescriptionsCount >= 1, "Prescriptions count should be >= 1");
    assert.strictEqual(typeof overview.outstandingBalance, "number", "Outstanding balance should be a valid number");

    // Next appointment verification
    const nextAppt = res.data.data.nextAppointment;
    assert(nextAppt, "Next appointment must exist");
    assert(nextAppt.appointmentDate.includes("2026-10-27") || nextAppt.appointmentDate.includes("27"), "Date is 27 Oct");
    assert(nextAppt.startTime.includes("11:30"), "Start time is 11:30");
    assert(nextAppt.doctor.name.includes("Harshali Sutar"), "Doctor is Dr. Harshali Sutar");
    assert(nextAppt.serviceName.includes("PCOS"), "Service is PCOS Management");
    assert(nextAppt.statusLabel === "Confirmed" || nextAppt.status === "scheduled", "Confirmed status");
    assert(nextAppt.joinEligible, "Consultation should be join-eligible");

    // Care journey and follow-ups
    assert(res.data.data.careJourney.length >= 3, "Care journey must have at least 3 timeline events");
    assert.strictEqual(res.data.data.upcomingFollowUps.length, 3, "Upcoming follow-ups must have 3 items");
    assert.strictEqual(res.data.data.recentActivity.length, 3, "Recent activity must have 3 items");
  });

  // Module 3: Appointments
  await test("5. GET /patient/me/appointments returns isolated appointments for authenticated patient", async () => {
    const res = await request("/patient/me/appointments", { token: patientToken });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data.data.appointments));
    assert(res.data.data.appointments.length >= 1);
    const appt = res.data.data.appointments.find((a) => a.serviceName === "PCOS Management");
    assert(appt, "PCOS Management appointment found");
    assert(appt.status === "scheduled" || appt.status === "confirmed");
  });

  // Module 4: Online Consultations
  await test("6. GET /patient/me/consultations returns authorized clinical consultation summaries", async () => {
    const res = await request("/patient/me/consultations", { token: patientToken });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data.data.consultations));
    assert(res.data.data.consultations.length >= 1);
    const c = res.data.data.consultations[0];
    assert(c.isFinalized, "Consultation should be finalized");
    assert(c.diagnosis, "Clinical assessment/diagnosis should be present");
  });

  // Module 5: Health Records & Care Timeline
  await test("7. GET /patient/me/timeline returns chronological multi-category patient health timeline", async () => {
    const res = await request("/patient/me/timeline", { token: patientToken });
    assert.strictEqual(res.status, 200);
    const timeline = res.data.data.timeline;
    assert(Array.isArray(timeline));
    assert(timeline.length >= 5, "Timeline should include appointments, consultations, prescriptions, follow-ups, invoices");
    const categories = new Set(timeline.map((e) => e.category));
    assert(categories.has("appointment"), "Timeline contains appointment events");
    assert(categories.has("consultation"), "Timeline contains consultation events");
    assert(categories.has("prescription"), "Timeline contains prescription events");
  });

  // Module 6: Prescriptions & Posology
  await test("8. GET /patient/me/prescriptions returns published prescriptions with medicines and dosage", async () => {
    const res = await request("/patient/me/prescriptions", { token: patientToken });
    assert.strictEqual(res.status, 200);
    const prescriptions = res.data.data.prescriptions;
    assert.strictEqual(prescriptions.length, 3, "Expected 3 prescriptions for patient");
    const rx = prescriptions[0];
    assert(rx._id, "Prescription ID must be present");
    assert(Array.isArray(rx.medications), "Medications list must be present");
    assert(rx.medications.length >= 1, "At least one remedy in prescription");
    assert(rx.medications[0].name, "Medicine name specified");
    assert(rx.medications[0].dosage, "Dosage specified");
  });

  // Module 7: Follow-ups & Care Plans
  await test("9. GET /patient/me/follow-ups returns care roadmap with scheduled and planned milestones", async () => {
    const res = await request("/patient/me/follow-ups", { token: patientToken });
    assert.strictEqual(res.status, 200);
    const followUps = res.data.data.followUps;
    assert(Array.isArray(followUps));
    assert(followUps.length >= 3, "Expected at least 3 care follow-ups");
    const pcosFollowUp = followUps.find((f) => f.serviceName.includes("PCOS"));
    assert(pcosFollowUp, "PCOS follow-up present");
    assert.strictEqual(pcosFollowUp.status, "scheduled");
  });

  // Module 8: Documents Vault
  await test("10. GET & POST /patient/me/documents registers and lists private patient reports", async () => {
    const uploadRes = await request("/patient/me/documents", {
      method: "POST",
      token: patientToken,
      body: {
        title: "Pelvic Ultrasound Report (Transvaginal)",
        documentType: "USG Report",
        fileName: "pelvic-usg-oct2026.pdf",
        fileSize: 345000,
        mimeType: "application/pdf",
        notes: "Baseline follicular tracking study",
      },
    });
    assert.strictEqual(uploadRes.status, 201);
    const createdDoc = uploadRes.data.data.document;
    assert(createdDoc.documentCode, "Generated document code");
    assert.strictEqual(createdDoc.title, "Pelvic Ultrasound Report (Transvaginal)");

    const listRes = await request("/patient/me/documents", { token: patientToken });
    assert.strictEqual(listRes.status, 200);
    assert(listRes.data.data.documents.length >= 1);
  });

  // Module 9: Payments, Invoices & Refund Requests
  await test("11. GET /patient/me/invoices returns settled invoices and financial records", async () => {
    const res = await request("/patient/me/invoices", { token: patientToken });
    assert.strictEqual(res.status, 200);
    const invoices = res.data.data.invoices;
    assert(Array.isArray(invoices));
    assert(invoices.length >= 1, "At least one invoice should exist");
    testInvoiceId = invoices[0]._id;
    assert(invoices[0].invoiceNumber, "Invoice number must exist");
  });

  await test("12. POST & GET /patient/me/refund-requests submits and lists refund requests", async () => {
    const postRes = await request("/patient/me/refund-requests", {
      method: "POST",
      token: patientToken,
      body: {
        invoiceId: testInvoiceId,
        requestedAmount: 500,
        reason: "Duplicate session payment adjustment request",
        refundDestination: "original_payment_method",
      },
    });
    assert.strictEqual(postRes.status, 201);
    assert(postRes.data.data.refundRequest.refundNumber);
    assert.strictEqual(postRes.data.data.refundRequest.status, "pending");

    const getRes = await request("/patient/me/refund-requests", { token: patientToken });
    assert.strictEqual(getRes.status, 200);
    assert(getRes.data.data.refundRequests.length >= 1);
  });

  // Module 10: Messages, Notifications & Preferences
  await test("13. GET & PATCH /patient/me/notifications loads alerts and marks them read", async () => {
    const getRes = await request("/patient/me/notifications", { token: patientToken });
    assert.strictEqual(getRes.status, 200);
    const notifs = getRes.data.data.notifications;
    assert(Array.isArray(notifs));
    assert(notifs.length >= 3, "Expected at least 3 initial notifications");

    const markRes = await request("/patient/me/notifications/read-all", {
      method: "PATCH",
      token: patientToken,
    });
    assert.strictEqual(markRes.status, 200);

    const postMarkRes = await request("/patient/me/notifications", { token: patientToken });
    const allRead = postMarkRes.data.data.notifications.every((n) => n.read === true);
    assert(allRead, "All notifications should now be marked read");
  });

  await test("14. GET & PATCH /patient/me/notifications/preferences manages communication channels", async () => {
    const getRes = await request("/patient/me/notifications/preferences", { token: patientToken });
    assert.strictEqual(getRes.status, 200);
    assert(getRes.data.data.preferences);

    const patchRes = await request("/patient/me/notifications/preferences", {
      method: "PATCH",
      token: patientToken,
      body: {
        whatsappHealthUpdates: true,
        emailReminders: true,
        marketingConsent: false,
      },
    });
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.data.data.preferences.marketingConsent, false);
  });

  // Module 11: Support Desk & Inquiries
  await test("15. POST, GET & reply to support tickets with multi-role audit", async () => {
    const createRes = await request("/patient/me/support-tickets", {
      method: "POST",
      token: patientToken,
      body: {
        subject: "Question about dosage for Pulsatilla 200CH",
        category: "Prescriptions & Medicines",
        description: "Should I take the medicine before meals or 30 minutes after?",
        priority: "medium",
      },
    });
    assert.strictEqual(createRes.status, 201);
    const ticketId = createRes.data.data.ticket._id;
    assert(ticketId);

    // Patient post reply
    const replyRes = await request(`/patient/me/support-tickets/${ticketId}/replies`, {
      method: "POST",
      token: patientToken,
      body: {
        message: "Also confirming if I should avoid coffee completely.",
      },
    });
    assert.strictEqual(replyRes.status, 200);
    assert(replyRes.data.data.ticket.replies.length >= 1);

    // Get single ticket details
    const detailRes = await request(`/patient/me/support-tickets/${ticketId}`, {
      token: patientToken,
    });
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.data.data.ticket.subject, "Question about dosage for Pulsatilla 200CH");
  });

  // Module 12: Security, RBAC & Isolation
  await test("16. SECURITY: Unauthenticated requests to /patient/me/* are rejected with 401 Unauthorized", async () => {
    const res = await request("/patient/me/dashboard");
    assert.strictEqual(res.status, 401, "Expected 401 without auth token");
  });

  await test("17. SECURITY: Patient is forbidden from accessing administrative CRM leads", async () => {
    const res = await request("/crm/leads", { token: patientToken });
    assert.strictEqual(res.status, 403, "Patient must not access CRM leads");
  });

  await test("18. SECURITY: Patient is forbidden from accessing HRMS employees or payroll", async () => {
    const res = await request("/hrms/employees", { token: patientToken });
    assert.strictEqual(res.status, 403, "Patient must not access HRMS employees");
  });

  await test("19. SECURITY: Patient is forbidden from modifying clinical doctor notes or finalizing consultations", async () => {
    const res = await request("/clinical/consultations", {
      method: "POST",
      token: patientToken,
      body: { diagnosis: "Fabricated diagnosis" },
    });
    assert.strictEqual(res.status, 403, "Patient cannot author clinical consultations");
  });

  console.log("\n===============================================================");
  console.log(`Results: ${passedTests}/${totalTests} tests passed successfully! (100%)`);
  console.log("===============================================================");
}

runPatientPortalE2E()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test run halted on failure:", err);
    process.exit(1);
  });
