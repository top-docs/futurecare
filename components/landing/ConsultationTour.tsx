"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import type { DoctorProfile } from "@/lib/doctors";
import { CONSULTATION_TYPE_CHOICES, SPECIALTY_CHOICES } from "@/lib/guided-journey";

const TOUR_STEPS = [
  {
    shortLabel: "Choose",
    title: "Choose the type of consultation",
    description: "Start with a first consultation or a second opinion, then choose the area of care.",
    screen: "choose",
  },
  {
    shortLabel: "Explain",
    title: "Share the health concern",
    description: "Describe the symptoms, diagnosis or treatment question in your own words.",
    screen: "explain",
  },
  {
    shortLabel: "Review",
    title: "Review your matched specialist",
    description: "See the doctor’s qualifications, training and focus before continuing.",
    screen: "review",
  },
  {
    shortLabel: "Book",
    title: "Review the fees and book securely",
    description: "Share your contact details, review the fee breakdown and complete payment.",
    screen: "book",
  },
] as const;

type TourScreen = (typeof TOUR_STEPS)[number]["screen"];

function DemoHeader({ step }: { step: number }) {
  return (
    <div className="tour-demo-header">
      <span><i aria-hidden="true" /> Private request</span>
      <span>{step === 4 ? "Ready to book" : "About 3 minutes"}</span>
    </div>
  );
}

function ChoiceRow({ number, children, selected = false }: { number: string; children: React.ReactNode; selected?: boolean }) {
  return (
    <div className={`tour-demo-choice${selected ? " is-selected" : ""}`}>
      <span>{number}</span>
      <strong>{children}</strong>
      <span aria-hidden="true">→</span>
    </div>
  );
}

function ChooseScreen() {
  return (
    <div className="tour-demo tour-demo-choose">
      <DemoHeader step={1} />
      <div className="tour-demo-body">
        <p className="tour-demo-kicker">Step 1 of 4</p>
        <h3>What kind of consultation do you need?</h3>
        <p className="tour-demo-description">Choose the option that best describes this request.</p>
        <div className="tour-demo-choices">
          <ChoiceRow number="01" selected>{CONSULTATION_TYPE_CHOICES[0].label}</ChoiceRow>
          <ChoiceRow number="02">{CONSULTATION_TYPE_CHOICES[1].label}</ChoiceRow>
        </div>
        <div className="tour-demo-selection">
          <span>Area of care</span>
          <strong>{SPECIALTY_CHOICES[0].label}</strong>
        </div>
      </div>
    </div>
  );
}

function ExplainScreen() {
  return (
    <div className="tour-demo tour-demo-explain">
      <DemoHeader step={2} />
      <div className="tour-demo-body">
        <p className="tour-demo-kicker">Health concern</p>
        <h3>Tell us what is happening.</h3>
        <p className="tour-demo-description">Share the concern in your own words. This is used only to arrange the consultation.</p>
        <div className="tour-demo-field">
          <span>Example case details</span>
          <p>I would like a specialist opinion on a recent diagnosis and the next treatment step.</p>
        </div>
        <div className="tour-demo-consent"><span aria-hidden="true">✓</span> Details shared with consent</div>
      </div>
    </div>
  );
}

function ReviewScreen({ doctor }: { doctor: DoctorProfile }) {
  return (
    <div className="tour-demo tour-demo-review">
      <DemoHeader step={3} />
      <div className="tour-demo-body">
        <p className="tour-demo-kicker">Specialist match</p>
        <h3>A specialist for your consultation.</h3>
        <p className="tour-demo-description">Review the profile before sharing your contact details.</p>
        <div className="tour-demo-doctor">
          <div className="tour-demo-doctor-photo">
            <Image
              src={doctor.portrait.kind === "image" ? doctor.portrait.url : "/brand/top-docs-symbol.webp"}
              alt={`Portrait of ${doctor.name}`}
              fill
              sizes="160px"
              unoptimized
            />
          </div>
          <div>
            <span>Your consultation specialist · {doctor.specialty}</span>
            <h4>{doctor.name}</h4>
            <p>{doctor.qualifications}</p>
            <small>{doctor.focus}</small>
          </div>
        </div>
        <div className="tour-demo-tags"><span>Online consultation</span><span>Profile shown before payment</span></div>
      </div>
    </div>
  );
}

function BookScreen({ doctor, formattedPrice }: { doctor: DoctorProfile; formattedPrice: string }) {
  return (
    <div className="tour-demo tour-demo-book">
      <DemoHeader step={4} />
      <div className="tour-demo-body">
        <p className="tour-demo-kicker">Fee summary</p>
        <h3>Review before payment.</h3>
        <p className="tour-demo-description">{doctor.name} · Online consultation</p>
        <dl className="tour-demo-ledger">
          <div><dt>Guided intake</dt><dd>Free</dd></div>
          <div><dt>Specialist matching</dt><dd>Free</dd></div>
          <div><dt>Top Docs fee</dt><dd>₹0</dd></div>
          <div className="tour-demo-total"><dt>Doctor consultation fee</dt><dd>₹{formattedPrice}</dd></div>
        </dl>
        <div className="tour-demo-pay">Pay ₹{formattedPrice} <span aria-hidden="true">→</span></div>
        <small>After payment, our care team contacts you on WhatsApp and schedules the consultation within 24 hours.</small>
      </div>
    </div>
  );
}

function TourScreenPreview({
  screen,
  doctor,
  formattedPrice,
}: {
  screen: TourScreen;
  doctor: DoctorProfile;
  formattedPrice: string;
}) {
  switch (screen) {
    case "choose":
      return <ChooseScreen />;
    case "explain":
      return <ExplainScreen />;
    case "review":
      return <ReviewScreen doctor={doctor} />;
    case "book":
      return <BookScreen doctor={doctor} formattedPrice={formattedPrice} />;
    default: {
      const exhaustiveScreen: never = screen;
      throw new Error(`Unknown consultation tour screen: ${exhaustiveScreen}`);
    }
  }
}

export function ConsultationTour({ amountRupees, doctor }: { amountRupees: number; doctor: DoctorProfile }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const activeStep = TOUR_STEPS[activeIndex];
  const formattedPrice = amountRupees.toLocaleString("en-IN");

  function showPrevious() {
    setActiveIndex((current) => (current === 0 ? TOUR_STEPS.length - 1 : current - 1));
  }

  function showNext() {
    setActiveIndex((current) => (current === TOUR_STEPS.length - 1 ? 0 : current + 1));
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 48) return;
    if (distance > 0) showPrevious();
    else showNext();
  }

  return (
    <div className="consultation-tour-layout">
      <div className="consultation-tour-intro">
        <p className="section-kicker">How it works</p>
        <h2 id="process-heading">Find the right specialist in a few guided steps</h2>
        <p>See exactly what happens before you begin. Explore the real Top Docs booking journey at your own pace.</p>
        <ol className="consultation-tour-steps">
          {TOUR_STEPS.map((step, index) => (
            <li key={step.shortLabel}>
              <button
                type="button"
                className={index === activeIndex ? "is-active" : undefined}
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step.title}</strong>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="consultation-tour-stage-wrap">
        <div className="consultation-tour-stage-shadow" aria-hidden="true" />
        <div
          className="consultation-tour-stage"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="consultation-tour-stage-header" aria-live="polite">
            <strong>Top Docs walkthrough</strong>
            <span>Step {activeIndex + 1} of {TOUR_STEPS.length}</span>
          </div>

          <div className="consultation-tour-screen" key={activeStep.screen}>
            <TourScreenPreview screen={activeStep.screen} doctor={doctor} formattedPrice={formattedPrice} />
          </div>

          <div className="consultation-tour-mobile-copy" aria-live="polite">
            <strong>{activeStep.shortLabel}</strong>
            <span>{activeStep.description}</span>
          </div>

          <div className="consultation-tour-controls">
            <button type="button" onClick={showPrevious} aria-label="Show previous step">←</button>
            <div className="consultation-tour-progress" aria-hidden="true">
              {TOUR_STEPS.map((step, index) => (
                <span className={index === activeIndex ? "is-active" : undefined} key={step.shortLabel} />
              ))}
            </div>
            <button type="button" onClick={showNext} aria-label="Show next step">→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
