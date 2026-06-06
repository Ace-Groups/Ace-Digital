/**
 * Send the welcome letter and app guide emails to a specific address.
 * Usage: pnpm --filter @workspace/scripts exec tsx src/send-test-emails.ts
 */

// Set up env for the email module
process.env.USE_FIRESTORE = "true";
process.env.GOOGLE_CLOUD_PROJECT = "ace-digital-os";

// We need to directly use Resend since the email module is in the api-server
import { Resend } from "resend";

const TO = "dev@mybexo.com";
const NAME = "Kavin Balaji S K";
const FROM = process.env.EMAIL_FROM ?? "Ace-Digital <itdep@mybexo.com>";
const APP_URL = "https://ace-digital-os.web.app";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
          <tr>
            <td style="background-color:#111827;padding:36px;">
              ${opts.bodyHtml}
            </td>
          </tr>
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

// Email #1: Welcome Letter
function buildWelcomeLetter(): { subject: string; html: string } {
  const subject = `Welcome to Ace Digital, ${NAME}!`;
  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#f1f5f9;">
      Dear ${escapeHtml(NAME)}, 🎉
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

  return { subject, html };
}

// Email #2: App Guide
function buildAppGuide(): { subject: string; html: string } {
  const subject = "Getting Started with Ace Digital";
  const features = [
    { icon: "📊", title: "Dashboard", desc: "Get a real-time overview of your projects, tasks, and team activity at a glance." },
    { icon: "📋", title: "Projects & Tasks", desc: "Create, assign, and track work across your team with powerful Kanban boards." },
    { icon: "💬", title: "Team Chat", desc: "Real-time messaging with channels, threads, and file sharing for seamless collaboration." },
    { icon: "💰", title: "Finance", desc: "View salary records, expense tracking, and manage payroll with ease." },
    { icon: "🎫", title: "Service Desk", desc: "Submit and track IT, HR, and support tickets with built-in SLA tracking." },
    { icon: "📅", title: "Calendar", desc: "Schedule meetings, track deadlines, and manage your time effectively." },
  ];

  const featureCards = features.map(f => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
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
</table>`).join("");

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#f1f5f9;">
      Hi ${escapeHtml(NAME)}! 🚀
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
      Here's a quick tour of everything you can do with
      <strong style="color:#5483B3;">Ace Digital OS</strong> — your all-in-one workspace.
    </p>
    <p style="margin:0 0 14px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#5483B3;">
      Key Features
    </p>
    ${featureCards}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="padding:14px 16px;background-color:rgba(16,185,129,0.08);border-left:3px solid #10B981;border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:13px;color:#34d399;line-height:1.5;">
            💡 <strong>Pro tip:</strong> Install Ace Digital as a PWA from your browser menu for the best mobile experience — it works offline too!
          </p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td align="center">
          <a href="${APP_URL}" target="_blank" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#5483B3 0%,#7B61FF 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;box-shadow:0 8px 24px rgba(84,131,179,0.35);">
            Explore Ace Digital →
          </a>
        </td>
      </tr>
    </table>
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

  return { subject, html };
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("❌ RESEND_API_KEY not set. Set it in .env or pass it as env var.");
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  // Send welcome letter
  const welcome = buildWelcomeLetter();
  console.log(`📧 Sending welcome letter to ${TO}...`);
  const { error: err1, data: d1 } = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: welcome.subject,
    html: welcome.html,
  });
  if (err1) {
    console.error("❌ Welcome letter failed:", err1.message);
  } else {
    console.log(`✅ Welcome letter sent — id: ${d1?.id}`);
  }

  // Small delay for inbox ordering
  await new Promise(r => setTimeout(r, 800));

  // Send app guide
  const guide = buildAppGuide();
  console.log(`📧 Sending app guide to ${TO}...`);
  const { error: err2, data: d2 } = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: guide.subject,
    html: guide.html,
  });
  if (err2) {
    console.error("❌ App guide failed:", err2.message);
  } else {
    console.log(`✅ App guide sent — id: ${d2?.id}`);
  }

  console.log("\n🎉 Done!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
