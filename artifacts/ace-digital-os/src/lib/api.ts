export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function getAuthToken(): string | null {
  return localStorage.getItem("ace_token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("ace_token", token);
}

export function clearAuthToken(): void {
  localStorage.removeItem("ace_token");
}

export function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
