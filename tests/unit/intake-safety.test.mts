import assert from "node:assert/strict";
import test from "node:test";

import {
  EMERGENCY_STOP,
  UNCLEAR_RETRY,
  assessIntakeMessage,
} from "../../lib/intake-safety.ts";

test("retries unclear input without rejecting short valid concerns", () => {
  assert.deepEqual(assessIntakeMessage("asdfgh qwerty"), {
    kind: "unclear",
    message: UNCLEAR_RETRY,
  });
  assert.deepEqual(assessIntakeMessage("???"), {
    kind: "unclear",
    message: UNCLEAR_RETRY,
  });
  assert.deepEqual(assessIntakeMessage("PCOS"), { kind: "processable" });
});

test("stops a possible emergency before all other intake handling", () => {
  assert.deepEqual(
    assessIntakeMessage(
      "My father has severe chest pain and is struggling to breathe right now",
    ),
    { kind: "possible-emergency", message: EMERGENCY_STOP },
  );
  assert.deepEqual(
    assessIntakeMessage("  ASDFGH   SEVERE CHEST PAIN  "),
    { kind: "possible-emergency", message: EMERGENCY_STOP },
  );
  assert.deepEqual(
    assessIntakeMessage("My father is having a stroke right now"),
    { kind: "possible-emergency", message: EMERGENCY_STOP },
  );
  assert.deepEqual(
    assessIntakeMessage("I think she is having a heart attack"),
    { kind: "possible-emergency", message: EMERGENCY_STOP },
  );
});

test("allows ordinary health concerns to continue", () => {
  assert.deepEqual(
    assessIntakeMessage("My periods are delayed by two weeks"),
    { kind: "processable" },
  );
});

test("allows a Hindi health concern to reach the assistant", () => {
  assert.deepEqual(assessIntakeMessage("मेरी माहवारी छह हफ्तों से नहीं आई है"), { kind: "processable" });
});

test("does not misclassify ordinary English service questions as Hinglish", async () => {
  const { detectIntakeLanguage } = await import("../../lib/intake-language.ts");
  assert.equal(detectIntakeLanguage("Can I upload a report for the doctor?"), "en");
});
