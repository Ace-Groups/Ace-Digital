import { ensureFirebaseAdminApp } from "@workspace/db";
import { getFirestore } from "firebase-admin/firestore";
import { Resend } from "resend";

const LOGIN_URL = process.env.APP_LOGIN_URL ?? "https://ace-digital-os.web.app/login";
const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? "Ace-Digital <no-reply@acedigital.com>";
const MAIL_COLLECTION = process.env.FIREBASE_MAIL_COLLECTION ?? "mail";

const log = (msg: string, ...args: unknown[]) =>
  console.log(`[email] ${msg}`, ...args);
const warn = (msg: string, ...args: unknown[]) =>
  console.warn(`[email] ${msg}`, ...args);

function extractDomain(fromAddress: string): string {
  const match = fromAddress.match(/<(.+?)>/);
  if (!match) return fromAddress;
  return match[1].split("@")[1] ?? "";
}

export function validateEmailConfig(): void {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM;
  const domain = extractDomain(DEFAULT_FROM);

  if (!apiKey) {
    warn("RESEND_API_KEY is not set — emails will not be sent. Set it in Render Dashboard env vars.");
  } else {
    log(`RESEND_API_KEY configured (${apiKey.slice(0, 6)}...)`);
  }

  if (from) {
    log(`EMAIL_FROM = ${from}`);
  } else {
    log(`EMAIL_FROM not set, using default: ${DEFAULT_FROM}`);
  }

  if (!domain) {
    warn("Could not extract domain from from-address — verify EMAIL_FROM format is 'Name <email@domain.com>'");
  }
}

validateEmailConfig();

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
  const subject = isWelcome ? "Welcome to Ace Digital" : "Ace-Digital password reset";
  const intro = isWelcome
    ? "Your Ace-Digital account has been created and is ready to use."
    : "Your Ace-Digital password was reset by an administrator.";
  const greeting = isWelcome ? "Welcome aboard" : "Hi";

  const text = [
    `${greeting}, ${params.fullName}!`,
    "",
    intro,
    "",
    `Login: ${LOGIN_URL}`,
    `Email: ${params.email}`,
    `Temporary password: ${params.password}`,
    "",
    "You will be asked to set a new password on your next sign-in.",
    "",
    "— The Ace Digital Team",
  ].join("\n");

  // Build a login URL that includes the password as a query param so
  // the login page can auto-fill it (the login page reads ?pw= and
  // puts it on the clipboard).
  const loginWithPw = `${LOGIN_URL}?pw=${encodeURIComponent(params.password)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Main card -->
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.5);">

          <!-- Header gradient banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#052659 0%,#5483B3 50%,#7B61FF 100%);padding:44px 36px 36px;text-align:center;">
              <!-- Logo / Brand mark -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;text-align:center;vertical-align:middle;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-1px;">
                    AD
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                ${isWelcome ? "Welcome to Ace Digital" : "Password Reset"}
              </h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);font-weight:400;">
                ${isWelcome ? "Your workspace is ready" : "Your credentials have been updated"}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#111827;padding:36px;">
              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#f1f5f9;">
                ${escapeHtml(greeting)}, ${escapeHtml(params.fullName)}! ${isWelcome ? "👋" : "🔐"}
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#94a3b8;line-height:1.6;">
                ${escapeHtml(intro)}
              </p>

              <!-- Credentials card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#1e293b,#0f172a);border:1px solid rgba(84,131,179,0.25);border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 16px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#5483B3;">
                      Your Login Credentials
                    </p>

                    <!-- Email row -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                      <tr>
                        <td style="padding:12px 16px;background-color:rgba(255,255,255,0.04);border-radius:10px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Email</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#e2e8f0;">${escapeHtml(params.email)}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Password row -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:12px 16px;background-color:rgba(123,97,255,0.08);border:1px dashed rgba(123,97,255,0.3);border-radius:10px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:#7B61FF;">Temporary Password</p>
                          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:1px;font-family:'Courier New',monospace;">${escapeHtml(params.password)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="padding:12px 16px;background-color:rgba(245,158,11,0.08);border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;">
                    <p style="margin:0;font-size:13px;color:#fbbf24;line-height:1.5;">
                      ⚠️ You'll be asked to change your password after your first login. The button below copies it for you automatically.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${loginWithPw}" target="_blank" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#5483B3 0%,#7B61FF 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;box-shadow:0 8px 24px rgba(84,131,179,0.35);">
                      Login to Ace Digital →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternate link -->
              <p style="margin:24px 0 0;text-align:center;font-size:12px;color:#475569;line-height:1.5;">
                Or copy this link:
                <a href="${LOGIN_URL}" style="color:#5483B3;text-decoration:underline;word-break:break-all;">${LOGIN_URL}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0d1117;padding:24px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:#475569;">
                Sent by <strong style="color:#94a3b8;">Ace Digital</strong>
              </p>
              <p style="margin:0;font-size:11px;color:#334155;">
                This is an automated message. Please do not reply directly.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function sendViaResend(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    warn("RESEND_API_KEY not set — cannot send email via Resend");
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    log(`Sending "${subject}" to ${to} via Resend (from: ${DEFAULT_FROM})`);
    const { error, data } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      text,
      html,
    });
    if (error) {
      warn("Resend API returned an error:", error.message);
      if (error.message.toLowerCase().includes("domain")) {
        warn(
          `The domain "${extractDomain(DEFAULT_FROM)}" may not be verified in Resend. ` +
            "Go to https://resend.com/domains to verify it.",
        );
      }
      return false;
    }
    log(`Resend email sent — id: ${data?.id ?? "unknown"}`);
    return true;
  } catch (err) {
    warn("Resend send threw exception:", err);
    return false;
  }
}

/** Fallback: Firebase Extension "Trigger Email from Firestore" (mail collection). */
async function queueFirebaseMail(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<boolean> {
  if (process.env.USE_FIRESTORE !== "true") {
    warn("USE_FIRESTORE is not true — skipping Firestore mail queue fallback");
    return false;
  }

  try {
    ensureFirebaseAdminApp();
    const db = getFirestore();
    const ref = await db.collection(MAIL_COLLECTION).add({
      to: [to],
      from: DEFAULT_FROM,
      message: { subject, text, html },
    });
    log(`Queued Firestore mail doc ${ref.id} for ${to} (subject: "${subject}")`);
    return true;
  } catch (err) {
    warn("Failed to queue Firebase mail:", err);
    return false;
  }
}

export async function sendCredentialsEmail(params: CredentialsEmailParams): Promise<boolean> {
  const { subject, text, html } = buildCredentialsContent(params);

  if (await sendViaResend(params.to, subject, text, html)) {
    return true;
  }

  if (process.env.RESEND_API_KEY?.trim()) {
    warn(
      "Resend had an API key but failed — refusing to fall back to Firestore queue. " +
        "Check the Resend error above, or verify your domain in the Resend dashboard.",
    );
    return false;
  }

  log("Resend not configured, attempting Firestore mail queue fallback...");
  const queued = await queueFirebaseMail(params.to, subject, text, html);
  if (!queued) {
    warn(
      "No RESEND_API_KEY and Firestore mail queue also failed. " +
        "Set RESEND_API_KEY (recommended) in Render env vars, or install the firestore-send-email extension on Firebase.",
    );
  }
  return queued;
}

/** @deprecated Use sendCredentialsEmail */
export async function sendWelcomeEmail(
  params: Omit<CredentialsEmailParams, "kind">,
): Promise<boolean> {
  return sendCredentialsEmail({ ...params, kind: "welcome" });
}
