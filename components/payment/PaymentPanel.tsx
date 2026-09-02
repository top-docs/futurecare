"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { createSingleFlightGate } from "@/lib/single-flight";
import type { GuidedContactDetails } from "@/lib/validation";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => Promise<void>;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (event: "payment.failed", handler: () => void) => void };
  }
}

async function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return true;

  return await new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentPanel({
  caseId,
  contact,
  doctorName,
  sessionId,
}: {
  caseId: Id<"cases">;
  contact: GuidedContactDetails;
  caseSummary?: string;
  doctorName: string;
  sessionId: string;
}) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [amountRupees, setAmountRupees] = useState(800);
  const [isChecking, setIsChecking] = useState(true);
  const [paymentCheckVersion, setPaymentCheckVersion] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"test" | "live" | "unconfigured">("unconfigured");
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const paymentGate = useRef(createSingleFlightGate());

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/payments/quote").then((response) => {
        if (!response.ok) throw new Error("The current price could not be checked.");
        return response.json();
      }),
      fetch(`/api/payments/status?caseId=${encodeURIComponent(caseId)}&sessionId=${encodeURIComponent(sessionId)}`).then((response) => {
        if (!response.ok) throw new Error("The saved payment could not be checked.");
        return response.json();
      }),
    ]).then(([quote, status]) => {
      if (!active) return;
      if (typeof quote.amountRupees === "number") setAmountRupees(quote.amountRupees);
      if (typeof status.amountRupees === "number") setAmountRupees(status.amountRupees);
      const mode = status.paymentMode ?? quote.paymentMode;
      if (mode === "test" || mode === "live" || mode === "unconfigured") setPaymentMode(mode);
      setCheckoutEnabled(Boolean(status.checkoutEnabled ?? quote.checkoutEnabled));
      if (status.status === "paid") router.replace(`/complete?case=${encodeURIComponent(caseId)}`);
    }).catch(() => { if (active) setError("Payment status could not be checked. You can retry safely."); })
      .finally(() => { if (active) setIsChecking(false); });
    return () => { active = false; };
  }, [caseId, paymentCheckVersion, router, sessionId]);

  function checkSavedPayment() {
    setIsChecking(true);
    setPaymentCheckVersion((current) => current + 1);
  }

  function saveAttemptAndCheck(result: "failed" | "cancelled") {
    void fetch("/api/payments/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, sessionId, result }),
    }).finally(checkSavedPayment);
  }

  async function startPayment() {
    if (isStarting || isChecking || !checkoutEnabled || !paymentGate.current.tryStart()) return;
    setIsStarting(true);
    setError("");

    try {
      const scriptReady = await loadRazorpay();
      if (!scriptReady || !window.Razorpay) {
        throw new Error("Razorpay could not load. Check your connection and try again.");
      }

      const orderResponse = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, sessionId }),
      });
      const order = (await orderResponse.json()) as {
        error?: string;
        keyId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        paid?: boolean;
        amountRupees?: number;
        paymentMode?: "test" | "live";
      };

      if (order.paid) {
        router.replace(`/complete?case=${encodeURIComponent(caseId)}`);
        return;
      }

      if (!orderResponse.ok || !order.keyId || !order.orderId || !order.amount || !order.currency) {
        throw new Error(order.error ?? "The payment could not be started.");
      }
      if (typeof order.amountRupees === "number") setAmountRupees(order.amountRupees);
      if (order.paymentMode) setPaymentMode(order.paymentMode);

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Top Docs",
        description: order.paymentMode === "test"
          ? "Online specialist consultation · Test payment"
          : "Online specialist consultation",
        order_id: order.orderId,
        prefill: {
          name: contact.patientName,
          contact: `+91${contact.phone}`,
        },
        theme: { color: "#243C35" },
        handler: async (response) => {
          const verificationResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseId, sessionId, ...response }),
          });
          const verification = (await verificationResponse.json()) as { verified?: boolean; error?: string };

          if (!verificationResponse.ok || !verification.verified) {
            setError(verification.error ?? "We could not confirm the payment.");
            setIsStarting(false);
            paymentGate.current.finish();
            checkSavedPayment();
            return;
          }

          router.push(`/complete?case=${encodeURIComponent(caseId)}`);
        },
        modal: {
          ondismiss: () => {
            saveAttemptAndCheck("cancelled");
            setError("Payment was closed. Your case is saved, and you can try again.");
            setIsStarting(false);
            paymentGate.current.finish();
          },
        },
      });

      checkout.on("payment.failed", () => {
        saveAttemptAndCheck("failed");
        setError("Payment failed. Your case is saved, and you can retry without starting over.");
        setIsStarting(false);
        paymentGate.current.finish();
      });

      checkout.open();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The payment could not be started.");
      setIsStarting(false);
      paymentGate.current.finish();
    }
  }

  return (
    <section className="payment-panel">
      {paymentMode === "test" ? <div className="payment-test-label">Razorpay test mode</div> : null}
      <p className="step-label">Ready to consult</p>
      <h2>{doctorName} · Online consultation</h2>
      <div className="payment-ledger">
        <div><span>Guided intake</span><strong>Free</strong></div>
        <div><span>Specialist matching</span><strong>Free</strong></div>
        <div><span>Top Docs fee</span><strong>₹0</strong></div>
        <div className="ledger-total"><span>Doctor consultation fee</span><strong>₹{amountRupees.toLocaleString("en-IN")}</strong></div>
      </div>

      <p className="after-payment">
        After payment, our care team will contact you on WhatsApp and schedule the consultation within 24 hours.
      </p>

      <button className="primary-button full-width" type="button" onClick={startPayment} disabled={isStarting || isChecking || !checkoutEnabled}>
        {isChecking
          ? "Checking saved payment…"
          : isStarting
            ? "Opening Razorpay…"
            : !checkoutEnabled && paymentMode === "live"
              ? "Live payment is not enabled"
              : !checkoutEnabled
                ? "Payment is not configured"
                : paymentMode === "test"
                  ? `Pay ₹${amountRupees.toLocaleString("en-IN")} in test mode`
                  : `Pay ₹${amountRupees.toLocaleString("en-IN")}`}
      </button>
      {error ? <div className="payment-retry" role="alert"><p className="form-error">{error}</p><button className="secondary-button" type="button" onClick={() => { setError(""); checkSavedPayment(); }}>Check again</button></div> : null}
      <p className="secure-note">
        {paymentMode === "test"
          ? "Secure Razorpay test checkout. No real charge is made in test mode."
          : paymentMode === "live" && !checkoutEnabled
            ? "Live checkout is disabled while public launch checks are pending."
            : "Secure checkout powered by Razorpay."}
      </p>
    </section>
  );
}
