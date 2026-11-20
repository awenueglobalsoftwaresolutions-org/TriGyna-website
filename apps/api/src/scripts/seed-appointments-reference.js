const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function seedRealReferenceData() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna");
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;
  const usersColl = db.collection("users");
  const doctorsColl = db.collection("doctors");
  const patientsColl = db.collection("patients");
  const appointmentsColl = db.collection("appointments");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("TriGyna@123", salt);

  // 1. Ensure the 4 primary reference doctors exist in users & doctors collections
  const doctorDefs = [
    {
      name: "Dr. Aarav Sharma",
      email: "doctor@trigyna.test",
      phone: "9000000002",
      specialization: ["Gynaecologist", "Women's Wellness & PCOD", "Homoeopathy"],
      consultationFee: 700,
    },
    {
      name: "Dr. Ritu Verma",
      email: "dr.ritu.verma@trigyna.test",
      phone: "9000000021",
      specialization: ["Dermatologist", "Clinical Dermatology", "Skin & Hair"],
      consultationFee: 650,
    },
    {
      name: "Dr. Neha Singh",
      email: "dr.neha.singh@trigyna.test",
      phone: "9000000022",
      specialization: ["Nutritionist", "Diet & Lifestyle", "Metabolic Health"],
      consultationFee: 500,
    },
    {
      name: "Dr. Sameer Khan",
      email: "dr.sameer.khan@trigyna.test",
      phone: "9000000023",
      specialization: ["General Physician", "Preventive Healthcare", "Family Medicine"],
      consultationFee: 600,
    },
  ];

  const doctorMap = {};

  for (const docDef of doctorDefs) {
    let user = await usersColl.findOne({
      $or: [{ email: docDef.email }, { name: docDef.name }],
    });

    if (!user) {
      const insertUserRes = await usersColl.insertOne({
        name: docDef.name,
        email: docDef.email,
        phone: docDef.phone,
        passwordHash,
        role: "doctor",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      user = { _id: insertUserRes.insertedId, ...docDef };
      console.log(`Created doctor user: ${docDef.name}`);
    } else {
      await usersColl.updateOne(
        { _id: user._id },
        { $set: { role: "doctor", status: "active", name: docDef.name } }
      );
    }

    let doctorDoc = await doctorsColl.findOne({ userId: user._id });
    if (!doctorDoc) {
      const insertDocRes = await doctorsColl.insertOne({
        userId: user._id,
        specialization: docDef.specialization,
        consultationFee: docDef.consultationFee,
        status: "active",
        workingHours: { start: "08:00", end: "18:00" },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      doctorDoc = { _id: insertDocRes.insertedId };
      console.log(`Created doctor profile for: ${docDef.name}`);
    } else {
      await doctorsColl.updateOne(
        { _id: doctorDoc._id },
        {
          $set: {
            specialization: docDef.specialization,
            consultationFee: docDef.consultationFee,
            status: "active",
          },
        }
      );
    }

    doctorMap[docDef.name] = doctorDoc._id;
  }

  // 2. Ensure real patients exist in MongoDB
  const patientDefs = [
    { fullName: "Ananya Mishra", phone: "+91 98765 43210", code: "TR-1001", age: 28, gender: "female" },
    { fullName: "Priya Verma", phone: "+91 98765 43211", code: "TR-1002", age: 31, gender: "female" },
    { fullName: "Kavita Reddy", phone: "+91 98765 43212", code: "TR-1003", age: 26, gender: "female" },
    { fullName: "Neha Gupta", phone: "+91 98765 43213", code: "TR-1004", age: 34, gender: "female" },
    { fullName: "Rohit Kumar", phone: "+91 98765 43214", code: "TR-1005", age: 29, gender: "male" },
    { fullName: "Megha Singh", phone: "+91 98765 43215", code: "TR-1006", age: 27, gender: "female" },
    { fullName: "Sneha Patel", phone: "+91 98765 43216", code: "TR-1007", age: 33, gender: "female" },
    { fullName: "Pooja Yadav", phone: "+91 98765 43217", code: "TR-1008", age: 25, gender: "female" },
    { fullName: "Riya Sharma", phone: "+91 98765 43218", code: "TR-1009", age: 30, gender: "female" },
    { fullName: "Amit Kumar", phone: "+91 98765 43219", code: "TR-1010", age: 35, gender: "male" },
    { fullName: "Deepa Tiwari", phone: "+91 98765 43220", code: "TR-1011", age: 32, gender: "female" },
    { fullName: "Sunita Patel", phone: "+91 98765 43221", code: "TR-1012", age: 41, gender: "female" },
    { fullName: "Manisha Singh", phone: "+91 98765 43222", code: "TR-1013", age: 29, gender: "female" },
    { fullName: "Rahul Mehta", phone: "+91 98765 43223", code: "TR-1014", age: 38, gender: "male" },
    { fullName: "Alka Singh", phone: "+91 98765 43224", code: "TR-1015", age: 36, gender: "female" },
    { fullName: "Sandeep Kumar", phone: "+91 98765 43225", code: "TR-1016", age: 44, gender: "male" },
  ];

  const patientMap = {};

  for (const pDef of patientDefs) {
    let patient = await patientsColl.findOne({
      $or: [{ fullName: pDef.fullName }, { phone: pDef.phone }, { patientCode: pDef.code }],
    });

    if (!patient) {
      const pRes = await patientsColl.insertOne({
        fullName: pDef.fullName,
        phone: pDef.phone,
        patientCode: pDef.code,
        age: pDef.age,
        gender: pDef.gender,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      patientMap[pDef.fullName] = pRes.insertedId;
      console.log(`Created patient record: ${pDef.fullName}`);
    } else {
      patientMap[pDef.fullName] = patient._id;
    }
  }

  // 3. Clear existing appointments on 2026-10-31 and insert the canonical 12 real MongoDB appointment records
  const targetDate = "2026-10-31";
  await appointmentsColl.deleteMany({ appointmentDate: targetDate });

  const appointmentsToSeed = [
    // --- Dr. Aarav Sharma (Gynaecologist) ---
    {
      appointmentCode: "TG-A-201",
      patientName: "Ananya Mishra",
      doctorName: "Dr. Aarav Sharma",
      serviceName: "Follow-up",
      startTime: "09:00",
      endTime: "09:30",
      status: "completed",
      mode: "In-Clinic Consultation",
      notes: "Routine post-treatment follow-up. Vital signs normal, pain resolved.",
    },
    {
      appointmentCode: "TG-A-202",
      patientName: "Priya Verma",
      doctorName: "Dr. Aarav Sharma",
      serviceName: "PCOD Consultation",
      startTime: "10:00",
      endTime: "10:30",
      status: "in_consultation",
      mode: "In-Clinic Consultation",
      notes: "PCOD hormonal cycle evaluation. Ultrasonic pelvic scan reviewed.",
    },
    {
      appointmentCode: "TG-A-203",
      patientName: "Kavita Reddy",
      doctorName: "Dr. Aarav Sharma",
      serviceName: "Skin & Hair",
      startTime: "11:30",
      endTime: "12:00",
      status: "scheduled",
      mode: "In-Clinic Consultation",
      notes: "Hormonal acne & scalp thinning assessment.",
    },
    {
      appointmentCode: "TG-A-204",
      patientName: "Neha Gupta",
      doctorName: "Dr. Aarav Sharma",
      serviceName: "General Consultation",
      startTime: "14:00",
      endTime: "14:30",
      status: "scheduled",
      mode: "In-Clinic Consultation",
      notes: "Annual wellness checkup and blood panel review.",
    },
    {
      appointmentCode: "TG-A-205",
      patientName: "Rohit Kumar",
      doctorName: "Dr. Aarav Sharma",
      serviceName: "Follow-up",
      startTime: "16:00",
      endTime: "16:30",
      status: "scheduled",
      mode: "In-Clinic Consultation",
      notes: "Review progress on lifestyle modification protocol.",
    },

    // --- Dr. Ritu Verma (Dermatologist) ---
    {
      appointmentCode: "TG-A-206",
      patientName: "Megha Singh",
      doctorName: "Dr. Ritu Verma",
      serviceName: "Skin Consultation",
      startTime: "09:30",
      endTime: "10:00",
      status: "completed",
      mode: "In-Clinic Consultation",
      notes: "Eczema flare-up review and topical therapy adjustments.",
    },
    {
      appointmentCode: "TG-A-207",
      patientName: "Sneha Patel",
      doctorName: "Dr. Ritu Verma",
      serviceName: "Hair Treatment",
      startTime: "11:00",
      endTime: "11:30",
      status: "completed",
      mode: "In-Clinic Consultation",
      notes: "PRP maintenance session #3 completed without complications.",
    },
    {
      appointmentCode: "TG-A-208",
      patientName: "Pooja Yadav",
      doctorName: "Dr. Ritu Verma",
      serviceName: "Skin Follow-up",
      startTime: "13:00",
      endTime: "13:30",
      status: "scheduled",
      mode: "In-Clinic Consultation",
      notes: "Pigmentation assessment after 4 weeks of serum application.",
    },
    {
      appointmentCode: "TG-A-209",
      patientName: "Riya Sharma",
      doctorName: "Dr. Ritu Verma",
      serviceName: "Consultation",
      startTime: "15:00",
      endTime: "15:30",
      status: "cancelled",
      mode: "In-Clinic Consultation",
      notes: "Patient cancelled due to out-of-town travel. Reschedule planned.",
      cancellationReason: "Patient travel emergency",
    },

    // --- Dr. Neha Singh (Nutritionist) ---
    {
      appointmentCode: "TG-A-210",
      patientName: "Amit Kumar",
      doctorName: "Dr. Neha Singh",
      serviceName: "Nutrition Consultation",
      startTime: "09:00",
      endTime: "09:30",
      status: "completed",
      mode: "In-Clinic Consultation",
      notes: "Insulin resistance dietary roadmap & macronutrient macro plan.",
    },
    {
      appointmentCode: "TG-A-211",
      patientName: "Deepa Tiwari",
      doctorName: "Dr. Neha Singh",
      serviceName: "Diet Program",
      startTime: "12:00",
      endTime: "12:30",
      status: "completed",
      mode: "In-Clinic Consultation",
      notes: "Phase 2 anti-inflammatory gut healing protocol launched.",
    },
    {
      appointmentCode: "TG-A-212",
      patientName: "Sunita Patel",
      doctorName: "Dr. Neha Singh",
      serviceName: "Nutrition Follow-up",
      startTime: "14:30",
      endTime: "15:00",
      status: "in_consultation",
      mode: "In-Clinic Consultation",
      notes: "Bi-weekly weigh-in: -1.8kg. Caloric adjustment reviewed.",
    },
    {
      appointmentCode: "TG-A-213",
      patientName: "Manisha Singh",
      doctorName: "Dr. Neha Singh",
      serviceName: "Diet Consultation",
      startTime: "16:30",
      endTime: "17:00",
      status: "scheduled",
      mode: "In-Clinic Consultation",
      notes: "Pre-natal nutrition counseling & micronutrient supplement guide.",
    },

    // --- Dr. Sameer Khan (General Physician) ---
    {
      appointmentCode: "TG-A-214",
      patientName: "Rahul Mehta",
      doctorName: "Dr. Sameer Khan",
      serviceName: "General Consultation",
      startTime: "10:30",
      endTime: "11:00",
      status: "completed",
      mode: "In-Clinic Consultation",
      notes: "Blood pressure monitored at 122/80 mmHg. Medication refilled.",
    },
    {
      appointmentCode: "TG-A-215",
      patientName: "Alka Singh",
      doctorName: "Dr. Sameer Khan",
      serviceName: "Follow-up",
      startTime: "12:30",
      endTime: "13:00",
      status: "completed",
      mode: "In-Clinic Consultation",
      notes: "Thyroid profile TSH 2.1 mIU/L within optimal clinical range.",
    },
    {
      appointmentCode: "TG-A-216",
      patientName: "Sandeep Kumar",
      doctorName: "Dr. Sameer Khan",
      serviceName: "General Consultation",
      startTime: "15:30",
      endTime: "16:00",
      status: "scheduled",
      mode: "In-Clinic Consultation",
      notes: "Seasonal allergy evaluation & non-drowsy antihistamines.",
    },
  ];

  for (const appt of appointmentsToSeed) {
    const patientId = patientMap[appt.patientName];
    const doctorId = doctorMap[appt.doctorName];

    await appointmentsColl.insertOne({
      appointmentCode: appt.appointmentCode,
      patientId,
      doctorId,
      serviceName: appt.serviceName,
      appointmentDate: targetDate,
      startTime: appt.startTime,
      endTime: appt.endTime,
      status: appt.status,
      mode: appt.mode,
      notes: appt.notes,
      cancellationReason: appt.cancellationReason || null,
      meetingProvider: "none",
      meetingStatus: "pending",
      paymentStatus: "paid",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const count = await appointmentsColl.countDocuments({ appointmentDate: targetDate });
  console.log(`Successfully seeded ${count} real MongoDB appointments for ${targetDate}`);

  await mongoose.disconnect();
  console.log("Database disconnected.");
}

seedRealReferenceData().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});

