import { CARE_CONSENT_ERROR } from "./consultation-consent.ts";
import type { DoctorId } from "./doctors.ts";
import {
  caseDetailsSchema,
  resolveGuidedRoute,
  type ConsultationType,
  type DoctorStatus,
  type OncologyChoice,
  type SpecialtyChoice,
} from "./guided-journey.ts";
import { assessIntakeMessage } from "./intake-safety.ts";

export type GuidedCaseSubmissionInput = {
  consultationType: ConsultationType;
  selectedSpecialty: SpecialtyChoice;
  oncologyChoice?: OncologyChoice;
  caseDetails: string;
  careConsentAccepted: boolean;
};

export type GuidedCaseSubmissionResult =
  | { kind: "invalid"; field: "caseDetails" | "careConsent"; message: string }
  | { kind: "emergency"; message: string }
  | {
      kind: "matched";
      consultationType: ConsultationType;
      selectedSpecialty: Exclude<SpecialtyChoice, "other-not-sure">;
      oncologyChoice?: OncologyChoice;
      caseDetails: string;
      doctorId: DoctorId;
    }
  | {
      kind: "human-review";
      consultationType: ConsultationType;
      selectedSpecialty: SpecialtyChoice;
      oncologyChoice?: OncologyChoice;
      caseDetails: string;
      reason: "other-or-not-sure" | "unknown-selection" | "doctor-unavailable";
    };

export function buildGuidedCaseSubmission(
  input: GuidedCaseSubmissionInput,
  options: { doctorStatus?: (doctorId: DoctorId) => DoctorStatus } = {},
): GuidedCaseSubmissionResult {
  const parsedDetails = caseDetailsSchema.safeParse(input.caseDetails);
  if (!parsedDetails.success) {
    return {
      kind: "invalid",
      field: "caseDetails",
      message: parsedDetails.error.issues[0]?.message
        ?? "Tell us about the symptoms, diagnosis, or treatment question.",
    };
  }

  const safety = assessIntakeMessage(parsedDetails.data);
  if (safety.kind === "possible-emergency") {
    return { kind: "emergency", message: safety.message };
  }

  if (!input.careConsentAccepted) {
    return { kind: "invalid", field: "careConsent", message: CARE_CONSENT_ERROR };
  }

  const route = resolveGuidedRoute({
    consultationType: input.consultationType,
    specialty: input.selectedSpecialty,
    oncologyChoice: input.oncologyChoice,
    caseDetails: parsedDetails.data,
  }, options);

  if (route.kind === "matched") {
    return {
      kind: "matched",
      consultationType: input.consultationType,
      selectedSpecialty: route.specialty,
      ...(input.selectedSpecialty === "oncology"
        ? { oncologyChoice: input.oncologyChoice }
        : {}),
      caseDetails: parsedDetails.data,
      doctorId: route.doctorId,
    };
  }

  return {
    kind: "human-review",
    consultationType: input.consultationType,
    selectedSpecialty: input.selectedSpecialty,
    ...(input.selectedSpecialty === "oncology"
      ? { oncologyChoice: input.oncologyChoice }
      : {}),
    caseDetails: parsedDetails.data,
    reason: route.reason,
  };
}
