import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cases: defineTable({
    sessionId: v.string(),
    flowVersion: v.optional(v.literal("guided-v1")),
    consultationType: v.optional(v.union(
      v.literal("first-consultation"),
      v.literal("second-opinion"),
    )),
    selectedSpecialty: v.optional(v.union(
      v.literal("gynaecology"), v.literal("gastroenterology"),
      v.literal("cardiology"), v.literal("nephrology"),
      v.literal("oncology"), v.literal("orthopaedics"),
      v.literal("neonatology"), v.literal("neurology"),
      v.literal("endocrinology"), v.literal("urology"),
      v.literal("other-not-sure"),
    )),
    oncologyChoice: v.optional(v.union(
      v.literal("head-and-neck"),
      v.literal("medical-treatment"),
      v.literal("other-not-sure"),
    )),
    caseDetails: v.optional(v.string()),
    matchOutcome: v.optional(v.union(
      v.literal("matched"),
      v.literal("human-review"),
    )),
    reviewReason: v.optional(v.union(
      v.literal("other-or-not-sure"), v.literal("unknown-selection"),
      v.literal("doctor-unavailable"), v.literal("patient-rejected-match"),
    )),
    guidedStage: v.optional(v.union(
      v.literal("human-review"), v.literal("doctor-shown"),
      v.literal("contact"), v.literal("payment-ready"),
      v.literal("payment-pending"), v.literal("paid"),
      v.literal("complete"), v.literal("enquiry-complete"),
    )),
    caseType: v.optional(v.union(v.literal("consultation"), v.literal("unsupported_enquiry"))),
    concern: v.string(),
    followUp: v.string(),
    caseSummary: v.string(),
    messages: v.optional(v.array(v.object({
      id: v.string(),
      role: v.union(v.literal("assistant"), v.literal("patient")),
      text: v.string(),
    }))),
    careConsentAcceptedAt: v.optional(v.number()),
    source: v.optional(v.string()),
    stage: v.optional(v.union(
      v.literal("follow-up"), v.literal("matched"), v.literal("correction"),
      v.literal("enquiry"), v.literal("enquiry-complete"), v.literal("contact"),
      v.literal("reports"), v.literal("payment"),
    )),
    specialty: v.optional(v.string()),
    doctorId: v.optional(v.string()),
    patientName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.union(
      v.literal("ready_for_payment"),
      v.literal("payment_pending"),
      v.literal("paid"),
      v.literal("enquiry_received"),
      v.literal("draft"),
      v.literal("matched"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_session_id", ["sessionId"]),

  payments: defineTable({
    caseId: v.id("cases"),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),
    receipt: v.optional(v.string()),
    creationLeaseUntil: v.optional(v.number()),
    amountPaise: v.number(),
    currency: v.literal("INR"),
    status: v.union(v.literal("creating"), v.literal("created"), v.literal("paid")),
    assistance: v.optional(v.union(v.literal("self_serve"), v.literal("support_assisted"))),
    lastAttemptResult: v.optional(v.union(v.literal("failed"), v.literal("cancelled"))),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_case_id", ["caseId"])
    .index("by_order_id", ["razorpayOrderId"]),

  reports: defineTable({
    caseId: v.id("cases"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.union(v.literal("application/pdf"), v.literal("image/jpeg"), v.literal("image/png")),
    sizeBytes: v.number(),
    uploadedAt: v.number(),
  })
    .index("by_case_id", ["caseId"])
    .index("by_storage_id", ["storageId"]),

  events: defineTable({
    sessionId: v.string(),
    caseId: v.optional(v.id("cases")),
    name: v.union(
      v.literal("visit"), v.literal("chat_started"), v.literal("doctor_shown"),
      v.literal("see_doctor"), v.literal("contact_submitted"), v.literal("payment_started"),
      v.literal("payment_succeeded"), v.literal("payment_failed"), v.literal("payment_cancelled"),
      v.literal("unsupported_enquiry"),
      v.literal("landing_view"), v.literal("cta_selected"), v.literal("journey_started"),
      v.literal("consultation_type_selected"), v.literal("specialty_selected"),
      v.literal("case_submitted"), v.literal("human_review"),
      v.literal("enquiry_received"),
    ),
    dedupeKey: v.string(),
    source: v.string(),
    assistance: v.union(v.literal("self_serve"), v.literal("support_assisted")),
    doctorId: v.optional(v.string()),
    amountPaise: v.optional(v.number()),
    consultationType: v.optional(v.union(
      v.literal("first-consultation"),
      v.literal("second-opinion"),
    )),
    selectedSpecialty: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_dedupe_key", ["dedupeKey"])
    .index("by_session_id", ["sessionId"]),
});
