export interface PatientTestimonial {
  id: string;
  name: string;
  badge: string;
  avatar: string;
  quote: string;
  service: string;
  rating: number;
}

export const testimonialsData: PatientTestimonial[] = [
  {
    id: "test-1",
    name: "Priya S.",
    badge: "Verified Patient",
    avatar: "/images/testimonials/patient-4.webp",
    quote:
      "The consultation was very helpful. I feel more energetic and healthier now. Highly recommended.",
    service: "General Wellness & Digestion",
    rating: 5,
  },
  {
    id: "test-2",
    name: "Ananya M.",
    badge: "Verified Patient",
    avatar: "/images/testimonials/patient-2.webp",
    quote:
      "A very professional and caring approach. The personalised plan has made a big difference.",
    service: "PCOD & Hormonal Balance",
    rating: 5,
  },
  {
    id: "test-3",
    name: "Sushil K.",
    badge: "Verified Patient",
    avatar: "/images/testimonials/patient-3.webp",
    quote:
      "Clear guidance and practical solutions. I feel more confident about my health and lifestyle now.",
    service: "Skin & Scalp Care",
    rating: 5,
  },
];
