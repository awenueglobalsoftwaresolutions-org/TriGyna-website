/**
 * TriGyna Health & Wellness — Seed Sales CRM Dashboard Dataset
 * Matches exact reference screenshot (media_1793302122333_53f2a310.jpg)
 * 128 Total Leads: 36 New, 28 Contacted, 18 Interested, 12 Appointment, 34 Converted
 * Today's Tasks, Upcoming Appointments, Source Breakdown, Funnel, Recent Activities
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const Lead = require("../modules/crm/lead.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const Appointment = require("../modules/appointments/appointment.model");
const User = require("../modules/users/user.model");
const Invoice = require("../modules/billing/invoice.model");
const WhatsAppConversation = require("../modules/integrations/whatsapp.model");
const Notification = require("../modules/notifications/notification.model");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";

async function seedSalesDashboard() {
  console.log("--> Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI);

  // 1. Resolve or create Sales Executive user (Sushil Kumar)
  let salesUser = await User.findOne({ email: "sales@trigyna.test" });
  if (!salesUser) {
    salesUser = await User.create({
      name: "Sushil Kumar",
      email: "sales@trigyna.test",
      phone: "9000000008",
      role: "sales",
      status: "active",
      passwordHash: "$2b$10$w8T.Nvh1FepR7YVq6Yv3f.z7bK18iXz8Z9B1hT6Y7v9X8a0b1c2d3e", // TriGyna@123
    });
  } else {
    salesUser.name = "Sushil Kumar";
    salesUser.role = "sales";
    await salesUser.save();
  }

  // Also ensure admin@trigyna.test is Sushil Kumar
  let adminUser = await User.findOne({ email: "admin@trigyna.test" });
  if (adminUser) {
    adminUser.name = "Sushil Kumar";
    await adminUser.save();
  }

  // Resolve Doctor for appointments
  let doctor = await Doctor.findOne().populate("userId");
  if (!doctor) {
    console.log("No doctor found, skipping appointment links");
  }

  console.log("--> Seeding 20 signature visible pipeline leads with exact names & services...");

  const now = new Date();
  const minutesAgo = (m) => new Date(now.getTime() - m * 60 * 1000);
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // 20 Visible Kanban Cards exactly from the design:
  const signatureLeads = [
    // Column 1: New Leads (4 visible)
    {
      phone: "9100000001",
      fullName: "Priya Sharma",
      email: "priya.sharma@trigyna.test",
      serviceInterest: "PCOD Consultation",
      status: "new",
      source: "website_enquiry",
      createdAt: minutesAgo(2),
      tasks: [
        {
          title: "Call back - Priya Sharma",
          dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
          priority: "high",
          status: "open",
        },
      ],
      activities: [
        {
          action: "ENQUIRY_SUBMITTED",
          details: "Priya Sharma submitted enquiry form for PCOD Consultation",
          createdAt: minutesAgo(2),
        },
      ],
    },
    {
      phone: "9100000002",
      fullName: "Rahul Verma",
      email: "rahul.verma@trigyna.test",
      serviceInterest: "Hair Fall Treatment",
      status: "new",
      source: "instagram",
      createdAt: minutesAgo(10),
      activities: [
        {
          action: "LEAD_CAPTURED",
          details: "Inbound inquiry from Instagram Ad campaign",
          createdAt: minutesAgo(10),
        },
      ],
    },
    {
      phone: "9100000003",
      fullName: "Anjali Singh",
      email: "anjali.singh@trigyna.test",
      serviceInterest: "Diet & Nutrition",
      status: "new",
      source: "whatsapp",
      createdAt: minutesAgo(25),
      activities: [
        {
          action: "WHATSAPP_MESSAGE_RECEIVED",
          details: "Asked about customized clinical meal plan for PCOS",
          createdAt: minutesAgo(25),
        },
      ],
    },
    {
      phone: "9100000004",
      fullName: "Kavita Mishra",
      email: "kavita.mishra@trigyna.test",
      serviceInterest: "General Consultation",
      status: "new",
      source: "google_seo",
      createdAt: hoursAgo(1),
    },

    // Column 2: Contacted (4 visible)
    {
      phone: "9100000005",
      fullName: "Amit Patel",
      email: "amit.patel@trigyna.test",
      serviceInterest: "Skin Treatment",
      status: "contacted",
      source: "website_enquiry",
      createdAt: hoursAgo(2),
      tasks: [
        {
          title: "Send treatment details - Amit Patel",
          dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0),
          priority: "medium",
          status: "open",
        },
      ],
      activities: [
        {
          action: "APPOINTMENT_BOOKED",
          details: "Amit Patel appointment booked for skin rejuvenation",
          createdAt: hoursAgo(1),
        },
      ],
    },
    {
      phone: "9100000006",
      fullName: "Neha Gupta",
      email: "neha.gupta@trigyna.test",
      serviceInterest: "PCOS Program",
      status: "contacted",
      source: "whatsapp",
      createdAt: hoursAgo(3),
      tasks: [
        {
          title: "Follow-up - Neha Gupta",
          dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0),
          priority: "high",
          status: "open",
        },
      ],
      activities: [
        {
          action: "PHONE_CALL_LOGGED",
          details: "You called Neha Gupta; discussed 3-month hormonal reversal roadmap",
          createdAt: minutesAgo(15),
        },
      ],
    },
    {
      phone: "9100000007",
      fullName: "Vikas Singh",
      email: "vikas.singh@trigyna.test",
      serviceInterest: "Online Consultation",
      status: "contacted",
      source: "referral",
      createdAt: hoursAgo(4),
      tasks: [
        {
          title: "Follow-up - Vikas Singh",
          dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30, 0),
          priority: "medium",
          status: "open",
        },
      ],
      activities: [
        {
          action: "FOLLOW_UP_REMINDER",
          details: "Follow-up reminder set for Vikas Singh",
          createdAt: hoursAgo(3),
        },
      ],
    },
    {
      phone: "9100000008",
      fullName: "Pooja Yadav",
      email: "pooja.yadav@trigyna.test",
      serviceInterest: "Fertility Consultation",
      status: "contacted",
      source: "website_enquiry",
      createdAt: hoursAgo(5),
    },

    // Column 3: Interested (4 visible)
    {
      phone: "9100000009",
      fullName: "Sneha Jain",
      email: "sneha.jain@trigyna.test",
      serviceInterest: "Diet Program",
      status: "interested",
      source: "instagram",
      createdAt: daysAgo(1),
    },
    {
      phone: "9100000010",
      fullName: "Rohit Kumar",
      email: "rohit.kumar@trigyna.test",
      serviceInterest: "Skin Care Program",
      status: "interested",
      source: "google_seo",
      createdAt: daysAgo(1),
    },
    {
      phone: "9100000011",
      fullName: "Meena Sharma",
      email: "meena.sharma@trigyna.test",
      serviceInterest: "PCOD Treatment",
      status: "interested",
      source: "whatsapp",
      createdAt: daysAgo(2),
    },
    {
      phone: "9100000012",
      fullName: "Sanjay Gupta",
      email: "sanjay.gupta@trigyna.test",
      serviceInterest: "General Checkup",
      status: "interested",
      source: "walk_in",
      createdAt: daysAgo(2),
    },

    // Column 4: Appointment (4 visible)
    {
      phone: "9100000013",
      fullName: "Kritika Sinha",
      email: "kritika.sinha@trigyna.test",
      serviceInterest: "Online Consultation",
      status: "appointment",
      source: "website_enquiry",
      createdAt: hoursAgo(6),
      tasks: [
        {
          title: "Confirm appointment - Kritika Sinha",
          dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0),
          priority: "high",
          status: "open",
        },
      ],
    },
    {
      phone: "9100000014",
      fullName: "Deepak Verma",
      email: "deepak.verma@trigyna.test",
      serviceInterest: "Hair Treatment",
      status: "appointment",
      source: "whatsapp",
      createdAt: hoursAgo(8),
    },
    {
      phone: "9100000015",
      fullName: "Shweta Agarwal",
      email: "shweta.agarwal@trigyna.test",
      serviceInterest: "PCOS Consultation",
      status: "appointment",
      source: "referral",
      createdAt: daysAgo(1),
    },
    {
      phone: "9100000016",
      fullName: "Manish Yadav",
      email: "manish.yadav@trigyna.test",
      serviceInterest: "Diet Consultation",
      status: "appointment",
      source: "instagram",
      createdAt: daysAgo(1),
    },

    // Column 5: Converted (4 visible)
    {
      phone: "9100000017",
      fullName: "Ritu Verma",
      email: "ritu.verma@trigyna.test",
      serviceInterest: "PCOD Program",
      status: "converted",
      source: "website_enquiry",
      createdAt: daysAgo(2),
      activities: [
        {
          action: "PATIENT_CONVERTED",
          details: "Ritu Verma converted to patient; 3-month comprehensive package active",
          createdAt: hoursAgo(2),
        },
      ],
    },
    {
      phone: "9100000018",
      fullName: "Arjun Mehta",
      email: "arjun.mehta@trigyna.test",
      serviceInterest: "Skin Treatment",
      status: "converted",
      source: "google_seo",
      createdAt: daysAgo(3),
    },
    {
      phone: "9100000019",
      fullName: "Pallavi Singh",
      email: "pallavi.singh@trigyna.test",
      serviceInterest: "Diet & Nutrition",
      status: "converted",
      source: "whatsapp",
      createdAt: daysAgo(3),
    },
    {
      phone: "9100000020",
      fullName: "Nikhil Tiwari",
      email: "nikhil.tiwari@trigyna.test",
      serviceInterest: "General Consultation",
      status: "converted",
      source: "walk_in",
      createdAt: daysAgo(5),
    },
  ];

  for (const sLead of signatureLeads) {
    let lead = await Lead.findOne({ phone: sLead.phone });
    const payload = {
      ...sLead,
      assignedTo: salesUser._id,
      consultationMode: "Online Video Consultation",
      priority: sLead.priority || "medium",
    };
    if (!lead) {
      await Lead.create(payload);
    } else {
      Object.assign(lead, payload);
      await lead.save();
    }
  }

  // 3. Complete dataset distribution to reach exact counts:
  // Target: New: 36, Contacted: 28, Interested: 18, Appointment: 12, Converted: 34 (Total: 128)
  const currentCounts = {
    new: await Lead.countDocuments({ status: "new" }),
    contacted: await Lead.countDocuments({ status: { $in: ["contacted", "contact_attempted", "assigned"] } }),
    interested: await Lead.countDocuments({ status: { $in: ["interested", "qualified"] } }),
    appointment: await Lead.countDocuments({ status: { $in: ["appointment", "appointment_booked", "consultation_booked"] } }),
    converted: await Lead.countDocuments({ status: "converted" }),
  };

  const needed = {
    new: Math.max(0, 36 - currentCounts.new),
    contacted: Math.max(0, 28 - currentCounts.contacted),
    interested: Math.max(0, 18 - currentCounts.interested),
    appointment: Math.max(0, 12 - currentCounts.appointment),
    converted: Math.max(0, 34 - currentCounts.converted),
  };

  console.log("Current status counts:", currentCounts);
  console.log("Needed leads per status:", needed);

  const services = ["PCOD Consultation", "Skin Treatment", "Hair Fall Treatment", "PCOS Program", "Diet & Nutrition", "Fertility Consultation", "General Consultation"];
  const sources = ["website_enquiry", "whatsapp", "instagram", "google_seo", "referral", "walk_in"];

  let basePhone = 9100001000;
  for (const [st, count] of Object.entries(needed)) {
    for (let i = 0; i < count; i++) {
      basePhone++;
      const srv = services[i % services.length];
      const src = sources[i % sources.length];
      const leadName = `Patient Lead ${basePhone % 1000}`;
      await Lead.create({
        fullName: leadName,
        phone: String(basePhone),
        email: `lead.${basePhone}@synthetic.trigyna.test`,
        serviceInterest: srv,
        status: st,
        source: src,
        consultationMode: "Online Video Consultation",
        assignedTo: salesUser._id,
        createdAt: daysAgo(Math.floor(Math.random() * 14) + 1),
      });
    }
  }

  // Verify total leads
  const finalTotal = await Lead.countDocuments();
  console.log(`--> Lead population complete. Total leads in MongoDB: ${finalTotal}`);

  // Seed or ensure paid invoice with ₹1,28,000 revenue
  const totalRev = await Invoice.aggregate([
    { $match: { status: "paid" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  if (!totalRev.length || totalRev[0].total < 128000) {
    let patient = await Patient.findOne();
    if (patient) {
      await Invoice.create({
        invoiceNumber: "INV-SLS-128K",
        patientId: patient._id,
        doctorId: doctor ? doctor._id : undefined,
        currency: "INR",
        subtotal: 128000,
        totalAmount: 128000,
        paidAmount: 128000,
        status: "paid",
        items: [{ description: "Healthcare Wellness & Clinical Package Subscriptions", amount: 128000, quantity: 1 }],
      });
      console.log("--> Created baseline paid invoice for ₹1,28,000 revenue");
    }
  }

  // Seed WhatsApp Conversations
  await WhatsAppConversation.deleteMany({});
  const priyaLead = await Lead.findOne({ fullName: "Priya Sharma" });
  const amitLead = await Lead.findOne({ fullName: "Amit Patel" });
  const nehaLead = await Lead.findOne({ fullName: "Neha Gupta" });
  const kritikaLead = await Lead.findOne({ fullName: "Kritika Sinha" });
  const vikasLead = await Lead.findOne({ fullName: "Vikas Singh" });

  await WhatsAppConversation.create([
    {
      conversationId: "WA-9100000001",
      customerPhone: "9100000001",
      customerName: "Priya Sharma",
      leadId: priyaLead ? priyaLead._id : undefined,
      assignedStaff: salesUser._id,
      status: "active",
      unreadCount: 1,
      lastMessage: {
        text: "Yes please, 11:00 AM slot works for me.",
        sender: "customer",
        timestamp: minutesAgo(2),
      },
      messages: [
        {
          messageId: "WAM-PRIYA-01",
          sender: "customer",
          senderName: "Priya Sharma",
          text: "Hello TriGyna, I need advice regarding PCOD irregular cycles and natural homeopathy remedies.",
          status: "read",
          timestamp: minutesAgo(30),
        },
        {
          messageId: "WAM-PRIYA-02",
          sender: "staff",
          senderName: "Sushil Kumar",
          text: "Hello Priya! Welcome to TriGyna Care Desk. We specialize in holistic root-cause management for PCOD. Would you prefer an online video consultation today?",
          status: "read",
          timestamp: minutesAgo(15),
        },
        {
          messageId: "WAM-PRIYA-03",
          sender: "customer",
          senderName: "Priya Sharma",
          text: "Yes please, 11:00 AM slot works for me.",
          status: "delivered",
          timestamp: minutesAgo(2),
        },
      ],
      internalNotes: [
        {
          note: "High intent patient. Wants PCOD 3-month comprehensive holistic care plan.",
          author: "Sushil Kumar",
          createdAt: minutesAgo(10),
        },
      ],
    },
    {
      conversationId: "WA-9100000005",
      customerPhone: "9100000005",
      customerName: "Amit Patel",
      leadId: amitLead ? amitLead._id : undefined,
      assignedStaff: salesUser._id,
      status: "active",
      unreadCount: 0,
      lastMessage: {
        text: "Thanks Sushil! Can you send me the payment link for the 3-month package?",
        sender: "customer",
        timestamp: minutesAgo(40),
      },
      messages: [
        {
          messageId: "WAM-AMIT-01",
          sender: "staff",
          senderName: "Sushil Kumar",
          text: "Hi Amit, sharing the details of our Chronic Skin & Eczema care package with you.",
          status: "read",
          timestamp: hoursAgo(2),
        },
        {
          messageId: "WAM-AMIT-02",
          sender: "customer",
          senderName: "Amit Patel",
          text: "Thanks Sushil! Can you send me the payment link for the 3-month package?",
          status: "read",
          timestamp: minutesAgo(40),
        },
      ],
    },
    {
      conversationId: "WA-9100000008",
      customerPhone: "9100000008",
      customerName: "Kritika Sinha",
      leadId: kritikaLead ? kritikaLead._id : undefined,
      assignedStaff: salesUser._id,
      status: "waiting",
      unreadCount: 0,
      lastMessage: {
        text: "Thank you, joining in 5 minutes!",
        sender: "customer",
        timestamp: minutesAgo(15),
      },
      messages: [
        {
          messageId: "WAM-KRITIKA-01",
          sender: "staff",
          senderName: "Sushil Kumar",
          text: "Dear Kritika, your online consultation with Dr. Anita Rao is confirmed for today at 11:00 AM. Meet link: https://meet.google.com/tg-care-meet",
          status: "read",
          timestamp: hoursAgo(1),
        },
        {
          messageId: "WAM-KRITIKA-02",
          sender: "customer",
          senderName: "Kritika Sinha",
          text: "Thank you, joining in 5 minutes!",
          status: "read",
          timestamp: minutesAgo(15),
        },
      ],
    },
    {
      conversationId: "WA-9100000006",
      customerPhone: "9100000006",
      customerName: "Neha Gupta",
      leadId: nehaLead ? nehaLead._id : undefined,
      assignedStaff: salesUser._id,
      status: "active",
      unreadCount: 2,
      lastMessage: {
        text: "Can I pay in two installments?",
        sender: "customer",
        timestamp: minutesAgo(10),
      },
      messages: [
        {
          messageId: "WAM-NEHA-01",
          sender: "customer",
          senderName: "Neha Gupta",
          text: "Hi Sushil, I reviewed the PCOS package brochure. What diet support is included?",
          status: "read",
          timestamp: minutesAgo(20),
        },
        {
          messageId: "WAM-NEHA-02",
          sender: "customer",
          senderName: "Neha Gupta",
          text: "Can I pay in two installments?",
          status: "delivered",
          timestamp: minutesAgo(10),
        },
      ],
    },
    {
      conversationId: "WA-9100000007",
      customerPhone: "9100000007",
      customerName: "Vikas Singh",
      leadId: vikasLead ? vikasLead._id : undefined,
      assignedStaff: salesUser._id,
      status: "waiting",
      unreadCount: 0,
      lastMessage: {
        text: "Glad to connect Vikas! Let us know if you need to reschedule or add previous lab reports.",
        sender: "staff",
        timestamp: hoursAgo(1),
      },
      messages: [
        {
          messageId: "WAM-VIKAS-01",
          sender: "customer",
          senderName: "Vikas Singh",
          text: "Hello, received the appointment reminder.",
          status: "read",
          timestamp: hoursAgo(2),
        },
        {
          messageId: "WAM-VIKAS-02",
          sender: "staff",
          senderName: "Sushil Kumar",
          text: "Glad to connect Vikas! Let us know if you need to reschedule or add previous lab reports.",
          status: "read",
          timestamp: hoursAgo(1),
        },
      ],
    },
  ]);
  console.log("--> Seeded 5 active WhatsApp conversation threads");

  // Seed Notifications
  await Notification.deleteMany({ recipientRole: { $in: ["sales", "crm", "all"] } });
  await Notification.create([
    {
      recipientId: salesUser._id,
      recipientRole: "sales",
      title: "New Inbound Lead: Priya Sharma",
      message: "Lead submitted inquiry for PCOD Consultation via Instagram Ad campaign.",
      type: "lead",
      read: false,
      link: "/sales/dashboard?tab=leads",
      createdAt: minutesAgo(2),
    },
    {
      recipientId: salesUser._id,
      recipientRole: "sales",
      title: "Appointment Confirmed: Kritika Sinha",
      message: "Online Video Consultation scheduled today at 11:00 AM with Dr. Anita Rao.",
      type: "appointment",
      read: false,
      link: "/sales/dashboard?tab=appointments",
      createdAt: minutesAgo(45),
    },
    {
      recipientId: salesUser._id,
      recipientRole: "sales",
      title: "Payment Received: ₹3,499",
      message: "Arjun Mehta completed payment for Skin Care Rejuvenation Package.",
      type: "billing",
      read: false,
      link: "/sales/dashboard?tab=invoices",
      createdAt: hoursAgo(2),
    },
    {
      recipientId: salesUser._id,
      recipientRole: "sales",
      title: "Follow-up Due: Neha Gupta",
      message: "Scheduled follow-up call today at 11:30 AM for PCOS Program closure.",
      type: "lead",
      read: true,
      link: "/sales/dashboard?tab=followups",
      createdAt: hoursAgo(3),
    },
    {
      recipientId: salesUser._id,
      recipientRole: "sales",
      title: "WhatsApp API Webhook Synced",
      message: "Meta Cloud API webhook is healthy with 99.8% delivery SLA.",
      type: "system",
      read: true,
      link: "/sales/dashboard?tab=whatsapp",
      createdAt: hoursAgo(5),
    },
  ]);
  console.log("--> Seeded 5 Sales & CRM notifications");

  console.log("--> Sales CRM seeding finished successfully!");
  await mongoose.disconnect();
}

if (require.main === module) {
  seedSalesDashboard()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedSalesDashboard };

