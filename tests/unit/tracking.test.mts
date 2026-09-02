import assert from "node:assert/strict";
import test from "node:test";
import {
  captureFirstTouchSource,
  getTrafficSource,
  readSavedTrafficSource,
  saveTrafficSource,
} from "../../lib/tracking.ts";

test("keeps an allowed campaign source", () => assert.equal(getTrafficSource("?utm_source=Instagram", ""), "instagram"));
test("falls back to referrer or direct without storing a full URL", () => {
  assert.equal(getTrafficSource("", "https://x.com/post/123"), "twitter");
  assert.equal(getTrafficSource("", "https://unknown.example/patient/private"), "referral");
  assert.equal(getTrafficSource("?utm_source=<script>", ""), "other");
});

test("stores only a sanitized source and ignores unsafe saved values", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  assert.equal(saveTrafficSource(storage, "Instagram"), "instagram");
  assert.equal(readSavedTrafficSource(storage), "instagram");
  saveTrafficSource(storage, "https://example.com/patient?diagnosis=private");
  assert.equal(readSavedTrafficSource(storage), "other");
});

test("keeps the first safe source across landing and enquiry pages", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  assert.equal(captureFirstTouchSource(storage, "instagram"), "instagram");
  assert.equal(captureFirstTouchSource(storage, "whatsapp"), "instagram");
  assert.equal(readSavedTrafficSource(storage), "instagram");
});

test("maps unknown or private-looking campaign values to a closed source", () => {
  assert.equal(getTrafficSource("?utm_source=patient-has-crohns", ""), "other");
  assert.equal(getTrafficSource("?utm_source=WhatsApp", ""), "whatsapp");
});
