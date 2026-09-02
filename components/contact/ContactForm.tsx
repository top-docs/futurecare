"use client";

import { useRef, useState } from "react";
import {
  guidedContactSchema,
  type GuidedContactDetails,
} from "@/lib/validation";

type ContactValues = GuidedContactDetails;
type FieldErrors = Partial<Record<keyof ContactValues, string>>;

type ContactFormProps = {
  isSaving: boolean;
  mode?: "consultation" | "enquiry";
  variant: "guided";
  onSubmit: (details: GuidedContactDetails) => Promise<void>;
};

export function ContactForm(props: ContactFormProps) {
  const { isSaving, mode = "consultation" } = props;
  const [values, setValues] = useState<ContactValues>({
    patientName: "",
    phone: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = guidedContactSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ContactValues;
        nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      queueMicrotask(() => formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setErrors({});
    await props.onSubmit(result.data);
  }

  function update(field: keyof ContactValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <p className="step-label">{mode === "enquiry" ? "Request a review" : "Your details"}</p>
        <h2>Where should our care team reach you?</h2>
        <p>
          {mode === "enquiry"
            ? "We’ll review your enquiry and contact you within 24 hours. No payment is taken now."
            : "We’ll use these details only to coordinate this consultation."}
        </p>
      </div>

      <label>
        Your name
        <input
          autoComplete="name"
          value={values.patientName}
          onChange={(event) => update("patientName", event.target.value)}
          aria-invalid={Boolean(errors.patientName)}
          aria-describedby={errors.patientName ? "patient-name-error" : undefined}
        />
        {errors.patientName ? <span id="patient-name-error" className="field-error">{errors.patientName}</span> : null}
      </label>

      <label>
        Indian WhatsApp number
        <div className="phone-input">
          <span aria-hidden="true">+91</span>
          <input
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            value={values.phone}
            onChange={(event) => update("phone", event.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
        </div>
        {errors.phone ? <span id="phone-error" className="field-error">{errors.phone}</span> : null}
      </label>

      <button className="primary-button full-width" type="submit" disabled={isSaving}>
        {isSaving
          ? "Saving your case…"
          : mode === "enquiry"
            ? "Send enquiry"
            : "Continue to payment"}
      </button>
      <p className="retention-note">
        We keep this record until you ask us to delete it. You can email{" "}
        <a href="mailto:lokeshdange8@gmail.com?subject=Delete%20my%20Top%20Docs%20record">lokeshdange8@gmail.com</a>.
      </p>
    </form>
  );
}
