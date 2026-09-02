import assert from "node:assert/strict";
import test from "node:test";

import { linkSessionToCase, recordOnce, recordServerEvent } from "../../convex/events.ts";

type Row = Record<string, unknown> & { _id: string };

function handler<TArgs, TResult>(value: unknown) {
  return (value as { _handler: (ctx: unknown, args: TArgs) => Promise<TResult> })._handler;
}

function fakeDb(options: { consultationCase?: Row | null; event?: Row | null } = {}) {
  const consultationCase = options.consultationCase ?? null;
  const event = options.event ?? null;
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];
  const patches: Array<{ id: string; value: Record<string, unknown> }> = [];
  return {
    state: { inserts, patches },
    db: {
      get: async (id: string) => consultationCase?._id === id ? consultationCase : null,
      insert: async (table: string, value: Record<string, unknown>) => {
        inserts.push({ table, value });
        return "event-new";
      },
      patch: async (id: string, value: Record<string, unknown>) => patches.push({ id, value }),
      query: () => ({
        withIndex: () => ({
          unique: async () => event,
          collect: async () => event ? [event] : [],
        }),
      }),
    },
  };
}

const record = handler<Record<string, unknown>, string>(recordOnce);
const link = handler<Record<string, unknown>, void>(linkSessionToCase);

test("client events store only closed source data and never trust doctor or assistance", async () => {
  const store = fakeDb();
  await record({ db: store.db }, {
    sessionId: "session-safe",
    name: "landing_view",
    source: "patient-has-crohns",
    doctorId: "forged-doctor",
    assistance: "support_assisted",
  });
  assert.deepEqual(store.state.inserts[0]?.value, {
    sessionId: "session-safe",
    name: "landing_view",
    source: "other",
    assistance: "self_serve",
    dedupeKey: "session-safe:landing_view",
    createdAt: store.state.inserts[0]?.value.createdAt,
  });
});

test("a client cannot attach an event to another session's case", async () => {
  const store = fakeDb({ consultationCase: { _id: "case-private", sessionId: "owner-session" } });
  await assert.rejects(() => record({ db: store.db }, {
    sessionId: "attacker-session",
    caseId: "case-private",
    name: "contact_submitted",
    source: "direct",
  }));
  assert.equal(store.state.inserts.length, 0);
});

test("a client cannot forge a post-consent doctor event", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-review",
      sessionId: "session-review",
      matchOutcome: "human-review",
      status: "draft",
    },
  });
  await assert.rejects(() => record({ db: store.db }, {
    sessionId: "session-review",
    caseId: "case-review",
    name: "doctor_shown",
    source: "direct",
    doctorId: "forged-doctor",
  }));
  assert.equal(store.state.inserts.length, 0);
});

test("session linking verifies case ownership before changing events", async () => {
  const store = fakeDb({
    consultationCase: { _id: "case-private", sessionId: "owner-session" },
    event: { _id: "event-1", sessionId: "attacker-session" },
  });
  await assert.rejects(() => link({ db: store.db }, {
    sessionId: "attacker-session",
    caseId: "case-private",
  }));
  assert.equal(store.state.patches.length, 0);
});

test("payment revenue is written once with canonical assistance", async () => {
  const first = fakeDb();
  await recordServerEvent({ db: first.db } as never, {
    sessionId: "session-paid",
    caseId: "case-paid" as never,
    name: "payment_succeeded",
    source: "instagram",
    amountPaise: 80_000,
    assistance: "support_assisted",
  });
  assert.equal(first.state.inserts.length, 1);
  assert.equal(first.state.inserts[0]?.value.amountPaise, 80_000);
  assert.equal(first.state.inserts[0]?.value.assistance, "support_assisted");

  const existing = first.state.inserts[0]!.value as Row;
  existing._id = "event-paid";
  const retry = fakeDb({ event: existing });
  await recordServerEvent({ db: retry.db } as never, {
    sessionId: "session-paid",
    caseId: "case-paid" as never,
    name: "payment_succeeded",
    source: "whatsapp",
    amountPaise: 80_000,
    assistance: "self_serve",
  });
  assert.equal(retry.state.inserts.length, 0);
});
