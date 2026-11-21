export interface FollowUpItem {
  _id: string;
  followUpCode: string;
  patientId?: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone: string;
    email?: string;
    gender?: string;
    age?: number;
    bloodGroup?: string;
    allergies?: string;
    clinicalFocus?: string;
    chronicConditions?: string;
    emergencyContact?: {
      name?: string;
      relation?: string;
      phone?: string;
    };
  };
  doctorId?: {
    _id: string;
    specialization?: string;
    consultationFee?: number;
    roomNumber?: string;
    userId?: {
      _id: string;
      name: string;
      phone?: string;
      email?: string;
      role?: string;
    };
  };
  appointmentId?: {
    _id: string;
    appointmentCode: string;
    scheduledDate: string;
    scheduledTime: string;
    serviceName: string;
    status?: string;
  };
  consultationId?: {
    _id: string;
    consultationCode: string;
    chiefComplaints?: string;
    clinicalNotes?: string;
    diagnoses?: string[];
    treatmentPlan?: string;
    prescriptions?: string;
    status?: string;
  };
  serviceName: string;
  dueDate: string;
  scheduledTime?: string;
  mode: string;
  status:
    | "scheduled"
    | "completed"
    | "missed"
    | "rescheduled"
    | "planned"
    | "pending"
    | "overdue"
    | "cancelled"
    | "in_progress";
  interval?: string;
  planInstructions?: string;
  outcome?: string;
  outcomeNotes?: string;
  recoveryStatus?:
    | "Improved"
    | "Significantly Improved"
    | "Stable"
    | "No Improvement"
    | "Requires Review"
    | "Treatment Adjusted"
    | "Referred"
    | "Pending Review";
  symptoms?: string;
  clinicalObservations?: string;
  assignedStaff?: string;
  completedAt?: string;
  completedBy?: {
    name?: string;
    email?: string;
    role?: string;
  };
  missedReason?: string;
  rescheduleHistory?: Array<{
    originalDate: string;
    originalTime?: string;
    newDate: string;
    newTime?: string;
    reason?: string;
    rescheduledBy?: {
      name?: string;
      role?: string;
    };
    createdAt: string;
  }>;
  reminders?: Array<{
    channel: "whatsapp" | "email" | "sms";
    status: "scheduled" | "sent" | "delivered" | "failed";
    scheduledFor?: string;
    sentAt?: string;
    recipient?: string;
    content?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpStats {
  totalFollowUps: number;
  totalChange: string;
  totalSubtitle: string;
  dueToday: number;
  dueTodaySubtitle: string;
  completed: number;
  completedChange: string;
  completedSubtitle: string;
  missedOverdue: number;
  missedOverdueSubtitle: string;
  tabCounts: {
    all: number;
    due_today: number;
    upcoming: number;
    overdue: number;
    completed: number;
    missed: number;
    rescheduled: number;
  };
}

export interface UpcomingItem {
  _id: string;
  followUpCode: string;
  patientName: string;
  patientCode: string;
  phone: string;
  date: string;
  time: string;
  displaySlot: string;
  mode: string;
  status: string;
}

export interface CalendarDayData {
  date: string;
  day: number;
  total: number;
  completed: number;
  scheduled: number;
  items: Array<{
    id: string;
    code: string;
    patientName: string;
    patientCode: string;
    mode: string;
    status: string;
    time: string;
  }>;
}

export interface CalendarResponse {
  year: number;
  month: number;
  totalEvents: number;
  days: Record<string, CalendarDayData>;
}

export interface OptionItem {
  _id: string;
  fullName?: string;
  name?: string;
  patientCode?: string;
  phone?: string;
  specialization?: string;
  userId?: { name: string; phone?: string; email?: string };
}
