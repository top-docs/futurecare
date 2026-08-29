import Link from "next/link";

export default function CompletePage() {
  return (
    <main className="completion-page">
      <section className="completion-card">
        <div className="success-mark" aria-hidden="true">✓</div>
        <p className="eyebrow">Test payment received</p>
        <h1>Your consultation request is saved.</h1>
        <p className="completion-lead">
          Our care team will contact you on WhatsApp shortly to schedule your consultation within 24 hours.
        </p>
        <div className="next-step-card">
          <span>What happens next</span>
          <ol>
            <li>Our care team reviews the case details.</li>
            <li>We confirm the consultation time on WhatsApp.</li>
            <li>The doctor conducts the consultation over Zoom.</li>
          </ol>
        </div>
        <p className="test-disclaimer">This was a Razorpay test payment. No real money was charged.</p>
        <Link className="secondary-button" href="/">Return to FutureCare</Link>
      </section>
    </main>
  );
}

