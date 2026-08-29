import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cases: defineTable({
    sessionId: v.string(),
    concern: v.string(),
    followUp: v.string(),
    caseSummary: v.string(),
    specialty: v.string(),
    doctorId: v.string(),
    patientName: v.string(),
    phone: v.string(),
    email: v.string(),
    status: v.union(
      v.literal("ready_for_payment"),
      v.literal("payment_pending"),
      v.literal("paid"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_session_id", ["sessionId"]),

  payments: defineTable({
    caseId: v.id("cases"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.optional(v.string()),
    amountPaise: v.number(),
    currency: v.literal("INR"),
    status: v.union(v.literal("created"), v.literal("paid")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_case_id", ["caseId"])
    .index("by_order_id", ["razorpayOrderId"]),
});

