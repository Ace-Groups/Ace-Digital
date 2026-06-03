/** Explicit production WebSocket URL (wss://...). */
export function getRealtimeWsUrl(): string | null {
  const env = import.meta.env.VITE_REALTIME_WS_URL?.trim();
  return env || null;
}

/** Dev default: Vite proxies /ws → api-server. */
export function resolveRealtimeWsUrl(): string {
  const configured = getRealtimeWsUrl();
  if (configured) return configured;

  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }

  return "";
}

export function isRealtimeConfigured(): boolean {
  return Boolean(getRealtimeWsUrl() || import.meta.env.DEV);
}
