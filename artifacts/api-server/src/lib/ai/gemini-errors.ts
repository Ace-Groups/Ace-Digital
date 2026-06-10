/** Map raw Gemini SDK / API errors to safe user-facing copy (never leak URLs or internals). */

export function isGeminiQuotaExhausted(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /429|RESOURCE_EXHAUSTED|Too Many Requests/i.test(msg) &&
    /prepayment credits are depleted|quota|rate limit/i.test(msg)
  );
}

export function isGeminiRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (isGeminiQuotaExhausted(err)) return false;
  return /429|503|502|504|UNAVAILABLE|temporarily unavailable/i.test(msg);
}

export function formatGeminiErrorForUser(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (/prepayment credits are depleted/i.test(msg)) {
    return (
      "Ace AI is paused because the Google AI billing balance for this workspace is empty. " +
      "An administrator needs to add prepaid credits in Google AI Studio (Billing → Buy credits), " +
      "or attach a valid API key with available quota."
    );
  }
  if (/429|RESOURCE_EXHAUSTED|Too Many Requests/i.test(msg)) {
    return "Ace AI is receiving too many requests right now. Please wait a minute and try again.";
  }
  if (/401|403|API key not valid|PERMISSION_DENIED/i.test(msg)) {
    return "Ace AI is misconfigured (invalid API key). Contact your administrator.";
  }
  if (/404|not found|is not found for API version/i.test(msg)) {
    return "Ace AI model is unavailable. Contact your administrator to update GEMINI_MODEL.";
  }

  return "Ace AI could not complete your request. Please try again in a moment.";
}

export function formatGeminiErrorForLog(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
