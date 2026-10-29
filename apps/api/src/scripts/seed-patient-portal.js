const mongoose = require("mongoose");
const User = require("../modules/users/user.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const FollowUp = require("../modules/clinical/followup.model");
const Notification = require("../modules/notifications/notification.model");
const Invoice = require("../modules/billing/invoice.model");
const Payment = require("../modules/billing/payment.model");
const Receipt = require("../modules/billing/receipt.model");
const RefundRequest = require("../modules/billing/refund-request.model");
const PatientDocument = require("../modules/patients/document.model");
const SupportTicket = require("../modules/support/support-ticket.model");
const env = require("../config/env");

async function seedPatientPortal() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB for patient portal seeding");

  // 1. Find or verify Ananya Mishra
  const user = await User.findOne({ email: "patient@trigyna.test" });
  if (!user) {
    throw new Error("patient@trigyna.test user not found");
  }

  let patient = await Patient.findOne({ patientCode: "TR-1001" });
  if (!patient) {
    patient = await Patient.create({
      userId: user._id,
      patientCode: "TR-1001",
      fullName: "Ananya Mishra",
      phone: "9000000006",
      email: "patient@trigyna.test",
      gender: "female",
      age: 28,
      dateOfBirth: "1998-05-14",
      bloodGroup: "O+",
      address: "B-402, Green Glen Layout, Bellandur, Bengaluru 560103",
      allergies: ["Penicillin", "Dust Mites"],
      medicalHistory: "PCOS diagnosed in 2024, occasional migraine",
      emergencyContact: {
        name: "Vikram Mishra",
        phone: "9876543210",
        relationship: "Spouse",
      },
      status: "active",
    });
  } else {
    patient.userId = user._id;
    patient.fullName = "Ananya Mishra";
    patient.phone = "9000000006";
    patient.email = "patient@trigyna.test";
    patient.gender = "female";
    patient.age = 28;
    patient.dateOfBirth = "1998-05-14";
    patient.bloodGroup = "O+";
    patient.allergies = ["Penicillin", "Dust Mites"];
    patient.emergencyContact = {
      name: "Vikram Mishra",
      phone: "9876543210",
      relationship: "Spouse",
    };
    await patient.save();
  }

  // 2. Find Dr. Harshali Sutar
  let doctor = await Doctor.findOne({ "userId.email": "harshali.sutar@trigyna.test" });
  if (!doctor) {
    const docUser = await User.findOne({ email: "harshali.sutar@trigyna.test" });
    if (docUser) {
      doctor = await Doctor.findOne({ userId: docUser._id });
    }
  }
  if (!doctor) {
    doctor = await Doctor.findOne();
  }
  console.log("Using Doctor ID:", doctor._id);

  // 3. Clean up existing appointments for Ananya to have exactly 1 upcoming + 1 past
  await Appointment.deleteMany({ patientId: patient._id });

  // Create Past Completed Appointment (15 Oct 2026)
  const pastAppt = await Appointment.create({
    appointmentCode: "APT-2026-001",
    patientId: patient._id,
    doctorId: doctor._id,
    serviceName: "Homoeopathy Consultation",
    appointmentDate: "2026-10-15",
    startTime: "10:00",
    endTime: "10:30",
    mode: "Online Video Consultation",
    status: "completed",
    paymentStatus: "paid",
    notes: "General health discussion & treatment plan for PCOS.",
  });

  // Create Upcoming Confirmed Appointment (27 Oct 2026)
  const nextAppt = await Appointment.create({
    appointmentCode: "APT-2026-099",
    patientId: patient._id,
    doctorId: doctor._id,
    serviceName: "PCOS Management",
    appointmentDate: "2026-10-27",
    startTime: "11:30",
    endTime: "12:00",
    mode: "Online Video Consultation",
    status: "scheduled",
    paymentStatus: "paid",
    notes: "Follow-up consultation for PCOS Management.",
  });

  // 4. Clinical Consultation for 15 Oct 2026
  await Consultation.deleteMany({ patientId: patient._id });
  const pastConsultation = await Consultation.create({
    consultationCode: "CON-2026-001",
    appointmentId: pastAppt._id,
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaints: "General health discussion & treatment plan",
    diagnosis: "PCOS, mild hormonal imbalance",
    treatmentPlan: "Constitutional homoeopathy, dietary modifications, stress management.",
    vitalSigns: {
      bloodPressure: "118/76",
      pulse: 72,
      temperature: 98.4,
      weightKg: 58,
      bmi: 21.8,
    },
    isFinalized: true,
    finalizedAt: new Date("2026-10-15T10:30:00Z"),
    createdAt: new Date("2026-10-15T10:30:00Z"),
  });

  // 5. Exactly 3 Prescriptions
  await Prescription.deleteMany({ patientId: patient._id });
  await Prescription.create([
    {
      prescriptionCode: "RX-2026-001",
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: pastConsultation._id,
      medications: [
        {
          name: "Pulsatilla Nigricans",
          potency: "200C",
          dosage: "4 globules",
          frequency: "Once a day morning",
          duration: "14 days",
          instructions: "Empty stomach in the morning",
        },
        {
          name: "Sepia Officinalis",
          potency: "30C",
          dosage: "4 globules",
          frequency: "Twice daily",
          duration: "21 days",
          instructions: "Before meals with warm water",
        },
        {
          name: "Folliculinum",
          potency: "3X",
          dosage: "2 tablets",
          frequency: "At bedtime",
          duration: "10 days",
          instructions: "Bedtime after dinner",
        },
      ],
      dietaryAdvice: "Medicines and lifestyle recommendations",
      lifestyleAdvice: "Engage in 30 minutes of brisk walking or yoga daily.",
      createdAt: new Date("2026-10-15T10:35:00Z"),
    },
    {
      prescriptionCode: "RX-2026-002",
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: pastConsultation._id,
      medications: [
        {
          name: "Calcarea Carbonica",
          dosage: "4 globules",
          frequency: "Weekly",
          duration: "4 weeks",
          instructions: "Sunday morning empty stomach",
        },
      ],
      dietaryAdvice: "High fiber, whole grain diet with green leafy vegetables.",
      createdAt: new Date("2026-09-20T11:00:00Z"),
    },
    {
      prescriptionCode: "RX-2026-003",
      patientId: patient._id,
      doctorId: doctor._id,
      consultationId: pastConsultation._id,
      medications: [
        {
          name: "Natrum Muriaticum",
          dosage: "4 globules",
          frequency: "Once daily",
          duration: "10 days",
          instructions: "Dissolve on tongue",
        },
      ],
      dietaryAdvice: "Hydrate adequately with 2.5L water daily.",
      createdAt: new Date("2026-08-10T09:30:00Z"),
    },
  ]);

  // 6. Follow-ups
  await FollowUp.deleteMany({
    $or: [
      { patientId: patient._id },
      { followUpCode: { $in: ["FLW-2026-001", "FLW-2026-002", "FLW-2026-003"] } },
    ],
  });
  await FollowUp.create([
    {
      followUpCode: "FLW-2026-001",
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: nextAppt._id,
      consultationId: pastConsultation._id,
      serviceName: "PCOS Management Follow-up",
      dueDate: new Date("2026-10-27T11:30:00Z"),
      scheduledTime: "11:30 AM - 12:00 PM",
      mode: "Video consultation",
      status: "scheduled",
      interval: "Day 14",
      planInstructions: "Review response to Pulsatilla and Sepia. Evaluate cycle length.",
      staffNotes: "Patient confirmed attendance via portal.",
    },
    {
      followUpCode: "FLW-2026-002",
      patientId: patient._id,
      doctorId: doctor._id,
      serviceName: "Progress Review",
      dueDate: new Date("2026-11-10T11:00:00Z"),
      scheduledTime: "11:00 AM - 11:30 AM",
      mode: "Video consultation",
      status: "scheduled",
      interval: "Day 21",
      planInstructions: "Progress review and plan update. Assessment of cycle regularization.",
      staffNotes: "Scheduled routine milestone.",
    },
    {
      followUpCode: "FLW-2026-003",
      patientId: patient._id,
      doctorId: doctor._id,
      serviceName: "Diet & Nutrition Review",
      dueDate: new Date("2026-11-25T11:30:00Z"),
      scheduledTime: "11:30 AM - 12:00 PM",
      mode: "Video consultation",
      status: "planned", // "planned" so active scheduled count = 2, but list shows all 3 upcoming!
      interval: "Custom",
      planInstructions: "Anti-inflammatory dietary protocol review with nutrition counselor.",
      staffNotes: "Optional programme phase.",
    },
  ]);

  // 7. Clean up invoices, payments, and receipts to ensure 0 outstanding balance
  await Invoice.deleteMany({ patientId: patient._id });
  await Payment.deleteMany({ patientId: patient._id });
  await Receipt.deleteMany({ patientId: patient._id });

  // 7a. Past settled invoice
  await Invoice.create({
    invoiceNumber: "INV-2026-001",
    patientId: patient._id,
    appointmentId: pastAppt._id,
    doctorId: doctor._id,
    items: [
      {
        description: "Homoeopathy Consultation (Dr. Harshali Sutar)",
        quantity: 1,
        amount: 500,
        unitPrice: 500,
      },
    ],
    totalAmount: 500,
    paidAmount: 500,
    balanceAmount: 0,
    taxAmount: 0,
    status: "paid",
    paymentMethod: "upi",
    paidAt: new Date("2026-10-15T10:00:00Z"),
    createdAt: new Date("2026-10-15T10:00:00Z"),
  });

  // 7b. Exact Reference Receipt & Invoice matching user visual reference
  const refInvoice = await Invoice.create({
    invoiceNumber: "TRI/2026/000458",
    patientId: patient._id,
    appointmentId: nextAppt._id,
    doctorId: doctor._id,
    items: [
      {
        description: "PCOS Management Consultation",
        details: "Online Video Consultation (30 Minutes)",
        quantity: 1,
        unitPrice: 1000,
        amount: 1000,
      },
      {
        description: "Follow-up Support (14 Days)",
        details: "Included in the consultation package",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      },
    ],
    subtotal: 1000,
    discountAmount: 0,
    taxableAmount: 1000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 1000,
    paidAmount: 1000,
    balanceAmount: 0,
    status: "paid",
    paymentMethod: "upi",
    paidAt: new Date("2026-10-27T11:22:00+05:30"),
    createdAt: new Date("2026-10-27T11:22:00+05:30"),
  });

  const refPayment = await Payment.create({
    paymentNumber: "PAY-2026-000458",
    invoiceId: refInvoice._id,
    patientId: patient._id,
    amount: 1000,
    currency: "INR",
    paymentMethod: "upi",
    paymentProvider: "phonepe",
    providerTransactionId: "T2610271122456789",
    status: "success",
    paidAt: new Date("2026-10-27T11:22:00+05:30"),
    recordedBy: user._id,
    notes: "Verified UPI PhonePe transaction",
  });

  const refReceipt = await Receipt.create({
    receiptNumber: "RCP/2026/000458",
    paymentId: refPayment._id,
    invoiceId: refInvoice._id,
    patientId: patient._id,
    appointmentId: nextAppt._id,
    doctorId: doctor._id,
    amountReceived: 1000,
    currency: "INR",
    paymentMethod: "UPI (PhonePe)",
    providerTransactionId: "T2610271122456789",
    issuedAt: new Date("2026-10-27T11:22:00+05:30"),
    verificationToken: "tg_rcp_2026_000458_verif",
    status: "issued",
  });

  refPayment.receiptId = refReceipt._id;
  await refPayment.save();

  refInvoice.payments = [
    {
      amount: 1000,
      paymentMethod: "upi",
      paymentProvider: "phonepe",
      transactionRef: "T2610271122456789",
      receiptId: refReceipt._id,
      receiptNumber: refReceipt.receiptNumber,
      recordedBy: user._id,
      recordedAt: new Date("2026-10-27T11:22:00+05:30"),
      notes: "Verified payment via UPI (PhonePe)",
    },
  ];
  await refInvoice.save();

  // 8. Exactly 3 Unread Notifications matching reference screenshot text
  await Notification.deleteMany({ recipientId: user._id });
  await Notification.create([
    {
      recipientId: user._id,
      recipientRole: "patient",
      title: "Appointment confirmed",
      message: "Your appointment with Dr. Harshali Sutar on 27 Oct 2026 at 11:30 AM is confirmed.",
      type: "appointment",
      read: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      recipientId: user._id,
      recipientRole: "patient",
      title: "Prescription added",
      message: "A new prescription has been added to your health records.",
      type: "clinical",
      read: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      recipientId: user._id,
      recipientRole: "patient",
      title: "Follow-up reminder",
      message: "Your follow-up consultation is scheduled on 27 Oct 2026.",
      type: "appointment",
      read: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  ]);

  // 9. Documents
  await PatientDocument.deleteMany({ patientId: patient._id });
  await PatientDocument.create([
    {
      documentCode: "DOC-2026-001",
      patientId: patient._id,
      title: "Pelvic Ultrasound Report",
      category: "lab_report",
      fileUrl: "/documents/sample_pelvic_ultrasound.pdf",
      fileName: "pelvic_usg_oct2026.pdf",
      fileSize: 1450000,
      mimeType: "application/pdf",
      uploadedBy: user._id,
      description: "Baseline pelvic ultrasound showing mild ovarian stroma prominence.",
      isVerified: true,
    },
    {
      documentCode: "DOC-2026-002",
      patientId: patient._id,
      title: "Comprehensive Hormone Panel (FSH/LH/DHEA)",
      category: "diagnostic",
      fileUrl: "/documents/sample_hormone_panel.pdf",
      fileName: "hormone_panel_sep2026.pdf",
      fileSize: 820000,
      mimeType: "application/pdf",
      uploadedBy: user._id,
      description: "Laboratory report for endocrine evaluation.",
      isVerified: true,
    },
  ]);

  // 10. Support ticket
  await SupportTicket.deleteMany({ patientId: patient._id });
  await SupportTicket.create({
    ticketNumber: "TKT-2026-001",
    patientId: patient._id,
    userId: user._id,
    category: "Prescriptions & Medicines",
    subject: "Query regarding morning globule administration",
    description: "Can I take Pulsatilla 200 with warm herbal tea in the morning?",
    status: "resolved",
    priority: "medium",
    replies: [
      {
        senderId: doctor.userId?._id || user._id,
        senderRole: "doctor",
        senderName: "Dr. Harshali Sutar",
        message: "Hello Ananya, please take the globules on a clean tongue with plain water. You may have herbal tea 20 minutes later.",
        createdAt: new Date("2026-10-16T11:00:00Z"),
      },
    ],
  });

  // 11. Realistic Refund Requests
  await RefundRequest.deleteMany({ patientId: patient._id });
  await RefundRequest.create([
    {
      refundNumber: "REF-2026-000458",
      invoiceId: refInvoice._id,
      patientId: patient._id,
      requestedAmount: 1000,
      reason: "Duplicate session payment adjustment request",
      paymentMethod: "upi",
      refundDestination: "original_payment_method",
      status: "pending",
      createdAt: new Date("2026-10-24T09:15:00Z"),
    },
    {
      refundNumber: "REF-2026-000412",
      invoiceId: refInvoice._id,
      patientId: patient._id,
      requestedAmount: 500,
      reason: "Consultation schedule adjustment",
      paymentMethod: "upi",
      refundDestination: "original_payment_method",
      status: "processed",
      processedAt: new Date("2026-10-18T16:00:00Z"),
      createdAt: new Date("2026-10-18T14:30:00Z"),
    },
  ]);

  console.log("Patient portal reference seed complete for Ananya Mishra!");
  await mongoose.disconnect();
}

seedPatientPortal().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
