import { setBaseUrl } from "@workspace/api-client-react";

/**
 * The Render server — only used for WebSocket (Socket.IO).
 * Firebase Gen 1 Cloud Functions cannot handle WebSocket upgrades,
 * so real-time chat must connect directly to Render.
 */
const RENDER_WS_BASE = "https://ace-digital-api.onrender.com";

/**
 * Configure the REST API client.
 *
 * On Firebase Hosting the `firebase.json` rewrite sends `/api/**` to the
 * Cloud Function, so REST calls use same-origin (no base URL needed).
 *
 * When `VITE_API_BASE_URL` is set explicitly (e.g. the `build:web:render`
 * script), all REST traffic goes there instead (Render).
 */
export function configureApiClient(): void {
  // Dev: always same-origin `/api` → Vite proxy → Render (avoids CORS on localhost:517x).
  if (import.meta.env.DEV) {
    setBaseUrl(null);
    return;
  }
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (base) {
    setBaseUrl(base.replace(/\/+$/, ""));
  }
}

/**
 * Resolve the URL that Socket.IO should connect to.
 * Always targets the Render server because Firebase Functions
 * (Gen 1 HTTPS) do not support WebSocket upgrades.
 */
export function resolveSocketUrl(): string {
  const override = import.meta.env.VITE_SOCKET_URL?.trim();
  if (override) return override.replace(/\/+$/, "");

  // In production, always use the Render server for WebSocket
  if (import.meta.env.PROD) return RENDER_WS_BASE;

  // Dev mode → same-origin (Vite proxies /socket.io to local API)
  return window.location.origin;
}

