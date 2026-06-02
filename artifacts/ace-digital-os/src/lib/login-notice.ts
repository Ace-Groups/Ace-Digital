const STORAGE_KEY = "ace-login-notice";

export type LoginNotice = {
  type: "password-updated";
  email?: string;
};

export function setLoginNotice(notice: LoginNotice): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notice));
}

export function consumeLoginNotice(): LoginNotice | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as LoginNotice;
  } catch {
    return null;
  }
}
