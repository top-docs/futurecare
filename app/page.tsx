import { ConsultationFlow } from "@/components/chat/ConsultationFlow";

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="FutureCare home">
          <span className="brand-mark" aria-hidden="true">
            F
          </span>
          <span>FutureCare</span>
        </a>
        <span className="header-note">Specialist consultation within 24 hours</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">24/7 AI Health Assistant</p>
          <h1>Start with your concern. We’ll find the right specialist.</h1>
          <p className="hero-intro">
            Share your symptoms, diagnosis, or treatment question. Our assistant organises
            your case and introduces one verified specialist trained at a leading medical
            institute.
          </p>

          <div className="promise-list" aria-label="Consultation promises">
            <div>
              <span className="promise-icon" aria-hidden="true">✓</span>
              <span><strong>Doctor-led advice</strong><small>The AI never diagnoses or prescribes</small></span>
            </div>
            <div>
              <span className="promise-icon" aria-hidden="true">✓</span>
              <span><strong>₹800 introductory price</strong><small>One online specialist consultation</small></span>
            </div>
            <div>
              <span className="promise-icon" aria-hidden="true">✓</span>
              <span><strong>Private case record</strong><small>Shared only for your consultation</small></span>
            </div>
          </div>
        </div>

        <ConsultationFlow />
      </section>

      <section className="trust-strip" aria-label="Why patients can trust FutureCare">
        <span>Built by doctors</span>
        <span>Manually verified profiles</span>
        <span>Consultation within 24 hours</span>
        <span>Secure test payment</span>
      </section>

      <p className="institute-note">
        Institution names indicate doctors’ training backgrounds, not hospital association
        or endorsement.
      </p>
    </main>
  );
}

