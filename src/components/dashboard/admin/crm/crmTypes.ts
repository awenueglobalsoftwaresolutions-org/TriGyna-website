export interface CrmLead {
  _id: string;
  leadCode?: string;
  fullName: string;
  phone: string;
  email?: string;
  serviceInterest: string;
  consultationMode?: string;
  message?: string;
  source: string;
  campaign?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status:
    | "new"
    | "contacted"
    | "interested"
    | "qualified"
    | "consultation_booked"
    | "consultation_completed"
    | "converted"
    | "nurture"
    | "lost"
    | "appointment_booked"
    | string;
  lostReason?: string;
  assignedTo?: { _id: string; name: string; email?: string; phone?: string };
  followUpDate?: string;
  notes?: Array<{ _id: string; body: string; createdBy?: { name: string }; createdAt: string }>;
  tasks?: Array<{
    _id: string;
    title: string;
    dueDate: string;
    priority: string;
    status: string;
    notes?: string;
    createdAt: string;
  }>;
  activities?: Array<{
    _id: string;
    action: string;
    details?: string;
    performedBy?: { name: string };
    createdAt: string;
  }>;
  stageHistory?: Array<{
    _id: string;
    fromStage?: string;
    toStage: string;
    changedBy?: { name: string };
    reason?: string;
    changedAt: string;
  }>;
  communications?: Array<{
    _id: string;
    channel: string;
    direction: string;
    content: string;
    status: string;
    timestamp: string;
  }>;
  convertedPatientId?: { _id: string; patientCode: string; fullName: string; phone?: string };
  convertedAppointmentId?: {
    _id: string;
    appointmentCode: string;
    appointmentDate: string;
    startTime: string;
    status: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface CrmKpis {
  totalLeads: number;
  totalLeadsGrowth?: string;
  newLeads: number;
  newLeadsGrowth?: string;
  followUpsDue: number;
  highPriorityFollowUps?: number;
  consultationsBooked: number;
  consultationsGrowth?: string;
  convertedLeads: number;
  conversionRate: number;
}

export type CrmTabType =
  | "overview"
  | "pipeline"
  | "all_leads"
  | "followups"
  | "tasks"
  | "campaigns"
  | "reports";

export interface FollowUpItem {
  _id: string;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  leadService?: string;
  leadStatus?: string;
  title?: string;
  dueDate: string;
  priority?: string;
  status?: string;
  notes?: string;
  time?: string;
  assignedTo?: { _id?: string; name?: string };
}

export interface CrmTaskItem {
  _id: string;
  leadId?: string;
  leadName?: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  status: "open" | "completed" | "cancelled" | string;
  dueDate?: string;
}

export interface LeadSourceItem {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SalesUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  totalAssigned?: number;
}

export interface ServiceItem {
  _id: string;
  name: string;
  category?: string;
  price?: number;
  description?: string;
}

export interface PipelineColumn {
  id: string;
  name: string;
  color: string;
  badgeBg: string;
  dotColor: string;
  count: number;
  leads: CrmLead[];
}
