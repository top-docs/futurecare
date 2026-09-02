import assert from "node:assert/strict";
import test from "node:test";

import {
  getGuidedSessionSnapshot,
  routeGuidedCaseToReview,
  saveGuidedContact,
  submitGuidedCase,
} from "../../convex/cases.ts";

type Row = Record<string, unknown> & { _id: string };

function handler<TArgs, TResult>(value: unknown) {
  return (value as { _handler: (ctx: unknown, args: TArgs) => Promise<TResult> })._handler;
}

function fakeDb(options: {
  consultationCase?: Row | null;
  payment?: Row | null;
} = {}) {
  let consultationCase = options.consultationCase ?? null;
  const payment = options.payment ?? null;
  const patches: Array<{ id: string; value: Record<string, unknown> }> = [];
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];
  const queries: string[] = [];

  return {
    state: { patches, inserts, queries },
    db: {
      get: async (id: string) => consultationCase?._id === id ? consultationCase : null,
      patch: async (id: string, value: Record<string, unknown>) => {
        patches.push({ id, value });
        if (consultationCase?._id === id) consultationCase = { ...consultationCase, ...value };
      },
      insert: async (table: string, value: Record<string, unknown>) => {
        inserts.push({ table, value });
        return "new-case-id";
      },
      query: (table: string) => {
        queries.push(table);
        return {
          withIndex: () => ({
            unique: async () => table === "cases"
              ? consultationCase
              : table === "payments"
                ? payment
                : null,
          }),
        };
      },
    },
  };
}

const submit = handler<Record<string, unknown>, Record<string, unknown>>(submitGuidedCase);
const saveContact = handler<Record<string, unknown>, Record<string, unknown>>(saveGuidedContact);
const routeToReview = handler<Record<string, unknown>, Record<string, unknown>>(routeGuidedCaseToReview);
const getSnapshot = handler<Record<string, unknown>, Record<string, unknown> | null>(getGuidedSessionSnapshot);

test("emergency submission returns guidance before any database access", async () => {
  const store = fakeDb();
  const result = await submit({ db: store.db }, {
    sessionId: "session-emergency",
    consultationType: "first-consultation",
    selectedSpecialty: "cardiology",
    caseDetails: "I have severe chest pain and difficulty breathing.",
    careConsentAccepted: false,
    source: "direct",
  });

  assert.equal(result.kind, "emergency");
  assert.deepEqual(store.state.queries, []);
  assert.deepEqual(store.state.inserts, []);
});

test("same guided session updates its draft instead of creating a duplicate", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-1",
      sessionId: "session-1",
      flowVersion: "guided-v1",
      status: "draft",
    },
  });
  const result = await submit({ db: store.db }, {
    sessionId: "session-1",
    consultationType: "first-consultation",
    selectedSpecialty: "cardiology",
    caseDetails: "I have had palpitations for two days.",
    careConsentAccepted: true,
    source: "direct",
  });

  assert.equal(result.caseId, "case-1");
  assert.equal(store.state.patches.length, 1);
  assert.equal(store.state.inserts.filter((entry) => entry.table === "cases").length, 0);
});

test("contact recheck stops an emergency without saving contact details", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-2",
      sessionId: "session-2",
      flowVersion: "guided-v1",
      consultationType: "first-consultation",
      selectedSpecialty: "cardiology",
      caseDetails: "I have severe chest pain and difficulty breathing.",
      matchOutcome: "matched",
      status: "matched",
    },
  });
  const result = await saveContact({ db: store.db }, {
    caseId: "case-2",
    sessionId: "session-2",
    patientName: "Aditya Sharma",
    phone: "9876543210",
  });

  assert.equal(result.kind, "emergency");
  assert.equal(store.state.patches.length, 0);
});

test("human-review case completes as an enquiry and never becomes payment-ready", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-3",
      sessionId: "session-3",
      flowVersion: "guided-v1",
      consultationType: "second-opinion",
      selectedSpecialty: "other-not-sure",
      caseDetails: "I am not sure which specialist should review these symptoms.",
      matchOutcome: "human-review",
      reviewReason: "other-or-not-sure",
      status: "draft",
    },
  });
  const result = await saveContact({ db: store.db }, {
    caseId: "case-3",
    sessionId: "session-3",
    patientName: "Aditya Sharma",
    phone: "9876543210",
  });

  assert.equal(result.kind, "enquiry-complete");
  assert.equal(store.state.patches[0]?.value.status, "enquiry_received");
  assert.notEqual(store.state.patches[0]?.value.status, "ready_for_payment");
});

test("matched contact becomes payment-ready only for the saved approved doctor", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-matched-contact",
      sessionId: "session-matched-contact",
      flowVersion: "guided-v1",
      consultationType: "first-consultation",
      selectedSpecialty: "cardiology",
      caseDetails: "I have had palpitations for two days.",
      matchOutcome: "matched",
      doctorId: "abhimanyu-nigam",
      status: "matched",
    },
  });
  const result = await saveContact({ db: store.db }, {
    caseId: "case-matched-contact",
    sessionId: "session-matched-contact",
    patientName: "Aditya Sharma",
    phone: "9876543210",
  });

  assert.equal(result.kind, "payment-ready");
  assert.equal(result.doctorId, "abhimanyu-nigam");
  assert.equal(store.state.patches[0]?.value.status, "ready_for_payment");
  assert.equal(store.state.patches[0]?.value.guidedStage, "payment-ready");
  assert.equal(store.state.patches[0]?.value.doctorId, "abhimanyu-nigam");
});

test("saved doctor mismatch fails closed to human review at contact", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-mismatch",
      sessionId: "session-mismatch",
      flowVersion: "guided-v1",
      consultationType: "first-consultation",
      selectedSpecialty: "cardiology",
      caseDetails: "I have had palpitations for two days.",
      matchOutcome: "matched",
      doctorId: "kirti-sinha",
      status: "matched",
    },
  });
  const result = await saveContact({ db: store.db }, {
    caseId: "case-mismatch",
    sessionId: "session-mismatch",
    patientName: "Aditya Sharma",
    phone: "9876543210",
  });

  assert.equal(result.kind, "enquiry-complete");
  assert.equal(store.state.patches[0]?.value.matchOutcome, "human-review");
  assert.equal(store.state.patches[0]?.value.status, "enquiry_received");
});

test("stale doctor recovery hides the doctor and returns safe review", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-stale",
      sessionId: "session-stale",
      flowVersion: "guided-v1",
      consultationType: "second-opinion",
      selectedSpecialty: "oncology",
      oncologyChoice: "medical-treatment",
      caseDetails: "We need clarity on the current cancer treatment plan.",
      matchOutcome: "matched",
      doctorId: "rachit-sood",
      guidedStage: "doctor-shown",
      status: "matched",
    },
  });
  const result = await getSnapshot({ db: store.db }, { sessionId: "session-stale" });

  assert.equal(result?.matchOutcome, "human-review");
  assert.equal(result?.reviewReason, "doctor-unavailable");
  assert.equal(result?.guidedStage, "human-review");
  assert.equal(result?.doctorId, undefined);
});

test("guided snapshot carries matched doctor, stage, and saved contact", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-recover",
      sessionId: "session-recover",
      flowVersion: "guided-v1",
      consultationType: "first-consultation",
      selectedSpecialty: "cardiology",
      caseDetails: "I have had palpitations for two days.",
      matchOutcome: "matched",
      doctorId: "abhimanyu-nigam",
      guidedStage: "payment-ready",
      patientName: "Aditya Sharma",
      phone: "9876543210",
      status: "ready_for_payment",
    },
  });
  const result = await getSnapshot({ db: store.db }, { sessionId: "session-recover" });

  assert.equal(result?.doctorId, "abhimanyu-nigam");
  assert.equal(result?.guidedStage, "payment-ready");
  assert.equal(result?.patientName, "Aditya Sharma");
  assert.equal(result?.phone, "9876543210");
  assert.equal(result?.resumeState, "payment-ready");
});

test("payment state wins recovery even when the saved guided stage is older", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-pending",
      sessionId: "session-pending",
      flowVersion: "guided-v1",
      consultationType: "first-consultation",
      selectedSpecialty: "cardiology",
      caseDetails: "I have had palpitations for two days.",
      matchOutcome: "matched",
      doctorId: "abhimanyu-nigam",
      guidedStage: "doctor-shown",
      status: "matched",
    },
    payment: { _id: "payment-pending", status: "created", razorpayOrderId: "order_saved" },
  });
  const result = await getSnapshot({ db: store.db }, { sessionId: "session-pending" });
  assert.equal(result?.resumeState, "payment-pending");
});

test("paid and enquiry terminal states win recovery", async () => {
  const paidStore = fakeDb({
    consultationCase: {
      _id: "case-paid",
      sessionId: "session-paid",
      flowVersion: "guided-v1",
      consultationType: "first-consultation",
      selectedSpecialty: "cardiology",
      caseDetails: "I have had palpitations for two days.",
      matchOutcome: "matched",
      doctorId: "abhimanyu-nigam",
      guidedStage: "doctor-shown",
      status: "paid",
    },
  });
  assert.equal((await getSnapshot({ db: paidStore.db }, { sessionId: "session-paid" }))?.resumeState, "paid");

  const enquiryStore = fakeDb({
    consultationCase: {
      _id: "case-enquiry",
      sessionId: "session-enquiry",
      flowVersion: "guided-v1",
      consultationType: "second-opinion",
      selectedSpecialty: "other-not-sure",
      caseDetails: "I need help finding the right specialist.",
      matchOutcome: "human-review",
      guidedStage: "human-review",
      status: "enquiry_received",
    },
  });
  assert.equal((await getSnapshot({ db: enquiryStore.db }, { sessionId: "session-enquiry" }))?.resumeState, "enquiry-complete");
});

test("guided resubmission keeps the original safe traffic source", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-source",
      sessionId: "session-source",
      flowVersion: "guided-v1",
      source: "instagram",
      status: "draft",
    },
  });
  await submit({ db: store.db }, {
    sessionId: "session-source",
    consultationType: "first-consultation",
    selectedSpecialty: "cardiology",
    caseDetails: "I have had palpitations for two days.",
    careConsentAccepted: true,
    source: "whatsapp",
  });
  assert.equal(store.state.patches[0]?.value.source, "instagram");
});

test("case submission records structured funnel facts without medical or contact text", async () => {
  const store = fakeDb();
  await submit({ db: store.db }, {
    sessionId: "session-events",
    consultationType: "second-opinion",
    selectedSpecialty: "cardiology",
    caseDetails: "I have had palpitations for two days.",
    careConsentAccepted: true,
    source: "instagram",
  });

  const eventRows = store.state.inserts.filter((entry) => entry.table === "events");
  assert.deepEqual(eventRows.map((entry) => entry.value.name), [
    "consultation_type_selected",
    "specialty_selected",
    "case_submitted",
    "doctor_shown",
  ]);
  for (const { value } of eventRows) {
    assert.equal("caseDetails" in value, false);
    assert.equal("patientName" in value, false);
    assert.equal("phone" in value, false);
  }
  assert.equal(eventRows[0]?.value.consultationType, "second-opinion");
  assert.equal(eventRows[1]?.value.selectedSpecialty, "cardiology");
});

test("human-review contact records completion from saved server state", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-review-events",
      sessionId: "session-review-events",
      flowVersion: "guided-v1",
      consultationType: "second-opinion",
      selectedSpecialty: "other-not-sure",
      caseDetails: "I need help finding the right specialist.",
      matchOutcome: "human-review",
      reviewReason: "other-or-not-sure",
      source: "whatsapp",
      status: "draft",
    },
  });
  await saveContact({ db: store.db }, {
    caseId: "case-review-events",
    sessionId: "session-review-events",
    patientName: "Aditya Sharma",
    phone: "9876543210",
  });

  const eventRows = store.state.inserts.filter((entry) => entry.table === "events");
  assert.deepEqual(eventRows.map((entry) => entry.value.name), [
    "contact_submitted",
    "enquiry_received",
  ]);
  assert.equal(eventRows.every((entry) => entry.value.source === "whatsapp"), true);
});

test("completed enquiry cannot be rolled back to a draft", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-4",
      sessionId: "session-4",
      flowVersion: "guided-v1",
      matchOutcome: "human-review",
      status: "enquiry_received",
    },
  });
  const result = await routeToReview({ db: store.db }, {
    caseId: "case-4",
    sessionId: "session-4",
  });

  assert.equal(result.kind, "enquiry-complete");
  assert.equal(store.state.patches.length, 0);
});

test("routing the same saved match to review twice is idempotent", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-correction",
      sessionId: "session-correction",
      flowVersion: "guided-v1",
      matchOutcome: "matched",
      doctorId: "abhimanyu-nigam",
      status: "matched",
    },
  });

  const first = await routeToReview({ db: store.db }, {
    caseId: "case-correction",
    sessionId: "session-correction",
    reason: "patient-rejected-match",
  });
  const second = await routeToReview({ db: store.db }, {
    caseId: "case-correction",
    sessionId: "session-correction",
    reason: "patient-rejected-match",
  });

  assert.equal(first.kind, "human-review");
  assert.equal(second.kind, "human-review");
  assert.equal(store.state.patches.length, 1);
});

test("invalid guided contact is rejected without changing the case", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "case-invalid-contact",
      sessionId: "session-invalid-contact",
      flowVersion: "guided-v1",
      consultationType: "first-consultation",
      selectedSpecialty: "cardiology",
      caseDetails: "I have had palpitations for two days.",
      matchOutcome: "matched",
      doctorId: "abhimanyu-nigam",
      status: "matched",
    },
  });

  await assert.rejects(() => saveContact({ db: store.db }, {
    caseId: "case-invalid-contact",
    sessionId: "session-invalid-contact",
    patientName: "A",
    phone: "12345",
  }));
  assert.equal(store.state.patches.length, 0);
});

test("paid legacy sessions recover only their payment state", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "legacy-case",
      sessionId: "legacy-session",
      status: "paid",
      concern: "private medical text",
    },
    payment: { _id: "payment-1", status: "captured" },
  });
  const result = await getSnapshot({ db: store.db }, { sessionId: "legacy-session" });

  assert.deepEqual(result, {
    kind: "legacy-payment",
    caseId: "legacy-case",
    caseStatus: "paid",
    paymentStatus: "captured",
    resumeState: "paid",
  });
  assert.equal("concern" in result!, false);
});

test("legacy payment-pending returns only the fields needed to reopen its saved order", async () => {
  const store = fakeDb({
    consultationCase: {
      _id: "legacy-pending-case",
      sessionId: "legacy-pending-session",
      status: "payment_pending",
      patientName: "Aditya Sharma",
      phone: "9876543210",
      doctorId: "abhimanyu-nigam",
      concern: "private medical text",
      caseSummary: "private summary",
    },
    payment: {
      _id: "legacy-pending-payment",
      status: "created",
      razorpayOrderId: "order_saved",
    },
  });
  const result = await getSnapshot({ db: store.db }, { sessionId: "legacy-pending-session" });

  assert.deepEqual(result, {
    kind: "legacy-payment",
    caseId: "legacy-pending-case",
    caseStatus: "payment_pending",
    paymentStatus: "created",
    resumeState: "payment-pending",
    patientName: "Aditya Sharma",
    phone: "9876543210",
    doctorId: "abhimanyu-nigam",
    hasSavedOrder: true,
  });
  assert.equal("concern" in result!, false);
  assert.equal("caseSummary" in result!, false);
});
