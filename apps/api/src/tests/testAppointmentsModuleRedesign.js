const http = require("http");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const SlotReservation = require("../modules/appointments/slot-reservation.model");

let server;
let baseUrl;
let adminToken;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            // Keep as string (e.g. CSV)
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runAppointmentTests() {
  console.log("==================================================");
  console.log("TriGyna — Appointments & Schedule Redesign Test Suite");
  console.log("==================================================");

  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna");
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestRunner] Server listening on ${baseUrl}`);

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

  try {
    // 1. Authenticate as Admin/Owner
    const loginRes = await request("POST", "/api/v1/auth/login", {
      identifier: process.env.TEST_OWNER_PHONE || "+919172772326",
      password: process.env.TEST_OWNER_PASSWORD || "TriGyna@2326",
    });
    assert(loginRes.status === 200 && loginRes.data?.data?.token, "Owner login successful");
    adminToken = loginRes.data?.data?.token;

    // 2. Fetch Stats Endpoint
    const statsRes = await request("GET", "/api/v1/appointments/stats?date=2026-10-31", null, adminToken);
    assert(statsRes.status === 200, "GET /api/v1/appointments/stats returns 200");
    assert(typeof statsRes.data?.data?.totalAppointments === "number", "Total appointments count is a valid number");
    assert(statsRes.data?.data?.distribution?.completed?.percentage !== undefined, "Appointment distribution percentages computed");

    // 3. Fetch Calendar Grid Endpoint
    const calRes = await request("GET", "/api/v1/appointments/calendar?date=2026-10-31", null, adminToken);
    assert(calRes.status === 200, "GET /api/v1/appointments/calendar returns 200");
    assert(Array.isArray(calRes.data?.data?.doctors), "Doctors array returned for calendar columns");
    assert(Array.isArray(calRes.data?.data?.appointments), "Appointments array returned for calendar grid");

    // 4. Find active doctor & patient for booking
    const doctor = await Doctor.findOne({ status: "active" });
    const doctor2 = await Doctor.findOne({ status: "active", _id: { $ne: doctor._id } });
    const patient = await Patient.findOne();
    assert(doctor && patient, "Active doctor and patient records present in MongoDB");

    // 5. Atomic Booking Test
    const testDate = "2026-11-28";
    await Appointment.deleteMany({ appointmentDate: testDate });
    await SlotReservation.deleteMany({ appointmentDate: testDate });
    const bookRes1 = await request(
      "POST",
      "/api/v1/appointments",
      {
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        serviceName: "PCOD/PCOS Care",
        appointmentDate: testDate,
        startTime: "11:00",
        endTime: "11:30",
        mode: "Online Video Consultation",
        notes: "Automated test booking",
      },
      adminToken
    );
    assert(bookRes1.status === 201, "Appointment booked successfully with 201 Created");
    const createdApptId = bookRes1.data?.data?.appointment?._id;
    assert(createdApptId, "Generated unique appointment in MongoDB");

    // 6. Concurrency Conflict Prevention Test
    const conflictRes = await request(
      "POST",
      "/api/v1/appointments",
      {
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        serviceName: "PCOD/PCOS Care",
        appointmentDate: testDate,
        startTime: "11:00",
        endTime: "11:30",
      },
      adminToken
    );
    assert(conflictRes.status === 409, "Double booking same doctor at same slot rejected with 409 Conflict");

    // 7. Parallel Booking for different doctor succeeds
    if (doctor2) {
      const parallelRes = await request(
        "POST",
        "/api/v1/appointments",
        {
          patientId: patient._id.toString(),
          doctorId: doctor2._id.toString(),
          serviceName: "Skin & Hair",
          appointmentDate: testDate,
          startTime: "11:00",
          endTime: "11:30",
        },
        adminToken
      );
      assert(parallelRes.status === 201, "Parallel booking for different doctor allowed with 201 Created");
    }

    // 8. Check-In Lifecycle Action
    const checkInRes = await request("POST", `/api/v1/appointments/${createdApptId}/check-in`, {}, adminToken);
    assert(checkInRes.status === 200, "POST /:id/check-in transitions status to checked_in");

    // 9. Start Consultation Lifecycle Action
    const startRes = await request("POST", `/api/v1/appointments/${createdApptId}/start-consultation`, {}, adminToken);
    assert(startRes.status === 200, "POST /:id/start-consultation transitions status to in_consultation");

    // 10. Complete Appointment Lifecycle Action
    const completeRes = await request("POST", `/api/v1/appointments/${createdApptId}/complete`, {}, adminToken);
    assert(completeRes.status === 200, "POST /:id/complete transitions status to completed");

    // 11. Reschedule Appointment Test
    const reschedAppt = await request(
      "POST",
      "/api/v1/appointments",
      {
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        serviceName: "Skin & Hair",
        appointmentDate: testDate,
        startTime: "14:00",
        endTime: "14:30",
      },
      adminToken
    );
    const reschedId = reschedAppt.data?.data?.appointment?._id;
    const rescheduleActionRes = await request(
      "POST",
      `/api/v1/appointments/${reschedId}/reschedule`,
      {
        appointmentDate: testDate,
        startTime: "15:00",
        endTime: "15:30",
      },
      adminToken
    );
    assert(rescheduleActionRes.status === 200, "POST /:id/reschedule moved appointment to new slot");

    // 12. Video Meeting Link Update Test
    const videoLinkRes = await request(
      "PUT",
      `/api/v1/appointments/${createdApptId}/meeting-link`,
      {
        provider: "google_meet",
        meetingLink: "https://meet.google.com/abc-defg-hij",
      },
      adminToken
    );
    assert(videoLinkRes.status === 200, "PUT /:id/meeting-link attached Google Meet link");

    // 13. Cancellation Test
    const cancelRes = await request(
      "POST",
      `/api/v1/appointments/${reschedId}/cancel`,
      { reason: "Patient had personal emergency" },
      adminToken
    );
    assert(cancelRes.status === 200, "POST /:id/cancel marked appointment as cancelled");
    const checkCancelledInDb = await Appointment.findById(reschedId);
    assert(checkCancelledInDb.status === "cancelled", "Appointment persisted as cancelled without document deletion");

    // 14. CSV Export Test
    const exportRes = await request("GET", `/api/v1/appointments/export?date=${testDate}`, null, adminToken);
    assert(exportRes.status === 200, "GET /api/v1/appointments/export returns 200");
    assert(typeof exportRes.data === "string" && exportRes.data.includes("Appointment Code"), "CSV export contains headers");

  } catch (err) {
    console.error("Test execution failed:", err);
    failed++;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    console.log("==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
    process.exit(failed > 0 ? 1 : 0);
  }
}

runAppointmentTests();
