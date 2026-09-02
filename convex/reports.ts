import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";

async function requireCase(ctx: Pick<MutationCtx, "db"> | Pick<QueryCtx, "db">, caseId: Id<"cases">, sessionId: string) {
  const consultationCase = await ctx.db.get(caseId);
  if (!consultationCase || consultationCase.sessionId !== sessionId || consultationCase.caseType === "unsupported_enquiry") {
    throw new Error("The saved consultation case was not found.");
  }
  return consultationCase;
}

export const remove = mutation({
  args: { caseId: v.id("cases"), sessionId: v.string(), reportId: v.id("reports") },
  handler: async (ctx, args) => {
    await requireCase(ctx, args.caseId, args.sessionId);
    const report = await ctx.db.get(args.reportId);
    if (!report || report.caseId !== args.caseId) throw new Error("The report was not found.");
    await ctx.storage.delete(report.storageId);
    await ctx.db.delete(report._id);
  },
});

export const list = query({
  args: { caseId: v.id("cases"), sessionId: v.string() },
  handler: async (ctx, args) => {
    await requireCase(ctx, args.caseId, args.sessionId);
    return await ctx.db.query("reports").withIndex("by_case_id", (q) => q.eq("caseId", args.caseId)).collect();
  },
});
