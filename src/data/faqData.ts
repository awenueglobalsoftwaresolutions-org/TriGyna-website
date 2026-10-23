export interface FAQItem {
  id: string;
  category: "General" | "Consultation" | "Homoeopathy" | "Services & Care";
  question: string;
  answer: string;
}

export const faqData: FAQItem[] = [
  {
    id: "faq-1",
    category: "General",
    question: "What is the core healthcare philosophy of TriGyna?",
    answer:
      "TriGyna combines evidence-based clinical diagnostics with natural, holistic therapies and personalized nutritional guidance. We focus on identifying and treating the underlying root causes of health concerns rather than suppressing external symptoms.",
  },
  {
    id: "faq-2",
    category: "Consultation",
    question: "How do online video consultations work?",
    answer:
      "Online video consultations are conducted over a secure, confidential video link. After you submit your enquiry, our care desk coordinates a convenient appointment slot. You will have a dedicated one-on-one session with Dr. Harshali Sutar to discuss your symptoms, lifestyle, medical history, and lab reports. Prescriptions and customized care plans are sent securely in digital format.",
  },
  {
    id: "faq-3",
    category: "Consultation",
    question: "Can I book an in-person clinic consultation in Prayagraj?",
    answer:
      "Yes, in-person clinic visits are available at our Prayagraj location by prior appointment. When submitting your enquiry or connecting on WhatsApp, simply specify your preference for an in-clinic consultation.",
  },
  {
    id: "faq-4",
    category: "Services & Care",
    question: "Does TriGyna provide care for both men and women?",
    answer:
      "Yes. While we have deep clinical specialisation in women's hormonal health, PCOD/PCOS, and reproductive wellness, TriGyna provides comprehensive care for both men and women across Skin & Hair, Homoeopathy, Diet & Nutrition, and General Medicine.",
  },
  {
    id: "faq-5",
    category: "Homoeopathy",
    question: "Is homoeopathic treatment safe to take alongside ongoing medications?",
    answer:
      "Yes. Homoeopathic constitutional remedies do not pharmacologically interact or interfere with allopathic prescriptions. We advise keeping a simple 30-minute time interval between medications. Always inform us of any medications you are currently taking.",
  },
  {
    id: "faq-6",
    category: "Services & Care",
    question: "How do I share my past medical reports or blood work?",
    answer:
      "You can securely share recent laboratory reports, ultrasounds, or clinical summaries directly through WhatsApp (+91 917-277-2326) or by email (trigyna.health@gmail.com) prior to your consultation session.",
  },
  {
    id: "faq-7",
    category: "General",
    question: "Is my medical information kept strictly confidential?",
    answer:
      "Absolutely. We adhere to the highest standards of clinical privacy and patient confidentiality. Your health records, diagnostic discussions, and personal contact details are never shared with third parties.",
  },
  {
    id: "faq-8",
    category: "Consultation",
    question: "What happens after I submit an enquiry form?",
    answer:
      "Once you submit an enquiry, our patient care coordinator reviews your health requirements and contacts you within a few business hours via phone or WhatsApp to confirm your preferred consultation mode and schedule your appointment.",
  },
];
