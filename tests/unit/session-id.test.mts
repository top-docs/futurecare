import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSessionId,
  getOrCreateSessionId,
  getSafeSessionAccess,
  getSafeSessionAccessForEntry,
} from "../../lib/session-id.ts";

function storageWith(value: string | null) {
  let saved = value;
  return { storage: { getItem: () => saved, setItem: (_key: string, next: string) => { saved = next; } }, read: () => saved };
}

test("reuses a valid browser session identifier", () => {
  const state = storageWith("123e4567-e89b-12d3-a456-426614174000");
  assert.equal(getOrCreateSessionId(state.storage, () => "new"), "123e4567-e89b-12d3-a456-426614174000");
});

test("clears only the browser session link when starting a different case", () => {
  const values = new Map<string, string>([["futurecare.session.v1", "11111111-1111-4111-8111-111111111111"]]);
  clearSessionId({ removeItem: (key) => values.delete(key) });
  assert.equal(values.has("futurecare.session.v1"), false);
});

test("a fresh landing entry replaces the saved browser session before recovery", () => {
  const values = new Map<string, string>([["futurecare.session.v1", "11111111-1111-4111-8111-111111111111"]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };

  const result = getSafeSessionAccessForEntry(
    () => storage,
    true,
    () => "22222222-2222-4222-8222-222222222222",
  );

  assert.deepEqual(result, {
    sessionId: "22222222-2222-4222-8222-222222222222",
    recoveryAvailable: true,
  });
  assert.equal(values.get("futurecare.session.v1"), result.sessionId);
});

test("a direct journey return keeps its saved browser session for recovery", () => {
  const saved = "11111111-1111-4111-8111-111111111111";
  const values = new Map<string, string>([["futurecare.session.v1", saved]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };

  const result = getSafeSessionAccessForEntry(
    () => storage,
    false,
    () => "22222222-2222-4222-8222-222222222222",
  );

  assert.equal(result.sessionId, saved);
});

test("replaces corrupt local state without storing health data", () => {
  const state = storageWith("corrupt");
  assert.equal(getOrCreateSessionId(state.storage, () => "987e6543-e21b-12d3-a456-426614174999"), "987e6543-e21b-12d3-a456-426614174999");
  assert.equal(state.read(), "987e6543-e21b-12d3-a456-426614174999");
});

test("keeps the visit usable when browser storage is unavailable", () => {
  const result = getSafeSessionAccess(
    () => { throw new Error("blocked"); },
    () => "123e4567-e89b-12d3-a456-426614174777",
  );
  assert.deepEqual(result, {
    sessionId: "123e4567-e89b-12d3-a456-426614174777",
    recoveryAvailable: false,
  });
});
