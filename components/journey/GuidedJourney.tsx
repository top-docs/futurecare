"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CaseDetailsStep,
  ConsultationTypeStep,
  EmergencyStop,
  EnquiryCompleteStep,
  GuidedContactStep,
  MatchedDoctorStep,
  OncologyStep,
  SpecialtyStep,
} from "@/components/journey/JourneySteps";
import { PaymentPanel } from "@/components/payment/PaymentPanel";
import {
  createInitialJourneyState,
  guidedJourneyReducer,
  validateGuidedCaseStep,
  type GuidedJourneyStep,
} from "@/lib/guided-journey-state";
import { findDoctorById, type DoctorId } from "@/lib/doctors";
import type { GuidedContactDetails } from "@/lib/validation";
import {
  clearSessionId,
  getSafeSessionAccessForEntry,
} from "@/lib/session-id";
import { createSingleFlightGate } from "@/lib/single-flight";
import {
  captureFirstTouchSource,
  getTrafficSource,
} from "@/lib/tracking";

const HISTORY_KEY = "topDocsJourneyStep";

function initialSource() {
  const current = getTrafficSource(window.location.search, document.referrer);
  try {
    return captureFirstTouchSource(window.localStorage, current);
  } catch {
    return current;
  }
}

function isInputStep(value: unknown): value is GuidedJourneyStep {
  return value === "consultation-type"
    || value === "specialty"
    || value === "oncology"
    || value === "case-details";
}

export function GuidedJourney() {
  const submitGuidedCase = useMutation(api.cases.submitGuidedCase);
  const saveGuidedContact = useMutation(api.cases.saveGuidedContact);
  const routeGuidedCaseToReview = useMutation(api.cases.routeGuidedCaseToReview);
  const recordEvent = useMutation(api.events.recordOnce);
  const [startNewRequest] = useState(
    () => new URLSearchParams(window.location.search).get("start") === "new",
  );
  const [sessionAccess] = useState(() => getSafeSessionAccessForEntry(
    () => window.localStorage,
    startNewRequest,
  ));
  const [source] = useState(initialSource);
  const [state, dispatch] = useReducer(guidedJourneyReducer, undefined, createInitialJourneyState);
  const [isRestored, setIsRestored] = useState(false);
  const [restoreTimedOut, setRestoreTimedOut] = useState(false);
  const [requiresNewSession, setRequiresNewSession] = useState(false);
  const [legacyPayment, setLegacyPayment] = useState<{
    caseId: Id<"cases">;
    patientName?: string;
    phone?: string;
    doctorId?: string;
    hasSavedOrder: boolean;
  } | null>(null);
  const recoveryAvailable = sessionAccess.recoveryAvailable;
  const snapshot = useQuery(api.cases.getGuidedSessionSnapshot, {
    sessionId: sessionAccess.sessionId,
  });
  const hydratedSession = useRef(false);
  const submitGate = useRef(createSingleFlightGate());
  const contactGate = useRef(createSingleFlightGate());
  const correctionGate = useRef(createSingleFlightGate());
  const unavailableDoctorGate = useRef(createSingleFlightGate());
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctionError, setCorrectionError] = useState("");
  const [unavailableDoctorAttempt, setUnavailableDoctorAttempt] = useState(0);
  const matchedDoctor = state.doctorId ? findDoctorById(state.doctorId) : null;

  useEffect(() => {
    void recordEvent({
      sessionId: sessionAccess.sessionId,
      name: "journey_started",
      source,
    });
  }, [recordEvent, sessionAccess.sessionId, source]);

  useEffect(() => {
    if (
      state.step !== "doctor-shown"
      || !state.doctorId
      || matchedDoctor
      || !state.caseId
      || !unavailableDoctorGate.current.tryStart()
    ) return;

    setCorrectionError("");
    void routeGuidedCaseToReview({
      caseId: state.caseId as Id<"cases">,
      sessionId: sessionAccess.sessionId,
      reason: "doctor-unavailable",
    }).then(() => {
      dispatch({
        type: "saved",
        caseId: state.caseId!,
        outcome: "human-review",
        reviewReason: "doctor-unavailable",
      });
    }).catch(() => {
      setCorrectionError("This specialist is not currently available. We could not open human review yet.");
    }).finally(() => unavailableDoctorGate.current.finish());
  }, [matchedDoctor, routeGuidedCaseToReview, sessionAccess.sessionId, state.caseId, state.doctorId, state.step, unavailableDoctorAttempt]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("start");
    window.history.replaceState(
      { [HISTORY_KEY]: "consultation-type" },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    const onPopState = (event: PopStateEvent) => {
      const target = event.state?.[HISTORY_KEY] as unknown;
      if (isInputStep(target)) dispatch({ type: "restore-step", step: target });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (snapshot === undefined || hydratedSession.current) return;
    hydratedSession.current = true;
    queueMicrotask(() => {
      if (snapshot?.kind === "legacy-payment") {
        if (snapshot.resumeState === "paid") {
          window.location.replace(`/complete?case=${encodeURIComponent(snapshot.caseId)}`);
          return;
        }
        setLegacyPayment({
          caseId: snapshot.caseId,
          patientName: snapshot.patientName,
          phone: snapshot.phone,
          doctorId: snapshot.doctorId,
          hasSavedOrder: Boolean(snapshot.hasSavedOrder),
        });
        setIsRestored(true);
        return;
      }
      if (snapshot?.kind === "new-session-required") {
        setRequiresNewSession(true);
        setIsRestored(true);
        return;
      }
      if (
        snapshot?.kind === "guided"
        && snapshot.consultationType
        && snapshot.selectedSpecialty
        && snapshot.caseDetails
        && snapshot.matchOutcome
      ) {
        if (snapshot.resumeState === "paid") {
          window.location.replace(`/complete?case=${encodeURIComponent(snapshot.caseId)}`);
          return;
        }
        dispatch({
          type: "restore-saved",
          consultationType: snapshot.consultationType,
          selectedSpecialty: snapshot.selectedSpecialty,
          oncologyChoice: snapshot.oncologyChoice,
          caseDetails: snapshot.caseDetails,
          caseId: snapshot.caseId,
          outcome: snapshot.matchOutcome,
          doctorId: snapshot.doctorId as DoctorId | undefined,
          reviewReason: snapshot.reviewReason,
          guidedStage: snapshot.guidedStage,
          resumeState: snapshot.resumeState,
          patientName: snapshot.patientName,
          phone: snapshot.phone,
        });
      } else if (snapshot?.kind === "guided") {
        setRequiresNewSession(true);
      }
      setIsRestored(true);
    });
  }, [snapshot]);

  useEffect(() => {
    if (snapshot !== undefined) return;
    const timeout = window.setTimeout(() => setRestoreTimedOut(true), 8_000);
    return () => window.clearTimeout(timeout);
  }, [snapshot]);

  function pushStep(step: GuidedJourneyStep) {
    window.history.pushState({ [HISTORY_KEY]: step }, "");
  }

  function startFresh() {
    dispatch({ type: "start-fresh" });
    window.history.replaceState({ [HISTORY_KEY]: "consultation-type" }, "");
  }

  function startNewSession() {
    try {
      clearSessionId(window.localStorage);
    } catch {
      // A reload still creates a fresh in-memory identifier when storage is blocked.
    }
    window.location.reload();
  }

  function goBack() {
    if (state.step === "consultation-type") return;
    if (isInputStep(window.history.state?.[HISTORY_KEY])) {
      window.history.back();
      return;
    }
    dispatch({ type: "back" });
  }

  async function handleCaseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submitGate.current.tryStart()) return;

    const validation = validateGuidedCaseStep(
      state.caseDetails,
      state.careConsentAccepted,
    );
    if (validation.kind === "emergency") {
      dispatch({ type: "emergency", message: validation.message });
      submitGate.current.finish();
      return;
    }
    if (validation.kind === "invalid") {
      dispatch({ type: "validation-error", field: validation.field, message: validation.message });
      submitGate.current.finish();
      return;
    }
    if (!state.consultationType || !state.selectedSpecialty) {
      dispatch({ type: "submit-failed", message: "Return to the earlier questions and complete each choice." });
      submitGate.current.finish();
      return;
    }

    dispatch({ type: "submit-started" });
    try {
      const result = await submitGuidedCase({
        sessionId: sessionAccess.sessionId,
        consultationType: state.consultationType,
        selectedSpecialty: state.selectedSpecialty,
        oncologyChoice: state.oncologyChoice,
        caseDetails: validation.caseDetails,
        careConsentAccepted: true,
        source,
      });

      if (result.kind === "emergency") {
        dispatch({ type: "emergency", message: result.message });
        return;
      }
      if (result.kind === "new-session-required") {
        setRequiresNewSession(true);
        return;
      }

      dispatch({
        type: "saved",
        caseId: result.caseId,
        outcome: result.kind,
        doctorId: result.kind === "matched" ? result.doctorId : undefined,
        reviewReason: result.kind === "human-review" ? result.reason : undefined,
      });
    } catch {
      dispatch({
        type: "submit-failed",
        message: "We could not save the request. Check your connection and try again.",
      });
    } finally {
      submitGate.current.finish();
    }
  }

  async function handleCorrection() {
    if (!state.caseId || !correctionGate.current.tryStart()) return;
    setIsCorrecting(true);
    setCorrectionError("");
    try {
      const result = await routeGuidedCaseToReview({
        caseId: state.caseId as Id<"cases">,
        sessionId: sessionAccess.sessionId,
        reason: "patient-rejected-match",
      });
      if (result.kind === "enquiry-complete") {
        dispatch({
          type: "contact-saved",
          result: "enquiry-complete",
          patientName: state.contact?.patientName ?? "",
          phone: state.contact?.phone ?? "",
        });
      } else {
        dispatch({ type: "correction-complete" });
        pushStep("specialty");
      }
    } catch {
      setCorrectionError("We could not update the match. Check your connection and try again.");
    } finally {
      setIsCorrecting(false);
      correctionGate.current.finish();
    }
  }

  async function handleContactSubmit(details: GuidedContactDetails) {
    if (!state.caseId || !contactGate.current.tryStart()) return;
    dispatch({ type: "contact-submit-started" });
    try {
      const result = await saveGuidedContact({
        caseId: state.caseId as Id<"cases">,
        sessionId: sessionAccess.sessionId,
        patientName: details.patientName,
        phone: details.phone,
      });
      if (result.kind === "emergency") {
        dispatch({ type: "emergency", message: result.message });
        return;
      }
      dispatch({
        type: "contact-saved",
        result: result.kind,
        patientName: details.patientName,
        phone: details.phone,
      });
    } catch {
      dispatch({
        type: "contact-submit-failed",
        message: "We could not save your contact details. Check your connection and try again.",
      });
    } finally {
      contactGate.current.finish();
    }
  }

  if (restoreTimedOut && !isRestored) {
    return (
      <section className="journey-system-state" role="alert">
        <p>We could not check for a saved request.</p>
        <button className="journey-secondary-action" type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </section>
    );
  }

  if (!isRestored) {
    return <section className="journey-system-state" role="status"><p>Checking for a saved request…</p></section>;
  }

  if (legacyPayment) {
    const savedDoctor = legacyPayment.doctorId
      ? findDoctorById(legacyPayment.doctorId)
      : null;
    if (
      legacyPayment.hasSavedOrder
      && legacyPayment.patientName
      && legacyPayment.phone
    ) {
      return (
        <PaymentPanel
          caseId={legacyPayment.caseId}
          contact={{
            patientName: legacyPayment.patientName,
            phone: legacyPayment.phone,
          }}
          doctorName={savedDoctor?.name ?? "Your saved specialist"}
          sessionId={sessionAccess.sessionId}
        />
      );
    }
    return (
      <section className="journey-system-state" role="alert">
        <p>We found an older payment request, but it does not have a saved Razorpay order that can be reopened.</p>
        <button className="journey-secondary-action" type="button" onClick={startNewSession}>
          Start a new request
        </button>
      </section>
    );
  }

  if (requiresNewSession) {
    return (
      <section className="journey-system-state" aria-labelledby="new-request-heading">
        <p className="journey-kicker">Earlier request found</p>
        <h1 id="new-request-heading">Start a new request without changing the earlier one.</h1>
        <p>The request already linked to this browser will remain unchanged.</p>
        <button className="journey-primary-action" type="button" onClick={startNewSession}>
          Start a new request <span aria-hidden="true">→</span>
        </button>
      </section>
    );
  }

  return (
    <>
      <div className="journey-progress" aria-label="Consultation request progress">
        <span>Private request</span>
        <span>{state.step === "payment-ready" || state.step === "enquiry-complete" ? "Saved" : "About 3 minutes"}</span>
      </div>

      {!recoveryAvailable ? (
        <p className="journey-storage-note" role="status">
          This visit will work, but this browser is blocking storage. Keep the page open so you do not lose progress.
        </p>
      ) : null}

      {state.step === "consultation-type" ? (
        <ConsultationTypeStep
          selected={state.consultationType}
          onChoose={(value) => {
            dispatch({ type: "choose-consultation", value });
            pushStep("specialty");
          }}
        />
      ) : null}
      {state.step === "specialty" ? (
        <SpecialtyStep
          selected={state.selectedSpecialty}
          onChoose={(value) => {
            dispatch({ type: "choose-specialty", value });
            pushStep(value === "oncology" ? "oncology" : "case-details");
          }}
        />
      ) : null}
      {state.step === "oncology" ? (
        <OncologyStep
          selected={state.oncologyChoice}
          onChoose={(value) => {
            dispatch({ type: "choose-oncology", value });
            pushStep("case-details");
          }}
        />
      ) : null}
      {state.step === "case-details" || state.step === "submitting" ? (
        <CaseDetailsStep
          value={state.caseDetails}
          consentAccepted={state.careConsentAccepted}
          fieldError={state.fieldError}
          submitError={state.submitError}
          isSubmitting={state.step === "submitting"}
          onValueChange={(value) => dispatch({ type: "set-case-details", value })}
          onConsentChange={(value) => dispatch({ type: "set-consent", value })}
          onSubmit={handleCaseSubmit}
        />
      ) : null}
      {state.step === "emergency-stop" ? (
        <EmergencyStop message={state.emergencyMessage} onStartFresh={startFresh} />
      ) : null}
      {state.step === "doctor-shown" && state.doctorId ? (
        matchedDoctor ? (
          <MatchedDoctorStep
            doctor={matchedDoctor}
            onContinue={() => dispatch({ type: "show-contact" })}
            onMismatch={() => void handleCorrection()}
            isCorrecting={isCorrecting}
            correctionError={correctionError}
          />
        ) : (
          <section className="journey-system-state" role={correctionError ? "alert" : "status"}>
            <p>{correctionError || "Opening the human-review path…"}</p>
            {correctionError ? (
              <button
                className="journey-secondary-action"
                type="button"
                onClick={() => setUnavailableDoctorAttempt((attempt) => attempt + 1)}
              >
                Try again
              </button>
            ) : null}
          </section>
        )
      ) : null}
      {state.step === "human-review" ? (
        <GuidedContactStep
          mode="enquiry"
          isSaving={false}
          saveError={state.submitError}
          onSubmit={handleContactSubmit}
        />
      ) : null}
      {state.step === "contact" || state.step === "saving-contact" ? (
        <GuidedContactStep
          mode={state.outcome === "matched" ? "consultation" : "enquiry"}
          isSaving={state.step === "saving-contact"}
          saveError={state.submitError}
          onSubmit={handleContactSubmit}
        />
      ) : null}
      {state.step === "payment-ready" || state.step === "payment-pending" ? (
        state.caseId && state.contact && matchedDoctor ? (
          <PaymentPanel
            caseId={state.caseId as Id<"cases">}
            contact={state.contact}
            doctorName={matchedDoctor.name}
            sessionId={sessionAccess.sessionId}
          />
        ) : (
          <section className="journey-system-state" role="alert">
            <p>We could not restore the saved payment details. Please start a new request.</p>
          </section>
        )
      ) : null}
      {state.step === "paid" && state.caseId ? (
        <section className="journey-system-state" role="status">
          <p>Opening your confirmed Top Docs request…</p>
        </section>
      ) : null}
      {state.step === "enquiry-complete" ? (
        <EnquiryCompleteStep onStartNewRequest={startNewSession} />
      ) : null}

      {state.step === "specialty" || state.step === "oncology" || state.step === "case-details" ? (
        <button className="journey-back" type="button" onClick={goBack}>
          <span aria-hidden="true">←</span> Back
        </button>
      ) : null}

      <p className="journey-privacy-line">
        Your medical details are saved only after consent. <Link href="/">Return to Top Docs</Link>
      </p>
    </>
  );
}
