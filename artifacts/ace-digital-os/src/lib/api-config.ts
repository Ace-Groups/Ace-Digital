import { setBaseUrl } from "@workspace/api-client-react";

/**
 * Configure the REST API client.
 *
 * Production Hosting rewrites `/api/**` to Cloud Run, so the SPA uses
 * same-origin requests unless `VITE_API_BASE_URL` is set.
 * Chat delivery uses Firestore listeners, not a long-lived API socket.
 */
function productionApiBase(): string | null {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  return base ? base.replace(/\/+$/, "") : null;
}

export function configureApiClient(): void {
  if (import.meta.env.DEV) {
    setBaseUrl(null);
    return;
  }
  setBaseUrl(productionApiBase());
}

/**
 * Resolve a relative API path to the same origin `configureApiClient` uses.
 */
export function resolveApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) return normalized;
  const base = productionApiBase();
  return base ? `${base}${normalized}` : normalized;
}
