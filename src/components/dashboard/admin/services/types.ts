export interface ServiceDoctor {
  _id: string;
  name: string;
  specialization: string[];
  qualifications?: string;
  consultationFee?: number;
  avatarUrl?: string;
  status: string;
  experienceYears?: string;
}

export interface ServiceItem {
  _id: string;
  code: string;
  name: string;
  slug: string;
  category: string;
  department?: string;
  durationMinutes: number;
  baseFee: number;
  discountFee?: number;
  taxRate?: number;
  consultationType: "in_person" | "online" | "both";
  status: "active" | "draft" | "inactive";
  isPublished: boolean;
  imageUrl?: string;
  description?: string;
  shortDescription?: string;
  assignedDoctors?: ServiceDoctor[];
  features?: string[];
  bookingCount?: number;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceCategoryItem {
  _id?: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  sortOrder: number;
  servicesCount?: number;
  status?: "active" | "inactive";
}

export interface PackageItem {
  _id: string;
  name: string;
  slug: string;
  category?: string;
  description: string;
  pricePaise: number;
  originalPricePaise?: number;
  priceRupees?: string;
  originalPriceRupees?: string;
  currency: string;
  totalSessions: number;
  sessionDurationMinutes: number;
  validityDays: number;
  consultationMode: "Online Video Consultation" | "In-Clinic Consultation" | "Both (In-Person & Online)";
  features: string[];
  isPublished: boolean;
  status?: "active" | "draft" | "inactive";
  subscribersCount?: number;
  createdAt?: string;
}

export interface CatalogueStats {
  totalServices: number;
  servicesAddedThisMonth: number;
  totalPackages: number;
  packagesAddedThisMonth: number;
  activeBookings: number;
  activeBookingsGrowth: string;
  serviceRevenue: number;
  serviceRevenueGrowth: string;
}

export interface DoctorOption {
  _id: string;
  name: string;
  specialization: string[];
  qualifications: string;
  experienceYears: string;
  status: string;
}

