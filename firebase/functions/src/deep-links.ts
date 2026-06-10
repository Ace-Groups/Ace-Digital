const DEFAULT_APP_ORIGIN = "https://ace-digital-os.web.app";

/** Public app origin for absolute push deep links (set APP_ORIGIN in functions config). */
export function getAppOrigin(): string {
  const origin =
    process.env.APP_ORIGIN?.trim() ||
    process.env.VITE_APP_ORIGIN?.trim() ||
    DEFAULT_APP_ORIGIN;
  return origin.replace(/\/$/, "");
}

/**
 * Converts in-app relative paths (e.g. `/channels?channel=3`) to absolute URLs
 * opened by FCM webpush, Expo, and notification click handlers.
 */
export function toAbsoluteDeepLink(link: string | null | undefined): string {
  const origin = getAppOrigin();
  if (!link?.trim()) return origin;
  const trimmed = link.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `${origin}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export type PushPayload = {
  userId: number;
  title: string;
  body: string;
  link?: string | null;
};

export function buildPushData(payload: PushPayload): Record<string, string> {
  const url = toAbsoluteDeepLink(payload.link);
  return {
    link: url,
    url,
    userId: String(payload.userId),
    title: payload.title,
    body: payload.body,
  };
}
