import assert from "node:assert/strict";
import test from "node:test";

import {
  CARE_CONSENT_ERROR,
  EMPTY_INPUT_ERROR,
  validateMessageSubmission,
} from "../../lib/consultation-consent.ts";

test("rejects whitespace-only health concerns with a specific message", () => {
  assert.deepEqual(validateMessageSubmission("   ", false), {
    ok: false,
    field: "input",
    message: EMPTY_INPUT_ERROR,
  });
});

test("rejects a health concern when care consent is missing", () => {
  assert.deepEqual(validateMessageSubmission("Delayed periods for two months", false), {
    ok: false,
    field: "careConsent",
    message: CARE_CONSENT_ERROR,
  });
});

test("accepts and trims a health concern after care consent", () => {
  assert.deepEqual(
    validateMessageSubmission("  Delayed periods for two months  ", true),
    {
      ok: true,
      text: "Delayed periods for two months",
    },
  );
});
