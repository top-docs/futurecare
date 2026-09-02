import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import type { MutationCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { getConsultationPrice } from "../lib/pricing.ts";
import { buildGuidedCaseSubmission } from "../lib/guided-case-contract.ts";
import { guidedContactSchema } from "../lib/validation.ts";
import {
  getApprovedDoctorStatus,
  resolveApprovedDoctor,
} from "./approvedDoctors.ts";
import { recordServerEvent } from "./events.ts";

const CREATION_LEASE_MS = 30_000;

function requirePaymentServer(secret: string) {
  const expected = (globalThis as { process?: { env?: { PAYMENT_API_SECRET_HASH?: string } } }).process?.env?.PAYMENT_API_SECRET_HASH;
  if (!expected || secret !== expected) throw new Error("Payment server authorization failed.");
}

async function recordPaymentEvent(ctx: MutationCtx, args: { sessionId: string; caseId: Id<"cases">; name: "payment_started" | "payment_succeeded" | "payment_failed" | "payment_cancelled"; source: string; amountPaise: number; assistance?: "self_serve" | "support_assisted" }) {
  return await recordServerEvent(ctx, args);
}

function requireEligibleGuidedCase(
  consultationCase: {
    flowVersion?: string;
    consultationType?: "first-consultation" | "second-opinion";
    selectedSpecialty?: "gynaecology" | "gastroenterology" | "cardiology" | "nephrology" | "oncology" | "orthopaedics" | "neonatology" | "neurology" | "endocrinology" | "urology" | "other-not-sure";
    oncologyChoice?: "head-and-neck" | "medical-treatment" | "other-not-sure";
    caseDetails?: string;
    matchOutcome?: string;
    caseType?: string;
    doctorId?: string;
    patientName?: string;
    phone?: string;
    status: string;
    guidedStage?: string;
  },
  allowPaymentPending: boolean,
) {
  if (
    consultationCase.flowVersion !== "guided-v1"
    || consultationCase.matchOutcome !== "matched"
    || consultationCase.caseType !== "consultation"
    || !consultationCase.consultationType
    || !consultationCase.selectedSpecialty
    || !consultationCase.caseDetails
    || !consultationCase.doctorId
  ) {
    throw new Error("Only a matched guided consultation can start payment.");
  }
  if (
    consultationCase.status !== "ready_for_payment"
    && !(allowPaymentPending && consultationCase.status === "payment_pending")
  ) {
    throw new Error("This guided consultation is not ready for payment.");
  }
  if (
    consultationCase.guidedStage !== "payment-ready"
    && !(allowPaymentPending && consultationCase.guidedStage === "payment-pending")
  ) {
    throw new Error("This guided consultation is not at the payment step.");
  }
  guidedContactSchema.parse({
    patientName: consultationCase.patientName,
    phone: consultationCase.phone,
  });
  const route = buildGuidedCaseSubmission({
    consultationType: consultationCase.consultationType,
    selectedSpecialty: consultationCase.selectedSpecialty,
    oncologyChoice: consultationCase.oncologyChoice,
    caseDetails: consultationCase.caseDetails,
    careConsentAccepted: true,
  }, { doctorStatus: getApprovedDoctorStatus });
  if (route.kind !== "matched" || route.doctorId !== consultationCase.doctorId) {
    throw new Error("The saved specialist is no longer the approved match.");
  }
  resolveApprovedDoctor(route.doctorId);
}

export const prepare = mutation({
  args: { caseId: v.id("cases"), sessionId: v.string(), serverSecret: v.string() },
  handler: async (ctx, args) => {
    requirePaymentServer(args.serverSecret);
    const consultationCase = await ctx.db.get(args.caseId);
    if (!consultationCase || consultationCase.sessionId !== args.sessionId) {
      throw new Error("The saved case was not found.");
    }

    const existing = await ctx.db.query("payments").withIndex("by_case_id", (q) => q.eq("caseId", args.caseId)).unique();
    if (existing) {
      await recordPaymentEvent(ctx, {
        sessionId: args.sessionId,
        caseId: args.caseId,
        name: "payment_started",
        source: consultationCase.source ?? "direct",
        amountPaise: existing.amountPaise,
        assistance: existing.assistance ?? "self_serve",
      });
      if (existing.status === "paid") {
        return {
          paymentId: existing._id,
          receipt: existing.receipt ?? `fc_${existing._id}`,
          status: existing.status,
          orderId: existing.razorpayOrderId,
          amountPaise: existing.amountPaise,
          currency: existing.currency,
          source: consultationCase.source ?? "direct",
          shouldCreate: false,
        };
      }

      if (consultationCase.flowVersion === "guided-v1") {
        requireEligibleGuidedCase(consultationCase, true);
      }
      if (existing.razorpayOrderId) {
        return {
          paymentId: existing._id,
          receipt: existing.receipt ?? `fc_${existing._id}`,
          status: existing.status,
          orderId: existing.razorpayOrderId,
          amountPaise: existing.amountPaise,
          currency: existing.currency,
          source: consultationCase.source ?? "direct",
          shouldCreate: false,
        };
      }

      // Historical cases can recover a saved order, but cannot create a new one.
      if (consultationCase.flowVersion !== "guided-v1") {
        return {
          paymentId: existing._id,
          receipt: existing.receipt ?? `fc_${existing._id}`,
          status: existing.status,
          orderId: undefined,
          amountPaise: existing.amountPaise,
          currency: existing.currency,
          source: consultationCase.source ?? "direct",
          shouldCreate: false,
          recoverOnly: true,
        };
      }

      const now = Date.now();
      if ((existing.creationLeaseUntil ?? 0) > now) {
        return {
          paymentId: existing._id,
          receipt: existing.receipt ?? `td_${existing._id}`,
          status: existing.status,
          orderId: undefined,
          amountPaise: existing.amountPaise,
          currency: existing.currency,
          source: consultationCase.source ?? "direct",
          shouldCreate: false,
        };
      }
      const receipt = existing.receipt ?? `td_${existing._id}`;
      await ctx.db.patch(existing._id, {
        receipt,
        creationLeaseUntil: now + CREATION_LEASE_MS,
        updatedAt: now,
      });
      return {
        paymentId: existing._id,
        receipt,
        status: existing.status,
        orderId: undefined,
        amountPaise: existing.amountPaise,
        currency: existing.currency,
        source: consultationCase.source ?? "direct",
        shouldCreate: true,
      };
    }

    requireEligibleGuidedCase(consultationCase, false);
    const now = Date.now();
    const amountPaise = getConsultationPrice(new Date(now)).amountPaise;
    const paymentId = await ctx.db.insert("payments", {
      caseId: args.caseId,
      amountPaise,
      currency: "INR",
      assistance: "self_serve",
      status: "creating",
      creationLeaseUntil: now + CREATION_LEASE_MS,
      createdAt: now,
      updatedAt: now,
    });
    const receipt = `td_${paymentId}`;
    await ctx.db.patch(paymentId, { receipt });
    await ctx.db.patch(args.caseId, {
      status: "payment_pending",
      guidedStage: "payment-pending",
      updatedAt: now,
    });
    await recordPaymentEvent(ctx, {
      sessionId: args.sessionId,
      caseId: args.caseId,
      name: "payment_started",
      source: consultationCase.source ?? "direct",
      amountPaise,
      assistance: "self_serve",
    });
    return {
      paymentId,
      receipt,
      status: "creating" as const,
      orderId: undefined,
      amountPaise,
      currency: "INR" as const,
      source: consultationCase.source ?? "direct",
      shouldCreate: true,
    };
  },
});

export const attachOrder = mutation({
  args: {
    paymentId: v.id("payments"),
    razorpayOrderId: v.string(),
    receipt: v.string(),
    amountPaise: v.number(),
    currency: v.literal("INR"),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requirePaymentServer(args.serverSecret);
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment record was not found.");
    if (payment.razorpayOrderId && payment.razorpayOrderId !== args.razorpayOrderId) {
      throw new Error("A different payment order already exists.");
    }
    if (
      payment.receipt !== args.receipt
      || payment.amountPaise !== args.amountPaise
      || payment.currency !== args.currency
    ) {
      throw new Error("The payment order does not match the saved quote.");
    }
    await ctx.db.patch(payment._id, {
      razorpayOrderId: args.razorpayOrderId,
      status: payment.status === "paid" ? "paid" : "created",
      creationLeaseUntil: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const getStatus = query({
  args: { caseId: v.id("cases"), sessionId: v.string() },
  handler: async (ctx, args) => {
    const consultationCase = await ctx.db.get(args.caseId);
    if (!consultationCase || consultationCase.sessionId !== args.sessionId) {
      throw new Error("The saved case was not found.");
    }
    const payment = await ctx.db.query("payments").withIndex("by_case_id", (q) => q.eq("caseId", args.caseId)).unique();
    return payment ? { ...payment, source: consultationCase.source ?? "direct" } : null;
  },
});

export const getForVerification = query({
  args: {
    caseId: v.id("cases"),
    sessionId: v.string(),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requirePaymentServer(args.serverSecret);
    const consultationCase = await ctx.db.get(args.caseId);
    if (!consultationCase || consultationCase.sessionId !== args.sessionId) {
      throw new Error("The saved case was not found.");
    }
    const payment = await ctx.db.query("payments").withIndex("by_case_id", (q) => q.eq("caseId", args.caseId)).unique();
    if (!payment?.razorpayOrderId) return null;
    return {
      paymentId: payment._id,
      caseId: payment.caseId,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      amountPaise: payment.amountPaise,
      currency: payment.currency,
      status: payment.status,
    };
  },
});

export const markAttempt = mutation({
  args: { caseId: v.id("cases"), sessionId: v.string(), result: v.union(v.literal("failed"), v.literal("cancelled")), serverSecret: v.string() },
  handler: async (ctx, args) => {
    requirePaymentServer(args.serverSecret);
    const consultationCase = await ctx.db.get(args.caseId);
    if (!consultationCase || consultationCase.sessionId !== args.sessionId) {
      throw new Error("The saved case was not found.");
    }
    const payment = await ctx.db.query("payments").withIndex("by_case_id", (q) => q.eq("caseId", args.caseId)).unique();
    if (payment && payment.status !== "paid" && payment.lastAttemptResult !== args.result) {
      await ctx.db.patch(payment._id, { lastAttemptResult: args.result, updatedAt: Date.now() });
      await recordPaymentEvent(ctx, {
        sessionId: args.sessionId,
        caseId: args.caseId,
        name: args.result === "failed" ? "payment_failed" : "payment_cancelled",
        source: consultationCase.source ?? "direct",
        amountPaise: payment.amountPaise,
        assistance: payment.assistance ?? "self_serve",
      });
    }
    return { source: consultationCase.source ?? "direct", amountPaise: payment?.amountPaise };
  },
});

export const markPaid = mutation({
  args: {
    caseId: v.id("cases"),
    sessionId: v.string(),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requirePaymentServer(args.serverSecret);
    const consultationCase = await ctx.db.get(args.caseId);
    if (!consultationCase || consultationCase.sessionId !== args.sessionId) {
      throw new Error("The saved case was not found.");
    }
    const payment = await ctx.db.query("payments").withIndex("by_case_id", (q) => q.eq("caseId", args.caseId)).unique();
    if (!payment || payment.razorpayOrderId !== args.razorpayOrderId) {
      throw new Error("Payment order was not found.");
    }
    if (payment.status === "paid" && payment.razorpayPaymentId === args.razorpayPaymentId) {
      await recordPaymentEvent(ctx, {
        sessionId: consultationCase.sessionId,
        caseId: payment.caseId,
        name: "payment_succeeded",
        source: consultationCase.source ?? "direct",
        amountPaise: payment.amountPaise,
        assistance: payment.assistance ?? "self_serve",
      });
      return payment._id;
    }
    if (payment.status === "paid") {
      throw new Error("This order already has a different confirmed payment.");
    }
    const now = Date.now();
    await ctx.db.patch(payment._id, {
      razorpayPaymentId: args.razorpayPaymentId,
      status: "paid",
      paidAt: now,
      creationLeaseUntil: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(payment.caseId, {
      status: "paid",
      guidedStage: consultationCase.flowVersion === "guided-v1" ? "paid" : consultationCase.guidedStage,
      updatedAt: now,
    });
    await recordPaymentEvent(ctx, {
      sessionId: consultationCase.sessionId,
      caseId: payment.caseId,
      name: "payment_succeeded",
      source: consultationCase.source ?? "direct",
      amountPaise: payment.amountPaise,
      assistance: payment.assistance ?? "self_serve",
    });
    return payment._id;
  },
});
