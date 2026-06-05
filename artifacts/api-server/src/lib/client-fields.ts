export type ClientCustomField = { key: string; value: string };

const MAX_CUSTOM_FIELDS = 20;
const MAX_KEY_LEN = 80;
const MAX_VALUE_LEN = 500;

export function sanitizeCustomFields(raw: unknown): ClientCustomField[] | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (!Array.isArray(raw)) return null;
  const out: ClientCustomField[] = [];
  for (const item of raw.slice(0, MAX_CUSTOM_FIELDS)) {
    if (!item || typeof item !== "object") continue;
    const key = String((item as { key?: unknown }).key ?? "").trim();
    const value = String((item as { value?: unknown }).value ?? "").trim();
    if (!key) continue;
    out.push({
      key: key.slice(0, MAX_KEY_LEN),
      value: value.slice(0, MAX_VALUE_LEN),
    });
  }
  return out;
}
