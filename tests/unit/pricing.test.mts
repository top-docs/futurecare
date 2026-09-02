import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getConsultationPrice } from "../../lib/pricing.ts";

test("uses ₹800 through 5 September 2026 IST", () => {
  const price = getConsultationPrice(new Date("2026-09-05T18:29:59.999Z"));

  assert.equal(price.amountPaise, 80_000);
  assert.equal(price.label, "Introductory price");
});

test("uses ₹1,500 from 6 September 2026 IST", () => {
  assert.equal(getConsultationPrice(new Date("2026-09-05T18:30:00.000Z")).amountPaise, 150_000);
});

test("payment panel separates the doctor fee from the zero Top Docs fee", () => {
  const paymentPanelSource = readFileSync(
    new URL("../../components/payment/PaymentPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(paymentPanelSource, /Top Docs fee<\/span><strong>₹0/);
  assert.match(paymentPanelSource, /Doctor consultation fee<\/span><strong>₹\{amountRupees/);
});
