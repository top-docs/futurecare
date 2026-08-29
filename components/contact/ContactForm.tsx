"use client";

import { useState } from "react";
import { contactSchema, type ContactDetails } from "@/lib/validation";

type FieldErrors = Partial<Record<keyof ContactDetails, string>>;

export function ContactForm({
  isSaving,
  onSubmit,
}: {
  isSaving: boolean;
  onSubmit: (details: ContactDetails) => Promise<void>;
}) {
  const [values, setValues] = useState<ContactDetails>({
    patientName: "",
    phone: "",
    email: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = contactSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ContactDetails;
        nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await onSubmit(result.data);
  }

  function update(field: keyof ContactDetails, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <p className="step-label">Your details</p>
        <h2>Where should our care team reach you?</h2>
        <p>We’ll use these details only to coordinate this consultation.</p>
      </div>

      <label>
        Patient’s full name
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
        Indian mobile number
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

      <label>
        Email address
        <input
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email ? <span id="email-error" className="field-error">{errors.email}</span> : null}
      </label>

      <button className="primary-button full-width" type="submit" disabled={isSaving}>
        {isSaving ? "Saving your case…" : "Continue to payment"}
      </button>
    </form>
  );
}

