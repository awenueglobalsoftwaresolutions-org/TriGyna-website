export interface HealthArticle {
  slug: string;
  category: "Lifestyle" | "Women's Health" | "Men's Health" | "Nutrition";
  title: string;
  excerpt: string;
  readTime: string;
  publishedDate: string;
  author: string;
  image: string;
  content: {
    intro: string;
    sections: {
      heading: string;
      body: string[];
    }[];
    keyTakeaways: string[];
  };
}

export const articlesData: HealthArticle[] = [
  {
    slug: "simple-habits-for-better-daily-health",
    category: "Lifestyle",
    title: "Simple Habits for Better Daily Health",
    excerpt: "Small, consistent lifestyle shifts that create lasting physical vitality, mental clarity, and digestive ease.",
    readTime: "4 min read",
    publishedDate: "Oct 15, 2026",
    author: "Dr. Harshali Sutar",
    image: "/images/articles/habits.webp",
    content: {
      intro:
        "True healthcare is built upon the silent architecture of daily routine. Rather than seeking drastic overhauls, the most enduring health transformations begin with small, rhythmic adjustments that harmonize with your body's natural circadian rhythm.",
      sections: [
        {
          heading: "1. The Morning Hydration & Sunlight Anchor",
          body: [
            "Within 30 minutes of waking, drink 500ml of room-temperature or lukewarm water. This gently jumpstarts gastrointestinal motility and rehydrates tissues after sleep.",
            "Step outdoors or by an open window for 10 minutes of early morning sun exposure. Natural light regulates melatonin suppression and resets your master circadian clock.",
          ],
        },
        {
          heading: "2. Mindful Meal Timings Over Restrictive Calorie Rules",
          body: [
            "Your digestive fire follows the sun. Eating your heaviest meal when metabolism peaks (between 12:00 PM and 2:00 PM) allows optimal enzyme secretion and nutrient absorption.",
            "Aim to close your dinner window at least 2.5 to 3 hours before sleep to prevent acid reflux and ensure deep cellular repair during nocturnal rest.",
          ],
        },
        {
          heading: "3. Micro-Movement Intervals Throughout the Day",
          body: [
            "Prolonged sedentary postures slow lymphatic circulation. Stand up and stretch for 2 minutes every hour.",
            "A gentle 10-minute walk after lunch or dinner blunts post-prandial blood sugar spikes by up to 25%, supporting metabolic longevity.",
          ],
        },
      ],
      keyTakeaways: [
        "Hydrate with lukewarm water first thing every morning.",
        "Catch 10 minutes of morning sunlight to synchronize sleep cycles.",
        "Eat your main meal at midday and finish dinner 3 hours before bed.",
        "Incorporate 10-minute gentle walks after meals for glucose stabilization.",
      ],
    },
  },
  {
    slug: "understanding-pcod-pcos-naturally",
    category: "Women's Health",
    title: "Understanding PCOD/PCOS Naturally",
    excerpt: "A holistic exploration of hormonal imbalances, root causes, and compassionate ways to support your cycle.",
    readTime: "6 min read",
    publishedDate: "Oct 10, 2026",
    author: "Dr. Harshali Sutar",
    image: "/images/articles/pcod.webp",
    content: {
      intro:
        "Polycystic Ovarian Disease (PCOD) and Polycystic Ovary Syndrome (PCOS) affect nearly 1 in 5 women of reproductive age. While often treated solely with synthetic hormones, understanding the underlying metabolic and inflammatory triggers opens the door to genuine healing and hormonal peace.",
      sections: [
        {
          heading: "Unraveling the Root Triggers",
          body: [
            "PCOS is primarily a metabolic condition driven by hyperinsulinemia (insulin resistance) and low-grade systemic inflammation. Elevated circulating insulin triggers the ovaries to produce excess androgens, leading to irregular ovulation, acne, and hair thinning.",
            "Addressing insulin sensitivity through low-glycemic, anti-inflammatory nutrition is essential for restoring spontaneous menstrual regularity.",
          ],
        },
        {
          heading: "Cycle Syncing Nutrition & Herbal Support",
          body: [
            "During the follicular phase (days 1–14), support estrogen metabolism with flaxseeds, pumpkin seeds, and leafy greens.",
            "During the luteal phase (days 15–28), incorporate magnesium-rich foods like sunflower seeds, sesame seeds, and dark leafy greens to alleviate PMS mood swings and support progesterone production.",
            "Classical homoeopathic constitutional remedies gently stimulate follicular maturation without the side effects of oral contraceptive pills.",
          ],
        },
        {
          heading: "Gentle Movement & Stress Modulation",
          body: [
            "Intense chronic cardio can elevate cortisol, worsening adrenal PCOS. Swap exhausting workouts for resistance training, brisk walking, and restorative yoga.",
            "Prioritizing 7–8 hours of uninterrupted sleep directly improves insulin signaling and ovarian hormone synthesis.",
          ],
        },
      ],
      keyTakeaways: [
        "PCOS is rooted in insulin resistance and chronic systemic inflammation.",
        "Natural ovulation can be restored without synthetic birth control pills.",
        "Seed cycling and magnesium-rich nutrition support luteal phase harmony.",
        "Manage cortisol with restorative movement and adequate sleep.",
      ],
    },
  },
  {
    slug: "managing-stress-for-a-healthier-you",
    category: "Men's Health",
    title: "Managing Stress for a Healthier You",
    excerpt: "Practical nervous system regulation techniques to protect heart health, hormonal vitality, and mental peace.",
    readTime: "5 min read",
    publishedDate: "Oct 05, 2026",
    author: "Dr. Harshali Sutar",
    image: "/images/articles/stress.webp",
    content: {
      intro:
        "Modern stress is rarely physical, yet the nervous system responds with the same fight-or-flight cascade: elevated cortisol, heightened blood pressure, and suppressed digestion. Learn how to down-regulate sympathetic overdrive using physiological tools.",
      sections: [
        {
          heading: "The Physiology of Chronic Stress",
          body: [
            "Prolonged mental pressure depletes adrenal reserves, lowers testosterone in men, and triggers systemic inflammation, contributing to cardiovascular strain and digestive dysfunction.",
            "The autonomic nervous system can be directly accessed and calmed through the vagus nerve using intentional respiration techniques.",
          ],
        },
        {
          heading: "The Physiological Sigh: Instant Calming Tool",
          body: [
            "Discovered by neuroscientists, a double inhalation through the nose followed by a long, slow sigh through the mouth rapidly re-inflates collapsed alveoli and activates parasympathetic calming within 3 breath cycles.",
            "Practicing this for 2 minutes during stressful moments immediately lowers heart rate and restores emotional equilibrium.",
          ],
        },
        {
          heading: "Digital Boundaries & Nature Grounding",
          body: [
            "Continuous notifications create chronic micro-arousal. Establish a hard digital sunset 60 minutes before bedtime.",
            "Spending just 20 minutes in green spaces or barefoot grounding has been clinically demonstrated to reduce salivary cortisol and improve blood pressure metrics.",
          ],
        },
      ],
      keyTakeaways: [
        "Chronic stress disrupts testosterone, digestion, and cardiovascular health.",
        "Use the physiological sigh (double inhale, long exhale) for instant calm.",
        "Create a screen-free buffer before bedtime to safeguard deep sleep.",
        "Incorporate brief periods of nature exposure into your weekly routine.",
      ],
    },
  },
  {
    slug: "balanced-diet-for-a-stronger-life",
    category: "Nutrition",
    title: "Balanced Diet for a Stronger Life",
    excerpt: "Nourishing your cellular health with whole foods, gut-friendly fiber, and balanced macronutrient architecture.",
    readTime: "5 min read",
    publishedDate: "Sep 28, 2026",
    author: "Dr. Harshali Sutar",
    image: "/images/articles/diet.webp",
    content: {
      intro:
        "Nutrition is not merely calories; it is biological information that instructs your genes, modulates inflammation, and fuels immune defense. Discover how to assemble balanced plates tailored to your unique metabolic constitution.",
      sections: [
        {
          heading: "The Modern Plate Method",
          body: [
            "Fill half your plate with colorful vegetables and leafy greens offering polyphenols and prebiotic fibers.",
            "Dedicate one quarter to high-quality proteins (lentils, paneer, sprouts, tofu, or lean choices) to stabilize satiety and maintain lean tissue.",
            "The remaining quarter should comprise complex, unrefined carbohydrates like millets, brown rice, or whole grain rotis, accompanied by healthy fats like cold-pressed oils, ghee, or seeds.",
          ],
        },
        {
          heading: "Cultivating a Healthy Gut Microbiome",
          body: [
            "Your gut microbiome dictates mood, nutrient absorption, and immunity. Introduce fermented probiotic foods like homemade curd, buttermilk, or fermented veggies.",
            "Diversify your plant intake: eating 25 to 30 diverse plant species per week dramatically improves microbial diversity and metabolic resilience.",
          ],
        },
        {
          heading: "Smart Food Order Sequencing",
          body: [
            "Eating fiber and vegetables first, followed by protein and fats, and finishing with starches or carbohydrates reduces post-meal glucose spikes by up to 50%.",
            "This simple sequencing trick prevents midday slumps and sustains mental sharpness throughout your workday.",
          ],
        },
      ],
      keyTakeaways: [
        "Prioritize colorful vegetables and clean protein sources at every meal.",
        "Eat fiber and protein first before carbohydrates to blunt glucose spikes.",
        "Aim for 25–30 distinct plant varieties each week for gut resilience.",
        "Choose traditional healthy fats in moderation to absorb fat-soluble vitamins.",
      ],
    },
  },
];
