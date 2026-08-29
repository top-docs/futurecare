import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createOrderRecord = mutation({
  args: {
    caseId: v.id("cases"),
    razorpayOrderId: v.string(),
    amountPaise: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_order_id", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId),
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const paymentId = await ctx.db.insert("payments", {
      caseId: args.caseId,
      razorpayOrderId: args.razorpayOrderId,
      amountPaise: args.amountPaise,
      currency: "INR",
      status: "created",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.caseId, {
      status: "payment_pending",
      updatedAt: now,
    });

    return paymentId;
  },
});

export const markPaid = mutation({
  args: {
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_order_id", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId),
      )
      .unique();

    if (!payment) {
      throw new Error("Payment order was not found.");
    }

    const now = Date.now();
    await ctx.db.patch(payment._id, {
      razorpayPaymentId: args.razorpayPaymentId,
      status: "paid",
      updatedAt: now,
    });
    await ctx.db.patch(payment.caseId, {
      status: "paid",
      updatedAt: now,
    });

    return payment._id;
  },
});

