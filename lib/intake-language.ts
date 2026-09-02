export type IntakeLanguage = "en" | "hi" | "hinglish";

export function detectIntakeLanguage(text: string): IntakeLanguage {
  if (/\p{Script=Devanagari}/u.test(text)) return "hi";
  if (/\b(?:kya|kaise|kab|kitna|dard|saans|dawai|paise|nahi|hai|hain|karna|chahiye)\b/i.test(text)) return "hinglish";
  return "en";
}
