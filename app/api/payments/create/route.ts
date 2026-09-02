import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getPaymentServerSecret,
  getRazorpayConfiguration,
  validateRazorpayOrder,
} from "@/lib/payment-server";

const requestSchema = z.object({ caseId: z.string().min(1), sessionId: z.string().uuid() });

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const configuration = getRazorpayConfiguration(process.env);
  if (!configuration.configured || !keyId || !keySecret || !convexUrl) {
    return NextResponse.json({ error: "Secure payment is not configured yet." }, { status: 503 });
  }
  if (!configuration.checkoutEnabled) {
    return NextResponse.json({
      error: "Live payment is disabled while the public launch checks are still pending.",
      paymentMode: configuration.mode,
    }, { status: 503 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid saved case is required." }, { status: 400 });

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const serverSecret = getPaymentServerSecret(keySecret);
    const prepared = await convex.mutation(api.payments.prepare, { caseId: parsed.data.caseId as Id<"cases">, sessionId: parsed.data.sessionId, serverSecret });
    if (prepared.status === "paid") return NextResponse.json({ paid: true });
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    let orderId = prepared.orderId;
    let amount = prepared.amountPaise;
    if (orderId) {
      const savedOrder = await razorpay.orders.fetch(orderId);
      const savedOrderCheck = validateRazorpayOrder(savedOrder, {
        receipt: prepared.receipt,
        amountPaise: prepared.amountPaise,
        currency: "INR",
      });
      if (!savedOrderCheck.ok) throw new Error(savedOrderCheck.reason);
      amount = Number(savedOrder.amount);
    } else {
      if (!prepared.shouldCreate) {
        return NextResponse.json({
          error: prepared.recoverOnly
            ? "This earlier payment has no reusable order. Please contact the care team."
            : "Your payment order is already being prepared. Check again in a moment.",
        }, { status: 409 });
      }
      const recovered = await razorpay.orders.all({ receipt: prepared.receipt, count: 1 });
      const order = recovered.items[0] ?? await razorpay.orders.create({ amount: prepared.amountPaise, currency: "INR", receipt: prepared.receipt, notes: { caseId: parsed.data.caseId } });
      const orderCheck = validateRazorpayOrder(order, {
        receipt: prepared.receipt,
        amountPaise: prepared.amountPaise,
        currency: "INR",
      });
      if (!orderCheck.ok) throw new Error(orderCheck.reason);
      orderId = order.id;
      amount = Number(order.amount);
      await convex.mutation(api.payments.attachOrder, {
        paymentId: prepared.paymentId,
        razorpayOrderId: order.id,
        receipt: prepared.receipt,
        amountPaise: prepared.amountPaise,
        currency: "INR",
        serverSecret,
      });
    }
    return NextResponse.json({
      keyId,
      orderId,
      amount,
      amountRupees: amount / 100,
      currency: prepared.currency,
      paymentMode: configuration.mode,
    });
  } catch {
    return NextResponse.json({ error: "Razorpay could not prepare the order. Your request is saved; try again." }, { status: 502 });
  }
}
