const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const Service = require("../modules/services/service.model");
const ServiceCategory = require("../modules/services/category.model");
const Package = require("../modules/packages/package.model");
const Doctor = require("../modules/doctors/doctor.model");
const Organization = require("../modules/organization/organization.model");

const CATEGORIES = [
  {
    name: "Gynecology & Obstetrics",
    slug: "gynecology-obstetrics",
    icon: "Venus",
    description: "Consultation, diagnostics and care for women's health at every life stage.",
    sortOrder: 1,
  },
  {
    name: "Reproductive & Hormonal Wellness",
    slug: "reproductive-hormonal-wellness",
    icon: "Heart",
    description: "Holistic constitutional protocols for PCOD, thyroid, and cycle synchronization.",
    sortOrder: 2,
  },
  {
    name: "Dermatology & Cosmetology",
    slug: "dermatology-cosmetology",
    icon: "Sparkles",
    description: "Clinical skin therapeutics, hormonal acne solutions, and root-cause hair renewal.",
    sortOrder: 3,
  },
  {
    name: "Fertility & IVF",
    slug: "fertility-ivf",
    icon: "Baby",
    description: "Pre-conception optimization, natural conception support, and adjuvant IVF care.",
    sortOrder: 4,
  },
  {
    name: "Preventive Health & Checkups",
    slug: "preventive-health-checkups",
    icon: "ShieldCheck",
    description: "Proactive screening, annual health audits, and early risk detection panels.",
    sortOrder: 5,
  },
  {
    name: "Wellness Programmes",
    slug: "wellness-programmes",
    icon: "Flower2",
    description: "Multi-week curated holistic programmes for restorative health and vitality.",
    sortOrder: 6,
  },
  {
    name: "Nutrition & Lifestyle",
    slug: "nutrition-lifestyle",
    icon: "Apple",
    description: "Therapeutic clinical nutrition, gut health rehabilitation, and metabolic pacing.",
    sortOrder: 7,
  },
  {
    name: "Others",
    slug: "others",
    icon: "LayoutGrid",
    description: "General second opinions, emergency follow-ups, and specialized clinical requests.",
    sortOrder: 8,
  },
];

const SERVICES = [
  // 1. Gynecology & Obstetrics (8 Services)
  {
    code: "SRV-GYN-01",
    name: "Comprehensive Gynecological Consultation",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1200,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "In-depth clinical gynecological assessment including ultrasound review, pelvic exam guidance, and constitutional care.",
    features: ["Pelvic health review", "Doctor consultation 30 mins", "Digital prescription", "7-day follow-up review"],
  },
  {
    code: "SRV-ANTE-01",
    name: "Antenatal Trimester Checkup",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1400,
    consultationType: "in_person",
    status: "active",
    imageUrl: "/images/about/approach-plant.jpg",
    description: "Routine pregnancy monitoring, fetal growth assessment, vitals check, and maternal nutrition advice.",
    features: ["Fetal Doppler listening", "Maternal vitals tracking", "Safe homoeopathic therapeutics", "Dietary chart"],
  },
  {
    code: "SRV-GYN-02",
    name: "Postnatal Recovery & Lactation Guidance",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1100,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "Fourth trimester physical healing, pelvic floor recovery, and breastfeeding support.",
  },
  {
    code: "SRV-GYN-03",
    name: "Menopause & Perimenopause Care",
    category: "Gynecology & Obstetrics",
    durationMinutes: 45,
    baseFee: 1600,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/about/clinic-reception.jpg",
    description: "Relief from hot flashes, sleep disturbances, mood swings, and bone density preservation.",
  },
  {
    code: "SRV-GYN-04",
    name: "Adolescent Puberty & Cycle Counseling",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1000,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "Empathetic teenage gynecology covering dysmenorrhea, delayed cycles, and emotional wellness.",
  },
  {
    code: "SRV-GYN-05",
    name: "Pelvic Pain & Endometriosis Protocol",
    category: "Gynecology & Obstetrics",
    durationMinutes: 45,
    baseFee: 1800,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/articles/pcod.webp",
    description: "Advanced conservative and holistic pain management for endometriosis and adenomyosis.",
  },
  {
    code: "SRV-GYN-06",
    name: "Cervical Cancer Screening & Liquid Pap",
    category: "Gynecology & Obstetrics",
    durationMinutes: 20,
    baseFee: 1500,
    consultationType: "in_person",
    status: "active",
    imageUrl: "/images/about/clinic-reception.jpg",
    description: "Preventative cervical cell cytology with HPV high-risk co-testing and clinical breast check.",
  },
  {
    code: "SRV-GYN-07",
    name: "Pre-Pregnancy Health Optimization",
    category: "Gynecology & Obstetrics",
    durationMinutes: 30,
    baseFee: 1300,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/hero/hero-couple.webp",
    description: "Preconception counseling, genetic carrier screening review, and micronutrient priming.",
  },

  // 2. Reproductive & Hormonal Wellness (4 Services)
  {
    code: "SRV-PCOS-01",
    name: "PCOS & Metabolic Health Evaluation",
    category: "Reproductive & Hormonal Wellness",
    durationMinutes: 45,
    baseFee: 1500,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/services/pcod-pcos.webp",
    description: "Deep-dive diagnostic analysis into insulin resistance, hyperandrogenism, and natural ovulatory restoration.",
    features: ["Hormone panel interpretation", "Insulin sensitivity analysis", "Constitutional homeopathy", "Custom meal roadmap"],
  },
  {
    code: "SRV-HOR-02",
    name: "Thyroid & Hypothyroid Metabolic Care",
    category: "Reproductive & Hormonal Wellness",
    durationMinutes: 30,
    baseFee: 1200,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/articles/stress.webp",
    description: "Hashimoto's and subclinical hypothyroidism holistic management for sustained metabolic energy.",
  },
  {
    code: "SRV-HOR-03",
    name: "Menstrual Regularity & Ovulation Sync",
    category: "Reproductive & Hormonal Wellness",
    durationMinutes: 30,
    baseFee: 1200,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/services/homoeopathy.webp",
    description: "Non-hormonal cycle regularization addressing oligomenorrhea and anovulatory bleeding.",
  },
  {
    code: "SRV-HOR-04",
    name: "PCOD Weight & Insulin Resistance Clinic",
    category: "Reproductive & Hormonal Wellness",
    durationMinutes: 40,
    baseFee: 1400,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/articles/diet.webp",
    description: "Specialized metabolic reset tackling visceral fat, cravings, and hormonal weight plateaus.",
  },

  // 3. Dermatology & Cosmetology (3 Services)
  {
    code: "SRV-DRM-01",
    name: "Clinical Dermatology & Hair Analysis",
    category: "Dermatology & Cosmetology",
    durationMinutes: 30,
    baseFee: 2000,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/services/skin-hair.webp",
    description: "Tricho-scan analysis for hair fall, telogen effluvium, alopecia, and internal nutritional triggers.",
    features: ["Scalp trichoscopy review", "DHT and ferritin audit", "Natural homoeopathic remedies", "Topical regimen"],
  },
  {
    code: "SRV-DRM-02",
    name: "Hormonal Acne & Melasma Correction",
    category: "Dermatology & Cosmetology",
    durationMinutes: 30,
    baseFee: 1600,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/services/skin-hair.webp",
    description: "Treating jawline acne, hyperpigmentation, and epidermal inflammation from within.",
  },
  {
    code: "SRV-DRM-03",
    name: "Chronic Eczema, Psoriasis & Allergy Care",
    category: "Dermatology & Cosmetology",
    durationMinutes: 45,
    baseFee: 1800,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/about/approach-plant.jpg",
    description: "Steroid-free immune modulation and gut-skin barrier restoration for chronic dermatoses.",
  },

  // 4. Fertility & IVF (3 Services)
  {
    code: "SRV-FERT-01",
    name: "Fertility Workup & Follicular Pacing",
    category: "Fertility & IVF",
    durationMinutes: 45,
    baseFee: 2200,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/hero/hero-couple.webp",
    description: "Couple fertility assessment, AMH/semen parameter review, and natural conception timing.",
  },
  {
    code: "SRV-FERT-02",
    name: "Pre-IVF Constitutional Priming",
    category: "Fertility & IVF",
    durationMinutes: 45,
    baseFee: 2500,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/about/doctor-consultation.jpg",
    description: "Improving egg quality, endometrial thickness, and implantation rates prior to assisted reproduction.",
  },
  {
    code: "SRV-FERT-03",
    name: "Recurrent Miscarriage & Loss Analysis",
    category: "Fertility & IVF",
    durationMinutes: 50,
    baseFee: 2600,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/about/clinic-reception.jpg",
    description: "Immunological, thrombophilic, and genetic factor exploration for recurrent early losses.",
  },

  // 5. Preventive Health & Checkups (3 Services)
  {
    code: "SRV-PREV-01",
    name: "Well-Woman Annual Health Audit",
    category: "Preventive Health & Checkups",
    durationMinutes: 45,
    baseFee: 2400,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/about/clinic-reception.jpg",
    description: "Complete systemic review: cardiovascular, metabolic, gynecological, and nutritional markers.",
  },
  {
    code: "SRV-PREV-02",
    name: "Comprehensive Female Hormone Panel",
    category: "Preventive Health & Checkups",
    durationMinutes: 30,
    baseFee: 1800,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/articles/pcod.webp",
    description: "Precision laboratory evaluation of estrogen, progesterone, DHEA-S, prolactin, and cortisol.",
  },
  {
    code: "SRV-PREV-03",
    name: "Bone Density & Osteoporosis Screen",
    category: "Preventive Health & Checkups",
    durationMinutes: 30,
    baseFee: 1500,
    consultationType: "in_person",
    status: "active",
    imageUrl: "/images/about/approach-plant.jpg",
    description: "DEXA scan interpretation, calcium metabolism check, and fracture risk minimization.",
  },

  // 6. Wellness Programmes (2 Services)
  {
    code: "SRV-WELL-01",
    name: "Stress, Sleep & Adrenal Exhaustion Reset",
    category: "Wellness Programmes",
    durationMinutes: 45,
    baseFee: 1600,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/articles/stress.webp",
    description: "Circadian rhythm re-anchoring, vagal tone stimulation, and nervous exhaustion recovery.",
  },
  {
    code: "SRV-WELL-02",
    name: "Holistic Gut Detox & Immunity Builder",
    category: "Wellness Programmes",
    durationMinutes: 40,
    baseFee: 1500,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/articles/habits.webp",
    description: "Elimination protocol, microbiome restoration, and constitutional vitality enhancement.",
  },

  // 7. Nutrition & Lifestyle (2 Services)
  {
    code: "SRV-NUT-01",
    name: "Clinical Dietetics & Metabolic Nutrition",
    category: "Nutrition & Lifestyle",
    durationMinutes: 45,
    baseFee: 1300,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/services/diet-nutrition.webp",
    description: "Personalized macronutrient balancing, glycemic control, and anti-inflammatory whole foods roadmap.",
  },
  {
    code: "SRV-NUT-02",
    name: "Anti-Inflammatory Gut & Microbiome Plan",
    category: "Nutrition & Lifestyle",
    durationMinutes: 30,
    baseFee: 1100,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/articles/diet.webp",
    description: "Targeted prebiotic and micronutrient strategy for IBS, bloating, and leaky gut symptoms.",
  },

  // 8. Others (1 Service)
  {
    code: "SRV-GEN-01",
    name: "General Medicine & Holistic Second Opinion",
    category: "Others",
    durationMinutes: 30,
    baseFee: 900,
    consultationType: "both",
    status: "active",
    imageUrl: "/images/services/general-medicine.webp",
    description: "Integrative medical review of chronic unresolved symptoms and medication reconciliation.",
  },
];

const PACKAGES = [
  {
    name: "Single Specialist Consultation",
    slug: "single-specialist-consultation",
    category: "Others",
    description: "One comprehensive specialist consultation with complete prescription and follow-up care.",
    pricePaise: 99900,
    originalPricePaise: 120000,
    totalSessions: 1,
    sessionDurationMinutes: 30,
    validityDays: 30,
    consultationMode: "Both (In-Person & Online)",
    features: ["1 Full Specialist Consultation", "Digital Prescription", "7-Day Query Support via WhatsApp"],
    isPublished: true,
    status: "active",
  },
  {
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
    status: "active",
  },
  {
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
      "Nutritional Supplement Guidance",
    ],
    isPublished: true,
    status: "active",
  },
  {
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
      "Dedicated Care Coordinator",
    ],
    isPublished: true,
    status: "active",
  },
  {
    name: "Antenatal Trimester Care Package",
    slug: "antenatal-trimester-care-package",
    category: "Gynecology & Obstetrics",
    description: "Continuous maternal and fetal monitoring throughout the second and third trimesters.",
    pricePaise: 799900,
    originalPricePaise: 1120000,
    totalSessions: 8,
    sessionDurationMinutes: 30,
    validityDays: 270,
    consultationMode: "Both (In-Person & Online)",
    features: [
      "8 Trimester Checkup Consultations",
      "Fetal Doppler & Growth Tracking",
      "Trimester-specific Nutrition Roadmaps",
      "Safe Homoeopathic Therapeutics for pregnancy symptoms",
    ],
    isPublished: true,
    status: "active",
  },
  {
    name: "Postnatal Healing & Lactation Programme",
    slug: "postnatal-healing-lactation-programme",
    category: "Gynecology & Obstetrics",
    description: "Fourth trimester physical healing, pelvic floor strengthening, and lactation support.",
    pricePaise: 420000,
    originalPricePaise: 550000,
    totalSessions: 4,
    sessionDurationMinutes: 30,
    validityDays: 60,
    consultationMode: "Both (In-Person & Online)",
    features: [
      "4 Consultations with Mother-Child Specialist",
      "Breastfeeding Technique & Flow Optimization",
      "Pelvic Floor & Core Recovery Regimen",
      "Postpartum Mood & Emotional Screen",
    ],
    isPublished: true,
    status: "active",
  },
  {
    name: "Fertility Preparation & Ovulation Protocol",
    slug: "fertility-preparation-ovulation-protocol",
    category: "Fertility & IVF",
    description: "Couples pre-conception preparation, ovulatory synchronization, and ovarian priming.",
    pricePaise: 650000,
    originalPricePaise: 900000,
    totalSessions: 6,
    sessionDurationMinutes: 45,
    validityDays: 120,
    consultationMode: "Both (In-Person & Online)",
    features: [
      "6 Joint Couple Fertility Consultations",
      "Follicular Dynamics & Basal Temperature Tracking",
      "Ovarian Reserve Priming Formulations",
      "Stress Reduction Protocol",
    ],
    isPublished: true,
    status: "active",
  },
  {
    name: "Menopause Transition & Bone Health",
    slug: "menopause-transition-bone-health",
    category: "Gynecology & Obstetrics",
    description: "Holistic perimenopause management, hot flash relief, and osteopenia prevention.",
    pricePaise: 480000,
    originalPricePaise: 640000,
    totalSessions: 5,
    sessionDurationMinutes: 40,
    validityDays: 120,
    consultationMode: "Both (In-Person & Online)",
    features: [
      "5 Menopause Specialty Consultations",
      "Bone Mineral Density & Calcium Metabolism Plan",
      "Natural Vasomotor & Sleep Stability",
      "Cardiovascular Risk Review",
    ],
    isPublished: true,
    status: "active",
  },
  {
    name: "Metabolic Weight Loss & Gut Rebalance",
    slug: "metabolic-weight-loss-gut-rebalance",
    category: "Nutrition & Lifestyle",
    description: "Resolving chronic metabolic stalls, thyroid sluggishness, and gut inflammation.",
    pricePaise: 540000,
    originalPricePaise: 720000,
    totalSessions: 6,
    sessionDurationMinutes: 40,
    validityDays: 90,
    consultationMode: "Both (In-Person & Online)",
    features: [
      "6 Clinical Nutrition & Homoeopathy Visits",
      "Elimination & Reintroduction Protocol",
      "Body Composition & Metabolic Rate Tracking",
      "Healthy Recipe & Meal Planning Handbook",
    ],
    isPublished: true,
    status: "active",
  },
  {
    name: "Adolescent PCOD & Acne Reversal",
    category: "Reproductive & Hormonal Wellness",
    slug: "adolescent-pcod-acne-reversal",
    description: "Gentle non-invasive care for young girls experiencing painful cycles, hirsutism, or cystic acne.",
    pricePaise: 380000,
    originalPricePaise: 500000,
    totalSessions: 4,
    sessionDurationMinutes: 30,
    validityDays: 90,
    consultationMode: "Both (In-Person & Online)",
    features: [
      "4 Youth-friendly Counseling Sessions",
      "Gentle Cycle Regulation",
      "Clear Skin Homoeopathic Kit",
      "Lifestyle & Exam Stress Guidance",
    ],
    isPublished: true,
    status: "active",
  },
  {
    name: "Stress, Fatigue & Sleep Recovery",
    slug: "stress-fatigue-sleep-recovery",
    category: "Wellness Programmes",
    description: "Adrenal burnout recovery, circadian sleep stabilization, and emotional rejuvenation.",
    pricePaise: 350000,
    originalPricePaise: 480000,
    totalSessions: 4,
    sessionDurationMinutes: 45,
    validityDays: 60,
    consultationMode: "Both (In-Person & Online)",
    features: [
      "4 Mind-Body Clinical Sessions",
      "Sleep Quality Actigraphy Review",
      "Nervous System Tonics",
      "Guided Relaxation & Vagal Practices",
    ],
    isPublished: true,
    status: "active",
  },
  {
    name: "Annual Well-Woman Preventive Circle",
    slug: "annual-well-woman-preventive-circle",
    category: "Preventive Health & Checkups",
    description: "Annual screening, cancer risk reduction, and proactive lifestyle maintenance.",
    pricePaise: 450000,
    originalPricePaise: 600000,
    totalSessions: 4,
    sessionDurationMinutes: 40,
    validityDays: 365,
    consultationMode: "Both (In-Person & Online)",
    features: [
      "4 Quarterly Preventive Health Audits",
      "Preventive Screening Checklist & Lab Review",
      "Personalized Risk Stratification",
      "All-year Health Record Archiving",
    ],
    isPublished: true,
    status: "active",
  },
];

async function seedServicesCatalogue() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
  console.log(`Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);

  console.log("Seeding Categories...");
  for (const cat of CATEGORIES) {
    await ServiceCategory.findOneAndUpdate(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true, new: true }
    );
  }
  console.log(`✓ ${CATEGORIES.length} Service Categories seeded/synced.`);

  // Find active doctors to assign to services
  const doctors = await Doctor.find({ status: "active" });
  console.log(`Found ${doctors.length} active doctors to link with services.`);

  console.log("Seeding Services...");
  let sortOrder = 1;
  const createdServices = [];

  for (const s of SERVICES) {
    const slug = (s.slug || s.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Link doctor IDs matching specialization
    const matchingDocs = doctors.filter((doc) => {
      const specs = (doc.specialization || []).map((sp) => sp.toLowerCase());
      const catLower = s.category.toLowerCase();
      return (
        specs.some((sp) => catLower.includes(sp) || sp.includes("homoeopathy") || sp.includes("general"))
      );
    });

    const assignedDoctorIds = matchingDocs.slice(0, 3).map((d) => d._id);

    const doc = await Service.findOneAndUpdate(
      { code: s.code },
      {
        $set: {
          ...s,
          slug,
          sortOrder: sortOrder++,
          assignedDoctors: assignedDoctorIds,
          isPublished: true,
        },
      },
      { upsert: true, new: true }
    );
    createdServices.push(doc);
  }
  console.log(`✓ ${createdServices.length} Services seeded/synced.`);

  console.log("Seeding Packages...");
  for (const p of PACKAGES) {
    await Package.findOneAndUpdate(
      { slug: p.slug },
      { $set: p },
      { upsert: true, new: true }
    );
  }
  console.log(`✓ ${PACKAGES.length} Packages seeded/synced.`);

  // Also sync with Organization.services
  const org = await Organization.findOne();
  if (org) {
    org.services = createdServices.map((s) => ({
      code: s.code,
      name: s.name,
      department: s.category,
      durationMinutes: s.durationMinutes,
      baseFee: s.baseFee,
      consultationType: s.consultationType,
      status: s.status === "active" ? "active" : "inactive",
    }));
    await org.save();
    console.log(`✓ Synchronized ${org.services.length} services to Organization model.`);
  }

  console.log("=========================================");
  console.log("SERVICES & PACKAGES CATALOGUE SEED COMPLETE");
  console.log("=========================================");
  await mongoose.disconnect();
}

if (require.main === module) {
  seedServicesCatalogue()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error seeding services catalogue:", err);
      process.exit(1);
    });
}

module.exports = { seedServicesCatalogue };

