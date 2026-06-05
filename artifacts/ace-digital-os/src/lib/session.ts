export const LAST_ACTIVITY_KEY = "ace_last_activity";
export const INACTIVITY_LIMIT_MS = 60 * 24 * 60 * 60 * 1000;
const REFRESH_BEFORE_EXPIRY_MS = 6 * 24 * 60 * 60 * 1000;

export function getLastActivity(): number | null {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : null;
}

export function setLastActivity(ts: number = Date.now()): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
}

export function clearLastActivity(): void {
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function isSessionExpired(): boolean {
  const last = getLastActivity();
  if (last === null) return false;
  return Date.now() - last > INACTIVITY_LIMIT_MS;
}

export function getTokenExpiryMs(token: string): number | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const payload = JSON.parse(atob(segment.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export function shouldRefreshToken(token: string): boolean {
  const exp = getTokenExpiryMs(token);
  if (exp === null) return false;
  return exp - Date.now() < REFRESH_BEFORE_EXPIRY_MS;
}
