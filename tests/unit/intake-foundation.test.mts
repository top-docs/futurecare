import assert from "node:assert/strict";
import test from "node:test";

import { createSingleFlightGate } from "../../lib/single-flight.ts";
import { guidedContactSchema } from "../../lib/validation.ts";

test("accepts only usable Indian contact details", () => {
  assert.equal(guidedContactSchema.safeParse({ patientName: "A", phone: "123" }).success, false);
  assert.equal(
    guidedContactSchema.safeParse({ patientName: "Aditya Sharma", phone: "9876543210" }).success,
    true,
  );
});

test("guided contact needs only a name and Indian WhatsApp number", () => {
  assert.equal(guidedContactSchema.safeParse({ patientName: "A", phone: "9876543210" }).success, false);
  assert.equal(guidedContactSchema.safeParse({ patientName: "Aditya Sharma", phone: "12345" }).success, false);
  assert.deepEqual(guidedContactSchema.parse({
    patientName: " Aditya Sharma ",
    phone: "9876543210",
  }), {
    patientName: "Aditya Sharma",
    phone: "9876543210",
  });
});

test("single-flight gate blocks repeated actions until released", () => {
  const gate = createSingleFlightGate();

  assert.equal(gate.tryStart(), true);
  assert.equal(gate.tryStart(), false);

  gate.finish();
  assert.equal(gate.tryStart(), true);
});
