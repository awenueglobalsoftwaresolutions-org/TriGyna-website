export interface SalesOverviewKpis {
  activeReps: {
    value: number;
    changeText: string;
    trend: "up" | "down" | "neutral";
  };
  teamConversionRate: {
    value: string;
    rawPercentage: number;
    changeText: string;
    trend: "up" | "down" | "neutral";
  };
  totalLeads: {
    value: number;
    changeText: string;
    trend: "up" | "down" | "neutral";
  };
  convertedLeads: {
    value: number;
    changeText: string;
    trend: "up" | "down" | "neutral";
  };
}

export interface PerformanceTrendData {
  labels: string[];
  leadsSeries: number[];
  conversionsSeries: number[];
  rawMonthly?: Array<{
    month: string;
    monthNum: number;
    year: number;
    monthlyLeads: number;
    monthlyConversions: number;
    cumulativeLeads: number;
    cumulativeConversions: number;
  }>;
}

export interface QuotaProgressData {
  targetLeads: number;
  achieved: number;
  remaining: number;
  percentage: number;
  overachievement?: number;
  periodLabel?: string;
}

export interface SalesRepresentativeItem {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  isTeamLead: boolean;
  salesRole: string;
  branchName: string;
  membershipStatus: "active" | "inactive" | "suspended";
  totalLeads: number;
  converted: number;
  conversionRate: number;
  monthlyTarget: number;
  progress: number;
  status: "Top Performer" | "On Track" | "Needs Attention" | "Inactive";
  employeeCode?: string;
  department?: string;
  startDate?: string;
}

export interface SalesTargetItem {
  _id: string;
  title: string;
  targetType: "individual" | "team" | "branch" | "quarterly";
  employeeId?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  branchName?: string;
  targetMetric: "conversions" | "leads" | "revenue";
  targetValue: number;
  achievedValue: number;
  remainingValue: number;
  percentage: number;
  periodMonth: number;
  periodYear: number;
  status: "active" | "completed" | "archived";
  createdAt: string;
}

export interface UnassignedLeadItem {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  serviceInterest: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  createdAt: string;
}

export interface RepDistributionItem {
  memberId: string;
  userId: string;
  name: string;
  branchName: string;
  salesRole: string;
  totalLeads: number;
  converted: number;
  inProgress: number;
}

export interface LeadDistributionData {
  totalAssigned: number;
  unassignedCount: number;
  unassignedLeads: UnassignedLeadItem[];
  reps: RepDistributionItem[];
  branches: Array<{ _id: string; memberCount: number }>;
}

export interface SalesActivityItem {
  id: string;
  type: "AUDIT" | "ASSIGNMENT";
  action: string;
  details?: Record<string, unknown> | any;
  actorName: string;
  timestamp: string;
}

export interface SalesTeamSettingsData {
  teamName: string;
  teamDescription: string;
  teamLeaderId?: {
    _id: string;
    name: string;
    email: string;
  };
  branch: string;
  monthlyTeamTarget: number;
  defaultIndividualTarget: number;
  assignmentRules: string;
  performanceCalculationSettings?: {
    attributionWindowDays: number;
    countReassignedConversionsTo: string;
  };
  notificationPreferences?: {
    notifyOnNewLead: boolean;
    notifyOnReassign: boolean;
    notifyOnTargetAchieved: boolean;
    channels: {
      inApp: boolean;
      email: boolean;
      whatsapp: boolean;
    };
  };
}

export interface CandidateStaffItem {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  designation: string;
  employeeCode: string;
  isEmployee: boolean;
}

export type SalesTeamNavTabKey =
  | "overview"
  | "members"
  | "performance"
  | "targets"
  | "distribution"
  | "activity";
