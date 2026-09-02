import Image from "next/image";
import Link from "next/link";

import { LANDING_FAQS, LANDING_PRIMARY_CTA } from "@/lib/landing-content";
import { LandingTracker } from "./LandingTracker";
import {
  ConsultationProcess,
  FeaturedSpecialists,
  FounderThesis,
  InstituteProof,
  SpecialtyProof,
} from "./TrustSections";

type LandingPageProps = {
  amountRupees: number;
};

function BrandLockup({ footer = false }: { footer?: boolean }) {
  return (
    <span className={footer ? "landing-brand footer-brand" : "landing-brand"}>
      <Image
        src="/brand/top-docs-symbol.webp"
        alt="Top Docs"
        width={64}
        height={64}
        priority={!footer}
      />
    </span>
  );
}

export function LandingPage({ amountRupees }: LandingPageProps) {
  return (
    <main className="landing-page" id="top">
      <LandingTracker />
      <header className="landing-header">
        <Link href="#top" aria-label="Top Docs home">
          <BrandLockup />
        </Link>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#specialties">Specialties</a>
          <a href="#specialists">Our doctors</a>
          <a href="#questions">Questions</a>
        </nav>
        <Link className="header-cta" href={LANDING_PRIMARY_CTA.href}>
          {LANDING_PRIMARY_CTA.label}
        </Link>
      </header>

      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="hero-proposition">
          <p className="hero-kicker">Online specialist consultations and second opinions</p>
          <h1 id="hero-heading">Specialist care <em>for your next step.</em></h1>
          <p className="hero-summary">
            Get a specialist consultation from doctors trained at leading medical institutes.
          </p>
          <div className="hero-actions">
            <Link className="primary-cta" href={LANDING_PRIMARY_CTA.href}>
              {LANDING_PRIMARY_CTA.label}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="hero-assurances" aria-label="Service facts">
            <li>Doctor profile before payment</li>
            <li>Video consultation within 24 hours</li>
            <li>Updates on WhatsApp</li>
          </ul>
        </div>

        <div className="provenance-folio" aria-label="What the online consultation includes">
          <div className="folio-tab">What you get</div>
          <div className="folio-sheet">
            <div className="folio-heading">
              <span>Your online consultation</span>
              <small>Before you pay</small>
            </div>
            <div className="folio-portraits" aria-hidden="true">
              <div><Image src="/doctors/kirti-sinha.webp" alt="" fill sizes="180px" unoptimized /></div>
              <div><Image src="/doctors/mridul-mahajan.webp" alt="" fill sizes="180px" unoptimized /></div>
              <div><Image src="/doctors/abhimanyu-nigam.webp" alt="" fill sizes="180px" unoptimized /></div>
            </div>
            <dl className="folio-ledger">
              <div><dt>Doctor</dt><dd>Profile shown before payment</dd></div>
              <div><dt>Consultation</dt><dd>Video call within 24 hours</dd></div>
              <div><dt>Next steps</dt><dd>Shared on WhatsApp</dd></div>
            </dl>
            <p>
              Institute names show where a doctor trained. They do not mean the institute employs
              or endorses the doctor or Top Docs.
            </p>
          </div>
        </div>
      </section>

      <InstituteProof />
      <SpecialtyProof />
      <ConsultationProcess amountRupees={amountRupees} />
      <FeaturedSpecialists />
      <FounderThesis />

      <section className="landing-section faq-section" id="questions" aria-labelledby="faq-heading">
        <div className="section-heading compact-heading">
          <p className="section-kicker">Questions</p>
          <h2 id="faq-heading">What you may want to know</h2>
        </div>
        <div className="faq-list">
          {LANDING_FAQS.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}<span aria-hidden="true">+</span></summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-section final-cta" aria-labelledby="final-heading">
        <p className="section-kicker">Start here</p>
        <h2 id="final-heading">Need help finding the right specialist?</h2>
        <p>Tell us the specialty and health concern. We’ll show you the next step.</p>
        <Link className="primary-cta light-cta" href={LANDING_PRIMARY_CTA.href}>
          {LANDING_PRIMARY_CTA.label}
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className="landing-footer">
        <div>
          <BrandLockup footer />
          <p>Online specialist consultations and second opinions for non-emergency concerns.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#specialties">Specialties</a>
          <a href="#specialists">Our doctors</a>
          <a href="#questions">Questions</a>
        </nav>
        <div className="footer-notes">
          <p>After payment, reports, timing and the video link are coordinated on WhatsApp.</p>
          <p>For medical emergencies, go to the nearest hospital or call local emergency services.</p>
        </div>
      </footer>
    </main>
  );
}
