import Image from "next/image";
import Link from "next/link";
import {
  Bone,
  Brain,
  FirstAidKit,
  GenderFemale,
  Heartbeat,
  Pill,
} from "@phosphor-icons/react/ssr";

import {
  FEATURED_SPECIALISTS,
  FOUNDER_THESIS,
  INSTITUTE_PROOF,
  LANDING_PRIMARY_CTA,
  MORE_SPECIALISTS,
  SPECIALTY_PROOF,
} from "@/lib/landing-content";
import type { DoctorProfile } from "@/lib/doctors";
import { ConsultationTour } from "./ConsultationTour";

const SPECIALTY_ICONS = [
  GenderFemale,
  Pill,
  Heartbeat,
  Brain,
  FirstAidKit,
  Bone,
] as const;

export function InstituteProof() {
  return (
    <section className="landing-section institute-proof" aria-labelledby="institute-heading">
      <div className="section-heading compact-heading">
        <p className="section-kicker">Doctor training</p>
        <h2 id="institute-heading">Doctors trained at leading medical institutes</h2>
      </div>
      <div className="institute-folio">
        {INSTITUTE_PROOF.map((institute) => (
          <article className="institute-entry" key={institute.shortName}>
            <Image
              src={institute.logo}
              alt={`${institute.shortName} emblem`}
              width={144}
              height={144}
            />
            <strong>{institute.shortName}</strong>
          </article>
        ))}
      </div>
      <p className="institute-disclaimer">
        Institute names describe where doctors trained. They do not mean the institutes employ,
        partner with or endorse Top Docs.
      </p>
    </section>
  );
}

export function ConsultationProcess({ amountRupees }: { amountRupees: number }) {
  return (
    <section className="landing-section consultation-process-section" id="how-it-works" aria-labelledby="process-heading">
      <ConsultationTour amountRupees={amountRupees} doctor={FEATURED_SPECIALISTS[0]} />
    </section>
  );
}

export function SpecialtyProof() {
  return (
    <section className="landing-section specialties-section" id="specialties" aria-labelledby="specialties-heading">
      <div className="section-heading split-heading">
        <div>
          <p className="section-kicker">Specialties</p>
          <h2 id="specialties-heading">What do you need help with?</h2>
        </div>
        <p>
          Choose a specialty below. If you are unsure, choose Other / Not sure and we’ll review
          your request.
        </p>
      </div>
      <div className="specialty-grid">
        {SPECIALTY_PROOF.map((specialty, index) => {
          const SpecialtyIcon = SPECIALTY_ICONS[index];
          return (
            <Link
              className={`specialty-tone-${index + 1}`}
              href={specialty.href}
              key={specialty.name}
            >
              <span className="specialty-icon" aria-hidden="true">
                <SpecialtyIcon size={26} weight="regular" />
              </span>
              <span className="specialty-copy">
                <h3>{specialty.name}</h3>
                <p>{specialty.description}</p>
              </span>
              <span className="specialty-arrow" aria-hidden="true">→</span>
            </Link>
          );
        })}
      </div>
      <Link className="other-specialty-link" href={LANDING_PRIMARY_CTA.href}>
        Other / Not sure <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

function SpecialistCard({ doctor }: { doctor: DoctorProfile }) {
  return (
    <article className="specialist-profile">
      <div className="specialist-portrait">
        {doctor.portrait.kind === "image" ? (
          <Image
            src={doctor.portrait.url}
            alt={`Portrait of ${doctor.name}`}
            fill
            sizes="(max-width: 640px) 76vw, (max-width: 1024px) 42vw, 30vw"
          />
        ) : (
          <span aria-label={`${doctor.name} portrait not available`}>
            {doctor.portrait.initials}
          </span>
        )}
      </div>
      <div className="specialist-copy">
        <p>{doctor.specialty}</p>
        <h3>{doctor.name}</h3>
        <dl>
          <div>
            <dt>Qualifications</dt>
            <dd>{doctor.qualifications}</dd>
          </div>
          <div>
            <dt>Training</dt>
            <dd>{doctor.training}</dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>{doctor.focus}</dd>
          </div>
        </dl>
        <Link className="profile-action" href={LANDING_PRIMARY_CTA.href}>
          Check consultation availability
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

export function FeaturedSpecialists() {
  return (
    <section className="landing-section specialists-section" id="specialists" aria-labelledby="specialists-heading">
      <div className="section-heading split-heading">
        <div>
          <p className="section-kicker">Our doctors</p>
          <h2 id="specialists-heading">Meet our specialists</h2>
        </div>
        <p>
          Browse the public roster, then tell us the specialty and health concern. We’ll show the
          matching doctor’s profile before you book.
        </p>
      </div>
      <div className="specialist-rail">
        {FEATURED_SPECIALISTS.map((doctor) => <SpecialistCard doctor={doctor} key={doctor.id} />)}
      </div>
      <details className="all-specialists">
        <summary>View all doctors <span aria-hidden="true">+</span></summary>
        <div className="all-specialists-grid">
          {MORE_SPECIALISTS.map((doctor) => <SpecialistCard doctor={doctor} key={doctor.id} />)}
        </div>
      </details>
    </section>
  );
}

export function FounderThesis() {
  return (
    <section className="landing-section founder-thesis" aria-labelledby="founder-heading">
      <div className="founder-story">
        <p className="section-kicker">{FOUNDER_THESIS.eyebrow}</p>
        <h2 id="founder-heading">{FOUNDER_THESIS.heading}</h2>
        {FOUNDER_THESIS.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="founder-signature">
          <Image
            src={FOUNDER_THESIS.portrait}
            alt="Lokesh Dange, founder of Top Docs"
            width={128}
            height={128}
            sizes="64px"
          />
          <p><strong>{FOUNDER_THESIS.founder}</strong><span>{FOUNDER_THESIS.role}</span></p>
        </div>
      </div>
      <aside className="founder-principles" aria-label="What Top Docs is built around">
        <p>What Top Docs is built around</p>
        <div>
          <p><strong>Credible specialist access</strong><span>Doctors with approved qualifications and training details.</span></p>
        </div>
        <div>
          <p><strong>Know who you will consult</strong><span>See the matched doctor’s profile before you book.</span></p>
        </div>
        <div>
          <p><strong>Human coordination</strong><span>Help with reports, timing and the video call.</span></p>
        </div>
        <Link className="primary-cta founder-cta" href={LANDING_PRIMARY_CTA.href}>
          {LANDING_PRIMARY_CTA.label} <span aria-hidden="true">→</span>
        </Link>
      </aside>
    </section>
  );
}
