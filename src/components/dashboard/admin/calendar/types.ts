export type CalendarViewMode = "month" | "week" | "day" | "agenda";

export type EventCategory =
  | "appointment"
  | "followup"
  | "doctor_session"
  | "staff_leave"
  | "task"
  | "institutional";

export type EventColor = "blue" | "green" | "purple" | "red" | "amber" | "gray";

export interface CalendarEvent {
  id: string;
  rawId: string;
  sourceType: EventCategory;
  title: string;
  badgeTitle?: string;
  serviceName?: string;
  description?: string;
  date: string; // "YYYY-MM-DD"
  endDate?: string;
  startTime: string; // e.g. "09:00 AM"
  endTime: string;
  allDay: boolean;
  status: string;
  category: EventCategory;
  color: EventColor;
  referenceCode?: string;
  mode?: string;
  interval?: string;
  priority?: string;
  patient?: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone?: string;
    gender?: string;
    age?: number;
  } | null;
  doctor?: {
    _id: string;
    name: string;
    specialization?: string[];
    consultationFee?: number;
  } | null;
  staff?: {
    _id: string;
    name: string;
    employeeCode?: string;
    department?: string;
    role?: string;
  } | null;
  branch?: {
    name: string;
  } | null;
  paymentStatus?: string;
  meetingLink?: string;
  details?: string;
  permissions?: {
    canEdit?: boolean;
    canReschedule?: boolean;
    canCancel?: boolean;
    canComplete?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  rescheduleHistory?: Array<{
    previousDate?: string;
    newDate?: string;
    rescheduledAt?: string;
    reason?: string;
  }>;
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  actorRole?: string;
  actorId?: { name?: string; role?: string; email?: string };
  details?: { reason?: string; appointmentCode?: string };
  timestamp?: string;
  createdAt?: string;
}

export interface CalendarStats {
  appointments: {
    total: number;
    delta: string;
    breakdown: { completed: number; scheduled: number };
  };
  followups: {
    total: number;
    delta: string;
    breakdown: { completed: number; pending: number };
  };
  doctorSessions: {
    total: number;
    activeDoctors: number;
  };
  staffLeaves: {
    total: number;
  };
  otherTasks: {
    total: number;
    tasks: number;
    events: number;
  };
  period: {
    year: number;
    month: number;
    monthName: string;
    startDate: string;
    endDate: string;
  };
}

export interface CalendarStreamsState {
  appointments: boolean;
  followups: boolean;
  doctorSessions: boolean;
  staffLeaves: boolean;
  clinicalTasks: boolean;
  administrativeEvents: boolean;
}

export interface CalendarFilterState {
  doctorId: string;
  staffId: string;
  patientId: string;
  status: string;
  search: string;
}

export interface ImportedCalendarEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType: string;
}
