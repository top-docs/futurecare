import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";

const responseSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!keySecret || !convexUrl) {
    return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
  }

  const parsed = responseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "The payment response is incomplete." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  const expected = createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const receivedBuffer = Buffer.from(razorpay_signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const verified =
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer);

  if (!verified) {
    return NextResponse.json({ error: "The payment signature is invalid." }, { status: 400 });
  }

  const convex = new ConvexHttpClient(convexUrl);
  await convex.mutation(api.payments.markPaid, {
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
  });

  return NextResponse.json({ verified: true });
}

