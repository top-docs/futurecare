import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import {
  getApprovedDoctorStatus,
  resolveApprovedDoctor,
} from "./approvedDoctors.ts";
import { buildGuidedCaseSubmission } from "../lib/guided-case-contract.ts";
import { guidedContactSchema } from "../lib/validation.ts";
import { sanitizeTrafficSource } from "../lib/tracking.ts";
import { recordServerEvent } from "./events.ts";

const consultationTypeValidator = v.union(
  v.literal("first-consultation"),
  v.literal("second-opinion"),
);

const specialtyChoiceValidator = v.union(
  v.literal("gynaecology"), v.literal("gastroenterology"),
  v.literal("cardiology"), v.literal("nephrology"),
  v.literal("oncology"), v.literal("orthopaedics"),
  v.literal("neonatology"), v.literal("neurology"),
  v.literal("endocrinology"), v.literal("urology"),
  v.literal("other-not-sure"),
);

const oncologyChoiceValidator = v.union(
  v.literal("head-and-neck"),
  v.literal("medical-treatment"),
  v.literal("other-not-sure"),
);

export const submitGuidedCase = mutation({
  args: {
    sessionId: v.string(),
    consultationType: consultationTypeValidator,
    selectedSpecialty: specialtyChoiceValidator,
    oncologyChoice: v.optional(oncologyChoiceValidator),
    caseDetails: v.string(),
    careConsentAccepted: v.boolean(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const submission = buildGuidedCaseSubmission(args, {
      doctorStatus: getApprovedDoctorStatus,
    });

    if (submission.kind === "invalid") {
      throw new Error(submission.message);
    }
    if (submission.kind === "emergency") {
      return { kind: "emergency" as const, message: submission.message };
    }

    const existing = await ctx.db
      .query("cases")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (existing && existing.flowVersion !== "guided-v1") {
      return { kind: "new-session-required" as const };
    }

    if (existing) {
      const payment = await ctx.db
        .query("payments")
        .withIndex("by_case_id", (q) => q.eq("caseId", existing._id))
        .unique();
      if (
        payment
        || existing.status === "paid"
        || existing.status === "payment_pending"
        || existing.status === "ready_for_payment"
        || existing.status === "enquiry_received"
      ) {
        return { kind: "new-session-required" as const };
      }
    }

    const now = Date.now();
    const doctor = submission.kind === "matched"
      ? resolveApprovedDoctor(submission.doctorId)
      : null;
    const record = {
      flowVersion: "guided-v1" as const,
      consultationType: submission.consultationType,
      selectedSpecialty: submission.selectedSpecialty,
      oncologyChoice: submission.oncologyChoice,
      caseDetails: submission.caseDetails,
      matchOutcome: submission.kind === "matched" ? "matched" as const : "human-review" as const,
      reviewReason: submission.kind === "human-review" ? submission.reason : undefined,
      guidedStage: submission.kind === "matched" ? "doctor-shown" as const : "human-review" as const,
      caseType: submission.kind === "matched" ? "consultation" as const : "unsupported_enquiry" as const,
      concern: "",
      followUp: "",
      caseSummary: "",
      careConsentAcceptedAt: now,
      source: existing?.source ?? sanitizeTrafficSource(args.source),
      specialty: doctor?.specialty,
      doctorId: doctor?.doctorId,
      status: submission.kind === "matched" ? "matched" as const : "draft" as const,
      updatedAt: now,
    };

    let caseId;
    if (existing) {
      await ctx.db.patch(existing._id, record);
      caseId = existing._id;
    } else {
      caseId = await ctx.db.insert("cases", {
        sessionId: args.sessionId,
        ...record,
        createdAt: now,
      });
    }

    const eventSource = existing?.source ?? sanitizeTrafficSource(args.source);
    await recordServerEvent(ctx, {
      sessionId: args.sessionId,
      caseId,
      name: "consultation_type_selected",
      source: eventSource,
      consultationType: submission.consultationType,
    });
    await recordServerEvent(ctx, {
      sessionId: args.sessionId,
      caseId,
      name: "specialty_selected",
      source: eventSource,
      selectedSpecialty: submission.selectedSpecialty,
    });
    await recordServerEvent(ctx, {
      sessionId: args.sessionId,
      caseId,
      name: "case_submitted",
      source: eventSource,
    });
    await recordServerEvent(ctx, {
      sessionId: args.sessionId,
      caseId,
      name: submission.kind === "matched" ? "doctor_shown" : "human_review",
      source: eventSource,
      doctorId: submission.kind === "matched" ? submission.doctorId : undefined,
    });

    if (submission.kind === "matched") {
      return { kind: "matched" as const, caseId, doctorId: submission.doctorId };
    }
    return { kind: "human-review" as const, caseId, reason: submission.reason };
  },
});

export const routeGuidedCaseToReview = mutation({
  args: {
    caseId: v.id("cases"),
    sessionId: v.string(),
    reason: v.optional(v.union(
      v.literal("patient-rejected-match"),
      v.literal("doctor-unavailable"),
    )),
  },
  handler: async (ctx, args) => {
    const consultationCase = await ctx.db.get(args.caseId);
    if (
      !consultationCase
      || consultationCase.sessionId !== args.sessionId
      || consultationCase.flowVersion !== "guided-v1"
    ) {
      throw new Error("The saved guided case was not found.");
    }
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_case_id", (q) => q.eq("caseId", args.caseId))
      .unique();
    if (payment || consultationCase.status === "paid") {
      throw new Error("A case with a payment cannot be changed to human review.");
    }
    if (consultationCase.status === "enquiry_received") {
      return { kind: "enquiry-complete" as const };
    }
    if (
      consultationCase.matchOutcome === "human-review"
      && consultationCase.status === "draft"
    ) {
      return { kind: "human-review" as const };
    }
    await ctx.db.patch(args.caseId, {
      matchOutcome: "human-review",
      reviewReason: args.reason ?? "patient-rejected-match",
      guidedStage: "human-review",
      caseType: "unsupported_enquiry",
      specialty: undefined,
      doctorId: undefined,
      status: "draft",
      updatedAt: Date.now(),
    });
    await recordServerEvent(ctx, {
      sessionId: args.sessionId,
      caseId: args.caseId,
      name: "human_review",
      source: consultationCase.source ?? "direct",
    });
    return { kind: "human-review" as const };
  },
});

export const saveGuidedContact = mutation({
  args: {
    caseId: v.id("cases"),
    sessionId: v.string(),
    patientName: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const contact = guidedContactSchema.parse({
      patientName: args.patientName,
      phone: args.phone,
    });
    const consultationCase = await ctx.db.get(args.caseId);
    if (
      !consultationCase
      || consultationCase.sessionId !== args.sessionId
      || consultationCase.flowVersion !== "guided-v1"
      || !consultationCase.consultationType
      || !consultationCase.selectedSpecialty
      || !consultationCase.caseDetails
    ) {
      throw new Error("The saved guided case was not found.");
    }

    const payment = await ctx.db
      .query("payments")
      .withIndex("by_case_id", (q) => q.eq("caseId", args.caseId))
      .unique();
    if (payment || consultationCase.status === "paid") {
      throw new Error("Contact details cannot change after payment starts.");
    }

    const route = buildGuidedCaseSubmission({
      consultationType: consultationCase.consultationType,
      selectedSpecialty: consultationCase.selectedSpecialty,
      oncologyChoice: consultationCase.oncologyChoice,
      caseDetails: consultationCase.caseDetails,
      careConsentAccepted: true,
    }, { doctorStatus: getApprovedDoctorStatus });

    if (route.kind === "emergency") {
      return { kind: "emergency" as const, message: route.message };
    }
    if (route.kind === "invalid") {
      throw new Error("The saved case details are no longer valid.");
    }

    const now = Date.now();
    if (
      consultationCase.matchOutcome === "matched"
      && route.kind === "matched"
      && consultationCase.doctorId === route.doctorId
    ) {
      const doctor = resolveApprovedDoctor(route.doctorId);
      await ctx.db.patch(args.caseId, {
        patientName: contact.patientName,
        phone: contact.phone,
        specialty: doctor.specialty,
        doctorId: doctor.doctorId,
        status: "ready_for_payment",
        guidedStage: "payment-ready",
        updatedAt: now,
      });
      await recordServerEvent(ctx, {
        sessionId: args.sessionId,
        caseId: args.caseId,
        name: "contact_submitted",
        source: consultationCase.source ?? "direct",
        doctorId: doctor.doctorId,
      });
      return { kind: "payment-ready" as const, doctorId: doctor.doctorId };
    }

    const reason = route.kind === "human-review"
      ? route.reason
      : consultationCase.reviewReason ?? "doctor-unavailable";
    await ctx.db.patch(args.caseId, {
      patientName: contact.patientName,
      phone: contact.phone,
      matchOutcome: "human-review",
      reviewReason: reason,
      guidedStage: "enquiry-complete",
      caseType: "unsupported_enquiry",
      specialty: undefined,
      doctorId: undefined,
      status: "enquiry_received",
      updatedAt: now,
    });
    await recordServerEvent(ctx, {
      sessionId: args.sessionId,
      caseId: args.caseId,
      name: "contact_submitted",
      source: consultationCase.source ?? "direct",
    });
    await recordServerEvent(ctx, {
      sessionId: args.sessionId,
      caseId: args.caseId,
      name: "enquiry_received",
      source: consultationCase.source ?? "direct",
    });
    return { kind: "enquiry-complete" as const, reason };
  },
});

export const getGuidedSessionSnapshot = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const consultationCase = await ctx.db
      .query("cases")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (!consultationCase) return null;

    const payment = await ctx.db
      .query("payments")
      .withIndex("by_case_id", (q) => q.eq("caseId", consultationCase._id))
      .unique();

    if (consultationCase.flowVersion !== "guided-v1") {
      if (payment || consultationCase.status === "paid" || consultationCase.status === "payment_pending") {
        const resumeState = payment?.status === "paid" || consultationCase.status === "paid"
          ? "paid" as const
          : "payment-pending" as const;
        return {
          kind: "legacy-payment" as const,
          caseId: consultationCase._id,
          caseStatus: consultationCase.status,
          paymentStatus: payment?.status,
          resumeState,
          ...(resumeState === "payment-pending" ? {
            patientName: consultationCase.patientName,
            phone: consultationCase.phone,
            doctorId: consultationCase.doctorId,
            hasSavedOrder: Boolean(payment?.razorpayOrderId),
          } : {}),
        };
      }
      return { kind: "new-session-required" as const };
    }

    const restoredRoute = consultationCase.matchOutcome === "matched"
      && consultationCase.consultationType
      && consultationCase.selectedSpecialty
      && consultationCase.caseDetails
      ? buildGuidedCaseSubmission({
          consultationType: consultationCase.consultationType,
          selectedSpecialty: consultationCase.selectedSpecialty,
          oncologyChoice: consultationCase.oncologyChoice,
          caseDetails: consultationCase.caseDetails,
          careConsentAccepted: true,
        }, { doctorStatus: getApprovedDoctorStatus })
      : null;
    const doctorIsSafe = restoredRoute?.kind === "matched"
      && restoredRoute.doctorId === consultationCase.doctorId;
    const mustUseHumanReview = consultationCase.matchOutcome === "matched" && !doctorIsSafe;
    const resumeState = payment?.status === "paid" || consultationCase.status === "paid"
      ? "paid" as const
      : consultationCase.status === "enquiry_received"
        ? "enquiry-complete" as const
        : payment?.status === "creating" || payment?.status === "created" || consultationCase.status === "payment_pending"
          ? "payment-pending" as const
          : consultationCase.status === "ready_for_payment"
            ? "payment-ready" as const
            : mustUseHumanReview || consultationCase.matchOutcome === "human-review"
              ? "human-review" as const
              : consultationCase.guidedStage === "contact"
                ? "contact" as const
                : "doctor-shown" as const;

    return {
      kind: "guided" as const,
      caseId: consultationCase._id,
      consultationType: consultationCase.consultationType,
      selectedSpecialty: consultationCase.selectedSpecialty,
      oncologyChoice: consultationCase.oncologyChoice,
      caseDetails: consultationCase.caseDetails,
      matchOutcome: mustUseHumanReview ? "human-review" as const : consultationCase.matchOutcome,
      reviewReason: mustUseHumanReview ? "doctor-unavailable" as const : consultationCase.reviewReason,
      guidedStage: mustUseHumanReview ? "human-review" as const : consultationCase.guidedStage,
      doctorId: mustUseHumanReview ? undefined : consultationCase.doctorId,
      patientName: consultationCase.patientName,
      phone: consultationCase.phone,
      caseStatus: consultationCase.status,
      paymentStatus: payment?.status,
      lastAttemptResult: payment?.lastAttemptResult,
      resumeState,
    };
  },
});
