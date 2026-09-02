import { PUBLIC_DISPLAY_DOCTORS } from "./public-doctors.ts";

export const LANDING_PRIMARY_CTA = {
  label: "Find my specialist",
  href: "/enquiry?start=new",
} as const;

const FEATURED_SPECIALIST_IDS = [
  "kirti-sinha",
  "mridul-mahajan",
  "abhimanyu-nigam",
  "rachit-sood",
  "himanshu",
  "saurav-das",
] as const;

const doctorById = new Map(PUBLIC_DISPLAY_DOCTORS.map((doctor) => [doctor.id, doctor]));

export const FEATURED_SPECIALISTS = FEATURED_SPECIALIST_IDS.map((id) => {
  const doctor = doctorById.get(id);
  if (!doctor) throw new Error(`Missing approved featured specialist: ${id}`);
  return doctor;
});

export const ALL_SPECIALISTS = PUBLIC_DISPLAY_DOCTORS;

export const MORE_SPECIALISTS = PUBLIC_DISPLAY_DOCTORS.filter(
  (doctor) => !FEATURED_SPECIALIST_IDS.includes(doctor.id as (typeof FEATURED_SPECIALIST_IDS)[number]),
);

export const INSTITUTE_PROOF = [
  {
    shortName: "AIIMS",
    logo: "/trust/institutes/aiims.webp",
  },
  {
    shortName: "PGIMER",
    logo: "/trust/institutes/pgimer.webp",
  },
  {
    shortName: "Tata Memorial",
    logo: "/trust/institutes/tata-memorial.webp",
  },
  {
    shortName: "JIPMER",
    logo: "/trust/institutes/jipmer.webp",
  },
  {
    shortName: "CMC Vellore",
    logo: "/trust/institutes/cmc-vellore.webp",
  },
] as const;

export const INSTITUTE_ROTATION = INSTITUTE_PROOF.map((institute) => institute.shortName);

export const CONSULTATION_STEPS = [
  {
    title: "Choose the type of consultation",
    description: "Select Specialist consultation or Second opinion.",
  },
  {
    title: "Tell us about the health concern",
    description: "Choose the specialty and describe the symptoms, diagnosis or treatment question.",
  },
  {
    title: "See the doctor’s profile",
    description: "Review the doctor’s name, qualifications and training before you share your number.",
  },
  {
    title: "Book the consultation",
    description: "Pay ₹800. We’ll contact you on WhatsApp and arrange the video consultation within 24 hours.",
  },
] as const;

export const SPECIALTY_PROOF = [
  { name: "Gynaecology", description: "Periods, fertility, pregnancy and women’s health", href: LANDING_PRIMARY_CTA.href },
  { name: "Gastroenterology", description: "Stomach, liver and bowel concerns", href: LANDING_PRIMARY_CTA.href },
  { name: "Cardiology", description: "Heart symptoms and treatment questions", href: LANDING_PRIMARY_CTA.href },
  { name: "Neurology", description: "Brain, spine and nerve concerns", href: LANDING_PRIMARY_CTA.href },
  { name: "Oncology", description: "Cancer consultations and second opinions", href: LANDING_PRIMARY_CTA.href },
  { name: "Orthopaedics", description: "Bones, joints and sports injuries", href: LANDING_PRIMARY_CTA.href },
] as const;

export const SERVICE_FACTS = [
  {
    label: "Before payment",
    value: "See the doctor’s name, qualifications and training.",
  },
  {
    label: "The consultation",
    value: "Meet the doctor online within 24 hours.",
  },
  {
    label: "After payment",
    value: "We coordinate reports, timing and the video link on WhatsApp.",
  },
  {
    label: "Your details",
    value: "We use your case and contact details only to arrange the consultation.",
  },
] as const;

export const FOUNDER_THESIS = {
  eyebrow: "Why I started Top Docs",
  heading: "Finding a credible specialist shouldn’t depend on who you know.",
  paragraphs: [
    "When my mother recently needed surgery, our family received different opinions about the right approach. We had medical advice, but we still lacked clarity about how to evaluate the options and decide what to do next.",
    "A second opinion from a specialist trained at AIIMS helped us understand the trade-offs and ask better questions before making the decision with her treating team.",
    "That experience became the reason I started Top Docs: to help more families reach credible specialists without depending on personal contacts, long queues, or travel to a major hospital.",
  ],
  founder: "Lokesh Dange",
  role: "Founder, Top Docs",
  portrait: "/founders/lokesh-dange-avatar.png",
} as const;

export const LANDING_FAQS = [
  {
    question: "Is this for a first consultation or a second opinion?",
    answer:
      "Both. Start a first consultation for a new concern, or choose a second opinion when you already have a diagnosis or treatment recommendation.",
  },
  {
    question: "How much does the consultation cost?",
    answer:
      "The introductory price is ₹800 for one online specialist consultation. The standard price is ₹1,500 from 6 September 2026.",
  },
  {
    question: "When will the consultation happen?",
    answer:
      "After payment, our care team contacts you on WhatsApp and arranges the consultation within 24 hours.",
  },
  {
    question: "How do I share medical reports?",
    answer:
      "You do not need to upload reports on this website. Our care team asks for relevant reports privately on WhatsApp after payment.",
  },
  {
    question: "Will I receive a prescription?",
    answer:
      "The consulting doctor decides what is clinically appropriate. When a prescription is relevant, it is shared after the consultation with the doctor’s registration details.",
  },
  {
    question: "Can Top Docs help in a medical emergency?",
    answer:
      "No. For severe or urgent symptoms, go to the nearest hospital or call local emergency services. This service arranges non-emergency online consultations.",
  },
] as const;

// No public patient stories have been approved for this build yet.
export const PUBLIC_TESTIMONIALS: readonly [] = [];
