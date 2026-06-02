import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const LOGIN_URL = process.env.APP_LOGIN_URL ?? "https://ace-digital-os.web.app/login";
const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? "Ace-Digital <noreply@ace-digital-os.web.app>";
const MAIL_COLLECTION = process.env.FIREBASE_MAIL_COLLECTION ?? "mail";

export type CredentialsEmailParams = {
  to: string;
  fullName: string;
  email: string;
  password: string;
  kind: "welcome" | "password_reset";
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCredentialsContent(params: CredentialsEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const isWelcome = params.kind === "welcome";
  const subject = isWelcome ? "Welcome to Ace-Digital" : "Ace-Digital password reset";
  const intro = isWelcome
    ? "Your Ace-Digital account has been created."
    : "Your Ace-Digital password was reset by an administrator.";

  const text = [
    `Hi ${params.fullName},`,
    "",
    intro,
    "",
    `Login: ${LOGIN_URL}`,
    `Email: ${params.email}`,
    `Temporary password: ${params.password}`,
    "",
    "You will be asked to set a new password on your next sign-in.",
    "",
    "— Ace-Digital",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
      <h2 style="color:#052659">${isWelcome ? "Welcome to Ace-Digital" : "Password reset"}</h2>
      <p>Hi ${escapeHtml(params.fullName)},</p>
      <p>${escapeHtml(intro)}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#64748b">Login URL</td><td><a href="${LOGIN_URL}">${LOGIN_URL}</a></td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Email</td><td><strong>${escapeHtml(params.email)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Password</td><td><strong>${escapeHtml(params.password)}</strong></td></tr>
      </table>
      <p style="color:#64748b;font-size:14px">You must change your password after signing in.</p>
    </div>
  `;

  return { subject, text, html };
}

/** Queue email via Firebase Extension "Trigger Email from Firestore" (mail collection). */
async function queueFirebaseMail(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<boolean> {
  if (process.env.USE_FIRESTORE !== "true") {
    console.warn("[email] USE_FIRESTORE is not true; cannot queue Firebase mail");
    return false;
  }

  try {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    await db.collection(MAIL_COLLECTION).add({
      to: [to],
      from: DEFAULT_FROM,
      message: { subject, text, html },
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to queue Firebase mail:", err);
    return false;
  }
}

export async function sendCredentialsEmail(params: CredentialsEmailParams): Promise<boolean> {
  const { subject, text, html } = buildCredentialsContent(params);
  return queueFirebaseMail(params.to, subject, text, html);
}

/** @deprecated Use sendCredentialsEmail */
export async function sendWelcomeEmail(
  params: Omit<CredentialsEmailParams, "kind">,
): Promise<boolean> {
  return sendCredentialsEmail({ ...params, kind: "welcome" });
}
