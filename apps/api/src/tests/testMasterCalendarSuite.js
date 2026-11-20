const http = require("http");
const mongoose = require("mongoose");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");
const Appointment = require("../modules/appointments/appointment.model");
const FollowUp = require("../modules/clinical/followup.model");
const Doctor = require("../modules/doctors/doctor.model");
const LeaveRequest = require("../modules/hrms/leave.model");
const Task = require("../modules/tasks/task.model");
const User = require("../modules/users/user.model");

let server;
let BASE_URL = "http://127.0.0.1:5000";

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
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runMasterCalendarSuite() {
  console.log("==================================================");
  console.log("TriGyna Master Institutional Calendar — Backend Test Suite");
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

  try {
    await connectDB();
    server = app.listen(0);
    const port = server.address().port;
    BASE_URL = `http://127.0.0.1:${port}`;
    console.log(`[TestServer] Ephemeral server running at ${BASE_URL}`);

    // 1. Authenticate Admin
    const loginRes = await makeRequest("POST", "/api/v1/auth/login", {
      identifier: "admin@trigyna.test",
      password: "TriGyna@123",
    });
    assert(loginRes.status === 200 && loginRes.body.data.token, "Admin authenticated successfully");
    const adminToken = loginRes.body.data.token;

    // 2. GET /api/v1/calendar/stats for November 2026 (KPI Cards)
    const statsRes = await makeRequest("GET", "/api/v1/calendar/stats?year=2026&month=10", null, adminToken);
    assert(
      statsRes.status === 200 &&
        statsRes.body.data.appointments !== undefined &&
        statsRes.body.data.followups !== undefined &&
        statsRes.body.data.doctorSessions !== undefined &&
        statsRes.body.data.staffLeaves !== undefined &&
        statsRes.body.data.otherTasks !== undefined,
      `Calendar KPI metrics retrieved (Appts: ${statsRes.body.data.appointments.total}, Follow-ups: ${statsRes.body.data.followups.total}, Sessions: ${statsRes.body.data.doctorSessions.total}, Leaves: ${statsRes.body.data.staffLeaves.total}, Other Tasks: ${statsRes.body.data.otherTasks.total})`
    );

    // 3. GET /api/v1/calendar/events for November 2026
    const eventsRes = await makeRequest(
      "GET",
      "/api/v1/calendar/events?startDate=2026-11-01&endDate=2026-11-30",
      null,
      adminToken
    );
    assert(
      eventsRes.status === 200 &&
        Array.isArray(eventsRes.body.data.events) &&
        eventsRes.body.data.events.length > 0 &&
        eventsRes.body.data.summary,
      `Unified events aggregated for November 2026 (${eventsRes.body.data.events.length} total events across 5 streams)`
    );

    // Verify event structure
    const sampleEvent = eventsRes.body.data.events[0];
    assert(
      sampleEvent.id &&
        sampleEvent.sourceType &&
        sampleEvent.category &&
        sampleEvent.color &&
        sampleEvent.date &&
        sampleEvent.startTime,
      `Event structure verified (Sample: [${sampleEvent.category}] ${sampleEvent.title} on ${sampleEvent.date} at ${sampleEvent.startTime})`
    );

    // 4. GET /api/v1/calendar/agenda for 2026-11-01 (Upcoming Today)
    const agendaRes = await makeRequest("GET", "/api/v1/calendar/agenda?date=2026-11-01", null, adminToken);
    assert(
      agendaRes.status === 200 && Array.isArray(agendaRes.body.data.events),
      `Agenda for 2026-11-01 retrieved (${agendaRes.body.data.events.length} events today)`
    );

    // 5. GET /api/v1/calendar/streams
    const streamsRes = await makeRequest(
      "GET",
      "/api/v1/calendar/streams?startDate=2026-11-01&endDate=2026-11-30",
      null,
      adminToken
    );
    assert(
      streamsRes.status === 200 &&
        streamsRes.body.data.streams.appointments !== undefined &&
        streamsRes.body.data.streams.followups !== undefined &&
        streamsRes.body.data.streams.doctorSessions !== undefined,
      `Calendar streams counts retrieved (Appts: ${streamsRes.body.data.streams.appointments}, Follow-ups: ${streamsRes.body.data.streams.followups})`
    );

    // 6. POST /api/v1/calendar/validate-schedule (Conflict Check)
    const activeDoc = await Doctor.findOne({ status: "active" });
    const conflictRes = await makeRequest(
      "POST",
      "/api/v1/calendar/validate-schedule",
      {
        doctorId: activeDoc._id.toString(),
        date: "2026-11-01",
        startTime: "03:00 AM", // Should conflict with outside clinic working hours
        endTime: "03:30 AM",
      },
      adminToken
    );
    assert(
      conflictRes.status === 200 && conflictRes.body.data.hasConflict === true,
      "Conflict detector flagged booking outside doctor working hours"
    );

    // 7. POST /api/v1/calendar/events (Create Event Workflow)
    const patient = await mongoose.model("Patient").findOne();
    const createRes = await makeRequest(
      "POST",
      "/api/v1/calendar/events",
      {
        eventType: "appointment",
        title: "Master Calendar Test Booking",
        date: "2026-11-28",
        startTime: "11:00 AM",
        endTime: "11:30 AM",
        doctorId: activeDoc._id.toString(),
        patientId: patient._id.toString(),
        serviceName: "Hormonal Balance & PCOS",
        mode: "In-Clinic Consultation",
        description: "Scheduled via automated Master Calendar test suite",
        overrideConflicts: true,
      },
      adminToken
    );
    assert(
      createRes.status === 201 && createRes.body.data.event.id.startsWith("appt-"),
      `Appointment created through Master Calendar (${createRes.body.data.event.referenceCode})`
    );
    const createdEventId = createRes.body.data.event.id;

    // 8. GET /api/v1/calendar/events/:eventId (Rich Detail)
    const detailRes = await makeRequest("GET", `/api/v1/calendar/events/${createdEventId}`, null, adminToken);
    assert(
      detailRes.status === 200 && detailRes.body.data.event.referenceCode,
      `Event detail drawer payload retrieved (${detailRes.body.data.event.title})`
    );

    // 9. POST /api/v1/calendar/events/:eventId/reschedule
    const reschedRes = await makeRequest(
      "POST",
      `/api/v1/calendar/events/${createdEventId}/reschedule`,
      {
        newDate: "2026-11-29",
        newStartTime: "02:00 PM",
        newEndTime: "02:30 PM",
        reason: "Patient requested afternoon consultation",
      },
      adminToken
    );
    assert(
      reschedRes.status === 200 && reschedRes.body.data.event.date === "2026-11-29",
      "Event successfully rescheduled to new date in underlying Appointment collection"
    );

    // Verify in database that appointmentDate actually changed
    const rawApptId = createdEventId.replace("appt-", "");
    const updatedAppt = await Appointment.findById(rawApptId);
    assert(
      updatedAppt.appointmentDate === "2026-11-29" && updatedAppt.status === "rescheduled",
      "Real MongoDB record updated with new date and rescheduled status"
    );

    // 10. POST /api/v1/calendar/events/:eventId/cancel
    const cancelRes = await makeRequest(
      "POST",
      `/api/v1/calendar/events/${createdEventId}/cancel`,
      { reason: "Routine test cancellation" },
      adminToken
    );
    assert(cancelRes.status === 200 && cancelRes.body.data.success, "Event safely cancelled via calendar endpoint");

    const cancelledAppt = await Appointment.findById(rawApptId);
    assert(cancelledAppt.status === "cancelled", "Underlying appointment status changed to 'cancelled' in MongoDB");

    // 11. GET /api/v1/calendar/export (CSV & ICS)
    const exportCsvRes = await makeRequest(
      "GET",
      "/api/v1/calendar/export?startDate=2026-11-01&endDate=2026-11-30&format=csv",
      null,
      adminToken
    );
    assert(
      exportCsvRes.status === 200 &&
        exportCsvRes.headers["content-type"].includes("text/csv") &&
        exportCsvRes.body.includes("Event ID,Source Type,Reference Code"),
      "Calendar CSV export verified with correct CSV headers"
    );

    const exportIcsRes = await makeRequest(
      "GET",
      "/api/v1/calendar/export?startDate=2026-11-01&endDate=2026-11-30&format=ics",
      null,
      adminToken
    );
    assert(
      exportIcsRes.status === 200 &&
        exportIcsRes.headers["content-type"].includes("text/calendar") &&
        exportIcsRes.body.includes("BEGIN:VCALENDAR"),
      "Calendar iCalendar (ICS) export verified with standard RFC 5545 format"
    );
  } catch (err) {
    console.error("Test execution failed:", err);
    failed++;
  } finally {
    if (server) await new Promise((res) => server.close(res));
    await disconnectDB();
  }

  console.log("==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runMasterCalendarSuite();
}

module.exports = runMasterCalendarSuite;
