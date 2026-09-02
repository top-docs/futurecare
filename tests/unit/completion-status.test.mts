import assert from "node:assert/strict";
import test from "node:test";

import { getCompletionState } from "../../lib/completion-status.ts";

test("confirmed payment returns a Top Docs handoff and the correct mode", () => {
  assert.deepEqual(getCompletionState({ status: "paid", paymentMode: "test" }), {
    kind: "paid",
    paymentMode: "test",
  });
  assert.deepEqual(getCompletionState({ status: "paid", paymentMode: "live" }), {
    kind: "paid",
    paymentMode: "live",
  });
});

test("creating or created payments remain retryable instead of looking failed", () => {
  assert.deepEqual(getCompletionState({ status: "created", lastAttemptResult: "cancelled" }), {
    kind: "pending",
    attempt: "cancelled",
  });
  assert.deepEqual(getCompletionState({ status: "creating" }), {
    kind: "pending",
    attempt: undefined,
  });
});

test("missing and malformed payment data is never shown as paid", () => {
  assert.deepEqual(getCompletionState({ status: "not_started" }), { kind: "not-confirmed" });
  assert.deepEqual(getCompletionState(null), { kind: "not-confirmed" });
});
