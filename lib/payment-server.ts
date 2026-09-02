import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type RazorpayEnvironment = Readonly<Record<string, string | undefined>>;

export type RazorpayConfiguration = {
  configured: boolean;
  mode: "test" | "live" | "unconfigured";
  checkoutEnabled: boolean;
};

export function getRazorpayConfiguration(
  environment: RazorpayEnvironment,
): RazorpayConfiguration {
  const keyId = environment.RAZORPAY_KEY_ID;
  const keySecret = environment.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return { configured: false, mode: "unconfigured", checkoutEnabled: false };
  }
  if (keyId.startsWith("rzp_test_")) {
    return { configured: true, mode: "test", checkoutEnabled: true };
  }
  if (keyId.startsWith("rzp_live_")) {
    return {
      configured: true,
      mode: "live",
      checkoutEnabled: environment.RAZORPAY_LIVE_ENABLED === "true",
    };
  }
  return { configured: false, mode: "unconfigured", checkoutEnabled: false };
}

type VerificationResult = { ok: true } | { ok: false; reason: string };

type RazorpayOrderLike = {
  id?: unknown;
  receipt?: unknown;
  amount?: unknown;
  currency?: unknown;
};

export function validateRazorpayOrder(
  order: RazorpayOrderLike,
  expected: { receipt: string; amountPaise: number; currency: "INR" },
): VerificationResult {
  if (typeof order.id !== "string" || !order.id) {
    return { ok: false, reason: "The Razorpay order has no identifier." };
  }
  if (order.receipt !== expected.receipt) {
    return { ok: false, reason: "The Razorpay order receipt does not match." };
  }
  if (Number(order.amount) !== expected.amountPaise) {
    return { ok: false, reason: "The Razorpay order amount does not match." };
  }
  if (order.currency !== expected.currency) {
    return { ok: false, reason: "The Razorpay order currency does not match." };
  }
  return { ok: true };
}

type RazorpayPaymentLike = {
  id?: unknown;
  order_id?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
};

export function validateCapturedPayment(
  payment: RazorpayPaymentLike,
  expected: {
    paymentId: string;
    orderId: string;
    amountPaise: number;
    currency: "INR";
  },
): VerificationResult {
  if (payment.id !== expected.paymentId) {
    return { ok: false, reason: "The Razorpay payment identifier does not match." };
  }
  if (payment.order_id !== expected.orderId) {
    return { ok: false, reason: "The Razorpay payment belongs to a different order." };
  }
  if (Number(payment.amount) !== expected.amountPaise) {
    return { ok: false, reason: "The Razorpay payment amount does not match." };
  }
  if (payment.currency !== expected.currency) {
    return { ok: false, reason: "The Razorpay payment currency does not match." };
  }
  if (payment.status !== "captured") {
    return { ok: false, reason: "The Razorpay payment has not been captured." };
  }
  return { ok: true };
}

export function verifyRazorpaySignature(args: {
  savedOrderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}) {
  const expected = createHmac("sha256", args.keySecret)
    .update(`${args.savedOrderId}|${args.paymentId}`)
    .digest("hex");
  const receivedBuffer = Buffer.from(args.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function getPaymentServerSecret(keySecret: string) {
  return createHash("sha256").update(keySecret).digest("hex");
}
