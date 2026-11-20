const mongoose = require("mongoose");
const WhatsAppConversation = require("../modules/integrations/whatsapp.model");
const Lead = require("../modules/crm/lead.model");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");

async function seedReferenceConversations() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna");
  console.log("Connected to MongoDB for WhatsApp Reference Data Alignment...");

  // Find Admin Sushil Kumar
  let adminUser = await User.findOne({ role: "admin", name: "Sushil Kumar" });
  if (!adminUser) {
    adminUser = await User.findOne({ role: "admin" }) || await User.findOne({ role: "owner" });
  }

  // 1. Priya Sharma (+91 98765 43210)
  const priyaPhone = "9876543210";
  let priyaLead = await Lead.findOne({ phone: priyaPhone });
  if (!priyaLead) {
    priyaLead = await Lead.create({
      leadCode: "LD-987654",
      fullName: "Priya Sharma",
      phone: priyaPhone,
      serviceInterest: "Hair Treatment",
      status: "new",
      priority: "medium",
      source: "whatsapp",
      assignedTo: adminUser?._id,
      tags: ["New Lead", "Hair Treatment", "WhatsApp Enquiry"],
      notes: [{ body: "Interested in PRP & Hair Fall control treatments. High intent.", createdBy: adminUser?._id }],
    });
  } else {
    priyaLead.serviceInterest = "Hair Treatment";
    priyaLead.status = "new";
    priyaLead.priority = "medium";
    priyaLead.assignedTo = adminUser?._id;
    priyaLead.tags = ["New Lead", "Hair Treatment"];
    await priyaLead.save();
  }

  let priyaConv = await WhatsAppConversation.findOne({ customerPhone: priyaPhone });
  const priyaMessages = [
    {
      messageId: "WAM-PRIYA-REF-01",
      sender: "customer",
      senderName: "Priya Sharma",
      text: "Hi, I'm interested in a hair treatment. Can you share more details?",
      status: "read",
      mediaType: "text",
      timestamp: new Date("2026-10-31T10:10:00.000Z"),
    },
    {
      messageId: "WAM-PRIYA-REF-02",
      sender: "staff",
      senderName: "Sushil Kumar",
      text: "Hello Priya 👋\nThanks for reaching out to TriGyna Health & Wellness.\n\nWe offer personalized hair treatment plans including hair fall control, regrowth therapies, and PRP.\nWould you like to book a consultation with our specialist?",
      status: "read",
      mediaType: "text",
      timestamp: new Date("2026-10-31T10:14:00.000Z"),
    },
    {
      messageId: "WAM-PRIYA-REF-03",
      sender: "customer",
      senderName: "Priya Sharma",
      text: "Yes, I would like to book a consultation for this week.",
      status: "delivered",
      mediaType: "text",
      timestamp: new Date("2026-10-31T10:24:00.000Z"),
    },
    {
      messageId: "WAM-PRIYA-REF-04",
      sender: "staff",
      senderName: "TriGyna Care Desk",
      text: "Book Consultation\nSelect a convenient slot for your visit.",
      status: "read",
      mediaType: "interactive",
      interactiveData: {
        action: "book_appointment",
        title: "Book Consultation",
        subtitle: "Select a convenient slot for your visit.",
        buttonText: "View Available Slots",
      },
      timestamp: new Date("2026-10-31T10:24:30.000Z"),
    },
  ];

  if (!priyaConv) {
    priyaConv = await WhatsAppConversation.create({
      conversationId: `WA-${priyaPhone}`,
      customerPhone: priyaPhone,
      customerName: "Priya Sharma",
      leadId: priyaLead._id,
      assignedStaff: adminUser?._id,
      status: "active",
      serviceInterest: "Hair Treatment",
      priority: "medium",
      starred: false,
      tags: ["Hair Treatment", "New Inquiry"],
      unreadCount: 2,
      lastMessage: {
        text: "Yes, I would like to book a consultation...",
        sender: "customer",
        timestamp: new Date("2026-10-31T10:24:00.000Z"),
      },
      messages: priyaMessages,
      internalNotes: [
        {
          note: "Prospective patient seeking hair restoration consultation in Prayagraj. Suggested Dr. Rajesh Mehta.",
          author: "Sushil Kumar",
          createdAt: new Date("2026-10-31T10:15:00.000Z"),
        },
      ],
    });
  } else {
    priyaConv.customerName = "Priya Sharma";
    priyaConv.leadId = priyaLead._id;
    priyaConv.assignedStaff = adminUser?._id;
    priyaConv.status = "active";
    priyaConv.serviceInterest = "Hair Treatment";
    priyaConv.priority = "medium";
    priyaConv.tags = ["Hair Treatment", "New Inquiry"];
    priyaConv.unreadCount = 2;
    priyaConv.lastMessage = {
      text: "Yes, I would like to book a consultation...",
      sender: "customer",
      timestamp: new Date("2026-10-31T10:24:00.000Z"),
    };
    priyaConv.messages = priyaMessages;
    await priyaConv.save();
  }

  // 2. Rohan Mehta (+91 98765 43211)
  const rohanPhone = "9876543211";
  let rohanLead = await Lead.findOne({ phone: rohanPhone });
  if (!rohanLead) {
    rohanLead = await Lead.create({
      leadCode: "LD-987655",
      fullName: "Rohan Mehta",
      phone: rohanPhone,
      serviceInterest: "Fertility Treatment",
      status: "interested",
      priority: "high",
      source: "whatsapp",
      assignedTo: adminUser?._id,
      tags: ["Inquiry", "Fertility"],
    });
  }

  let rohanConv = await WhatsAppConversation.findOne({ customerPhone: rohanPhone });
  const rohanMessages = [
    {
      messageId: "WAM-ROHAN-01",
      sender: "customer",
      senderName: "Rohan Mehta",
      text: "Do you have any fertility treatment options?",
      status: "delivered",
      mediaType: "text",
      timestamp: new Date("2026-10-31T09:58:00.000Z"),
    },
  ];

  if (!rohanConv) {
    rohanConv = await WhatsAppConversation.create({
      conversationId: `WA-${rohanPhone}`,
      customerPhone: rohanPhone,
      customerName: "Rohan Mehta",
      leadId: rohanLead._id,
      assignedStaff: adminUser?._id,
      status: "active",
      serviceInterest: "Fertility Treatment",
      priority: "high",
      starred: false,
      tags: ["Inquiry", "Fertility"],
      unreadCount: 1,
      lastMessage: {
        text: "Do you have any fertility treatment options?",
        sender: "customer",
        timestamp: new Date("2026-10-31T09:58:00.000Z"),
      },
      messages: rohanMessages,
    });
  } else {
    rohanConv.customerName = "Rohan Mehta";
    rohanConv.serviceInterest = "Fertility Treatment";
    rohanConv.priority = "high";
    rohanConv.tags = ["Inquiry", "Fertility"];
    rohanConv.unreadCount = 1;
    rohanConv.lastMessage = {
      text: "Do you have any fertility treatment options?",
      sender: "customer",
      timestamp: new Date("2026-10-31T09:58:00.000Z"),
    };
    rohanConv.messages = rohanMessages;
    await rohanConv.save();
  }

  // 3. Neha Gupta (+91 98765 43212)
  const nehaPhone = "9876543212";
  let nehaLead = await Lead.findOne({ phone: nehaPhone });
  if (!nehaLead) {
    nehaLead = await Lead.create({
      leadCode: "LD-987656",
      fullName: "Neha Gupta",
      phone: nehaPhone,
      serviceInterest: "General Consultation",
      status: "contacted",
      priority: "medium",
      source: "whatsapp",
      assignedTo: adminUser?._id,
      tags: ["Follow-up", "General"],
    });
  }

  let nehaConv = await WhatsAppConversation.findOne({ customerPhone: nehaPhone });
  const nehaMessages = [
    {
      messageId: "WAM-NEHA-REF-01",
      sender: "customer",
      senderName: "Neha Gupta",
      text: "What are the consultation charges?",
      status: "read",
      mediaType: "text",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000),
    },
  ];

  if (!nehaConv) {
    nehaConv = await WhatsAppConversation.create({
      conversationId: `WA-${nehaPhone}`,
      customerPhone: nehaPhone,
      customerName: "Neha Gupta",
      leadId: nehaLead._id,
      assignedStaff: adminUser?._id,
      status: "active",
      serviceInterest: "General Consultation",
      priority: "medium",
      tags: ["Follow-up", "General"],
      unreadCount: 0,
      lastMessage: {
        text: "What are the consultation charges?",
        sender: "customer",
        timestamp: new Date(Date.now() - 24 * 3600 * 1000),
      },
      messages: nehaMessages,
    });
  } else {
    nehaConv.customerName = "Neha Gupta";
    nehaConv.serviceInterest = "General Consultation";
    nehaConv.tags = ["Follow-up", "General"];
    nehaConv.lastMessage = {
      text: "What are the consultation charges?",
      sender: "customer",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000),
    };
    await nehaConv.save();
  }

  // 4. Ankit Verma (+91 98765 43213)
  const ankitPhone = "9876543213";
  let ankitLead = await Lead.findOne({ phone: ankitPhone });
  if (!ankitLead) {
    ankitLead = await Lead.create({
      leadCode: "LD-987657",
      fullName: "Ankit Verma",
      phone: ankitPhone,
      serviceInterest: "Consultation Booking",
      status: "appointment_requested",
      priority: "medium",
      source: "whatsapp",
      assignedTo: adminUser?._id,
      tags: ["Appointment", "Consultation"],
    });
  }

  let ankitConv = await WhatsAppConversation.findOne({ customerPhone: ankitPhone });
  const ankitMessages = [
    {
      messageId: "WAM-ANKIT-REF-01",
      sender: "customer",
      senderName: "Ankit Verma",
      text: "Please share available slots for this week.",
      status: "read",
      mediaType: "text",
      timestamp: new Date(Date.now() - 28 * 3600 * 1000),
    },
  ];

  if (!ankitConv) {
    ankitConv = await WhatsAppConversation.create({
      conversationId: `WA-${ankitPhone}`,
      customerPhone: ankitPhone,
      customerName: "Ankit Verma",
      leadId: ankitLead._id,
      assignedStaff: adminUser?._id,
      status: "active",
      serviceInterest: "Consultation Booking",
      priority: "medium",
      tags: ["Appointment", "Consultation"],
      unreadCount: 0,
      lastMessage: {
        text: "Please share available slots for this week.",
        sender: "customer",
        timestamp: new Date(Date.now() - 28 * 3600 * 1000),
      },
      messages: ankitMessages,
    });
  } else {
    ankitConv.customerName = "Ankit Verma";
    ankitConv.tags = ["Appointment", "Consultation"];
    ankitConv.lastMessage = {
      text: "Please share available slots for this week.",
      sender: "customer",
      timestamp: new Date(Date.now() - 28 * 3600 * 1000),
    };
    await ankitConv.save();
  }

  // 5. Sneha Kapoor (+91 98765 43214)
  const snehaPhone = "9876543214";
  let snehaLead = await Lead.findOne({ phone: snehaPhone });
  if (!snehaLead) {
    snehaLead = await Lead.create({
      leadCode: "LD-987658",
      fullName: "Sneha Kapoor",
      phone: snehaPhone,
      serviceInterest: "Hair Treatment",
      status: "closed",
      priority: "low",
      source: "whatsapp",
      assignedTo: adminUser?._id,
      tags: ["Closed", "Hair Treatment"],
    });
  }

  let snehaConv = await WhatsAppConversation.findOne({ customerPhone: snehaPhone });
  const snehaMessages = [
    {
      messageId: "WAM-SNEHA-REF-01",
      sender: "customer",
      senderName: "Sneha Kapoor",
      text: "Thanks! I'll confirm by today.",
      status: "read",
      mediaType: "text",
      timestamp: new Date("2026-10-27T14:30:00.000Z"),
    },
  ];

  if (!snehaConv) {
    snehaConv = await WhatsAppConversation.create({
      conversationId: `WA-${snehaPhone}`,
      customerPhone: snehaPhone,
      customerName: "Sneha Kapoor",
      leadId: snehaLead._id,
      assignedStaff: adminUser?._id,
      status: "closed",
      serviceInterest: "Hair Treatment",
      priority: "low",
      tags: ["Closed", "Hair Treatment"],
      unreadCount: 0,
      lastMessage: {
        text: "Thanks! I'll confirm by today.",
        sender: "customer",
        timestamp: new Date("2026-10-27T14:30:00.000Z"),
      },
      messages: snehaMessages,
    });
  } else {
    snehaConv.customerName = "Sneha Kapoor";
    snehaConv.tags = ["Closed", "Hair Treatment"];
    snehaConv.lastMessage = {
      text: "Thanks! I'll confirm by today.",
      sender: "customer",
      timestamp: new Date("2026-10-27T14:30:00.000Z"),
    };
    await snehaConv.save();
  }

  console.log("Successfully seeded and aligned reference WhatsApp conversations in MongoDB!");
  await mongoose.disconnect();
}

seedReferenceConversations().catch(console.error);
