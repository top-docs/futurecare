"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { DoctorProfile } from "@/lib/doctors";

type ConsultationQuote = {
  amountRupees: number;
  label: string;
};

function isConsultationQuote(value: unknown): value is ConsultationQuote {
  if (!value || typeof value !== "object") return false;
  const quote = value as Record<string, unknown>;
  return Number.isInteger(quote.amountRupees)
    && Number(quote.amountRupees) > 0
    && typeof quote.label === "string"
    && quote.label.length > 0;
}

export function DoctorCard({
  doctor,
  onContinue,
  onMismatch,
  isCorrecting = false,
  correctionError,
}: {
  doctor: DoctorProfile;
  onContinue: () => void;
  onMismatch: () => void;
  isCorrecting?: boolean;
  correctionError?: string;
}) {
  const [quote, setQuote] = useState<ConsultationQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteAttempt, setQuoteAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/payments/quote", {
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      const value: unknown = await response.json();
      if (!response.ok || !isConsultationQuote(value)) {
        throw new Error("The current consultation price could not be loaded.");
      }
      setQuote(value);
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setQuoteError("We could not confirm the current price. Please try again.");
    });
    return () => controller.abort();
  }, [quoteAttempt]);

  return (
    <article className="doctor-card">
      <div className="doctor-photo-wrap">
        {doctor.portrait.kind === "image" ? (
          <Image
            className="doctor-photo"
            src={doctor.portrait.url}
            alt={doctor.name}
            width={180}
            height={180}
            sizes="(max-width: 640px) 104px, 128px"
          />
        ) : (
          <div
            className="doctor-photo doctor-initials"
            role="img"
            aria-label={`${doctor.name} initials placeholder`}
          >
            {doctor.portrait.initials}
          </div>
        )}
      </div>
      <div className="doctor-details">
        <p className="doctor-specialty">Your consultation specialist · {doctor.specialty}</p>
        <h2>{doctor.name}</h2>
        <p className="doctor-qualifications">{doctor.qualifications}</p>
        <p className="doctor-training">{doctor.training}</p>
        <p className="doctor-focus">{doctor.focus}</p>
        <div className="consultation-facts">
          <span>Online consultation</span>
          <span>Arranged within 24 hours after payment</span>
        </div>
        <div className="doctor-action-row">
          <div className="price-block">
            {quote ? (
              <>
                <strong>₹{quote.amountRupees.toLocaleString("en-IN")}</strong>
                <small>{quote.label}</small>
              </>
            ) : quoteError ? (
              <button
                className="quote-retry"
                type="button"
                onClick={() => {
                  setQuote(null);
                  setQuoteError("");
                  setQuoteAttempt((attempt) => attempt + 1);
                }}
              >
                Retry price
              </button>
            ) : (
              <span className="quote-loading" role="status">Checking current price…</span>
            )}
          </div>
          <div className="doctor-buttons">
            <button
              className="journey-primary-action"
              type="button"
              onClick={onContinue}
              disabled={!quote || isCorrecting}
            >
              Continue with this specialist <span aria-hidden="true">→</span>
            </button>
            <button
              className="doctor-correction"
              type="button"
              onClick={onMismatch}
              disabled={isCorrecting}
            >
              {isCorrecting ? "Updating…" : "This doesn’t look right"}
            </button>
          </div>
        </div>
        {quoteError ? <p className="journey-error" role="alert">{quoteError}</p> : null}
        {correctionError ? <p className="journey-error" role="alert">{correctionError}</p> : null}
      </div>
    </article>
  );
}
