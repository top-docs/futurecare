const SOURCE_STORAGE_KEY = "topdocs.source.v1";

type SourceStorage = Pick<Storage, "getItem" | "setItem">;

export const TRAFFIC_SOURCES = [
  "direct",
  "instagram",
  "whatsapp",
  "twitter",
  "google",
  "facebook",
  "linkedin",
  "referral",
  "other",
] as const;

export type TrafficSource = typeof TRAFFIC_SOURCES[number];

const trafficSourceSet = new Set<string>(TRAFFIC_SOURCES);

export function sanitizeTrafficSource(
  value: string | null | undefined,
): TrafficSource {
  const source = value?.trim().toLowerCase();
  if (!source) return "direct";
  if (source === "x" || source === "x.com" || source === "twitter.com") return "twitter";
  if (source === "wa" || source === "wa.me") return "whatsapp";
  return trafficSourceSet.has(source) ? source as TrafficSource : "other";
}

export function getTrafficSource(search: string, referrer: string): TrafficSource {
  const source = new URLSearchParams(search).get("utm_source");
  if (source) return sanitizeTrafficSource(source);
  if (referrer) {
    try {
      const hostname = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
      if (hostname === "x.com" || hostname.endsWith(".twitter.com")) return "twitter";
      if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) return "instagram";
      if (hostname === "wa.me" || hostname.endsWith(".whatsapp.com")) return "whatsapp";
      if (hostname.endsWith(".google.com") || hostname === "google.com" || hostname.endsWith(".google.co.in")) return "google";
      if (hostname === "facebook.com" || hostname.endsWith(".facebook.com")) return "facebook";
      if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) return "linkedin";
      return hostname ? "referral" : "direct";
    }
    catch { return "direct"; }
  }
  return "direct";
}

export function readSavedTrafficSource(storage: Pick<SourceStorage, "getItem">) {
  return sanitizeTrafficSource(storage.getItem(SOURCE_STORAGE_KEY));
}

export function saveTrafficSource(storage: Pick<SourceStorage, "setItem">, source: string) {
  const safeSource = sanitizeTrafficSource(source);
  storage.setItem(SOURCE_STORAGE_KEY, safeSource);
  return safeSource;
}

export function captureFirstTouchSource(
  storage: SourceStorage,
  source: string,
): TrafficSource {
  const existing = storage.getItem(SOURCE_STORAGE_KEY);
  if (existing && trafficSourceSet.has(existing)) return existing as TrafficSource;
  return saveTrafficSource(storage, source);
}
