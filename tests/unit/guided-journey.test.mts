import assert from "node:assert/strict";
import test from "node:test";

import {
  CONSULTATION_TYPE_CHOICES,
  GUIDED_STAGES,
  ONCOLOGY_CHOICES,
  SPECIALTY_CHOICES,
  caseDetailsSchema,
  resolveGuidedRoute,
} from "../../lib/guided-journey.ts";

const EXPECTED_ROUTES = [
  ["gynaecology", "kirti-sinha"],
  ["gastroenterology", "mridul-mahajan"],
  ["cardiology", "abhimanyu-nigam"],
  ["nephrology", "jaswanth-kumar-dola"],
  ["orthopaedics", "himanshu"],
  ["neonatology", "abhishek-gowdar"],
  ["neurology", "naman-agarwal"],
  ["endocrinology", "saurav-das"],
  ["urology", "rajath-shetty"],
] as const;

test("publishes the locked guided choices and stages", () => {
  assert.deepEqual(
    CONSULTATION_TYPE_CHOICES.map((choice) => choice.value),
    ["first-consultation", "second-opinion"],
  );
  assert.equal(SPECIALTY_CHOICES.length, 11);
  assert.equal(SPECIALTY_CHOICES.at(-1)?.value, "other-not-sure");
  assert.deepEqual(
    ONCOLOGY_CHOICES.map((choice) => choice.value),
    ["head-and-neck", "medical-treatment", "other-not-sure"],
  );
  assert.deepEqual(GUIDED_STAGES.slice(0, 3), [
    "consultation-type",
    "specialty",
    "case-details",
  ]);
});

test("maps every supported non-oncology selection to one approved doctor", () => {
  for (const [specialty, doctorId] of EXPECTED_ROUTES) {
    assert.deepEqual(
      resolveGuidedRoute({
        consultationType: "first-consultation",
        specialty,
        caseDetails: "These details must not influence the fixed route.",
      }),
      { kind: "matched", specialty, doctorId },
    );
  }
});

test("maps both supported oncology choices and reviews oncology uncertainty", () => {
  assert.deepEqual(
    resolveGuidedRoute({
      consultationType: "second-opinion",
      specialty: "oncology",
      oncologyChoice: "head-and-neck",
      caseDetails: "Treatment details",
    }),
    { kind: "matched", specialty: "oncology", doctorId: "rachit-sood" },
  );
  assert.deepEqual(
    resolveGuidedRoute({
      consultationType: "second-opinion",
      specialty: "oncology",
      oncologyChoice: "medical-treatment",
      caseDetails: "Completely different written symptoms",
    }),
    { kind: "matched", specialty: "oncology", doctorId: "chitrakshi-nagpal" },
  );
  assert.deepEqual(
    resolveGuidedRoute({
      consultationType: "second-opinion",
      specialty: "oncology",
      oncologyChoice: "other-not-sure",
      caseDetails: "I am unsure which cancer specialty applies.",
    }),
    { kind: "human-review", reason: "other-or-not-sure" },
  );
});

test("routes other, unknown, and unavailable selections to human review", () => {
  assert.deepEqual(
    resolveGuidedRoute({
      consultationType: "first-consultation",
      specialty: "other-not-sure",
      caseDetails: "I am not sure which specialty I need.",
    }),
    { kind: "human-review", reason: "other-or-not-sure" },
  );
  assert.deepEqual(
    resolveGuidedRoute({
      consultationType: "not-a-real-type",
      specialty: "cardiology",
      caseDetails: "Heart palpitations",
    }),
    { kind: "human-review", reason: "unknown-selection" },
  );
  assert.deepEqual(
    resolveGuidedRoute({
      consultationType: "first-consultation",
      specialty: "not-a-real-specialty",
      caseDetails: "Some medical details",
    }),
    { kind: "human-review", reason: "unknown-selection" },
  );
  assert.deepEqual(
    resolveGuidedRoute(
      {
        consultationType: "first-consultation",
        specialty: "cardiology",
        caseDetails: "Heart palpitations",
      },
      { doctorStatus: () => "inactive" },
    ),
    { kind: "human-review", reason: "doctor-unavailable" },
  );
  assert.deepEqual(
    resolveGuidedRoute(
      {
        consultationType: "first-consultation",
        specialty: "cardiology",
        caseDetails: "Heart palpitations",
      },
      { doctorStatus: () => "missing" },
    ),
    { kind: "human-review", reason: "doctor-unavailable" },
  );
});

test("written symptoms never override the selected specialty", () => {
  assert.deepEqual(
    resolveGuidedRoute({
      consultationType: "first-consultation",
      specialty: "cardiology",
      caseDetails: "My periods are delayed and I have an ovarian cyst.",
    }),
    { kind: "matched", specialty: "cardiology", doctorId: "abhimanyu-nigam" },
  );
});

test("case details reject blank and nonsense text but accept Hindi and Hinglish", () => {
  for (const invalid of ["", "   ", "qwerty", "!!!!", "aaaaaa"]) {
    assert.equal(caseDetailsSchema.safeParse(invalid).success, false);
  }

  for (const valid of [
    "मेरी माँ के घुटने में कई दिनों से दर्द है।",
    "Meri mother ko do hafte se pet mein dard hai.",
  ]) {
    assert.equal(caseDetailsSchema.safeParse(valid).success, true);
  }
});
