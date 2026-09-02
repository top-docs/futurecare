import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getPaymentServerSecret,
  getRazorpayConfiguration,
  validateCapturedPayment,
} from "@/lib/payment-server";

const querySchema = z.object({ caseId: z.string().min(1), sessionId: z.string().uuid() });
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ caseId: url.searchParams.get("caseId"), sessionId: url.searchParams.get("sessionId") });
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!parsed.success || !convexUrl) return NextResponse.json({ error: "A valid saved case is required." }, { status: 400 });
  try {
    const convex = new ConvexHttpClient(convexUrl);
    const payment = await convex.query(api.payments.getStatus, { caseId: parsed.data.caseId as Id<"cases">, sessionId: parsed.data.sessionId });
    const configuration = getRazorpayConfiguration(process.env);
    if (!payment) return NextResponse.json({ status: "not_started", paymentMode: configuration.mode, checkoutEnabled: configuration.checkoutEnabled });
    const publicStatus = {
      amountRupees: payment.amountPaise / 100,
      paymentMode: configuration.mode,
      checkoutEnabled: configuration.checkoutEnabled,
    };
    if (payment.status === "paid") return NextResponse.json({ status: "paid", ...publicStatus });
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!configuration.configured || !keyId || !keySecret || !payment.razorpayOrderId) {
      return NextResponse.json({ status: payment.status, orderId: payment.razorpayOrderId, ...publicStatus });
    }
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const paymentList = await razorpay.orders.fetchPayments(payment.razorpayOrderId);
    for (const candidate of paymentList.items) {
      if (!candidate.id) continue;
      const fetched = await razorpay.payments.fetch(candidate.id);
      const paymentCheck = validateCapturedPayment(fetched, {
        paymentId: candidate.id,
        orderId: payment.razorpayOrderId,
        amountPaise: payment.amountPaise,
        currency: "INR",
      });
      if (paymentCheck.ok) {
        await convex.mutation(api.payments.markPaid, {
          caseId: parsed.data.caseId as Id<"cases">,
          sessionId: parsed.data.sessionId,
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: candidate.id,
          serverSecret: getPaymentServerSecret(keySecret),
        });
        return NextResponse.json({ status: "paid", ...publicStatus });
      }
    }
    return NextResponse.json({ status: payment.status, orderId: payment.razorpayOrderId, lastAttemptResult: payment.lastAttemptResult, ...publicStatus });
  } catch {
    return NextResponse.json({ error: "Payment status could not be checked. Try again." }, { status: 502 });
  }
}
