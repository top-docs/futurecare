import { NextResponse } from "next/server";
import { getConsultationPrice } from "@/lib/pricing";
import { getRazorpayConfiguration } from "@/lib/payment-server";

export async function GET() {
  const configuration = getRazorpayConfiguration(process.env);
  return NextResponse.json({
    ...getConsultationPrice(),
    paymentMode: configuration.mode,
    checkoutEnabled: configuration.checkoutEnabled,
  });
}
