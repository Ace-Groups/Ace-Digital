/** Unwrap legacy JSON envelopes if the API stored raw model JSON. */
export function formatAiDisplayText(content: string | null | undefined): string {
  const trimmed = content?.trim();
  if (!trimmed) return "";

  const candidates = [trimmed];
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as { text?: unknown };
      if (typeof parsed?.text === "string" && parsed.text.trim()) {
        return parsed.text.trim();
      }
    } catch {
      // not JSON
    }
  }

  return trimmed;
}
