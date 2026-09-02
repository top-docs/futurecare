"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCompletionState, type CompletionState } from "@/lib/completion-status";
import { clearSessionId, getSafeSessionAccess } from "@/lib/session-id";

type ViewState =
  | { kind: "checking" }
  | { kind: "error" }
  | { kind: "storage-unavailable" }
  | CompletionState;

export function CompletionStatus() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "checking" });
  const [checkVersion, setCheckVersion] = useState(0);

  useEffect(() => {
    const caseId = new URLSearchParams(window.location.search).get("case");
    if (!caseId) {
      queueMicrotask(() => setState({ kind: "not-confirmed" }));
      return;
    }
    const session = getSafeSessionAccess(() => window.localStorage);
    if (!session.recoveryAvailable) {
      queueMicrotask(() => setState({ kind: "storage-unavailable" }));
      return;
    }

    let active = true;
    fetch(`/api/payments/status?caseId=${encodeURIComponent(caseId)}&sessionId=${encodeURIComponent(session.sessionId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Payment check failed.");
        return response.json();
      })
      .then((result) => { if (active) setState(getCompletionState(result)); })
      .catch(() => { if (active) setState({ kind: "error" }); });
    return () => { active = false; };
  }, [checkVersion]);

  function checkAgain() {
    setState({ kind: "checking" });
    setCheckVersion((current) => current + 1);
  }

  function startNewRequest() {
    try {
      clearSessionId(window.localStorage);
    } catch {
      // The new page will use a one-visit identifier if storage is blocked.
    }
    router.push("/enquiry");
  }

  if (state.kind === "checking") {
    return <section className="completion-card" role="status"><p>Confirming your payment…</p></section>;
  }

  if (state.kind !== "paid") {
    const pending = state.kind === "pending";
    return (
      <section className="completion-card">
        <p className="eyebrow">{pending ? "Payment pending" : "Payment not confirmed"}</p>
        <h1>{pending ? "Your request is saved." : "We can’t confirm this payment yet."}</h1>
        <p className="completion-lead">
          {pending
            ? state.attempt === "failed"
              ? "The last payment attempt failed. Return to your saved request to retry without entering the case details again."
              : "The payment is not complete yet. Check again, or return to your saved request to continue with the same order."
            : state.kind === "storage-unavailable"
              ? "This browser is blocking the saved session link, so we cannot check the payment here."
              : state.kind === "error"
                ? "The payment check is temporarily unavailable. Your saved request has not been changed."
                : "No completed payment was found for this saved request."}
        </p>
        <div className="completion-actions">
          <button className="secondary-button" type="button" onClick={checkAgain}>Check again</button>
          <Link className="secondary-button" href="/enquiry">Return to saved request</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="completion-card">
      <div className="success-mark" aria-hidden="true">✓</div>
      <p className="eyebrow">{state.paymentMode === "test" ? "Test payment received" : "Payment received"}</p>
      <h1>Your Top Docs consultation request is confirmed.</h1>
      <p className="completion-lead">Our care team will contact you on WhatsApp to schedule your consultation within 24 hours.</p>
      <div className="next-step-card"><span>What happens next</span><ol><li>Our care team reviews the case details.</li><li>We ask for relevant reports and confirm the time on WhatsApp.</li><li>The doctor conducts the consultation over video call.</li></ol></div>
      {state.paymentMode === "test" ? <p className="test-disclaimer">This was a Razorpay test payment. No real money was charged.</p> : null}
      <p className="retention-note">We keep this record until you ask us to delete it. <a href="mailto:lokeshdange8@gmail.com?subject=Delete%20my%20Top%20Docs%20record">Request deletion</a>.</p>
      <div className="completion-actions">
        <button className="secondary-button" type="button" onClick={startNewRequest}>Start a new request</button>
        <Link className="secondary-button" href="/">Return to Top Docs</Link>
      </div>
    </section>
  );
}
