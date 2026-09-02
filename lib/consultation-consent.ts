export const EMPTY_INPUT_ERROR = "Enter your health concern before sending.";

export const CARE_CONSENT_ERROR =
  "Accept the care and privacy notice before sharing health details.";

export type MessageSubmissionValidation =
  | { ok: true; text: string }
  | { ok: false; field: "input" | "careConsent"; message: string };

export function validateMessageSubmission(
  input: string,
  careConsent: boolean,
): MessageSubmissionValidation {
  const text = input.trim();

  if (!text) {
    return { ok: false, field: "input", message: EMPTY_INPUT_ERROR };
  }

  if (!careConsent) {
    return {
      ok: false,
      field: "careConsent",
      message: CARE_CONSENT_ERROR,
    };
  }

  return { ok: true, text };
}
