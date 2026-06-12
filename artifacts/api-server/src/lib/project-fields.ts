import { sanitizeCustomFields } from "./client-fields";

export { sanitizeCustomFields as sanitizeProjectCustomFields };

export function normalizeGithubUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (!url.hostname.includes("github.com")) return null;
  return url.toString();
}
