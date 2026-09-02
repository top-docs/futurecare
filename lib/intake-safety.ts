import { detectIntakeLanguage } from "./intake-language.ts";

export const UNCLEAR_RETRY =
  "I couldn’t understand that. Please describe the symptom, diagnosis, or treatment question in a little more detail.";

export const EMERGENCY_STOP =
  "This may need urgent medical attention. Please go to the nearest hospital now or contact local emergency services. Do not wait for an online consultation.";

export function emergencyStopFor(text: string) {
  const language = detectIntakeLanguage(text);
  if (language === "hi") return "इस स्थिति में तुरंत चिकित्सा सहायता की जरूरत हो सकती है। अभी नजदीकी अस्पताल जाएं या स्थानीय आपातकालीन सेवा से संपर्क करें। ऑनलाइन परामर्श का इंतजार न करें।";
  if (language === "hinglish") return "Is situation mein turant medical help ki zarurat ho sakti hai. Abhi nearest hospital jaiye ya local emergency service se contact kijiye. Online consultation ka wait na karein.";
  return EMERGENCY_STOP;
}

export type IntakeAssessment =
  | { kind: "processable" }
  | { kind: "unclear"; message: typeof UNCLEAR_RETRY }
  | { kind: "possible-emergency"; message: string };

const EMERGENCY_PATTERNS = [
  /\bsevere chest pain\b/,
  /\bdifficulty breathing\b/,
  /\bstruggling to breathe\b/,
  /\b(?:can(?:not|'t)|unable to) breathe\b/,
  /\bunconscious\b/,
  /\bnot waking up\b/,
  /\bheavy bleeding\b/,
  /\buncontrollable bleeding\b/,
  /\b(?:is |might be )?having (?:a )?(?:stroke|heart attack)\b/,
  /\bsymptoms of (?:a )?(?:stroke|heart attack)\b/,
  /(?:सीने में तेज दर्द|सांस नहीं आ रही|साँस नहीं आ रही|बेहोश|बहुत खून बह रहा)/,
  /(?:saans nahi aa rahi|seene mein tez dard|behosh|bahut khoon)/,
];

const NONSENSE_PATTERNS = [
  /^(?:asdf|asdfgh|qwerty|qwertyuiop)(?:\s+(?:asdf|asdfgh|qwerty|qwertyuiop))*$/,
  /^(.)\1{3,}$/,
];

export function assessIntakeMessage(raw: string): IntakeAssessment {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");

  if (EMERGENCY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { kind: "possible-emergency", message: emergencyStopFor(raw) };
  }

  const hasLettersOrNumbers = /[\p{L}\p{N}]/u.test(normalized);
  if (
    !hasLettersOrNumbers ||
    NONSENSE_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return { kind: "unclear", message: UNCLEAR_RETRY };
  }

  return { kind: "processable" };
}
