import { DOCTORS, type DoctorProfile } from "./doctors.ts";

const PUBLIC_ONLY_DOCTORS = [
  {
    id: "harshad-bagde",
    name: "Dr. Harshad G. Bagde",
    specialty: "Gynaecology",
    topLevelSpecialty: "Gynaecology",
    qualifications:
      "MBBS · MS & DNB Obstetrics & Gynaecology · Fellowships in hystero-laparoscopy and pelvic reconstruction",
    training: "MS Obstetrics & Gynaecology at AIIMS Raipur",
    focus: "Assistant Professor, Obstetrics & Gynaecology, SVNGMC Yavatmal",
    portrait: { kind: "image", url: "/doctors/harshad-bagde.webp" },
  },
  {
    id: "vedang-desai",
    name: "Dr. Vedang Desai",
    specialty: "Neurology",
    topLevelSpecialty: "Neurology",
    qualifications: "MBBS · MD · DM Neurology",
    training: "Consultant Neurologist, AIIMS New Delhi",
    focus: "9+ years of clinical experience",
    portrait: { kind: "image", url: "/doctors/vedang-desai.webp" },
  },
  {
    id: "shainy-p",
    name: "Dr. Shainy P",
    specialty: "Gynaecology",
    topLevelSpecialty: "Gynaecology",
    qualifications: "MBBS, Andhra Medical College · MD Obstetrics & Gynaecology, AIIMS New Delhi",
    training: "Former Senior Resident at AIIMS New Delhi",
    focus: "10+ years of clinical experience",
    portrait: { kind: "image", url: "/doctors/shainy-p.webp" },
  },
  {
    id: "dinesh-walia",
    name: "Dr. Dinesh Walia",
    specialty: "Gastroenterology",
    topLevelSpecialty: "Gastroenterology",
    qualifications:
      "MBBS · MD Medicine · DM Gastroenterology, AIIMS New Delhi · Fellowship in Pancreatology, AIIMS New Delhi",
    training: "Gold Medalist in DM Gastroenterology at AIIMS New Delhi",
    focus: "Advanced endoscopy, pancreatology and liver disorders",
    portrait: { kind: "image", url: "/doctors/dinesh-walia.webp" },
  },
  {
    id: "shubham-garg",
    name: "Dr. Shubham Garg",
    specialty: "Physician",
    topLevelSpecialty: "Gastroenterology",
    qualifications: "MBBS · MD · DM Gastroenterology, AIIMS New Delhi",
    training: "DM Gastroenterology at AIIMS New Delhi",
    focus: "Co-founder of Top Docs and practising gastroenterologist",
    portrait: { kind: "image", url: "/doctors/shubham-garg.webp" },
  },
  {
    id: "shreya-panda",
    name: "Dr. Shreya Panda",
    specialty: "Gynaecology",
    topLevelSpecialty: "Gynaecology",
    qualifications:
      "MBBS, BKMC Government Medical College · MD Obstetrics & Gynaecology, AIIMS Rishikesh",
    training: "Former Senior Resident at AIIMS Raipur",
    focus: "Gynaecology consultations and second opinions",
    portrait: { kind: "image", url: "/doctors/shreya-panda.webp" },
  },
] as const satisfies readonly DoctorProfile[];

const doctorById = new Map<string, DoctorProfile>([
  ...DOCTORS.map((doctor) => [doctor.id, doctor] as const),
  ...PUBLIC_ONLY_DOCTORS.map((doctor) => [doctor.id, doctor] as const),
]);

const PUBLIC_DISPLAY_ORDER = [
  "kirti-sinha",
  "mridul-mahajan",
  "abhimanyu-nigam",
  "jaswanth-kumar-dola",
  "rachit-sood",
  "himanshu",
  "harshad-bagde",
  "abhishek-gowdar",
  "vedang-desai",
  "naman-agarwal",
  "saurav-das",
  "shainy-p",
  "dinesh-walia",
  "shubham-garg",
  "rajath-shetty",
  "shreya-panda",
] as const;

export const PUBLIC_DISPLAY_DOCTORS = PUBLIC_DISPLAY_ORDER.map((id) => {
  const doctor = doctorById.get(id);
  if (!doctor) throw new Error(`Missing public doctor profile: ${id}`);
  return doctor;
});
