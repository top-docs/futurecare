export type CompletionPaymentMode = "test" | "live" | "unconfigured";

export type CompletionState =
  | { kind: "paid"; paymentMode: CompletionPaymentMode }
  | { kind: "pending"; attempt: "failed" | "cancelled" | undefined }
  | { kind: "not-confirmed" };

export function getCompletionState(value: unknown): CompletionState {
  if (!value || typeof value !== "object") return { kind: "not-confirmed" };
  const result = value as Record<string, unknown>;
  if (result.status === "paid") {
    const paymentMode = result.paymentMode === "test" || result.paymentMode === "live"
      ? result.paymentMode
      : "unconfigured";
    return { kind: "paid", paymentMode };
  }
  if (result.status === "creating" || result.status === "created") {
    const attempt = result.lastAttemptResult === "failed" || result.lastAttemptResult === "cancelled"
      ? result.lastAttemptResult
      : undefined;
    return { kind: "pending", attempt };
  }
  return { kind: "not-confirmed" };
}
