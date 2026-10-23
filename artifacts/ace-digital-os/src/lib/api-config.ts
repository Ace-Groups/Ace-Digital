import { setBaseUrl } from "@workspace/api-client-react";

/**
 * Configure the REST API client.
 *
 * Production Hosting rewrites `/api/**` to Cloud Run, so the SPA uses
 * same-origin requests unless `VITE_API_BASE_URL` is set.
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

/**
 * Socket.IO connects to the same host as the page when Hosting rewrites
 * `/socket.io/**` to Cloud Run. Set `VITE_SOCKET_URL` only if that upgrade
 * fails and chat must dial the `*.run.app` URL directly.
 */
export function resolveSocketUrl(): string {
  const override = import.meta.env.VITE_SOCKET_URL?.trim();
  if (override) return override.replace(/\/+$/, "");

  const apiBase = productionApiBase();
  if (apiBase) return apiBase;

  return window.location.origin;
}
