/**
 * Send the welcome letter and app guide emails to a specific address.
 * Usage: pnpm --filter @workspace/scripts exec tsx src/send-test-emails.ts
 */

// Set up env for the email module
process.env.USE_FIRESTORE = "true";
process.env.GOOGLE_CLOUD_PROJECT = "ace-digital-os";

// We need to directly use Resend since the email module is in the api-server
import { Resend } from "resend";

const TO = "dev@acedigital.cc";
const NAME = "KAVINBALAJI S K";
const FROM = process.env.EMAIL_FROM ?? "Ace-Digital <itdep@acedigital.cc>";
const APP_URL = "https://acedigital.cc";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
                    <img src="https://acedigital.cc/ace-logo.png" alt="Ace Digital Logo" height="32" style="display:inline-block;height:32px;width:auto;" />
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
                      <a href="mailto:hr@acedigital.cc" style="color:#1A1A1A;text-decoration:none;">hr@acedigital.cc</a>
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
                      © 2026 <strong style="color:#2C2B2A;">Ace Digital</strong>. All rights reserved. <a href="https://acedigital.cc" target="_blank" style="color:#2C2B2A;text-decoration:underline;">acedigital.cc</a>
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

// Email #1: Welcome Letter
function buildWelcomeLetter(): { subject: string; html: string } {
  const subject = `Welcome to Ace Digital, ${NAME}`;
  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1A1A1A;">
      Dear ${escapeHtml(NAME)},
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
      We've built <strong style="color:#4B4ED3;">Ace Digital</strong> to be your
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

  return { subject, html };
}

// Email #2: App Guide
function buildAppGuide(): { subject: string; html: string } {
  const subject = "Getting Started with Ace Digital";
  const features = [
    { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/dashboard.png", title: "Dashboard", desc: "Get a real-time overview of your projects, tasks, and team activity at a glance." },
    { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/todo-list.png", title: "Projects & Tasks", desc: "Create, assign, and track work across your team with powerful Kanban boards." },
    { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/speech-bubble.png", title: "Team Chat", desc: "Real-time messaging with channels, threads, and file sharing for seamless collaboration." },
    { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/coins.png", title: "Finance", desc: "View salary records, expense tracking, and manage payroll with ease." },
    { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/customer-support.png", title: "Service Desk", desc: "Submit and track IT, HR, and support tickets with built-in SLA tracking." },
    { icon: "https://img.icons8.com/ios-filled/40/4B4ED3/calendar.png", title: "Calendar", desc: "Schedule meetings, track deadlines, and manage your time effectively." },
  ];

  const featureCards = features.map(f => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
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
</table>`).join("");

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1A1A1A;">
      Hi ${escapeHtml(NAME)},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#2C2B2A;line-height:1.6;">
      Here's a quick tour of everything you can do with
      <strong style="color:#4B4ED3;">Ace Digital</strong> — your all-in-one workspace.
    </p>
    
    <div style="margin:24px 0;text-align:center;">
      <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600" alt="Ace Digital Workspace Guide" width="488" style="display:block;width:100%;max-width:100%;height:auto;border-radius:12px;border:1px solid #DFD0BC;" />
    </div>

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
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td align="center">
          <a href="${APP_URL}" target="_blank" style="display:inline-block;padding:14px 40px;background-color:#4B4ED3;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:24px;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(75,78,211,0.2);">
            Explore Ace Digital →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#5C554E;">
      You'll receive your login credentials in a separate email.
    </p>`;

  const html = emailShell({
    title: subject,
    headline: "Getting Started",
    subtitle: "Your guide to Ace Digital",
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
