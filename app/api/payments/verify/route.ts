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
  verifyRazorpaySignature,
} from "@/lib/payment-server";

const responseSchema = z.object({
  caseId: z.string().min(1),
  sessionId: z.string().uuid(),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const configuration = getRazorpayConfiguration(process.env);
  if (!configuration.configured || !keyId || !keySecret || !convexUrl) {
    return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
  }

  const parsed = responseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "The payment response is incomplete." }, { status: 400 });
  }

  try {
    const {
      caseId,
      sessionId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = parsed.data;
    const convex = new ConvexHttpClient(convexUrl);
    const serverSecret = getPaymentServerSecret(keySecret);
    const saved = await convex.query(api.payments.getForVerification, {
      caseId: caseId as Id<"cases">,
      sessionId,
      serverSecret,
    });
    if (!saved || saved.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json({ error: "The payment does not match the saved order." }, { status: 400 });
    }
    if (!verifyRazorpaySignature({
      savedOrderId: saved.razorpayOrderId,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      keySecret,
    })) {
      return NextResponse.json({ error: "The payment signature is invalid." }, { status: 400 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const fetched = await razorpay.payments.fetch(razorpay_payment_id);
    const paymentCheck = validateCapturedPayment(fetched, {
      paymentId: razorpay_payment_id,
      orderId: saved.razorpayOrderId,
      amountPaise: saved.amountPaise,
      currency: "INR",
    });
    if (!paymentCheck.ok) {
      return NextResponse.json({ error: paymentCheck.reason }, { status: 400 });
    }
    await convex.mutation(api.payments.markPaid, {
      caseId: caseId as Id<"cases">,
      sessionId,
      razorpayOrderId: saved.razorpayOrderId,
      razorpayPaymentId: razorpay_payment_id,
      serverSecret,
    });
    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: "We could not confirm the payment yet. Check again safely." }, { status: 502 });
  }
}
