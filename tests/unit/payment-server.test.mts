import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  getRazorpayConfiguration,
  validateCapturedPayment,
  validateRazorpayOrder,
  verifyRazorpaySignature,
} from "../../lib/payment-server.ts";

test("test keys enable checkout and identify test mode", () => {
  assert.deepEqual(
    getRazorpayConfiguration({
      RAZORPAY_KEY_ID: "rzp_test_example",
      RAZORPAY_KEY_SECRET: "secret",
    }),
    { configured: true, mode: "test", checkoutEnabled: true },
  );
});

test("live keys stay disabled until the explicit live gate is true", () => {
  assert.deepEqual(
    getRazorpayConfiguration({
      RAZORPAY_KEY_ID: "rzp_live_example",
      RAZORPAY_KEY_SECRET: "secret",
    }),
    { configured: true, mode: "live", checkoutEnabled: false },
  );
  assert.deepEqual(
    getRazorpayConfiguration({
      RAZORPAY_KEY_ID: "rzp_live_example",
      RAZORPAY_KEY_SECRET: "secret",
      RAZORPAY_LIVE_ENABLED: "true",
    }),
    { configured: true, mode: "live", checkoutEnabled: true },
  );
});

test("missing or unrecognised keys never enable checkout", () => {
  assert.deepEqual(
    getRazorpayConfiguration({}),
    { configured: false, mode: "unconfigured", checkoutEnabled: false },
  );
  assert.deepEqual(
    getRazorpayConfiguration({
      RAZORPAY_KEY_ID: "public_key",
      RAZORPAY_KEY_SECRET: "secret",
    }),
    { configured: false, mode: "unconfigured", checkoutEnabled: false },
  );
});

test("signature verification uses the saved order id", () => {
  const signature = createHmac("sha256", "secret")
    .update("order_saved|pay_123")
    .digest("hex");

  assert.equal(verifyRazorpaySignature({
    savedOrderId: "order_saved",
    paymentId: "pay_123",
    signature,
    keySecret: "secret",
  }), true);
  assert.equal(verifyRazorpaySignature({
    savedOrderId: "order_other",
    paymentId: "pay_123",
    signature,
    keySecret: "secret",
  }), false);
});

test("a created or recovered order must match the saved receipt and quote", () => {
  const expected = { receipt: "td_payment", amountPaise: 80_000, currency: "INR" };
  assert.equal(validateRazorpayOrder({
    id: "order_1",
    receipt: "td_payment",
    amount: 80_000,
    currency: "INR",
  }, expected).ok, true);
  assert.equal(validateRazorpayOrder({
    id: "order_1",
    receipt: "wrong",
    amount: 80_000,
    currency: "INR",
  }, expected).ok, false);
  assert.equal(validateRazorpayOrder({
    id: "order_1",
    receipt: "td_payment",
    amount: 150_000,
    currency: "INR",
  }, expected).ok, false);
});

test("only an exact captured payment is accepted for fulfilment", () => {
  const expected = {
    paymentId: "pay_123",
    orderId: "order_saved",
    amountPaise: 80_000,
    currency: "INR",
  };
  assert.equal(validateCapturedPayment({
    id: "pay_123",
    order_id: "order_saved",
    amount: 80_000,
    currency: "INR",
    status: "captured",
  }, expected).ok, true);

  for (const payment of [
    { id: "pay_other", order_id: "order_saved", amount: 80_000, currency: "INR", status: "captured" },
    { id: "pay_123", order_id: "order_other", amount: 80_000, currency: "INR", status: "captured" },
    { id: "pay_123", order_id: "order_saved", amount: 150_000, currency: "INR", status: "captured" },
    { id: "pay_123", order_id: "order_saved", amount: 80_000, currency: "USD", status: "captured" },
    { id: "pay_123", order_id: "order_saved", amount: 80_000, currency: "INR", status: "authorized" },
  ]) {
    assert.equal(validateCapturedPayment(payment, expected).ok, false);
  }
});
