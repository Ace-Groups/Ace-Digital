const SESSION_USER_KEY = "ace_session_user";

export type SessionUser = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  teamId: number | null;
  teamName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: string;
  mustChangePassword: boolean;
};

export function readSessionUser(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionUser(user: SessionUser): void {
  try {
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } catch {
    // sessionStorage may be unavailable in private mode
  }
}

export function clearSessionUser(): void {
  try {
    sessionStorage.removeItem(SESSION_USER_KEY);
  } catch {
    // ignore
  }
}
