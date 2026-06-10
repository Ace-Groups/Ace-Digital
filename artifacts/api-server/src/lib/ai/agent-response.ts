import type { AiMessageMetadata } from "./types";

function unwrapJsonPayload(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced?.[1]) return fenced[1].trim();

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  return text;
}

function jsonCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const candidates = new Set<string>([trimmed, unwrapJsonPayload(trimmed)]);

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = trimmed.slice(firstBrace, lastBrace + 1);
    candidates.add(slice);
    candidates.add(unwrapJsonPayload(slice));
  }

  return [...candidates];
}

/** Normalize model output — unwrap JSON envelopes and code fences. */
export function parseAgentModelResponse(responseText: string): {
  text: string;
  metadata: AiMessageMetadata | null;
} {
  const trimmed = responseText.trim();
  if (!trimmed) return { text: "", metadata: null };

  for (const candidate of jsonCandidates(trimmed)) {
    try {
      const parsed = JSON.parse(candidate) as {
        text?: unknown;
        table?: AiMessageMetadata["tableData"];
      };
      if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
        let metadata: AiMessageMetadata | null = null;
        if (parsed.table?.columns?.length && parsed.table.rows) {
          metadata = { layout: "table", tableData: parsed.table };
        }
        const text = parsed.text.trim();
        return { text: text || trimmed, metadata };
      }
    } catch {
      // try next candidate
    }
  }

  return { text: trimmed, metadata: null };
}
