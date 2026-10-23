export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; desc?: string }[];
}

export type TrustStatIconType = "users" | "clock" | "calendar" | "star" | "shield" | "heart";

export interface TrustStatItem {
  id: string;
  value: string;
  label: string;
  sublabel?: string;
  desc?: string;
  icon: TrustStatIconType;
}

// ============================================================================
// TRUST & CREDIBILITY STATISTICS (SINGLE SOURCE OF TRUTH)
// Ek jagah change karein, poori website (Hero, About, Why Choose, Highlights)
// me automatically update ho jayega!
// ============================================================================
export const trustStats: TrustStatItem[] = [
  {
    id: "patients",
    value: "10K+",
    label: "Happy Patients",
    desc: "Trust earned through proven care",
    icon: "users",
  },
  {
    id: "experience",
    value: "5+",
    label: "Years of Trusted Care",
    desc: "Dedicated clinical excellence",
    icon: "clock",
  },
  {
    id: "satisfaction",
    value: "4.9/5",
    label: "Patient Satisfaction",
    desc: "Consistently rated by our patients",
    icon: "star",
  },
];

export const trustHighlights: TrustStatItem[] = [
  ...trustStats,
  {
    id: "confidential",
    value: "100%",
    label: "Confidential & Safe Care",
    desc: "Private and empathetic environment",
    icon: "shield",
  },
];

export const siteConfig = {
  name: "TriGyna",
  descriptor: "WOMEN | HEALTH | WELLNESS",
  tagline: "Better Health for a Brighter Tomorrow",
  subheading:
    "Personalised consultation and holistic care for men and women — online and in-clinic.",
  phone: "+91 917-277-2326",
  whatsappNumber: "+919172772326",
  whatsappUrl: "https://wa.me/919172772326?text=Hello%20TriGyna%2C%20I%20would%20like%20to%20enquire%20about%20a%20consultation",
  email: "trigyna.health@gmail.com",
  location: "Prayagraj, Uttar Pradesh - 211012",
  clinicHours: "Mon – Sat: 9:00 AM – 7:00 PM (IST)",
  doctor: {
    name: "Dr. Harshali Sutar",
    title: "Consultant | Healthcare & Wellness",
    degrees: "BHMS, PGD in Clinical Nutrition & Women's Health",
    bio: "Dedicated to helping individuals and families lead healthier, happier lives through personalised care, preventive guidance and holistic treatment approaches.",
    philosophy:
      "My goal is to provide the right guidance and support for your long-term health and well-being.",
    image: "/images/doctors/dr-harshali-sutar.webp",
    experienceYears: "10+",
    pillars: [
      "Personalised Consultation",
      "Evidence-Based Treatment",
      "Holistic Approach",
      "Support for Men & Women",
      "Focus on Long-Term Wellness",
    ],
  },
  carePrinciples: [
    {
      title: "Personalised Care Approach",
      desc: "Tailored treatments attuned to individual lifestyle and root cause factors.",
      icon: "HeartHandshake",
    },
    {
      title: "Expert Consultation",
      desc: "Comprehensive diagnostic assessment by experienced clinical specialists.",
      icon: "UserCheck",
    },
    {
      title: "Evidence-Based Treatment Plans",
      desc: "Grounded in proven medical science harmonised with holistic therapies.",
      icon: "Sparkles",
    },
    {
      title: "Confidential & Supportive Care",
      desc: "A safe, respectful, patient-first environment with strict privacy.",
      icon: "ShieldCheck",
    },
  ],
  whyChooseUs: [
    {
      title: "Holistic & Integrated Care",
      desc: "Modern medicine seamlessly paired with natural and lifestyle-based approaches.",
      icon: "TreePine",
    },
    {
      title: "Expert Guidance",
      desc: "One-on-one consultation with experienced, compassionate professionals.",
      icon: "Stethoscope",
    },
    {
      title: "Personalised Treatment Plans",
      desc: "Care regimens tailored precisely to individual biomarkers and life goals.",
      icon: "ClipboardCheck",
    },
    {
      title: "Care for All Ages",
      desc: "Comprehensive health support for men and women at every stage of life.",
      icon: "Users",
    },
  ],
  trustStats,
  trustHighlights,
  stats: trustStats,
  howItWorks: [
    {
      step: "01",
      title: "Explore Services",
      desc: "Browse our specialised clinical services covering Homoeopathy, PCOD/PCOS, Skin & Hair, Diet & Nutrition, and General Medicine.",
    },
    {
      step: "02",
      title: "Submit an Enquiry",
      desc: "Share your health concerns and preferred consultation mode (online video consultation or in-clinic visit in Prayagraj).",
    },
    {
      step: "03",
      title: "Connect with the Care Team",
      desc: "Our clinical coordination desk reviews your inquiry, confirms consultation details, and schedules your dedicated appointment.",
    },
  ],
};

export const navigationLinks: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  {
    label: "Services",
    href: "/services",
    children: [
      {
        label: "Skin & Hair",
        href: "/services/skin-hair",
        desc: "Healthy skin and stronger, healthier hair for lasting confidence.",
      },
      {
        label: "Homoeopathy",
        href: "/services/homoeopathy",
        desc: "Natural and holistic healing for long-term wellness.",
      },
      {
        label: "Diet & Nutrition",
        href: "/services/diet-nutrition",
        desc: "Personalised nutrition plans for a healthier, more active you.",
      },
      {
        label: "PCOD/PCOS Management",
        href: "/services/pcod-pcos",
        desc: "Hormonal balance and better reproductive health.",
      },
      {
        label: "General Medicine",
        href: "/services/general-medicine",
        desc: "Comprehensive care for your everyday health needs.",
      },
    ],
  },
  { label: "Doctor", href: "/doctor" },
  { label: "Health Tips", href: "/health-tips" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];
