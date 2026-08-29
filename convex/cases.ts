import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
  args: {
    sessionId: v.string(),
    concern: v.string(),
    followUp: v.string(),
    caseSummary: v.string(),
    patientName: v.string(),
    phone: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cases")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const now = Date.now();
    const record = {
      concern: args.concern.trim(),
      followUp: args.followUp.trim(),
      caseSummary: args.caseSummary.trim(),
      specialty: "Gynaecology",
      doctorId: "kirti-sinha",
      patientName: args.patientName.trim(),
      phone: args.phone.trim(),
      email: args.email.trim().toLowerCase(),
      status: "ready_for_payment" as const,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, record);
      return existing._id;
    }

    return await ctx.db.insert("cases", {
      sessionId: args.sessionId,
      ...record,
      createdAt: now,
    });
  },
});

