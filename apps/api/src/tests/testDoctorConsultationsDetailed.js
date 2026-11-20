const mongoose = require("mongoose");
const env = require("../config/env");

async function checkAppointments() {
  await mongoose.connect(env.MONGODB_URI);
  require("../modules/patients/patient.model");
  const Appointment = require("../modules/appointments/appointment.model");
  const Consultation = require("../modules/clinical/consultation.model");
  const doctorId = "6add104fb21891d04a99e855";

  const appts = await Appointment.find({ doctorId })
    .populate("patientId", "fullName patientCode phone")
    .sort({ appointmentDate: -1, startTime: -1 })
    .limit(10);

  console.log(`Found ${appts.length} appointments for Dr. Ananya:`);
  for (const a of appts) {
    const existingCons = await Consultation.findOne({ appointmentId: a._id });
    console.log({
      id: a._id,
      code: a.appointmentCode,
      patient: a.patientId?.fullName,
      status: a.status,
      date: a.appointmentDate,
      time: a.startTime,
      meetingUrl: a.meetingUrl,
      hasConsultation: !!existingCons,
      isFinalized: existingCons?.isFinalized,
    });
  }
  process.exit(0);
}

checkAppointments().catch((err) => {
  console.error(err);
  process.exit(1);
});
