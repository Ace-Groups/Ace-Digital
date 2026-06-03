const DEV_FALLBACK = "ace-digital-dev-only-not-for-production";

export interface AuthPayload {
  userId: number;
  role: string;
  teamId: number | null;
}

export function getJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (fromEnv && fromEnv.length >= 32) {
    return fromEnv;
  }

  if (isProduction) {
    throw new Error(
      "JWT_SECRET must be set to a random string of at least 32 characters in production.",
    );
  }

  return fromEnv && fromEnv.length > 0 ? fromEnv : DEV_FALLBACK;
}
