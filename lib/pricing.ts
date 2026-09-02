export const INTRODUCTORY_PRICE_END = new Date("2026-09-05T18:30:00.000Z");

export function getConsultationPrice(now = new Date()) {
  return now < INTRODUCTORY_PRICE_END
    ? { amountPaise: 80_000, amountRupees: 800, label: "Introductory price" }
    : { amountPaise: 150_000, amountRupees: 1_500, label: "Standard consultation price" };
}
