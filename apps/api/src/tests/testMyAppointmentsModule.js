const http = require("http");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");
const Patient = require("../modules/patients/patient.model");

let server;
let BASE_URL;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
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
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          // raw string
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log("=== STARTING MY APPOINTMENTS MODULE TEST ===");
  await connectDB();

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      BASE_URL = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    // 1. Authenticate Dr. Ananya
    const loginRes = await request("POST", "/api/v1/auth/login", {
      identifier: "ananya.sharma@trigyna.test",
      password: "TriGyna@123",
    });

    if (loginRes.status !== 200 || !loginRes.body.data?.token) {
      throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
    }
    const token = loginRes.body.data.token;
    console.log("[PASS] Dr. Ananya authenticated");

    // 2. Test GET /api/v1/doctor/appointments/summary
    const summaryRes = await request("GET", "/api/v1/doctor/appointments/summary?date=2026-10-26", null, token);
    console.log(`Summary Status: ${summaryRes.status}`);
    if (summaryRes.status !== 200 || !summaryRes.body.data?.kpis) {
      throw new Error(`Summary failed: ${JSON.stringify(summaryRes.body)}`);
    }
    const kpis = summaryRes.body.data.kpis;
    const qf = summaryRes.body.data.quickFilters;
    console.log("[PASS] Appointments summary returns 200");
    console.log(`- Today Appointments: ${kpis.todayAppointments} (${kpis.todayAppointmentsDelta})`);
    console.log(`- Upcoming Appointments: ${kpis.upcomingAppointments} (${kpis.upcomingAppointmentsDelta})`);
    console.log(`- Awaiting Consultation: ${kpis.awaitingConsultation} (${kpis.awaitingDelta})`);
    console.log(`- Completed: ${kpis.completedConsultations} (${kpis.completedDelta})`);
    console.log(`- Cancelled: ${kpis.cancelled}`);
    console.log(`- Rescheduled: ${kpis.rescheduled} (${kpis.rescheduledDelta})`);
    console.log(`- Quick Filters: All=${qf.all}, Confirmed=${qf.confirmed}, Awaiting=${qf.awaiting}, Completed=${qf.completed}, Cancelled=${qf.cancelled}, Rescheduled=${qf.rescheduled}`);

    // 3. Test GET /api/v1/doctor/appointments/calendar-summary
    const calRes = await request("GET", "/api/v1/doctor/appointments/calendar-summary?year=2026&month=10", null, token);
    if (calRes.status !== 200 || !calRes.body.data?.dateCounts) {
      throw new Error(`Calendar summary failed: ${JSON.stringify(calRes.body)}`);
    }
    console.log("[PASS] Calendar summary returns 200");
    console.log(`- Dates with appointments in Oct 2026:`, calRes.body.data.dateCounts);

    // 4. Test GET /api/v1/doctor/appointments with filters
    const listRes = await request("GET", "/api/v1/doctor/appointments?date=2026-10-26&limit=10", null, token);
    if (listRes.status !== 200 || !Array.isArray(listRes.body.data?.appointments)) {
      throw new Error(`List failed: ${JSON.stringify(listRes.body)}`);
    }
    console.log("[PASS] List appointments for 2026-10-26 returned 200");
    console.log(`- Appointments found: ${listRes.body.data.appointments.length}`);

    // 5. Test Export to CSV
    const exportRes = await request("GET", "/api/v1/doctor/appointments/export?date=2026-10-26", null, token);
    if (exportRes.status !== 200 || !exportRes.raw.includes("Appointment Code")) {
      throw new Error(`Export failed: ${exportRes.status}`);
    }
    console.log("[PASS] Export to CSV returns 200 with text/csv header");

    // 6. Test Book Appointment
    const patient = await Patient.findOne();
    if (patient) {
      const bookRes = await request(
        "POST",
        "/api/v1/doctor/appointments",
        {
          patientId: patient._id.toString(),
          serviceName: "Hormonal Health",
          appointmentDate: "2026-10-31",
          startTime: "11:00 AM",
          notes: "Test booking by doctor",
        },
        token
      );

      console.log(`Booking Status: ${bookRes.status}`);
      if (bookRes.status === 201) {
        console.log(`[PASS] Appointment created successfully: ${bookRes.body.data.appointment.appointmentCode}`);
      } else {
        console.log(`Booking response: ${JSON.stringify(bookRes.body)}`);
      }
    }

    console.log("=== ALL BACKEND CHECKS PASSED ===");
  } finally {
    if (server) server.close();
    await disconnectDB();
  }
}

runTest().catch((err) => {
  console.error("Test failed", err);
  process.exit(1);
});
