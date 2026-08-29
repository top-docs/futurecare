"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { ContactForm } from "@/components/contact/ContactForm";
import { DoctorCard } from "@/components/doctor/DoctorCard";
import { PaymentPanel } from "@/components/payment/PaymentPanel";
import type { ContactDetails } from "@/lib/validation";

type Stage = "concern" | "follow-up" | "matched" | "contact" | "payment";
type Message = { id: string; role: "assistant" | "patient"; text: string };

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  text: "Tell me about the symptoms, diagnosis, or treatment question you want help with.",
};

export function ConsultationFlow() {
  const createCase = useMutation(api.cases.create);
  const [stage, setStage] = useState<Stage>("concern");
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [concern, setConcern] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [careConsent, setCareConsent] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [caseId, setCaseId] = useState<Id<"cases"> | null>(null);
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const caseSummary = useMemo(() => {
    if (!concern) return "";
    return `${concern}${followUp ? ` The patient adds: ${followUp}` : ""}`;
  }, [concern, followUp]);

  function addMessage(role: Message["role"], text: string) {
    setMessages((current) => [
      ...current,
      { id: `${role}-${Date.now()}-${current.length}`, role, text },
    ]);
  }

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (!careConsent) {
      setConsentError("Accept the care and privacy notice before sharing health details.");
      return;
    }

    setConsentError("");
    setInput("");
    addMessage("patient", text);

    if (stage === "concern") {
      setConcern(text);
      addMessage(
        "assistant",
        "What has a doctor already told you, and what would you like the specialist to clarify?",
      );
      setStage("follow-up");
      return;
    }

    if (stage === "follow-up") {
      setFollowUp(text);
      addMessage(
        "assistant",
        "Thank you. Based on this Build Week test journey, I can introduce a gynaecology specialist for an online consultation.",
      );
      setStage("matched");
    }
  }

  async function handleContactSubmit(details: ContactDetails) {
    setIsSaving(true);
    setSaveError("");
    try {
      const sessionId = crypto.randomUUID();
      const id = await createCase({
        sessionId,
        concern,
        followUp,
        caseSummary,
        patientName: details.patientName,
        phone: details.phone,
        email: details.email,
      });
      setCaseId(id);
      setContact(details);
      setStage("payment");
    } catch {
      setSaveError("Your case could not be saved. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const showDoctor = stage === "matched" || stage === "contact" || stage === "payment";

  return (
    <section className="chat-card" aria-label="FutureCare consultation assistant">
      <div className="chat-header">
        <div className="assistant-identity">
          <span className="assistant-mark" aria-hidden="true">✦</span>
          <span><strong>Health Assistant</strong><small>Online now</small></span>
        </div>
        <span className="privacy-chip">Private</span>
      </div>

      <div className="chat-body" aria-live="polite">
        <div className="care-boundary">
          <span aria-hidden="true">i</span>
          <p>This assistant organises your case. It does not diagnose, prescribe, or replace a doctor.</p>
        </div>

        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <p>{message.text}</p>
          </div>
        ))}

        {showDoctor ? <DoctorCard onContinue={() => setStage("contact")} /> : null}

        {stage === "contact" ? (
          <>
            <div className="case-summary">
              <p className="step-label">Case summary</p>
              <p>{caseSummary}</p>
            </div>
            <ContactForm isSaving={isSaving} onSubmit={handleContactSubmit} />
            {saveError ? <p className="form-error" role="alert">{saveError}</p> : null}
          </>
        ) : null}

        {stage === "payment" && caseId && contact ? (
          <PaymentPanel caseId={caseId} contact={contact} caseSummary={caseSummary} />
        ) : null}
      </div>

      {stage === "concern" || stage === "follow-up" ? (
        <div className="composer-area">
          <label className="consent-row">
            <input
              type="checkbox"
              checked={careConsent}
              onChange={(event) => {
                setCareConsent(event.target.checked);
                setConsentError("");
              }}
            />
            <span>I agree to store these health details and share them with the care team and matched doctor for this consultation.</span>
          </label>
          {consentError ? <p className="consent-error" role="alert">{consentError}</p> : null}
          <form className="composer" onSubmit={handleSend}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tell us about your symptoms, diagnosis, or condition"
              rows={2}
              aria-label="Your health concern"
            />
            <button type="submit" disabled={!input.trim()} aria-label="Send message">
              <span aria-hidden="true">↑</span>
            </button>
          </form>
          <p className="emergency-note">If this may be an emergency, go to the nearest hospital now.</p>
        </div>
      ) : null}
    </section>
  );
}

