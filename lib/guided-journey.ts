import { z } from "zod";

import { DOCTORS, type DoctorId } from "./doctors.ts";
import { assessIntakeMessage } from "./intake-safety.ts";

export const CONSULTATION_TYPE_CHOICES = [
  { value: "first-consultation", label: "First consultation" },
  { value: "second-opinion", label: "Second opinion" },
] as const;

export type ConsultationType = (typeof CONSULTATION_TYPE_CHOICES)[number]["value"];

export const SPECIALTY_CHOICES = [
  { value: "gynaecology", label: "Periods, pregnancy or women’s health" },
  { value: "gastroenterology", label: "Stomach, digestion or liver" },
  { value: "cardiology", label: "Heart or blood circulation" },
  { value: "nephrology", label: "Kidney health" },
  { value: "oncology", label: "Cancer care" },
  { value: "orthopaedics", label: "Bones, joints or sports injuries" },
  { value: "neonatology", label: "Newborn or premature baby care" },
  { value: "neurology", label: "Brain, nerves or headaches" },
  { value: "endocrinology", label: "Diabetes, thyroid or hormones" },
  { value: "urology", label: "Urinary or prostate health" },
  { value: "other-not-sure", label: "Other / Not sure" },
] as const;

export type SpecialtyChoice = (typeof SPECIALTY_CHOICES)[number]["value"];
export type SupportedSpecialtyChoice = Exclude<SpecialtyChoice, "other-not-sure">;

export const ONCOLOGY_CHOICES = [
  { value: "head-and-neck", label: "Head and neck cancer" },
  { value: "medical-treatment", label: "Cancer medicines or treatment plan" },
  { value: "other-not-sure", label: "Other / Not sure" },
] as const;

export type OncologyChoice = (typeof ONCOLOGY_CHOICES)[number]["value"];

export const GUIDED_STAGES = [
  "consultation-type",
  "specialty",
  "case-details",
  "emergency-stop",
  "human-review",
  "doctor-shown",
  "contact",
  "payment-ready",
  "payment-pending",
  "paid",
  "complete",
  "enquiry-complete",
] as const;

export type GuidedStage = (typeof GUIDED_STAGES)[number];

const ROUTES: Readonly<Record<Exclude<SupportedSpecialtyChoice, "oncology">, DoctorId>> = {
  gynaecology: "kirti-sinha",
  gastroenterology: "mridul-mahajan",
  cardiology: "abhimanyu-nigam",
  nephrology: "jaswanth-kumar-dola",
  orthopaedics: "himanshu",
  neonatology: "abhishek-gowdar",
  neurology: "naman-agarwal",
  endocrinology: "saurav-das",
  urology: "rajath-shetty",
};

const ONCOLOGY_ROUTES: Readonly<Record<Exclude<OncologyChoice, "other-not-sure">, DoctorId>> = {
  "head-and-neck": "rachit-sood",
  "medical-treatment": "chitrakshi-nagpal",
};

const CONSULTATION_TYPE_VALUES = new Set<string>(
  CONSULTATION_TYPE_CHOICES.map((choice) => choice.value),
);
const SPECIALTY_VALUES = new Set<string>(SPECIALTY_CHOICES.map((choice) => choice.value));
const ONCOLOGY_VALUES = new Set<string>(ONCOLOGY_CHOICES.map((choice) => choice.value));

export const caseDetailsSchema = z.string()
  .trim()
  .min(1, "Tell us about the symptoms, diagnosis, or treatment question.")
  .refine(
    (value) => assessIntakeMessage(value).kind !== "unclear",
    "Please describe the symptoms, diagnosis, or treatment question in a little more detail.",
  );

export type GuidedRoute =
  | { kind: "matched"; specialty: SupportedSpecialtyChoice; doctorId: DoctorId }
  | {
      kind: "human-review";
      reason: "other-or-not-sure" | "unknown-selection" | "doctor-unavailable";
    };

export type DoctorStatus = "active" | "inactive" | "missing";

type RouteInput = {
  consultationType: unknown;
  specialty: unknown;
  oncologyChoice?: unknown;
  // Case details travel with the selection but never influence the doctor route.
  caseDetails?: string;
};

type RouteOptions = {
  doctorStatus?: (doctorId: DoctorId) => DoctorStatus;
};

function defaultDoctorStatus(doctorId: DoctorId): DoctorStatus {
  return DOCTORS.some((doctor) => doctor.id === doctorId) ? "active" : "missing";
}

export function resolveGuidedRoute(
  input: RouteInput,
  options: RouteOptions = {},
): GuidedRoute {
  if (
    typeof input.consultationType !== "string"
    || !CONSULTATION_TYPE_VALUES.has(input.consultationType)
    || typeof input.specialty !== "string"
    || !SPECIALTY_VALUES.has(input.specialty)
  ) {
    return { kind: "human-review", reason: "unknown-selection" };
  }

  if (input.specialty === "other-not-sure") {
    return { kind: "human-review", reason: "other-or-not-sure" };
  }

  let doctorId: DoctorId;
  if (input.specialty === "oncology") {
    if (input.oncologyChoice === "other-not-sure") {
      return { kind: "human-review", reason: "other-or-not-sure" };
    }
    if (
      typeof input.oncologyChoice !== "string"
      || !ONCOLOGY_VALUES.has(input.oncologyChoice)
    ) {
      return { kind: "human-review", reason: "unknown-selection" };
    }
    doctorId = ONCOLOGY_ROUTES[
      input.oncologyChoice as Exclude<OncologyChoice, "other-not-sure">
    ];
  } else {
    doctorId = ROUTES[input.specialty as Exclude<SupportedSpecialtyChoice, "oncology">];
  }

  const doctorStatus = options.doctorStatus ?? defaultDoctorStatus;
  if (!doctorId || doctorStatus(doctorId) !== "active") {
    return { kind: "human-review", reason: "doctor-unavailable" };
  }

  return {
    kind: "matched",
    specialty: input.specialty as SupportedSpecialtyChoice,
    doctorId,
  };
}
