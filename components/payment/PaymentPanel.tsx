"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import type { ContactDetails } from "@/lib/validation";

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
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => Promise<void>;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
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
  caseSummary,
}: {
  caseId: Id<"cases">;
  contact: ContactDetails;
  caseSummary: string;
}) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  async function startPayment() {
    if (isStarting) return;
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
        body: JSON.stringify({ caseId }),
      });
      const order = (await orderResponse.json()) as {
        error?: string;
        keyId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
      };

      if (!orderResponse.ok || !order.keyId || !order.orderId || !order.amount || !order.currency) {
        throw new Error(order.error ?? "The test payment could not be started.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "FutureCare",
        description: "Online specialist consultation · Test payment",
        order_id: order.orderId,
        prefill: {
          name: contact.patientName,
          email: contact.email,
          contact: `+91${contact.phone}`,
        },
        theme: { color: "#236C86" },
        handler: async (response) => {
          const verificationResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verification = (await verificationResponse.json()) as { verified?: boolean; error?: string };

          if (!verificationResponse.ok || !verification.verified) {
            setError(verification.error ?? "We could not confirm the test payment.");
            setIsStarting(false);
            return;
          }

          router.push(`/complete?case=${encodeURIComponent(caseId)}`);
        },
        modal: {
          ondismiss: () => {
            setError("Payment was closed. Your case is saved, and you can try again.");
            setIsStarting(false);
          },
        },
      });

      checkout.open();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The test payment could not be started.");
      setIsStarting(false);
    }
  }

  return (
    <section className="payment-panel">
      <div className="payment-test-label">Razorpay test mode</div>
      <p className="step-label">Ready to consult</p>
      <h2>Dr. Kirti Sinha · Online consultation</h2>
      <p className="payment-summary">{caseSummary}</p>

      <div className="payment-ledger">
        <div><span>AI-assisted intake</span><strong>Free</strong></div>
        <div><span>Case summary</span><strong>Free</strong></div>
        <div><span>Specialist matching</span><strong>Free</strong></div>
        <div className="ledger-total"><span>Specialist consultation</span><strong>₹800</strong></div>
      </div>

      <p className="after-payment">
        After payment, our care team will contact you on WhatsApp and schedule the consultation within 24 hours.
      </p>

      <button className="primary-button full-width" type="button" onClick={startPayment} disabled={isStarting}>
        {isStarting ? "Opening Razorpay…" : "Pay ₹800 in test mode"}
      </button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p className="secure-note">Secure checkout powered by Razorpay. No real charge is made in test mode.</p>
    </section>
  );
}
