import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import type { MutationCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { sanitizeTrafficSource } from "../lib/tracking.ts";

export const EVENT_NAMES = [
  "visit", "chat_started", "doctor_shown", "see_doctor",
  "contact_submitted", "unsupported_enquiry",
  "landing_view", "cta_selected", "journey_started", "consultation_type_selected",
  "specialty_selected", "case_submitted", "human_review",
  "enquiry_received", "payment_started", "payment_succeeded",
  "payment_failed", "payment_cancelled",
] as const;

export type EventName = typeof EVENT_NAMES[number];
type Assistance = "self_serve" | "support_assisted";

const eventNameSet = new Set<string>(EVENT_NAMES);

const clientEventName = v.union(
  v.literal("visit"), v.literal("chat_started"), v.literal("doctor_shown"),
  v.literal("see_doctor"), v.literal("contact_submitted"),
  v.literal("unsupported_enquiry"), v.literal("landing_view"),
  v.literal("cta_selected"), v.literal("journey_started"),
);

export async function recordServerEvent(
  ctx: MutationCtx,
  args: {
    sessionId: string;
    caseId?: Id<"cases">;
    name: EventName;
    source: string;
    assistance?: Assistance;
    doctorId?: string;
    amountPaise?: number;
    consultationType?: "first-consultation" | "second-opinion";
    selectedSpecialty?: string;
  },
) {
  if (!eventNameSet.has(args.name)) throw new Error("Unsupported funnel event.");
  const dedupeKey = `${args.sessionId}:${args.name}`;
  const existing = await ctx.db
    .query("events")
    .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
    .unique();
  if (existing) {
    if (!existing.caseId && args.caseId) {
      await ctx.db.patch(existing._id, { caseId: args.caseId });
    }
    return existing._id;
  }
  return await ctx.db.insert("events", {
    sessionId: args.sessionId,
    name: args.name,
    source: sanitizeTrafficSource(args.source),
    assistance: args.assistance ?? "self_serve",
    dedupeKey,
    createdAt: Date.now(),
    ...(args.caseId ? { caseId: args.caseId } : {}),
    ...(args.doctorId ? { doctorId: args.doctorId } : {}),
    ...(args.amountPaise !== undefined ? { amountPaise: args.amountPaise } : {}),
    ...(args.consultationType ? { consultationType: args.consultationType } : {}),
    ...(args.selectedSpecialty ? { selectedSpecialty: args.selectedSpecialty } : {}),
  });
}

export const recordOnce = mutation({
  args: {
    sessionId: v.string(),
    caseId: v.optional(v.id("cases")),
    name: clientEventName,
    source: v.string(),
    // Kept until U8 removes the old chat. The server ignores this value.
    doctorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const consultationCase = args.caseId ? await ctx.db.get(args.caseId) : null;
    if (args.caseId && (!consultationCase || consultationCase.sessionId !== args.sessionId)) {
      throw new Error("The saved case was not found.");
    }
    if (args.name === "contact_submitted" && (!consultationCase?.patientName || !consultationCase.phone)) {
      throw new Error("Contact has not been saved for this case.");
    }
    if (
      args.name === "doctor_shown"
      && (
        !consultationCase
        || consultationCase.matchOutcome !== "matched"
        || !consultationCase.doctorId
      )
    ) {
      throw new Error("A matched doctor has not been saved for this case.");
    }
    if (args.name === "unsupported_enquiry" && consultationCase?.status !== "enquiry_received") {
      throw new Error("The enquiry has not been completed.");
    }
    return await recordServerEvent(ctx, {
      sessionId: args.sessionId,
      caseId: args.caseId,
      name: args.name,
      source: consultationCase?.source ?? args.source,
      doctorId: consultationCase?.doctorId,
      assistance: "self_serve",
    });
  },
});

export const linkSessionToCase = mutation({
  args: { sessionId: v.string(), caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const consultationCase = await ctx.db.get(args.caseId);
    if (!consultationCase || consultationCase.sessionId !== args.sessionId) {
      throw new Error("The saved case was not found.");
    }
    const events = await ctx.db
      .query("events")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const event of events) {
      if (!event.caseId) await ctx.db.patch(event._id, { caseId: args.caseId });
    }
  },
});

export const listForSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => await ctx.db
    .query("events")
    .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
    .collect(),
});
