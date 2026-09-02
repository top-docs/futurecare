export const SUPPORTED_SPECIALTIES = [
  "Gynaecology",
  "Gastroenterology",
  "Cardiology",
  "Nephrology",
  "Oncology",
  "Orthopaedics",
  "Neonatology",
  "Neurology",
  "Endocrinology",
  "Urology",
] as const;

export type SupportedSpecialty = (typeof SUPPORTED_SPECIALTIES)[number];

type Portrait =
  | { kind: "image"; url: string }
  | { kind: "initials"; initials: string };

export type DoctorProfile = {
  id: string;
  name: string;
  specialty: string;
  topLevelSpecialty: SupportedSpecialty;
  qualifications: string;
  training: string;
  focus: string;
  portrait: Portrait;
};

export const DOCTORS = [
  {
    id: "kirti-sinha", name: "Dr. Kirti Sinha", specialty: "Gynaecology", topLevelSpecialty: "Gynaecology",
    qualifications: "MBBS · MS (Obstetrics & Gynaecology) · DNB · PDCC (High-Risk Pregnancy), AIIMS Raipur",
    training: "Trained in high-risk pregnancy at AIIMS Raipur",
    focus: "High-risk pregnancy, fertility and women’s health",
    portrait: { kind: "image", url: "/doctors/kirti-sinha.webp" },
  },
  {
    id: "mridul-mahajan", name: "Dr. Mridul Mahajan", specialty: "Gastroenterology", topLevelSpecialty: "Gastroenterology",
    qualifications: "MD Medicine · DM Gastroenterology, AIIMS New Delhi · Fellowship in IBD, AIIMS New Delhi",
    training: "Trained in gastroenterology and IBD at AIIMS New Delhi",
    focus: "Inflammatory bowel disease and digestive concerns",
    portrait: { kind: "image", url: "/doctors/mridul-mahajan.webp" },
  },
  {
    id: "abhimanyu-nigam", name: "Dr. Abhimanyu Nigam", specialty: "Cardiology", topLevelSpecialty: "Cardiology",
    qualifications: "MBBS · MD Internal Medicine · DM Cardiology, AIIMS Rishikesh",
    training: "Trained in cardiology at AIIMS Rishikesh",
    focus: "Angioplasty, pacemakers and heart-failure management",
    portrait: { kind: "image", url: "/doctors/abhimanyu-nigam.webp" },
  },
  {
    id: "jaswanth-kumar-dola", name: "Dr. Jaswanth Kumar Dola", specialty: "Nephrology", topLevelSpecialty: "Nephrology",
    qualifications: "DM Nephrology, AIIMS Raipur · MD General Medicine · MBBS",
    training: "Trained in nephrology at AIIMS Raipur",
    focus: "Dialysis, renal transplant, kidney biopsy, AKI and CKD",
    portrait: { kind: "image", url: "/doctors/jaswanth-kumar-dola.webp" },
  },
  {
    id: "rachit-sood", name: "Dr. Rachit Sood", specialty: "Head & Neck Surgical Oncology", topLevelSpecialty: "Oncology",
    qualifications: "MCh Head & Neck Surgery & Oncology, AIIMS New Delhi · DNB ENT · MS ENT, AIIMS Rishikesh",
    training: "Trained at AIIMS New Delhi and AIIMS Rishikesh",
    focus: "Oral and head-and-neck cancers",
    portrait: { kind: "image", url: "/doctors/rachit-sood.webp" },
  },
  {
    id: "chitrakshi-nagpal", name: "Dr. Chitrakshi Nagpal", specialty: "Medical Oncology", topLevelSpecialty: "Oncology",
    qualifications: "Medical Oncology",
    training: "Medical oncology training at AIIMS New Delhi",
    focus: "Medical oncology consultations and second opinions",
    portrait: { kind: "initials", initials: "CN" },
  },
  {
    id: "himanshu", name: "Dr. Himanshu", specialty: "Orthopaedics", topLevelSpecialty: "Orthopaedics",
    qualifications: "MBBS, AIIMS Jodhpur · MS Orthopaedics, JIPMER Puducherry · MRCS, Edinburgh",
    training: "Trained at AIIMS Jodhpur and JIPMER Puducherry",
    focus: "Bones, joints and sports injuries",
    portrait: { kind: "image", url: "/doctors/himanshu.webp" },
  },
  {
    id: "abhishek-gowdar", name: "Dr. Abhishek S. Gowdar", specialty: "Neonatology", topLevelSpecialty: "Neonatology",
    qualifications: "MBBS, Bangalore Medical College · MD Pediatrics, Maulana Azad Medical College · DM Neonatology, AIIMS Raipur",
    training: "Trained in neonatology at AIIMS Raipur",
    focus: "Premature and critically ill newborn care",
    portrait: { kind: "image", url: "/doctors/abhishek-gowdar.webp" },
  },
  {
    id: "naman-agarwal", name: "Dr. Naman Agarwal", specialty: "Neurology", topLevelSpecialty: "Neurology",
    qualifications: "MBBS · MD · DM Neurology, AIIMS Jodhpur",
    training: "Trained in neurology at AIIMS Jodhpur",
    focus: "Neurology consultations and second opinions",
    portrait: { kind: "image", url: "/doctors/naman-agarwal.webp" },
  },
  {
    id: "saurav-das", name: "Dr. Saurav Das", specialty: "Endocrinology", topLevelSpecialty: "Endocrinology",
    qualifications: "MBBS, JIPMER · MD Internal Medicine, AIIMS Delhi · DM Endocrinology & Metabolism, AIIMS Delhi",
    training: "Trained at JIPMER and AIIMS Delhi",
    focus: "Diabetes, thyroid, adrenal and pituitary conditions",
    portrait: { kind: "image", url: "/doctors/saurav-das.webp" },
  },
  {
    id: "rajath-shetty", name: "Dr. Rajath Shetty", specialty: "Urology", topLevelSpecialty: "Urology",
    qualifications: "MBBS · MS General Surgery · MCh Urology, AIIMS New Delhi",
    training: "Trained in urology at AIIMS New Delhi",
    focus: "Urology consultations and second opinions",
    portrait: { kind: "image", url: "/doctors/rajath-shetty.webp" },
  },
] as const satisfies readonly DoctorProfile[];

export type DoctorId = (typeof DOCTORS)[number]["id"];

const DOCTORS_BY_ID = new Map<string, DoctorProfile>(DOCTORS.map((doctor) => [doctor.id, doctor]));

export function findDoctorById(id: string): DoctorProfile | null {
  return DOCTORS_BY_ID.get(id) ?? null;
}

export function getDoctorById(id: DoctorId): DoctorProfile {
  const doctor = findDoctorById(id);
  if (!doctor) throw new Error(`Unknown approved doctor: ${id}`);
  return doctor;
}
