import assert from "node:assert/strict";
import test from "node:test";

import { prepare } from "../../convex/payments.ts";
import { getPaymentServerSecret } from "../../lib/payment-server.ts";

type Row = Record<string, unknown> & { _id: string };

function handler<TArgs, TResult>(value: unknown) {
  return (value as { _handler: (ctx: unknown, args: TArgs) => Promise<TResult> })._handler;
}

function fakeDb(options: { consultationCase: Row; payment?: Row | null }) {
  const consultationCase = options.consultationCase;
  let payment = options.payment ?? null;
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];
  const patches: Array<{ id: string; value: Record<string, unknown> }> = [];

  return {
    state: { inserts, patches },
    db: {
      get: async (id: string) => {
        if (id === consultationCase._id) return consultationCase;
        if (id === payment?._id) return payment;
        return null;
      },
      insert: async (table: string, value: Record<string, unknown>) => {
        inserts.push({ table, value });
        if (table === "payments") payment = { _id: "payment-new", ...value };
        return table === "payments" ? "payment-new" : "event-new";
      },
      patch: async (id: string, value: Record<string, unknown>) => {
        patches.push({ id, value });
        if (id === payment?._id) payment = { ...payment, ...value };
      },
      query: (table: string) => ({
        withIndex: () => ({
          unique: async () => table === "payments" ? payment : null,
        }),
      }),
    },
  };
}

const preparePayment = handler<Record<string, unknown>, Record<string, unknown>>(prepare);
const serverSecret = getPaymentServerSecret("secret");
process.env.PAYMENT_API_SECRET_HASH = serverSecret;

function guidedCase(overrides: Record<string, unknown> = {}): Row {
  return {
    _id: "case-guided",
    sessionId: "session-guided",
    flowVersion: "guided-v1",
    consultationType: "first-consultation",
    selectedSpecialty: "cardiology",
    caseDetails: "I have had palpitations for two days.",
    matchOutcome: "matched",
    caseType: "consultation",
    doctorId: "abhimanyu-nigam",
    patientName: "Aditya Sharma",
    phone: "9876543210",
    status: "ready_for_payment",
    guidedStage: "payment-ready",
    source: "direct",
    ...overrides,
  };
}

test("a new order is prepared only for an exact guided payment-ready match", async () => {
  const store = fakeDb({ consultationCase: guidedCase() });
  const result = await preparePayment({ db: store.db }, {
    caseId: "case-guided",
    sessionId: "session-guided",
    serverSecret,
  });

  assert.equal(result.shouldCreate, true);
  assert.equal(result.amountPaise, 80_000);
  assert.equal(store.state.inserts.filter((entry) => entry.table === "payments").length, 1);
});

test("a stale or client-mismatched doctor cannot start an order", async () => {
  const store = fakeDb({ consultationCase: guidedCase({ doctorId: "kirti-sinha" }) });
  await assert.rejects(() => preparePayment({ db: store.db }, {
    caseId: "case-guided",
    sessionId: "session-guided",
    serverSecret,
  }));
  assert.equal(store.state.inserts.length, 0);
});

test("legacy cases cannot create new orders", async () => {
  const store = fakeDb({
    consultationCase: guidedCase({ flowVersion: undefined }),
  });
  await assert.rejects(() => preparePayment({ db: store.db }, {
    caseId: "case-guided",
    sessionId: "session-guided",
    serverSecret,
  }));
  assert.equal(store.state.inserts.length, 0);
});

test("a saved legacy order can be recovered but cannot be recreated", async () => {
  const store = fakeDb({
    consultationCase: guidedCase({ flowVersion: undefined }),
    payment: {
      _id: "payment-old",
      caseId: "case-guided",
      amountPaise: 80_000,
      currency: "INR",
      status: "created",
      receipt: "fc_payment-old",
      razorpayOrderId: "order_old",
    },
  });
  const result = await preparePayment({ db: store.db }, {
    caseId: "case-guided",
    sessionId: "session-guided",
    serverSecret,
  });
  assert.equal(result.orderId, "order_old");
  assert.equal(result.shouldCreate, false);
});

test("a saved guided order stops if its doctor is no longer the exact match", async () => {
  const store = fakeDb({
    consultationCase: guidedCase({
      doctorId: "kirti-sinha",
      status: "payment_pending",
      guidedStage: "payment-pending",
    }),
    payment: {
      _id: "payment-stale",
      caseId: "case-guided",
      amountPaise: 80_000,
      currency: "INR",
      status: "created",
      receipt: "td_payment-stale",
      razorpayOrderId: "order_stale",
    },
  });
  await assert.rejects(() => preparePayment({ db: store.db }, {
    caseId: "case-guided",
    sessionId: "session-guided",
    serverSecret,
  }));
});

test("an existing ₹800 order keeps its saved price after the date boundary", async () => {
  const store = fakeDb({
    consultationCase: guidedCase(),
    payment: {
      _id: "payment-existing",
      caseId: "case-guided",
      amountPaise: 80_000,
      currency: "INR",
      status: "created",
      receipt: "td_payment-existing",
      razorpayOrderId: "order_existing",
    },
  });
  const result = await preparePayment({ db: store.db }, {
    caseId: "case-guided",
    sessionId: "session-guided",
    serverSecret,
  });
  assert.equal(result.amountPaise, 80_000);
  assert.equal(result.shouldCreate, false);
});
