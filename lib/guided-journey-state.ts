import { CARE_CONSENT_ERROR } from "./consultation-consent.ts";
import {
  caseDetailsSchema,
  type ConsultationType,
  type OncologyChoice,
  type SpecialtyChoice,
} from "./guided-journey.ts";
import type { DoctorId } from "./doctors.ts";
import { assessIntakeMessage } from "./intake-safety.ts";

export type GuidedJourneyStep =
  | "consultation-type"
  | "specialty"
  | "oncology"
  | "case-details"
  | "submitting"
  | "doctor-shown"
  | "human-review"
  | "contact"
  | "saving-contact"
  | "payment-ready"
  | "payment-pending"
  | "paid"
  | "enquiry-complete"
  | "emergency-stop";

export type GuidedJourneyOutcome = "matched" | "human-review";
export type GuidedReviewReason =
  | "other-or-not-sure"
  | "unknown-selection"
  | "doctor-unavailable"
  | "patient-rejected-match";

export type GuidedJourneyState = {
  step: GuidedJourneyStep;
  consultationType?: ConsultationType;
  selectedSpecialty?: SpecialtyChoice;
  oncologyChoice?: OncologyChoice;
  caseDetails: string;
  careConsentAccepted: boolean;
  fieldError?: { field: "caseDetails" | "careConsent"; message: string };
  submitError?: string;
  emergencyMessage?: string;
  caseId?: string;
  outcome?: GuidedJourneyOutcome;
  doctorId?: DoctorId;
  reviewReason?: GuidedReviewReason;
  guidedStage?: string;
  contact?: { patientName: string; phone: string };
};

export type GuidedJourneyEvent =
  | { type: "choose-consultation"; value: ConsultationType }
  | { type: "choose-specialty"; value: SpecialtyChoice }
  | { type: "choose-oncology"; value: OncologyChoice }
  | { type: "set-case-details"; value: string }
  | { type: "set-consent"; value: boolean }
  | { type: "validation-error"; field: "caseDetails" | "careConsent"; message: string }
  | { type: "submit-started" }
  | { type: "submit-failed"; message: string }
  | { type: "emergency"; message: string }
  | {
      type: "saved";
      caseId: string;
      outcome: GuidedJourneyOutcome;
      doctorId?: DoctorId;
      reviewReason?: GuidedReviewReason;
    }
  | { type: "show-contact" }
  | { type: "contact-submit-started" }
  | { type: "contact-submit-failed"; message: string }
  | {
      type: "contact-saved";
      result: "payment-ready" | "enquiry-complete";
      patientName: string;
      phone: string;
    }
  | { type: "correction-complete" }
  | { type: "correction-failed"; message: string }
  | { type: "back" }
  | { type: "restore-step"; step: GuidedJourneyStep }
  | {
      type: "restore-saved";
      consultationType: ConsultationType;
      selectedSpecialty: SpecialtyChoice;
      oncologyChoice?: OncologyChoice;
      caseDetails: string;
      caseId: string;
      outcome: GuidedJourneyOutcome;
      doctorId?: DoctorId;
      reviewReason?: GuidedReviewReason;
      guidedStage?: string;
      resumeState?: "doctor-shown" | "human-review" | "contact" | "payment-ready" | "payment-pending" | "paid" | "enquiry-complete";
      patientName?: string;
      phone?: string;
    }
  | { type: "start-fresh" };

export function createInitialJourneyState(): GuidedJourneyState {
  return {
    step: "consultation-type",
    caseDetails: "",
    careConsentAccepted: false,
  };
}

function previousStep(state: GuidedJourneyState): GuidedJourneyStep {
  if (state.step === "case-details") {
    return state.selectedSpecialty === "oncology" ? "oncology" : "specialty";
  }
  if (state.step === "oncology") return "specialty";
  if (state.step === "specialty") return "consultation-type";
  return state.step;
}

export function canVisitJourneyStep(
  state: GuidedJourneyState,
  step: GuidedJourneyStep,
): boolean {
  if (
    state.step === "doctor-shown"
    || state.step === "human-review"
    || state.step === "contact"
    || state.step === "saving-contact"
    || state.step === "payment-ready"
    || state.step === "payment-pending"
    || state.step === "paid"
    || state.step === "enquiry-complete"
    || state.step === "emergency-stop"
    || state.step === "submitting"
  ) {
    return step === state.step;
  }
  if (step === "consultation-type") return true;
  if (step === "specialty") return Boolean(state.consultationType);
  if (step === "oncology") {
    return Boolean(state.consultationType) && state.selectedSpecialty === "oncology";
  }
  if (step === "case-details") {
    return Boolean(state.consultationType)
      && Boolean(state.selectedSpecialty)
      && (state.selectedSpecialty !== "oncology" || Boolean(state.oncologyChoice));
  }
  return false;
}

export function guidedJourneyReducer(
  state: GuidedJourneyState,
  event: GuidedJourneyEvent,
): GuidedJourneyState {
  switch (event.type) {
    case "choose-consultation":
      return {
        ...state,
        consultationType: event.value,
        step: "specialty",
        fieldError: undefined,
        submitError: undefined,
      };
    case "choose-specialty":
      return {
        ...state,
        selectedSpecialty: event.value,
        oncologyChoice: undefined,
        step: event.value === "oncology" ? "oncology" : "case-details",
        fieldError: undefined,
        submitError: undefined,
      };
    case "choose-oncology":
      return {
        ...state,
        oncologyChoice: event.value,
        step: "case-details",
        fieldError: undefined,
        submitError: undefined,
      };
    case "set-case-details":
      return {
        ...state,
        caseDetails: event.value,
        fieldError: state.fieldError?.field === "caseDetails" ? undefined : state.fieldError,
        submitError: undefined,
      };
    case "set-consent":
      return {
        ...state,
        careConsentAccepted: event.value,
        fieldError: state.fieldError?.field === "careConsent" ? undefined : state.fieldError,
        submitError: undefined,
      };
    case "validation-error":
      return { ...state, step: "case-details", fieldError: event, submitError: undefined };
    case "submit-started":
      return { ...state, step: "submitting", fieldError: undefined, submitError: undefined };
    case "submit-failed":
      return { ...state, step: "case-details", submitError: event.message };
    case "emergency":
      return {
        ...createInitialJourneyState(),
        step: "emergency-stop",
        emergencyMessage: event.message,
      };
    case "saved":
      return {
        ...state,
        step: event.outcome === "matched" && event.doctorId
          ? "doctor-shown"
          : "human-review",
        caseId: event.caseId,
        outcome: event.outcome,
        doctorId: event.doctorId,
        reviewReason: event.reviewReason,
        fieldError: undefined,
        submitError: undefined,
      };
    case "show-contact":
      return { ...state, step: "contact", submitError: undefined };
    case "contact-submit-started":
      return { ...state, step: "saving-contact", submitError: undefined };
    case "contact-submit-failed":
      return { ...state, step: "contact", submitError: event.message };
    case "contact-saved":
      return {
        ...state,
        step: event.result,
        guidedStage: event.result,
        outcome: event.result === "enquiry-complete" ? "human-review" : state.outcome,
        doctorId: event.result === "enquiry-complete" ? undefined : state.doctorId,
        contact: { patientName: event.patientName, phone: event.phone },
        submitError: undefined,
      };
    case "correction-complete":
      return {
        ...state,
        step: "specialty",
        selectedSpecialty: undefined,
        oncologyChoice: undefined,
        outcome: undefined,
        doctorId: undefined,
        reviewReason: "patient-rejected-match",
        guidedStage: "human-review",
        submitError: undefined,
      };
    case "correction-failed":
      return { ...state, step: "doctor-shown", submitError: event.message };
    case "back":
      return {
        ...state,
        step: previousStep(state),
        fieldError: undefined,
        submitError: undefined,
      };
    case "restore-step":
      return canVisitJourneyStep(state, event.step) ? { ...state, step: event.step } : state;
    case "restore-saved":
      const restoredStep = event.resumeState ?? (event.outcome === "matched" && event.doctorId
        ? event.guidedStage === "payment-ready"
          || event.guidedStage === "payment-pending"
          || event.guidedStage === "paid"
          || event.guidedStage === "complete"
          ? "payment-ready"
          : event.guidedStage === "contact"
            ? "contact"
            : "doctor-shown"
        : event.guidedStage === "enquiry-complete"
          ? "enquiry-complete"
          : "human-review");
      return {
        step: restoredStep,
        consultationType: event.consultationType,
        selectedSpecialty: event.selectedSpecialty,
        oncologyChoice: event.oncologyChoice,
        caseDetails: event.caseDetails,
        careConsentAccepted: true,
        caseId: event.caseId,
        outcome: event.outcome,
        doctorId: event.doctorId,
        reviewReason: event.reviewReason,
        guidedStage: event.guidedStage,
        contact: event.patientName && event.phone
          ? { patientName: event.patientName, phone: event.phone }
          : undefined,
      };
    case "start-fresh":
      return createInitialJourneyState();
  }
}

export type GuidedCaseStepValidation =
  | { kind: "ready"; caseDetails: string }
  | { kind: "emergency"; message: string }
  | { kind: "invalid"; field: "caseDetails" | "careConsent"; message: string };

export function validateGuidedCaseStep(
  caseDetails: string,
  careConsentAccepted: boolean,
): GuidedCaseStepValidation {
  const parsed = caseDetailsSchema.safeParse(caseDetails);
  if (!parsed.success) {
    return {
      kind: "invalid",
      field: "caseDetails",
      message: parsed.error.issues[0]?.message
        ?? "Tell us about the symptoms, diagnosis, or treatment question.",
    };
  }

  const safety = assessIntakeMessage(parsed.data);
  if (safety.kind === "possible-emergency") {
    return { kind: "emergency", message: safety.message };
  }

  if (!careConsentAccepted) {
    return { kind: "invalid", field: "careConsent", message: CARE_CONSENT_ERROR };
  }

  return { kind: "ready", caseDetails: parsed.data };
}
