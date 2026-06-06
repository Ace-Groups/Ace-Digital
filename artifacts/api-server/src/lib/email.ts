import { ensureFirebaseAdminApp } from "@workspace/db";
import { getFirestore } from "firebase-admin/firestore";
import { Resend } from "resend";

const LOGIN_URL = process.env.APP_LOGIN_URL ?? "https://ace-digital-os.web.app/login";
const APP_URL = process.env.APP_URL ?? "https://ace-digital-os.web.app";
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

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type EmailContent = { subject: string; text: string; html: string };

// ---------------------------------------------------------------------------
// Shared email shell — all emails use this outer wrapper
// ---------------------------------------------------------------------------

function emailShell(opts: {
  title: string;
  headerIcon: string;
  headline: string;
  subtitle: string;
  bodyHtml: string;
  footerExtra?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.5);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#052659 0%,#5483B3 50%,#7B61FF 100%);padding:44px 36px 36px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;text-align:center;vertical-align:middle;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-1px;">
                    ${opts.headerIcon}
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                ${escapeHtml(opts.headline)}
              </h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);font-weight:400;">
                ${escapeHtml(opts.subtitle)}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#111827;padding:36px;">
              ${opts.bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0d1117;padding:24px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              ${opts.footerExtra ?? ""}
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
}

/** Reusable CTA button */
function ctaButton(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
  <tr>
    <td align="center">
      <a href="${href}" target="_blank" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#5483B3 0%,#7B61FF 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;box-shadow:0 8px 24px rgba(84,131,179,0.35);">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Email #1: Personal Welcome Letter from Kavin Balaji
// ---------------------------------------------------------------------------

function buildWelcomeLetterContent(fullName: string): EmailContent {
  const subject = `Welcome to Ace Digital, ${fullName}!`;

  const text = [
    `Dear ${fullName},`,
    "",
    "Welcome to the Ace Digital family! 🎉",
    "",
    "I'm personally thrilled to have you on board. At Ace Digital, we believe that",
    "great things happen when talented people come together with a shared vision.",
    "You are now part of a team that values innovation, collaboration, and excellence.",
    "",
    "We've built Ace Digital OS to be your all-in-one workspace — a place where you",
    "can manage projects, collaborate with your team, track your progress, and grow",
    "together. I'm confident you'll find it both powerful and intuitive.",
    "",
    "As you settle in, don't hesitate to reach out to your team or use the in-app",
    "chat to connect. We're all here to support you.",
    "",
    "Once again, welcome aboard! I look forward to the amazing work we'll accomplish together.",
    "",
    "Warm regards,",
    "Kavin Balaji",
    "Managing Director, Ace Digital",
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#f1f5f9;">
      Dear ${escapeHtml(fullName)}, 🎉
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.7;">
      Welcome to the Ace Digital family! I'm personally thrilled to have you on board.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.7;">
      At Ace Digital, we believe that great things happen when talented people come
      together with a shared vision. You are now part of a team that values
      <strong style="color:#e2e8f0;">innovation</strong>,
      <strong style="color:#e2e8f0;">collaboration</strong>, and
      <strong style="color:#e2e8f0;">excellence</strong>.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.7;">
      We've built <strong style="color:#5483B3;">Ace Digital OS</strong> to be your
      all-in-one workspace — a place where you can manage projects, collaborate
      with your team, track your progress, and grow together. I'm confident you'll
      find it both powerful and intuitive.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.7;">
      As you settle in, don't hesitate to reach out to your team or use the in-app
      chat to connect. We're all here to support you.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.7;">
      Once again, <strong style="color:#e2e8f0;">welcome aboard!</strong> I look forward to
      the amazing work we'll accomplish together.
    </p>

    <!-- Signature -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;margin-top:8px;">
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:14px;color:#94a3b8;">Warm regards,</p>
          <p style="margin:0 0 2px;font-size:18px;font-weight:700;color:#f1f5f9;">Kavin Balaji</p>
          <p style="margin:0;font-size:13px;color:#5483B3;font-weight:500;">Managing Director, Ace Digital</p>
        </td>
      </tr>
    </table>`;

  const html = emailShell({
    title: subject,
    headerIcon: "🎉",
    headline: "Welcome to Ace Digital",
    subtitle: "We're thrilled to have you on board",
    bodyHtml,
  });

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Email #2: App Guide — How to Use Ace Digital
// ---------------------------------------------------------------------------

type FeatureItem = { icon: string; title: string; desc: string };

const APP_FEATURES: FeatureItem[] = [
  { icon: "📊", title: "Dashboard", desc: "Get a real-time overview of your projects, tasks, and team activity at a glance." },
  { icon: "📋", title: "Projects & Tasks", desc: "Create, assign, and track work across your team with powerful Kanban boards." },
  { icon: "💬", title: "Team Chat", desc: "Real-time messaging with channels, threads, and file sharing for seamless collaboration." },
  { icon: "💰", title: "Finance", desc: "View salary records, expense tracking, and manage payroll with ease." },
  { icon: "🎫", title: "Service Desk", desc: "Submit and track IT, HR, and support tickets with built-in SLA tracking." },
  { icon: "📅", title: "Calendar", desc: "Schedule meetings, track deadlines, and manage your time effectively." },
];

function buildFeatureCard(f: FeatureItem): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
  <tr>
    <td style="padding:16px;background-color:rgba(255,255,255,0.03);border:1px solid rgba(84,131,179,0.12);border-radius:12px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:40px;height:40px;background:rgba(84,131,179,0.12);border-radius:10px;text-align:center;vertical-align:middle;font-size:20px;" valign="middle">
            ${f.icon}
          </td>
          <td style="padding-left:14px;" valign="middle">
            <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#e2e8f0;">${escapeHtml(f.title)}</p>
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.4;">${escapeHtml(f.desc)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function buildAppGuideContent(fullName: string): EmailContent {
  const subject = "Getting Started with Ace Digital";

  const text = [
    `Hi ${fullName},`,
    "",
    "Here's a quick tour of everything you can do with Ace Digital OS:",
    "",
    ...APP_FEATURES.map((f) => `• ${f.title}: ${f.desc}`),
    "",
    `Explore now: ${APP_URL}`,
    "",
    "Pro tip: Install Ace Digital as a PWA from your browser for the best mobile experience!",
    "",
    "— The Ace Digital Team",
  ].join("\n");

  const featureCards = APP_FEATURES.map(buildFeatureCard).join("");

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#f1f5f9;">
      Hi ${escapeHtml(fullName)}! 🚀
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
      Here's a quick tour of everything you can do with
      <strong style="color:#5483B3;">Ace Digital OS</strong> — your all-in-one workspace.
    </p>

    <!-- Section label -->
    <p style="margin:0 0 14px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#5483B3;">
      Key Features
    </p>

    ${featureCards}

    <!-- Pro tip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="padding:14px 16px;background-color:rgba(16,185,129,0.08);border-left:3px solid #10B981;border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:13px;color:#34d399;line-height:1.5;">
            💡 <strong>Pro tip:</strong> Install Ace Digital as a PWA from your browser menu for the best mobile experience — it works offline too!
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton(APP_URL, "Explore Ace Digital →")}

    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#475569;">
      You'll receive your login credentials in a separate email.
    </p>`;

  const html = emailShell({
    title: subject,
    headerIcon: "🚀",
    headline: "Getting Started",
    subtitle: "Your guide to Ace Digital OS",
    bodyHtml,
  });

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Email #3: Login Credentials (also used standalone for password resets)
// ---------------------------------------------------------------------------

export type CredentialsEmailParams = {
  to: string;
  fullName: string;
  email: string;
  password: string;
  kind: "welcome" | "password_reset";
};

function buildCredentialsContent(params: CredentialsEmailParams): EmailContent {
  const isWelcome = params.kind === "welcome";
  const subject = isWelcome ? "Your Ace Digital Login" : "Ace-Digital password reset";
  const intro = isWelcome
    ? "Your account is ready. Here are your login credentials."
    : "Your Ace-Digital password was reset by an administrator.";
  const greeting = isWelcome ? "Almost there" : "Hi";

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

  const loginWithPw = `${LOGIN_URL}?pw=${encodeURIComponent(params.password)}`;

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#f1f5f9;">
      ${escapeHtml(greeting)}, ${escapeHtml(params.fullName)}! ${isWelcome ? "🔑" : "🔐"}
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
                <p style="margin:0 0 4px;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:#7B61FF;">${isWelcome ? "Your Password" : "Temporary Password"}</p>
                <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:1px;font-family:'Courier New',monospace;">${escapeHtml(params.password)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="padding:12px 16px;background-color:rgba(245,158,11,0.08);border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:13px;color:#fbbf24;line-height:1.5;">
            ⚠️ You'll be asked to change your password after your first login. The button below copies it for you automatically.
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton(loginWithPw, "Login to Ace Digital →")}

    <p style="margin:24px 0 0;text-align:center;font-size:12px;color:#475569;line-height:1.5;">
      Or copy this link:
      <a href="${LOGIN_URL}" style="color:#5483B3;text-decoration:underline;word-break:break-all;">${LOGIN_URL}</a>
    </p>`;

  const html = emailShell({
    title: subject,
    headerIcon: isWelcome ? "🔑" : "🔐",
    headline: isWelcome ? "Your Login Credentials" : "Password Reset",
    subtitle: isWelcome
      ? "Everything you need to get started"
      : "Your credentials have been updated",
    bodyHtml,
  });

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Send helpers
// ---------------------------------------------------------------------------

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

/** Generic send: tries Resend first, falls back to Firestore queue. */
async function sendEmail(
  to: string,
  content: EmailContent,
): Promise<boolean> {
  if (await sendViaResend(to, content.subject, content.text, content.html)) {
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
  const queued = await queueFirebaseMail(to, content.subject, content.text, content.html);
  if (!queued) {
    warn(
      "No RESEND_API_KEY and Firestore mail queue also failed. " +
        "Set RESEND_API_KEY (recommended) in Render env vars, or install the firestore-send-email extension on Firebase.",
    );
  }
  return queued;
}

/** Small delay helper for email ordering in inbox. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send the full 3-email onboarding sequence for a newly created employee.
 * Emails are sent with small delays to ensure correct inbox ordering.
 */
export async function sendOnboardingSequence(params: {
  to: string;
  fullName: string;
  email: string;
  password: string;
}): Promise<{ welcomeSent: boolean; guideSent: boolean; credentialsSent: boolean }> {
  log(`Starting onboarding sequence for ${params.to}`);

  // Email #1: Personal welcome from Kavin Balaji
  const welcome = buildWelcomeLetterContent(params.fullName);
  const welcomeSent = await sendEmail(params.to, welcome);

  await delay(600);

  // Email #2: App guide
  const guide = buildAppGuideContent(params.fullName);
  const guideSent = await sendEmail(params.to, guide);

  await delay(600);

  // Email #3: Login credentials
  const creds = buildCredentialsContent({
    to: params.to,
    fullName: params.fullName,
    email: params.email,
    password: params.password,
    kind: "welcome",
  });
  const credentialsSent = await sendEmail(params.to, creds);

  log(
    `Onboarding sequence complete for ${params.to}: ` +
      `welcome=${welcomeSent}, guide=${guideSent}, credentials=${credentialsSent}`,
  );

  return { welcomeSent, guideSent, credentialsSent };
}

/** Send a single credentials email (used for password resets). */
export async function sendCredentialsEmail(params: CredentialsEmailParams): Promise<boolean> {
  const content = buildCredentialsContent(params);
  return sendEmail(params.to, content);
}

/** @deprecated Use sendCredentialsEmail or sendOnboardingSequence */
export async function sendWelcomeEmail(
  params: Omit<CredentialsEmailParams, "kind">,
): Promise<boolean> {
  return sendCredentialsEmail({ ...params, kind: "welcome" });
}
