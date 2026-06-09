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
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4ECD8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4ECD8;min-height:100vh;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);border:1px solid #DFD0BC;background-color:#FAF6F0;">

          <!-- Top Accent Bar -->
          <tr>
            <td height="4" style="height:4px;background:#4B4ED3;padding:0;"></td>
          </tr>

          <!-- Header / Welcome Banner Area -->
          <tr>
            <td style="background-color:#FAF6F0;padding:0;position:relative;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Decorative Left Beige Circle -->
                  <td width="80" valign="top" align="left" style="padding:0;margin:0;">
                    <div style="width:100px;height:100px;background-color:#EADDC9;border-radius:50%;margin-top:-40px;margin-left:-30px;"></div>
                  </td>
                  
                  <!-- Center Branding -->
                  <td align="center" valign="middle" style="padding:40px 0 20px;">
                    <img src="https://ace-digital-os.web.app/ace-logo.png" alt="Ace Digital Logo" height="32" style="display:inline-block;height:32px;width:auto;" />
                  </td>

                  <!-- Decorative Right Blue Accent -->
                  <td width="80" valign="top" align="right" style="padding:0;margin:0;text-align:right;">
                    <div style="width:120px;height:60px;background-color:#8C8EF2;border-radius:0 0 0 60px;margin-top:0;margin-right:0;opacity:0.8;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Headline & CTA -->
          <tr>
            <td style="background-color:#FAF6F0;padding:0 36px 30px;text-align:center;">
              <h1 style="margin:0 0 10px;font-family:Georgia,serif;font-size:32px;font-weight:700;color:#1A1A1A;letter-spacing:-0.5px;">
                ${escapeHtml(opts.headline)}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#5C554E;font-weight:400;font-family:Georgia,serif;font-style:italic;">
                ${escapeHtml(opts.subtitle)}
              </p>
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" bgcolor="#4B4ED3" style="border-radius:24px;">
                    <a href="${APP_URL}" target="_blank" style="display:inline-block;padding:12px 36px;background-color:#4B4ED3;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:24px;letter-spacing:0.5px;">
                      Explore more
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Area (Darker Cream Background transition) -->
          <tr>
            <td style="background-color:#EADDC9;padding:40px 36px;border-bottom:1px solid #DFD0BC;">
              ${opts.bodyHtml}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color:#EADDC9;padding:0 36px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #DFD0BC;padding-top:30px;">
                <tr>
                  <!-- Left Column: Follow Us -->
                  <td width="50%" valign="top" style="padding-right:20px;">
                    <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1A1A1A;text-transform:uppercase;letter-spacing:0.5px;">Follow us:</h3>
                    <p style="margin:0 0 16px;font-size:13px;color:#5C554E;line-height:1.5;">
                      Stay updated with the latest from the team on our social channels.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;">
                          <a href="https://facebook.com" target="_blank"><img src="https://img.icons8.com/ios-filled/32/2C2B2A/facebook-new.png" width="24" height="24" style="display:block;" alt="Facebook" /></a>
                        </td>
                        <td style="padding-right:12px;">
                          <a href="https://x.com" target="_blank"><img src="https://img.icons8.com/ios-filled/32/2C2B2A/twitterx.png" width="24" height="24" style="display:block;" alt="X" /></a>
                        </td>
                        <td style="padding-right:12px;">
                          <a href="https://instagram.com" target="_blank"><img src="https://img.icons8.com/ios-filled/32/2C2B2A/instagram-new.png" width="24" height="24" style="display:block;" alt="Instagram" /></a>
                        </td>
                        <td>
                          <a href="https://linkedin.com" target="_blank"><img src="https://img.icons8.com/ios-filled/32/2C2B2A/linkedin.png" width="24" height="24" style="display:block;" alt="LinkedIn" /></a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Right Column: Contact Us -->
                  <td width="50%" valign="top" style="padding-left:20px;">
                    <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1A1A1A;text-transform:uppercase;letter-spacing:0.5px;">Contact us</h3>
                    <p style="margin:0 0 6px;font-size:13px;color:#5C554E;line-height:1.5;">
                      Feel free to get in touch with our HR team:
                    </p>
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1A1A1A;">
                      <a href="mailto:hr@mybexo.com" style="color:#1A1A1A;text-decoration:none;">hr@mybexo.com</a>
                    </p>
                    <p style="margin:0 0 4px;font-size:13px;color:#5C554E;">
                      +91 90871 72072
                    </p>
                    <p style="margin:0;font-size:13px;color:#5C554E;">
                      Coimbatore, Tamil Nadu
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer Bottom -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:35px;border-top:1px solid #DFD0BC;padding-top:20px;text-align:center;">
                <tr>
                  <td>
                    ${opts.footerExtra ?? ""}
                    <p style="margin:0 0 6px;font-size:12px;color:#7C7267;">
                      © 2026 <strong style="color:#2C2B2A;">Ace Digital</strong>. All rights reserved. <a href="https://mybexo.com" target="_blank" style="color:#2C2B2A;text-decoration:underline;">mybexo.com</a>
                    </p>
                    <p style="margin:0;font-size:11px;color:#9C9287;">
                      If you prefer not to receive emails like this, you may unsubscribe <a href="#" style="color:#7C7267;text-decoration:underline;">here</a>.
                    </p>
                  </td>
                </tr>
              </table>
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
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 40px;background-color:#4B4ED3;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:24px;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(75,78,211,0.2);">
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
  const subject = `Welcome to Ace Digital, ${fullName}`;

  const text = [
    `Dear ${fullName},`,
    "",
    "Welcome to the Ace Digital family!",
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
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1A1A1A;">
      Dear ${escapeHtml(fullName)},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#2C2B2A;line-height:1.7;">
      Welcome to the Ace Digital family! I'm personally thrilled to have you on board.
    </p>
    
    <div style="margin:24px 0;text-align:center;">
      <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600" alt="Welcome to Ace Digital" width="488" style="display:block;width:100%;max-width:100%;height:auto;border-radius:12px;border:1px solid #DFD0BC;" />
    </div>
    
    <p style="margin:0 0 20px;font-size:15px;color:#2C2B2A;line-height:1.7;">
      At Ace Digital, we believe that great things happen when talented people come
      together with a shared vision. You are now part of a team that values
      <strong style="color:#1A1A1A;">innovation</strong>,
      <strong style="color:#1A1A1A;">collaboration</strong>, and
      <strong style="color:#1A1A1A;">excellence</strong>.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#2C2B2A;line-height:1.7;">
      We've built <strong style="color:#4B4ED3;">Ace Digital OS</strong> to be your
      all-in-one workspace — a place where you can manage projects, collaborate
      with your team, track your progress, and grow together. I'm confident you'll
      find it both powerful and intuitive.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#2C2B2A;line-height:1.7;">
      As you settle in, don't hesitate to reach out to your team or use the in-app
      chat to connect. We're all here to support you.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#2C2B2A;line-height:1.7;">
      Once again, <strong style="color:#1A1A1A;">welcome aboard!</strong> I look forward to
      the amazing work we'll accomplish together.
    </p>

    <!-- Signature -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #DFD0BC;padding-top:24px;margin-top:24px;">
      <tr>
        <td style="width:36px;padding-right:14px;" valign="middle">
          <img src="https://img.icons8.com/ios-filled/48/4B4ED3/signature.png" width="36" height="36" style="display:block;width:36px;height:36px;" />
        </td>
        <td valign="middle">
          <p style="margin:0 0 4px;font-size:13px;color:#5C554E;">Warm regards,</p>
          <p style="margin:0 0 2px;font-size:18px;font-weight:700;color:#1A1A1A;">Kavin Balaji</p>
          <p style="margin:0;font-size:13px;color:#4B4ED3;font-weight:600;">Managing Director, Ace Digital</p>
        </td>
      </tr>
    </table>`;

  const html = emailShell({
    title: subject,
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
  { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/dashboard.png", title: "Dashboard", desc: "Get a real-time overview of your projects, tasks, and team activity at a glance." },
  { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/todo-list.png", title: "Projects & Tasks", desc: "Create, assign, and track work across your team with powerful Kanban boards." },
  { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/speech-bubble.png", title: "Team Chat", desc: "Real-time messaging with channels, threads, and file sharing for seamless collaboration." },
  { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/coins.png", title: "Finance", desc: "View salary records, expense tracking, and manage payroll with ease." },
  { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/customer-support.png", title: "Service Desk", desc: "Submit and track IT, HR, and support tickets with built-in SLA tracking." },
  { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/calendar.png", title: "Calendar", desc: "Schedule meetings, track deadlines, and manage your time effectively." },
];

function buildFeatureCard(f: FeatureItem): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
  <tr>
    <td style="padding:16px;background-color:#FAF6F0;border:1px solid #DFD0BC;border-radius:12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="width:36px;height:36px;background:rgba(75,78,211,0.08);border-radius:8px;text-align:center;vertical-align:middle;padding:8px;" valign="middle">
            <img src="${f.icon}" width="20" height="20" style="display:block;margin:0 auto;width:20px;height:20px;" alt="${escapeHtml(f.title)}" />
          </td>
          <td style="padding-left:14px;" valign="middle">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1A1A1A;">${escapeHtml(f.title)}</p>
            <p style="margin:0;font-size:12px;color:#5C554E;line-height:1.4;">${escapeHtml(f.desc)}</p>
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
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1A1A1A;">
      Hi ${escapeHtml(fullName)},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#2C2B2A;line-height:1.6;">
      Here's a quick tour of everything you can do with
      <strong style="color:#4B4ED3;">Ace Digital OS</strong> — your all-in-one workspace.
    </p>

    <div style="margin:24px 0;text-align:center;">
      <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600" alt="Ace Digital Workspace Guide" width="488" style="display:block;width:100%;max-width:100%;height:auto;border-radius:12px;border:1px solid #DFD0BC;" />
    </div>

    <!-- Section label -->
    <p style="margin:0 0 14px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#4B4ED3;">
      Key Features
    </p>

    ${featureCards}

    <!-- Pro tip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="padding:14px 16px;background-color:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.15);border-left:4px solid #10B981;border-radius:0 8px 8px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:20px;padding-right:12px;" valign="top">
                <img src="https://img.icons8.com/ios-filled/20/10b981/idea.png" width="20" height="20" style="display:block;width:20px;height:20px;" />
              </td>
              <td>
                <p style="margin:0;font-size:13px;color:#10B981;line-height:1.5;">
                  <strong>Pro tip:</strong> Install Ace Digital as a PWA from your browser menu for the best mobile experience — it works offline too!
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton(APP_URL, "Explore Ace Digital →")}

    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#5C554E;">
      You'll receive your login credentials in a separate email.
    </p>`;

  const html = emailShell({
    title: subject,
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
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1A1A1A;">
      ${escapeHtml(greeting)}, ${escapeHtml(params.fullName)}!
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#2C2B2A;line-height:1.6;">
      ${escapeHtml(intro)}
    </p>

    <div style="margin:24px 0;text-align:center;">
      <img src="https://ace-digital-os.web.app/images/credentials_hero.png" alt="Security Access" width="488" style="display:block;width:100%;max-width:100%;height:auto;border-radius:12px;border:1px solid #DFD0BC;" />
    </div>

    <!-- Credentials card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF6F0;border:1px solid #DFD0BC;border-radius:14px;overflow:hidden;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#4B4ED3;">
            Your Login Credentials
          </p>

          <!-- Email row -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td style="padding:14px 18px;background-color:rgba(0,0,0,0.02);border:1px solid #DFD0BC;border-radius:10px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;padding-right:12px;" valign="middle">
                      <img src="https://ace-digital-os.web.app/images/mail-envelope.png" width="20" height="20" style="display:block;width:20px;height:20px;" />
                    </td>
                    <td valign="middle">
                      <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7C7267;">Email Address</p>
                      <p style="margin:0;font-size:14px;font-weight:700;color:#1A1A1A;word-break:break-all;">${escapeHtml(params.email)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Password row -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:14px 18px;background-color:rgba(75,78,211,0.04);border:1px solid rgba(75,78,211,0.20);border-radius:10px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;padding-right:12px;" valign="middle">
                      <img src="https://ace-digital-os.web.app/images/mail-password.png" width="20" height="20" style="display:block;width:20px;height:20px;" />
                    </td>
                    <td valign="middle">
                      <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4B4ED3;">Temporary Password</p>
                      <p style="margin:0;font-size:16px;font-weight:700;color:#1A1A1A;letter-spacing:1px;font-family:Consolas, Monaco, monospace;">${escapeHtml(params.password)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="padding:14px 16px;background-color:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.15);border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:20px;padding-right:12px;" valign="top">
                <img src="https://ace-digital-os.web.app/images/mail-warning.png" width="20" height="20" style="display:block;width:20px;height:20px;" />
              </td>
              <td>
                <p style="margin:0;font-size:13px;color:#B45309;line-height:1.5;">
                  You will be asked to change your password after your first login. The button below will copy your password for you automatically.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton(loginWithPw, "Login to Ace Digital →")}

    <p style="margin:24px 0 0;text-align:center;font-size:12px;color:#5C554E;line-height:1.5;">
      Or copy this link:
      <a href="${LOGIN_URL}" style="color:#4B4ED3;text-decoration:underline;word-break:break-all;">${LOGIN_URL}</a>
    </p>`;

  const html = emailShell({
    title: subject,
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
