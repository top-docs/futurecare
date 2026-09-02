const APPROVED_DOCTORS = {
  "kirti-sinha": { specialty: "Gynaecology", active: true },
  "mridul-mahajan": { specialty: "Gastroenterology", active: true },
  "abhimanyu-nigam": { specialty: "Cardiology", active: true },
  "jaswanth-kumar-dola": { specialty: "Nephrology", active: true },
  "rachit-sood": { specialty: "Oncology", active: true },
  "chitrakshi-nagpal": { specialty: "Oncology", active: true },
  himanshu: { specialty: "Orthopaedics", active: true },
  "abhishek-gowdar": { specialty: "Neonatology", active: true },
  "naman-agarwal": { specialty: "Neurology", active: true },
  "saurav-das": { specialty: "Endocrinology", active: true },
  "rajath-shetty": { specialty: "Urology", active: true },
} as const;

export type ApprovedDoctorId = keyof typeof APPROVED_DOCTORS;

export function getApprovedDoctorStatus(doctorId: string): "active" | "inactive" | "missing" {
  const doctor = APPROVED_DOCTORS[doctorId as ApprovedDoctorId];
  if (!doctor) return "missing";
  return doctor.active ? "active" : "inactive";
}

export function resolveApprovedDoctor(doctorId: string): {
  doctorId: ApprovedDoctorId;
  specialty: (typeof APPROVED_DOCTORS)[ApprovedDoctorId]["specialty"];
} {
  const doctor = APPROVED_DOCTORS[doctorId as ApprovedDoctorId];
  if (!doctor?.active) {
    throw new Error("Doctor is not in the approved launch roster.");
  }
  return { doctorId: doctorId as ApprovedDoctorId, specialty: doctor.specialty };
}
