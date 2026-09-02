import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getPaymentServerSecret } from "@/lib/payment-server";

const schema = z.object({ caseId: z.string().min(1), sessionId: z.string().uuid(), result: z.enum(["failed", "cancelled"]) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!parsed.success || !convexUrl || !keySecret) return NextResponse.json({ error: "Invalid payment update." }, { status: 400 });
  try {
    const convex = new ConvexHttpClient(convexUrl);
    await convex.mutation(api.payments.markAttempt, { caseId: parsed.data.caseId as Id<"cases">, sessionId: parsed.data.sessionId, result: parsed.data.result, serverSecret: getPaymentServerSecret(keySecret) });
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "The payment update could not be saved." }, { status: 400 });
  }
}
