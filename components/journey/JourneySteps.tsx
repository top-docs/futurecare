import {
  CONSULTATION_TYPE_CHOICES,
  ONCOLOGY_CHOICES,
  SPECIALTY_CHOICES,
  type ConsultationType,
  type OncologyChoice,
  type SpecialtyChoice,
} from "@/lib/guided-journey";
import { ContactForm } from "@/components/contact/ContactForm";
import { DoctorCard } from "@/components/doctor/DoctorCard";
import type { DoctorProfile } from "@/lib/doctors";
import type { GuidedContactDetails } from "@/lib/validation";

type StepFrameProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

function StepFrame({ eyebrow, title, description, children }: StepFrameProps) {
  return (
    <section className="journey-step" aria-labelledby="journey-question">
      <div className="journey-step-copy">
        <p className="journey-kicker">{eyebrow}</p>
        <h1 id="journey-question">{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ChoiceList<T extends string>({
  choices,
  selected,
  onChoose,
}: {
  choices: ReadonlyArray<{ value: T; label: string }>;
  selected?: T;
  onChoose: (value: T) => void;
}) {
  return (
    <div className="journey-choice-list">
      {choices.map((choice, index) => (
        <button
          key={choice.value}
          className="journey-choice"
          type="button"
          aria-pressed={selected === choice.value}
          onClick={() => onChoose(choice.value)}
        >
          <span className="journey-choice-index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{choice.label}</span>
          <span aria-hidden="true">→</span>
        </button>
      ))}
    </div>
  );
}

export function ConsultationTypeStep({
  selected,
  onChoose,
}: {
  selected?: ConsultationType;
  onChoose: (value: ConsultationType) => void;
}) {
  return (
    <StepFrame
      eyebrow="Step 1 of 4"
      title="What kind of consultation do you need?"
      description="Choose the option that best describes this request."
    >
      <ChoiceList choices={CONSULTATION_TYPE_CHOICES} selected={selected} onChoose={onChoose} />
    </StepFrame>
  );
}

export function SpecialtyStep({
  selected,
  onChoose,
}: {
  selected?: SpecialtyChoice;
  onChoose: (value: SpecialtyChoice) => void;
}) {
  return (
    <StepFrame
      eyebrow="Step 2 of 4"
      title="Which area of care is this about?"
      description="Choose the closest option. You can select Other / Not sure if none fit."
    >
      <ChoiceList choices={SPECIALTY_CHOICES} selected={selected} onChoose={onChoose} />
    </StepFrame>
  );
}

export function OncologyStep({
  selected,
  onChoose,
}: {
  selected?: OncologyChoice;
  onChoose: (value: OncologyChoice) => void;
}) {
  return (
    <StepFrame
      eyebrow="Cancer care detail"
      title="What kind of cancer consultation is this?"
      description="This helps route the request to the relevant consultation path."
    >
      <ChoiceList choices={ONCOLOGY_CHOICES} selected={selected} onChoose={onChoose} />
    </StepFrame>
  );
}

export function CaseDetailsStep({
  value,
  consentAccepted,
  fieldError,
  submitError,
  isSubmitting,
  onValueChange,
  onConsentChange,
  onSubmit,
}: {
  value: string;
  consentAccepted: boolean;
  fieldError?: { field: "caseDetails" | "careConsent"; message: string };
  submitError?: string;
  isSubmitting: boolean;
  onValueChange: (value: string) => void;
  onConsentChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const detailsError = fieldError?.field === "caseDetails" ? fieldError.message : undefined;
  const consentError = fieldError?.field === "careConsent" ? fieldError.message : undefined;

  return (
    <StepFrame
      eyebrow="Step 3 of 4"
      title="Tell us what is happening."
      description="Share the symptoms, diagnosis, or treatment question in your own words."
    >
      <form className="journey-details-form" onSubmit={onSubmit} noValidate>
        <label htmlFor="case-details">Case details</label>
        <textarea
          id="case-details"
          value={value}
          rows={7}
          maxLength={4_000}
          aria-describedby={detailsError ? "case-details-error case-details-help" : "case-details-help"}
          aria-invalid={Boolean(detailsError)}
          placeholder="For example: My mother has received two different surgery recommendations. We want clarity on the next step."
          onChange={(event) => onValueChange(event.target.value)}
          disabled={isSubmitting}
        />
        <p id="case-details-help" className="journey-field-help">
          This intake organises your request. It does not diagnose, prescribe, or recommend treatment.
        </p>
        {detailsError ? <p id="case-details-error" className="journey-error" role="alert">{detailsError}</p> : null}

        <label className="journey-consent">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(event) => onConsentChange(event.target.checked)}
            disabled={isSubmitting}
            aria-describedby={consentError ? "care-consent-error" : undefined}
          />
          <span>
            I agree to share these details with Top Docs for arranging this consultation.
            <small>Medical advice comes from the consulting doctor.</small>
          </span>
        </label>
        {consentError ? <p id="care-consent-error" className="journey-error" role="alert">{consentError}</p> : null}
        {submitError ? <p className="journey-error" role="alert">{submitError}</p> : null}

        <button className="journey-primary-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving securely…" : "Save and continue"}
          <span aria-hidden="true">→</span>
        </button>
        <p className="journey-urgent-note">
          If this may be an emergency, go to the nearest hospital or contact local emergency services now.
        </p>
      </form>
    </StepFrame>
  );
}

export function EmergencyStop({
  message,
  onStartFresh,
}: {
  message?: string;
  onStartFresh: () => void;
}) {
  return (
    <section className="journey-step journey-emergency" role="alert" aria-labelledby="urgent-heading">
      <p className="journey-kicker">Urgent care</p>
      <h1 id="urgent-heading">Please seek in-person help now.</h1>
      <p>{message ?? "This may need urgent medical attention."}</p>
      <p>
        Go to the nearest hospital or contact local emergency services. Do not wait for an online consultation.
      </p>
      <button className="journey-secondary-action" type="button" onClick={onStartFresh}>
        Start a fresh request
      </button>
    </section>
  );
}

export function SavedOutcome({ recoveryAvailable }: { recoveryAvailable: boolean }) {
  return (
    <section className="journey-step journey-saved" role="status" aria-labelledby="saved-heading">
      <span className="journey-saved-mark" aria-hidden="true">✓</span>
      <p className="journey-kicker">Details saved</p>
      <h1 id="saved-heading">Your consultation request is ready for the next step.</h1>
      <p>We saved the details you shared and prepared the relevant consultation path.</p>
      <p className="journey-field-help">
        {recoveryAvailable
          ? "You can close this page and reopen it on this browser without losing the saved request."
          : "Keep this page open. This browser is blocking storage, so the request cannot be restored here later."}
      </p>
    </section>
  );
}

export function MatchedDoctorStep({
  doctor,
  onContinue,
  onMismatch,
  isCorrecting,
  correctionError,
}: {
  doctor: DoctorProfile;
  onContinue: () => void;
  onMismatch: () => void;
  isCorrecting: boolean;
  correctionError?: string;
}) {
  return (
    <StepFrame
      eyebrow="Specialist match"
      title="A specialist for your consultation."
      description="This match comes from the area of care you selected. Review the profile and current price before sharing your contact details."
    >
      <div className="guided-doctor-step">
        <DoctorCard
          doctor={doctor}
          onContinue={onContinue}
          onMismatch={onMismatch}
          isCorrecting={isCorrecting}
          correctionError={correctionError}
        />
      </div>
    </StepFrame>
  );
}

export function GuidedContactStep({
  mode,
  isSaving,
  saveError,
  onSubmit,
}: {
  mode: "consultation" | "enquiry";
  isSaving: boolean;
  saveError?: string;
  onSubmit: (details: GuidedContactDetails) => Promise<void>;
}) {
  return (
    <section className="journey-step guided-contact-step" aria-labelledby="guided-contact-heading">
      <p className="journey-kicker">
        {mode === "enquiry" ? "Human review" : "Contact details"}
      </p>
      <h1 id="guided-contact-heading">
        {mode === "enquiry"
          ? "We’ll review this request before suggesting a specialist."
          : "Where should we coordinate the consultation?"}
      </h1>
      <p>
        {mode === "enquiry"
          ? "Leave your WhatsApp number and our care team will contact you within 24 hours. No payment is taken now."
          : "We need only your name and Indian WhatsApp number. Reports, timing, and the consultation link are coordinated on WhatsApp after payment."}
      </p>
      <ContactForm
        variant="guided"
        mode={mode}
        isSaving={isSaving}
        onSubmit={onSubmit}
      />
      {saveError ? <p className="journey-error" role="alert">{saveError}</p> : null}
    </section>
  );
}

export function EnquiryCompleteStep({ onStartNewRequest }: { onStartNewRequest: () => void }) {
  return (
    <section className="journey-step journey-saved" role="status" aria-labelledby="enquiry-complete-heading">
      <span className="journey-saved-mark" aria-hidden="true">✓</span>
      <p className="journey-kicker">Request received</p>
      <h1 id="enquiry-complete-heading">Our care team will review your request.</h1>
      <p>We’ll contact you on WhatsApp within 24 hours. No payment has been taken.</p>
      <button className="journey-secondary-action" type="button" onClick={onStartNewRequest}>
        Start a new request
      </button>
    </section>
  );
}
