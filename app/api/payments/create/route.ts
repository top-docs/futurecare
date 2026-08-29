import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const requestSchema = z.object({ caseId: z.string().min(1) });
const AMOUNT_PAISE = 80_000;

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!keyId || !keySecret || !convexUrl) {
    return NextResponse.json(
      { error: "Razorpay test mode is not configured yet." },
      { status: 503 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid saved case is required." }, { status: 400 });
  }

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: AMOUNT_PAISE,
      currency: "INR",
      receipt: `futurecare_${parsed.data.caseId.slice(-18)}`,
      notes: { caseId: parsed.data.caseId },
    });

    const convex = new ConvexHttpClient(convexUrl);
    await convex.mutation(api.payments.createOrderRecord, {
      caseId: parsed.data.caseId as Id<"cases">,
      razorpayOrderId: order.id,
      amountPaise: AMOUNT_PAISE,
    });

    return NextResponse.json({
      keyId,
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    });
  } catch {
    return NextResponse.json(
      { error: "Razorpay could not create the test order. Try again." },
      { status: 502 },
    );
  }
}
