export interface ServiceDetail {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  tagline: string;
  shortDesc: string;
  fullDesc: string;
  image: string;
  iconName: string;
  bgColor: string;
  accentColor: string;
  conditionsTreated: string[];
  keyBenefits: { title: string; desc: string }[];
  consultationApproach: { step: string; title: string; desc: string }[];
  faqs: { question: string; answer: string }[];
}

export const servicesData: ServiceDetail[] = [
  {
    id: "skin-hair",
    slug: "skin-hair",
    title: "Skin & Hair",
    eyebrow: "DERMATOLOGY & SCALP WELLNESS",
    tagline: "Healthy skin and stronger, healthier hair for lasting confidence.",
    shortDesc: "Healthy skin and stronger, healthier hair for lasting confidence.",
    fullDesc:
      "Our Skin & Hair clinical practice approaches dermatological conditions and hair concerns from the inside out. Rather than relying on superficial, temporary fixes, we assess internal hormonal harmony, nutritional deficiencies, systemic stress, and scalp health to formulate personalized treatment protocols.",
    image: "/images/services/skin-hair.webp",
    iconName: "Sparkles",
    bgColor: "#F8D9D1",
    accentColor: "#D97706",
    conditionsTreated: [
      "Acne, blemishes and post-inflammatory pigmentation",
      "Chronic eczema, psoriasis, and dermatitis",
      "Hair thinning, telogen effluvium, and alopecia areata",
      "Dandruff, dry scalp, and seborrheic conditions",
      "Premature skin aging and barrier compromise",
      "Hormone-related skin flare-ups",
    ],
    keyBenefits: [
      {
        title: "Root-Cause Diagnostics",
        desc: "We look beyond topical symptoms to identify internal metabolic, digestive, and hormonal triggers.",
      },
      {
        title: "Gentle, Non-Invasive Formulations",
        desc: "Combining holistic medicines with clinical nutrition to promote natural skin regeneration.",
      },
      {
        title: "Customized Scalp & Follicle Therapy",
        desc: "Targeted internal nutrition protocols designed to revive dormant follicles and reduce shedding.",
      },
      {
        title: "Long-Term Skin Vitality",
        desc: "Guidance on non-comedogenic daily routines, sun protection, and barrier-repairing habits.",
      },
    ],
    consultationApproach: [
      {
        step: "01",
        title: "Detailed Case Analysis",
        desc: "Comprehensive evaluation of skin history, gut health, stress factors, and past treatments.",
      },
      {
        step: "02",
        title: "Targeted Regimen",
        desc: "Prescription of individualized remedies alongside customized dietary adjustments.",
      },
      {
        step: "03",
        title: "Progress Review",
        desc: "Regular follow-ups to track barrier repair, hair density improvement, and cellular renewal.",
      },
    ],
    faqs: [
      {
        question: "How long does it take to see visible improvements in hair fall?",
        answer:
          "Hair growth follows biological cycles (anagen, catagen, telogen). Most patients notice a visible reduction in shedding within 4 to 8 weeks, with noticeable texture and thickness improvements after 3 to 6 months of consistent care.",
      },
      {
        question: "Can adult acne be treated without aggressive chemicals?",
        answer:
          "Yes. Adult acne is frequently linked with gut dysbiosis, androgen sensitivity, and stress. Our root-cause approach treats internal imbalances safely, helping eliminate acne without harsh side effects.",
      },
      {
        question: "Are your skin treatments suitable for sensitive skin?",
        answer:
          "Absolutely. Every treatment plan is individually customized to your specific skin barrier tolerance, ensuring no aggravation or harsh peeling.",
      },
    ],
  },
  {
    id: "homoeopathy",
    slug: "homoeopathy",
    title: "Homoeopathy",
    eyebrow: "CLASSICAL & CLINICAL HOMOEOPATHY",
    tagline: "Natural and holistic healing for long-term wellness.",
    shortDesc: "Natural and holistic healing for long-term wellness.",
    fullDesc:
      "At TriGyna, Homoeopathy is practiced with clinical precision and deep empathy. By treating the individual as a unified whole rather than a cluster of isolated symptoms, our individualized homoeopathic formulations stimulate the body's intrinsic healing response without dependency or harmful side effects.",
    image: "/images/services/homoeopathy.webp",
    iconName: "Leaf",
    bgColor: "#EADFCF",
    accentColor: "#6B8F5B",
    conditionsTreated: [
      "Chronic allergic rhinitis, asthma, and recurrent sinus issues",
      "Digestive complaints: IBS, acid reflux, gastritis, and chronic constipation",
      "Migraines, tension headaches, and neuralgias",
      "Arthritis, joint stiffness, and chronic musculoskeletal pain",
      "Stress, anxiety, and sleep pattern disturbances",
      "Pediatric and geriatric recurrent seasonal ailments",
    ],
    keyBenefits: [
      {
        title: "Zero Harmful Side Effects",
        desc: "Micro-diluted natural remedies that are completely safe, non-toxic, and non-habit forming.",
      },
      {
        title: "Constitutional Healing",
        desc: "Prescriptions tailored to your physical constitution, emotional temperament, and disease history.",
      },
      {
        title: "Sustainable Long-Term Relief",
        desc: "Focuses on strengthening immunity and preventing disease recurrence rather than temporary suppression.",
      },
      {
        title: "Complementary Compatibility",
        desc: "Can be safely administered alongside necessary conventional therapies under medical guidance.",
      },
    ],
    consultationApproach: [
      {
        step: "01",
        title: "Constitutional Case Taking",
        desc: "A relaxed, in-depth discussion covering medical history, temperament, physical sensitivities, and lifestyle.",
      },
      {
        step: "02",
        title: "Precision Remedy Selection",
        desc: "Selection of specific, verified homoeopathic medicines adhering to classical principles.",
      },
      {
        step: "03",
        title: "Systemic Monitoring",
        desc: "Continuous assessment of vitality and gradual tapering of remedies as natural balance restores.",
      },
    ],
    faqs: [
      {
        question: "Does homoeopathy act very slowly?",
        answer:
          "This is a common misconception. In acute conditions like seasonal fevers or sudden allergies, homoeopathy can act very rapidly. For chronic issues spanning several years, time is needed to reverse entrenched pathology, but relief typically begins within the first few weeks.",
      },
      {
        question: "Can I take homoeopathic medicine while taking allopathic medications?",
        answer:
          "Yes. Homoeopathic remedies do not pharmacologically interfere with allopathic drugs when taken with an appropriate 30-minute interval, making them safe for integrated healthcare.",
      },
      {
        question: "Are there strict dietary restrictions with homoeopathy?",
        answer:
          "Modern clinical homoeopathy only requires moderating strong substances like raw onion, garlic, or strong mint around the time of medicine intake.",
      },
    ],
  },
  {
    id: "diet-nutrition",
    slug: "diet-nutrition",
    title: "Diet & Nutrition",
    eyebrow: "METABOLIC & FUNCTIONAL NUTRITION",
    tagline: "Personalised nutrition plans for a healthier, more active you.",
    shortDesc: "Personalised nutrition plans for a healthier, more active you.",
    fullDesc:
      "We believe food is the most potent medicine when tailored to your metabolic blueprint. Our clinical nutrition protocols eliminate generic fad diets in favor of sustainable, wholesome, culturally adaptable meal strategies that optimize gut health, regulate blood sugar, and enhance day-to-day vitality.",
    image: "/images/services/diet-nutrition.webp",
    iconName: "Apple",
    bgColor: "#F6E8DD",
    accentColor: "#154734",
    conditionsTreated: [
      "Metabolic slowdown, stubborn weight gain, and insulin resistance",
      "Type-2 diabetes and pre-diabetes management",
      "Thyroid health (Hypothyroidism and Hashimoto's)",
      "Dyslipidemia, elevated cholesterol, and fatty liver",
      "Nutrient absorption disorders and micronutrient deficiencies",
      "Pre-pregnancy and postpartum restorative nutrition",
    ],
    keyBenefits: [
      {
        title: "No Starvation or Fad Diets",
        desc: "Wholesome, home-cooked foods planned around your daily routine, preferences, and cultural cuisine.",
      },
      {
        title: "Metabolic Reset",
        desc: "Stabilizing blood glucose curves to eliminate fatigue, brain fog, and chronic sweet cravings.",
      },
      {
        title: "Gut Microbiome Repair",
        desc: "Focus on prebiotic fibers and digestion-friendly preparations to heal the digestive lining.",
      },
      {
        title: "Lifelong Sustainable Habits",
        desc: "Empowering you with nutritional literacy so you can confidently make healthy food choices anywhere.",
      },
    ],
    consultationApproach: [
      {
        step: "01",
        title: "Dietary & Lifestyle Audit",
        desc: "Analysis of your 7-day food recall, daily schedule, energy fluctuations, and blood biomarker reports.",
      },
      {
        step: "02",
        title: "Customized Meal Architecture",
        desc: "A personalized, practical nutrition plan with flexible ingredient swaps and recipe suggestions.",
      },
      {
        step: "03",
        title: "Bi-Weekly Accountability",
        desc: "Regular coaching check-ins to fine-tune macros and celebrate milestone victories.",
      },
    ],
    faqs: [
      {
        question: "Do you prescribe calorie-counting or weighing every meal?",
        answer:
          "No. We prioritize nutrient density, mindful portioning, and plate balancing. You will learn to nourish your body intuitively without tedious weighing scales.",
      },
      {
        question: "Can I manage traditional Indian family meals on this diet?",
        answer:
          "Yes! Our plans are tailored around regular Indian home cooking — dals, sabzis, rotis, and rice — using smarter preparation techniques and meal timings.",
      },
    ],
  },
  {
    id: "pcod-pcos",
    slug: "pcod-pcos",
    title: "PCOD/PCOS Management",
    eyebrow: "HORMONAL & REPRODUCTIVE HEALTH",
    tagline: "Hormonal balance and better reproductive health.",
    shortDesc: "Hormonal balance and better reproductive health.",
    fullDesc:
      "PCOD and PCOS are multifaceted endocrine conditions that impact physical, emotional, and reproductive well-being. TriGyna provides an empathetic, 360-degree care framework integrating clinical homoeopathy, insulin-sensitizing functional nutrition, and cycle-syncing lifestyle guidance to restore natural ovulatory cycles.",
    image: "/images/services/pcod-pcos.webp",
    iconName: "Activity",
    bgColor: "#F9F7F1",
    accentColor: "#154734",
    conditionsTreated: [
      "Irregular, delayed, or absent menstrual cycles (oligomenorrhea/amenorrhea)",
      "Polycystic ovarian morphology visible on ultrasound",
      "Hormonal acne, hirsutism (excess facial/body hair), and female pattern hair loss",
      "Stubborn abdominal weight gain and high insulin levels",
      "Mood swings, anxiety, and pre-menstrual dysphoria",
      "Preconception preparation and fertility enhancement",
    ],
    keyBenefits: [
      {
        title: "Hormonal Equilibrium",
        desc: "Natural balancing of LH/FSH ratios, androgens, and estrogen without synthetic birth control pills.",
      },
      {
        title: "Restoration of Natural Cycles",
        desc: "Targeted therapies aimed at encouraging healthy, predictable spontaneous ovulation.",
      },
      {
        title: "Weight & Insulin Sensitivity",
        desc: "Specific nutritional regimens designed to tackle insulin resistance and reduce metabolic inflammation.",
      },
      {
        title: "Compassionate Emotional Care",
        desc: "Dedicated clinical empathy that understands the emotional toll of hormonal disorders.",
      },
    ],
    consultationApproach: [
      {
        step: "01",
        title: "Hormonal & Ultrasound Review",
        desc: "Thorough assessment of pelvic ultrasounds, thyroid profiles, fasting insulin, and symptom logs.",
      },
      {
        step: "02",
        title: "Multi-Pronged Care Plan",
        desc: "A unified plan combining homoeopathic remedies with cycle-synced nutrition and sleep hygiene.",
      },
      {
        step: "03",
        title: "Cycle Tracking & Support",
        desc: "Monthly reviews monitoring period regularity, symptom relief, and emotional well-being.",
      },
    ],
    faqs: [
      {
        question: "Can PCOS be reversed permanently?",
        answer:
          "PCOS has a strong genetic and metabolic basis, but its symptoms, irregular cycles, and hormonal abnormalities can be completely managed into sustained remission through root-cause treatment and lifestyle habits.",
      },
      {
        question: "Do I have to take contraceptive pills to regulate my periods?",
        answer:
          "Birth control pills produce artificial withdrawal bleeds without fixing ovulatory failure. Our goal is to naturally stimulate your ovaries to restore healthy, spontaneous ovulation without relying on artificial hormones.",
      },
    ],
  },
  {
    id: "general-medicine",
    slug: "general-medicine",
    title: "General Medicine",
    eyebrow: "PRIMARY & PREVENTIVE CLINICAL CARE",
    tagline: "Comprehensive care for your everyday health needs.",
    shortDesc: "Comprehensive care for your everyday health needs.",
    fullDesc:
      "From acute seasonal illnesses to chronic lifestyle disorders, our General Medicine consultation provides comprehensive clinical diagnostics, compassionate medical counsel, and preventive healthcare strategies to keep your entire family healthy, active, and resilient throughout every season.",
    image: "/images/services/general-medicine.webp",
    iconName: "Stethoscope",
    bgColor: "#EADFCF",
    accentColor: "#154734",
    conditionsTreated: [
      "Viral fevers, influenza, and seasonal respiratory infections",
      "Hypertension, blood pressure fluctuations, and cardiovascular risk screening",
      "Gastric distress, acidity, food intolerances, and infections",
      "Chronic fatigue, low immunity, and unexplained weakness",
      "Preventive executive health check-up analysis and interpretation",
      "Routine geriatric and pediatric family healthcare advice",
    ],
    keyBenefits: [
      {
        title: "Comprehensive Clinical Assessment",
        desc: "Thorough symptom analysis with clear diagnostic explanations and treatment transparency.",
      },
      {
        title: "Preventive Health Screening",
        desc: "Early detection of metabolic risks before they develop into chronic diseases.",
      },
      {
        title: "Rational, Judicious Prescriptions",
        desc: "Avoidance of unnecessary medication or over-investigation in favor of clear clinical logic.",
      },
      {
        title: "Family-Centric Continuity",
        desc: "A dependable family physician relationship you can trust for years to come.",
      },
    ],
    consultationApproach: [
      {
        step: "01",
        title: "Primary Assessment",
        desc: "Detailed medical history, vital signs assessment, and current prescription review.",
      },
      {
        step: "02",
        title: "Integrated Management",
        desc: "Evidence-based primary care paired with lifestyle recommendations.",
      },
      {
        step: "03",
        title: "Continuous Follow-Up",
        desc: "Follow-up monitoring to ensure complete recovery and prevent secondary complications.",
      },
    ],
    faqs: [
      {
        question: "Are consultations available online via video call?",
        answer:
          "Yes, we provide confidential online video consultations for patients across India and abroad, as well as in-person clinic appointments in Prayagraj.",
      },
      {
        question: "How do I share my past lab reports before the consultation?",
        answer:
          "You can securely share your lab reports and medical history directly via WhatsApp or email when scheduling your enquiry.",
      },
    ],
  },
];
