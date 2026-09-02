import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGuidedCaseSubmission,
} from "../../lib/guided-case-contract.ts";

test("builds a matched record from structured choices and ignores a supplied doctor", () => {
  const result = buildGuidedCaseSubmission({
    consultationType: "first-consultation",
    selectedSpecialty: "cardiology",
    caseDetails: "I have had palpitations for the last two days.",
    careConsentAccepted: true,
    doctorId: "kirti-sinha",
  } as never);

  assert.deepEqual(result, {
    kind: "matched",
    consultationType: "first-consultation",
    selectedSpecialty: "cardiology",
    caseDetails: "I have had palpitations for the last two days.",
    doctorId: "abhimanyu-nigam",
  });
});

test("routes both oncology branches and uncertainty from explicit choices", () => {
  assert.equal(buildGuidedCaseSubmission({
    consultationType: "second-opinion",
    selectedSpecialty: "oncology",
    oncologyChoice: "head-and-neck",
    caseDetails: "We want another opinion about an oral cancer surgery.",
    careConsentAccepted: true,
  }).kind, "matched");

  assert.deepEqual(buildGuidedCaseSubmission({
    consultationType: "second-opinion",
    selectedSpecialty: "oncology",
    oncologyChoice: "other-not-sure",
    caseDetails: "We are unsure which cancer specialist is appropriate.",
    careConsentAccepted: true,
  }), {
    kind: "human-review",
    consultationType: "second-opinion",
    selectedSpecialty: "oncology",
    oncologyChoice: "other-not-sure",
    caseDetails: "We are unsure which cancer specialist is appropriate.",
    reason: "other-or-not-sure",
  });
});

test("rejects missing consent and unclear case details before persistence", () => {
  assert.deepEqual(buildGuidedCaseSubmission({
    consultationType: "first-consultation",
    selectedSpecialty: "cardiology",
    caseDetails: "Heart palpitations for two days",
    careConsentAccepted: false,
  }), {
    kind: "invalid",
    field: "careConsent",
    message: "Accept the care and privacy notice before sharing health details.",
  });

  for (const caseDetails of ["", "qwerty", "!!!!"] as const) {
    const result = buildGuidedCaseSubmission({
      consultationType: "first-consultation",
      selectedSpecialty: "cardiology",
      caseDetails,
      careConsentAccepted: true,
    });
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") assert.equal(result.field, "caseDetails");
  }
});

test("returns an emergency result without a persistable record shape", () => {
  const result = buildGuidedCaseSubmission({
    consultationType: "first-consultation",
    selectedSpecialty: "cardiology",
    caseDetails: "I have severe chest pain and difficulty breathing.",
    careConsentAccepted: true,
  });

  assert.equal(result.kind, "emergency");
  assert.equal("caseDetails" in result, false);
  assert.match(result.message, /nearest hospital/i);
});

test("shows emergency guidance even when care consent is missing", () => {
  const result = buildGuidedCaseSubmission({
    consultationType: "first-consultation",
    selectedSpecialty: "cardiology",
    caseDetails: "I have severe chest pain and difficulty breathing.",
    careConsentAccepted: false,
  });

  assert.equal(result.kind, "emergency");
  assert.equal("caseDetails" in result, false);
});

test("routes inactive or missing approved doctors to human review", () => {
  for (const status of ["inactive", "missing"] as const) {
    const result = buildGuidedCaseSubmission({
      consultationType: "first-consultation",
      selectedSpecialty: "cardiology",
      caseDetails: "I have had palpitations for the last two days.",
      careConsentAccepted: true,
    }, { doctorStatus: () => status });

    assert.equal(result.kind, "human-review");
    if (result.kind === "human-review") assert.equal(result.reason, "doctor-unavailable");
  }
});
