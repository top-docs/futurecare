import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialJourneyState,
  guidedJourneyReducer,
  validateGuidedCaseStep,
} from "../../lib/guided-journey-state.ts";

test("moves forward and back without losing in-memory choices", () => {
  let state = createInitialJourneyState();
  state = guidedJourneyReducer(state, {
    type: "choose-consultation",
    value: "second-opinion",
  });
  state = guidedJourneyReducer(state, {
    type: "choose-specialty",
    value: "cardiology",
  });
  state = guidedJourneyReducer(state, { type: "set-case-details", value: "Palpitations for two days" });
  state = guidedJourneyReducer(state, { type: "back" });

  assert.equal(state.step, "specialty");
  assert.equal(state.consultationType, "second-opinion");
  assert.equal(state.selectedSpecialty, "cardiology");
  assert.equal(state.caseDetails, "Palpitations for two days");
});

test("inserts the oncology question only for cancer care", () => {
  let state = guidedJourneyReducer(createInitialJourneyState(), {
    type: "choose-consultation",
    value: "first-consultation",
  });
  state = guidedJourneyReducer(state, { type: "choose-specialty", value: "oncology" });
  assert.equal(state.step, "oncology");

  state = guidedJourneyReducer(state, { type: "choose-oncology", value: "medical-treatment" });
  assert.equal(state.step, "case-details");

  let nonOncology = guidedJourneyReducer(createInitialJourneyState(), {
    type: "choose-consultation",
    value: "first-consultation",
  });
  nonOncology = guidedJourneyReducer(nonOncology, {
    type: "choose-specialty",
    value: "gastroenterology",
  });
  assert.equal(nonOncology.step, "case-details");
});

test("emergency guidance wins even when consent is missing", () => {
  const result = validateGuidedCaseStep("I have severe chest pain and cannot breathe", false);
  assert.equal(result.kind, "emergency");
});

test("blank, unclear, and consent-free details return a specific field error", () => {
  assert.deepEqual(validateGuidedCaseStep("   ", true), {
    kind: "invalid",
    field: "caseDetails",
    message: "Tell us about the symptoms, diagnosis, or treatment question.",
  });
  assert.equal(validateGuidedCaseStep("asdfgh qwerty", true).kind, "invalid");
  assert.equal(validateGuidedCaseStep("Periods delayed by six weeks", false).kind, "invalid");
  assert.equal(validateGuidedCaseStep("Periods delayed by six weeks", false).field, "careConsent");
});

test("emergency state clears health details and offers a fresh start", () => {
  let state = guidedJourneyReducer(createInitialJourneyState(), {
    type: "choose-consultation",
    value: "first-consultation",
  });
  state = guidedJourneyReducer(state, { type: "choose-specialty", value: "cardiology" });
  state = guidedJourneyReducer(state, {
    type: "set-case-details",
    value: "I have severe chest pain and cannot breathe",
  });
  state = guidedJourneyReducer(state, { type: "set-consent", value: true });
  state = guidedJourneyReducer(state, { type: "emergency", message: "Seek urgent care." });

  assert.equal(state.step, "emergency-stop");
  assert.equal(state.caseDetails, "");
  assert.equal(state.careConsentAccepted, false);
  assert.equal(state.selectedSpecialty, undefined);

  state = guidedJourneyReducer(state, { type: "start-fresh" });
  assert.deepEqual(state, createInitialJourneyState());
});

test("restore accepts only reachable saved outcomes and cannot skip selections", () => {
  let state = guidedJourneyReducer(createInitialJourneyState(), {
    type: "restore-step",
    step: "case-details",
  });
  assert.equal(state.step, "consultation-type");

  state = guidedJourneyReducer(state, {
    type: "restore-saved",
    consultationType: "second-opinion",
    selectedSpecialty: "oncology",
    oncologyChoice: "head-and-neck",
    caseDetails: "Need clarity on the treatment plan",
    caseId: "case-123",
    outcome: "matched",
    doctorId: "rachit-sood",
    guidedStage: "doctor-shown",
  });
  assert.equal(state.step, "doctor-shown");
  assert.equal(state.caseDetails, "Need clarity on the treatment plan");
  assert.equal(state.outcome, "matched");

  state = guidedJourneyReducer(state, {
    type: "restore-step",
    step: "case-details",
  });
  assert.equal(state.step, "doctor-shown");
});

test("browser history cannot bypass an emergency stop", () => {
  const state = guidedJourneyReducer({
    ...createInitialJourneyState(),
    step: "emergency-stop",
    emergencyMessage: "Seek urgent care.",
  }, {
    type: "restore-step",
    step: "consultation-type",
  });

  assert.equal(state.step, "emergency-stop");
});

test("matched and human-review saves retain the server outcome", () => {
  const matched = guidedJourneyReducer(createInitialJourneyState(), {
    type: "saved",
    caseId: "case-match",
    outcome: "matched",
    doctorId: "rachit-sood",
  });
  assert.equal(matched.step, "doctor-shown");
  assert.equal(matched.caseId, "case-match");
  assert.equal(matched.doctorId, "rachit-sood");

  const review = guidedJourneyReducer(createInitialJourneyState(), {
    type: "saved",
    caseId: "case-review",
    outcome: "human-review",
    reviewReason: "doctor-unavailable",
  });
  assert.equal(review.step, "human-review");
  assert.equal(review.reviewReason, "doctor-unavailable");
});

test("correction clears the rejected doctor but keeps the saved case", () => {
  const corrected = guidedJourneyReducer({
    ...createInitialJourneyState(),
    step: "doctor-shown",
    caseId: "case-123",
    consultationType: "second-opinion",
    selectedSpecialty: "cardiology",
    caseDetails: "Need another review of ongoing palpitations.",
    careConsentAccepted: true,
    outcome: "matched",
    doctorId: "abhimanyu-nigam",
  }, { type: "correction-complete" });

  assert.equal(corrected.step, "specialty");
  assert.equal(corrected.caseId, "case-123");
  assert.equal(corrected.doctorId, undefined);
  assert.equal(corrected.selectedSpecialty, undefined);
  assert.equal(corrected.caseDetails, "Need another review of ongoing palpitations.");
});

test("contact outcomes recover payment and no-payment terminal states", () => {
  const matched = guidedJourneyReducer({
    ...createInitialJourneyState(),
    step: "contact",
    outcome: "matched",
  }, {
    type: "contact-saved",
    result: "payment-ready",
    patientName: "Aditya Sharma",
    phone: "9876543210",
  });
  assert.equal(matched.step, "payment-ready");
  assert.deepEqual(matched.contact, { patientName: "Aditya Sharma", phone: "9876543210" });

  const review = guidedJourneyReducer({
    ...matched,
    outcome: "human-review",
  }, {
    type: "contact-saved",
    result: "enquiry-complete",
    patientName: "Aditya Sharma",
    phone: "9876543210",
  });
  assert.equal(review.step, "enquiry-complete");
  assert.equal(review.outcome, "human-review");
  assert.equal(review.doctorId, undefined);
});

test("restore gives terminal and payment states priority over an older guided stage", () => {
  const base = {
    type: "restore-saved" as const,
    consultationType: "first-consultation" as const,
    selectedSpecialty: "cardiology" as const,
    caseDetails: "Palpitations for two days",
    caseId: "case-restore",
    outcome: "matched" as const,
    doctorId: "abhimanyu-nigam" as const,
    guidedStage: "doctor-shown",
  };

  const pending = guidedJourneyReducer(createInitialJourneyState(), {
    ...base,
    resumeState: "payment-pending",
    patientName: "Aditya Sharma",
    phone: "9876543210",
  });
  assert.equal(pending.step, "payment-pending");

  const paid = guidedJourneyReducer(createInitialJourneyState(), {
    ...base,
    resumeState: "paid",
  });
  assert.equal(paid.step, "paid");

  const enquiry = guidedJourneyReducer(createInitialJourneyState(), {
    ...base,
    outcome: "human-review",
    doctorId: undefined,
    resumeState: "enquiry-complete",
  });
  assert.equal(enquiry.step, "enquiry-complete");
});
