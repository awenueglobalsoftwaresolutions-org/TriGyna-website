import { getBaseUrl } from "./client";

export interface AssignedDoctorInfo {
  _id: string;
  userId?: { _id?: string; name: string; phone?: string; email?: string };
  specialization: string[];
  qualifications?: string;
  avatarUrl?: string;
  consultationFee?: number;
  bio?: string;
  experienceYears?: string;
  rating?: number;
  consultationModes?: string[];
}

export interface PublicService {
  _id: string;
  code: string;
  name: string;
  slug: string;
  category: string;
  department?: string;
  durationMinutes: number;
  baseFee: number;
  discountFee?: number;
  consultationType: "in_person" | "online" | "both";
  status: "active" | "draft" | "inactive";
  isPublished: boolean;
  imageUrl?: string;
  description?: string;
  shortDescription?: string;
  features?: string[];
  preparationInstructions?: string;
  assignedDoctors?: AssignedDoctorInfo[];
}

export interface PublicPackage {
  _id: string;
  name: string;
  slug: string;
  category?: string;
  description: string;
  pricePaise: number;
  originalPricePaise?: number;
  priceRupees?: string;
  originalPriceRupees?: string;
  totalSessions: number;
  sessionDurationMinutes: number;
  validityDays: number;
  consultationMode: string;
  features: string[];
  isPublished: boolean;
}

export interface PublicCategory {
  name: string;
  slug: string;
  icon: string;
  description?: string;
  servicesCount?: number;
}

// Master fallback catalog ensuring 100% build reliability when API is offline during SSG
const masterFallbackServices: PublicService[] = [
  {
    _id: "srv-fallback-01",
    code: "SRV-GYN-01",
    name: "Comprehensive Gynecological Consultation",
    slug: "comprehensive-gynecological-consultation",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1200,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "In-depth clinical gynecological assessment including ultrasound review, pelvic exam guidance, and constitutional care.",
    features: ["Pelvic health review", "Doctor consultation 30 mins", "Digital prescription", "7-day follow-up review"],
  },
  {
    _id: "srv-fallback-02",
    code: "SRV-ANTE-01",
    name: "Antenatal Trimester Checkup",
    slug: "antenatal-trimester-checkup",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1400,
    consultationType: "in_person",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/approach-plant.jpg",
    description: "Routine pregnancy monitoring, fetal growth assessment, vitals check, and maternal nutrition advice.",
    features: ["Fetal Doppler listening", "Maternal vitals tracking", "Safe homoeopathic therapeutics", "Dietary chart"],
  },
  {
    _id: "srv-fallback-03",
    code: "SRV-GYN-02",
    name: "Postnatal Recovery & Lactation Guidance",
    slug: "postnatal-recovery-lactation-guidance",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1100,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "Holistic care for new mothers focusing on pelvic floor toning, lactation support, and postnatal emotional wellness.",
    features: ["Lactation assessment", "Pelvic recovery exercises", "Constitutional remedies", "Nutrition blueprint"],
  },
  {
    _id: "srv-fallback-04",
    code: "SRV-GYN-03",
    name: "Menopause & Perimenopause Transitional Care",
    slug: "menopause-perimenopause-transitional-care",
    category: "Gynecology & Obstetrics",
    durationMinutes: 45,
    baseFee: 1600,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/clinic-interior.jpg",
    description: "Managing hot flashes, bone density concerns, mood variations, and hormonal shifts through natural protocols.",
    features: ["Endocrine hormone mapping", "Bone metabolism advice", "Natural sleep restoration", "Homoeopathic support"],
  },
  {
    _id: "srv-fallback-05",
    code: "SRV-GYN-04",
    name: "Adolescent Puberty & Menstrual Health",
    slug: "adolescent-puberty-menstrual-health",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 950,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/approach-plant.jpg",
    description: "Compassionate guidance for teenagers experiencing irregular periods, dysmenorrhea, or teenage acne.",
    features: ["Gentle non-invasive consultation", "Parent-teen counselling", "Hormonal rhythm correction", "Dietary alignment"],
  },
  {
    _id: "srv-fallback-06",
    code: "SRV-GYN-05",
    name: "Cervical & Breast Cancer Screening Review",
    slug: "cervical-breast-cancer-screening-review",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1500,
    consultationType: "in_person",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "Clinical breast examination, Pap smear guidance, HPV counselling, and risk stratification.",
    features: ["Clinical physical screening", "Diagnostic test interpretation", "Risk mitigation plan", "Lifestyle advice"],
  },
  {
    _id: "srv-fallback-07",
    code: "SRV-GYN-06",
    name: "Recurrent Vaginitis & UTI Holistic Clinic",
    slug: "recurrent-vaginitis-uti-holistic-clinic",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1100,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/clinic-interior.jpg",
    description: "Breaking the cycle of antibiotic resistance with gut-vaginal microbiome restoration and constitutional therapy.",
    features: ["Microbiome analysis", "Non-antibiotic prevention", "Bladder mucosa healing", "Follow-up schedule"],
  },
  {
    _id: "srv-fallback-08",
    code: "SRV-GYN-07",
    name: "Chronic Pelvic Pain & Endometriosis Workup",
    slug: "chronic-pelvic-pain-endometriosis-workup",
    category: "Gynecology & Obstetrics",
    durationMinutes: 45,
    baseFee: 1800,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/approach-plant.jpg",
    description: "Deep-dive diagnostic evaluation for severe dysmenorrhea, adenomyosis, and chronic pelvic inflammation.",
    features: ["Pain pathway assessment", "Anti-inflammatory dietary protocol", "Systemic immune modulation", "Doctor follow-up"],
  },
  {
    _id: "srv-fallback-09",
    code: "SRV-PCOS-01",
    name: "PCOS & Metabolic Health Evaluation",
    slug: "pcos-metabolic-health-evaluation",
    category: "Reproductive & Hormonal Wellness",
    durationMinutes: 45,
    baseFee: 1500,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "Comprehensive 45-minute root-cause assessment for insulin resistance, hirsutism, cystic ovaries, and cycle delay.",
    features: ["LH:FSH & insulin analysis", "Acne & androgenic grading", "Custom homoeopathic regimen", "4-week follow up"],
  },
  {
    _id: "srv-fallback-10",
    code: "SRV-THY-01",
    name: "Thyroid & Hypothyroidism Constitutional Care",
    slug: "thyroid-hypothyroidism-constitutional-care",
    category: "Reproductive & Hormonal Wellness",
    durationMinutes: 30,
    baseFee: 1200,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/clinic-interior.jpg",
    description: "Addressing Hashimoto's antibodies, sluggish metabolism, weight plateaus, and cold intolerance naturally.",
    features: ["Thyroid panel interpretation", "Metabolic rate optimization", "Autoimmune balancing", "Constitutional drops"],
  },
  {
    _id: "srv-fallback-11",
    code: "SRV-DRM-01",
    name: "Clinical Dermatology & Hair Analysis",
    slug: "clinical-dermatology-hair-analysis",
    category: "Dermatology & Cosmetology",
    durationMinutes: 30,
    baseFee: 2000,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "Comprehensive trichoscopy and skin barrier diagnosis for persistent acne, melasma, alopecia, and scalp eczema.",
    features: ["Dermatoscopy review", "Hormonal acne protocol", "Scalp barrier rehabilitation", "Homoeopathic remedies"],
  },
  {
    _id: "srv-fallback-12",
    code: "SRV-IVF-01",
    name: "Natural Conception & Pre-Conception Counseling",
    slug: "natural-conception-pre-conception-counseling",
    category: "Fertility & IVF",
    durationMinutes: 45,
    baseFee: 1800,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/approach-plant.jpg",
    description: "Couples fertility assessment, follicular timing, endometrial receptivity priming, and sperm motility enhancement.",
    features: ["Ovulation tracking advice", "Ovarian reserve evaluation", "Male factor homoeopathy", "Detox regimen"],
  },
  {
    _id: "srv-fallback-13",
    code: "SRV-PREV-01",
    name: "Annual Executive Women's Health Audit",
    slug: "annual-executive-womens-health-audit",
    category: "Preventive Health & Checkups",
    durationMinutes: 60,
    baseFee: 2500,
    consultationType: "in_person",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/clinic-interior.jpg",
    description: "Comprehensive head-to-toe 60-minute health audit covering cardiovascular risk, hormonal profile, bone mineral markers, and liver panels.",
    features: ["Full body vitals review", "ECG & blood panel audit", "Physician review 60 mins", "Annual wellness roadmap"],
  },
  {
    _id: "srv-fallback-14",
    code: "SRV-NUT-01",
    name: "Therapeutic Clinical Nutrition & Gut Reset",
    slug: "therapeutic-clinical-nutrition-gut-reset",
    category: "Nutrition & Lifestyle",
    durationMinutes: 45,
    baseFee: 1200,
    consultationType: "both",
    status: "active",
    isPublished: true,
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "Targeted elimination-reintroduction nutritional protocols for IBS, food sensitivities, leaky gut, and metabolic sluggishness.",
    features: ["Microbiome dietary assessment", "Custom weekly meal planner", "Supplement elimination strategy", "WhatsApp food log audit"],
  },
];

export async function getPublicServices(): Promise<PublicService[]> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/services?limit=100`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.data?.services && json.data.services.length > 0) {
      return json.data.services;
    }
  } catch {
    // API unavailable or prerendering
  }
  return masterFallbackServices;
}

export async function getPublicPackages(): Promise<PublicPackage[]> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/packages`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.data?.packages && json.data.packages.length > 0) {
      return json.data.packages;
    }
  } catch {
    // API unavailable or prerendering
  }
  return [
    {
      _id: "pkg-pcod-default",
      name: "PCOD/PCOS 3-Month Holistic Care",
      slug: "pcod-pcos-3-month-holistic-care",
      category: "Reproductive & Hormonal Wellness",
      description: "Complete natural reversal protocol addressing root causes: insulin, androgens, and ovulatory cycles.",
      pricePaise: 399900,
      originalPricePaise: 600000,
      totalSessions: 6,
      sessionDurationMinutes: 45,
      validityDays: 90,
      consultationMode: "Both (In-Person & Online)",
      features: [
        "6 Consultations with Homoeopath & Gynecologist",
        "Personalized Metabolic Diet Chart",
        "Bi-weekly Cycle & Symptom Tracking",
        "Priority WhatsApp Doctor Hotline",
      ],
      isPublished: true,
    },
    {
      _id: "pkg-skin-default",
      name: "Skin & Hair Renewal Program",
      slug: "skin-hair-renewal-program",
      category: "Dermatology & Cosmetology",
      description: "Targeted internal therapeutics for hormonal acne, scalp renewal, and hair fall arrest.",
      pricePaise: 249900,
      originalPricePaise: 450000,
      totalSessions: 3,
      sessionDurationMinutes: 30,
      validityDays: 60,
      consultationMode: "Both (In-Person & Online)",
      features: [
        "3 Tricho-Derm Consultations",
        "Customized Constitutional Formulations",
        "Scalp & Skin Progress Photologging",
      ],
      isPublished: true,
    },
    {
      _id: "pkg-wellness-default",
      name: "Complete Women's Wellness & Hormonal Balance",
      slug: "complete-womens-wellness-hormonal-balance",
      category: "Wellness Programmes",
      description: "The ultimate 6-month journey covering complete endocrine, emotional, and physical vitality.",
      pricePaise: 599900,
      originalPricePaise: 950000,
      totalSessions: 10,
      sessionDurationMinutes: 45,
      validityDays: 180,
      consultationMode: "Both (In-Person & Online)",
      features: [
        "10 Specialist Clinical Sessions",
        "Full Body Vitals & Hormone Audits",
        "Quarterly Diet & Lifestyle Readjustment",
      ],
      isPublished: true,
    },
  ];
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/services/categories`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.data?.categories) {
      return json.data.categories;
    }
  } catch {
    // fallback
  }
  return [
    { name: "Gynecology & Obstetrics", slug: "gynecology-obstetrics", icon: "Venus", servicesCount: 8 },
    { name: "Reproductive & Hormonal Wellness", slug: "reproductive-hormonal-wellness", icon: "Heart", servicesCount: 4 },
    { name: "Dermatology & Cosmetology", slug: "dermatology-cosmetology", icon: "Sparkles", servicesCount: 3 },
    { name: "Fertility & IVF", slug: "fertility-ivf", icon: "Baby", servicesCount: 3 },
    { name: "Preventive Health & Checkups", slug: "preventive-health-checkups", icon: "ShieldCheck", servicesCount: 3 },
    { name: "Wellness Programmes", slug: "wellness-programmes", icon: "Flower2", servicesCount: 2 },
    { name: "Nutrition & Lifestyle", slug: "nutrition-lifestyle", icon: "Apple", servicesCount: 2 },
    { name: "Others", slug: "others", icon: "LayoutGrid", servicesCount: 1 },
  ];
}

const SLUG_ALIASES: Record<string, string> = {
  "skin-hair": "clinical-dermatology-hair-analysis",
  "homoeopathy": "comprehensive-gynecological-consultation",
  "diet-nutrition": "clinical-dietetics-metabolic-nutrition",
  "pcod-pcos": "pcos-metabolic-health-evaluation",
  "general-medicine": "general-medicine-holistic-second-opinion",
};

export async function getPublicServiceBySlug(slug: string): Promise<PublicService | null> {
  const lower = slug.toLowerCase();
  const targetSlug = SLUG_ALIASES[lower] || lower;

  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/services/${targetSlug}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data?.service) {
        return json.data.service;
      }
    }
  } catch {
    // fallback to static lookup if API is unreachable
  }

  const staticMatch = masterFallbackServices.find(
    (s) =>
      s.slug === lower ||
      s.slug === targetSlug ||
      s.code.toLowerCase() === lower
  );
  return staticMatch || null;
}
