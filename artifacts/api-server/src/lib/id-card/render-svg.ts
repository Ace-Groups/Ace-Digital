import type { IdCardData, IdCardPair } from "./types";
import { aceLogoDataUrl } from "./logo-data";

/** Portrait CR80 proportions (54 × 86 mm). */
const W = 540;
const H = 856;
const LOGO = aceLogoDataUrl();
const NAVY = "#0B1F3A";
const TEAL = "#0D9488";
const TEAL_LIGHT = "#14B8A6";
const INK = "#1E293B";
const MUTED = "#64748B";
const HQ_LINE = "Ace Digital HQ · Coimbatore, Tamil Nadu";
const SUPPORT_EMAIL = "hr@mybexo.com";
const SUPPORT_PHONE = "+91 90871 72072";
const SUPPORT_WEB = "ace-digital-os.web.app";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDob(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function formatValidFrom(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function networkPattern(id: string, stroke: string): string {
  return `
    <pattern id="${id}" width="56" height="56" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="2.2" fill="${stroke}" opacity="0.4"/>
      <circle cx="48" cy="48" r="2.2" fill="${stroke}" opacity="0.4"/>
      <path d="M8 8 L48 48" stroke="${stroke}" stroke-width="0.7" opacity="0.18"/>
      <path d="M48 8 L8 48" stroke="${stroke}" stroke-width="0.7" opacity="0.14"/>
    </pattern>`;
}

function cardDefs(prefix: string): string {
  return `
    ${networkPattern(`${prefix}Net`, NAVY)}
    <linearGradient id="${prefix}Holo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67E8F9"/>
      <stop offset="45%" stop-color="#A78BFA"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
    <linearGradient id="${prefix}Footer" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="#163A5F"/>
    </linearGradient>
    <filter id="${prefix}Shadow" x="-8%" y="-4%" width="116%" height="108%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#0B1F3A" flood-opacity="0.12"/>
    </filter>`;
}

function lanyardSlot(): string {
  return `
    <rect x="${W / 2 - 40}" y="12" width="80" height="16" rx="8" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1"/>
    <rect x="${W / 2 - 28}" y="16" width="56" height="8" rx="4" fill="#F8FAFC"/>`;
}

function brandHeader(y: number): string {
  return `
    <image href="${LOGO}" x="${W / 2 - 52}" y="${y}" width="104" height="44" preserveAspectRatio="xMidYMid meet"/>
    <text x="${W / 2}" y="${y + 62}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="800" letter-spacing="3.5" fill="${NAVY}">ACE DIGITAL</text>
    <text x="${W / 2}" y="${y + 84}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" font-weight="700" letter-spacing="2.8" fill="${TEAL}">INSPIRING YOUTH</text>
    <text x="${W / 2}" y="${y + 100}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" font-weight="700" letter-spacing="2.8" fill="${TEAL}">EMPOWERING NATION</text>
    <line x1="108" y1="${y + 112}" x2="${W - 108}" y2="${y + 112}" stroke="${TEAL_LIGHT}" stroke-width="2.5" stroke-linecap="round"/>`;
}

function qrBlock(data: IdCardData, x: number, y: number, size: number): string {
  if (!data.qrSvg) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="14" fill="#FFFFFF" stroke="#CBD5E1"/>
      <text x="${x + size / 2}" y="${y + size / 2}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="${MUTED}">VERIFY QR</text>`;
  }
  const inner = data.qrSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "");
  return `
    <rect x="${x - 6}" y="${y - 6}" width="${size + 12}" height="${size + 12}" rx="18" fill="#FFFFFF" stroke="${TEAL_LIGHT}" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="12" fill="#FFFFFF"/>
    <svg x="${x + 10}" y="${y + 10}" width="${size - 20}" height="${size - 20}">${inner}</svg>`;
}

function portraitPhoto(data: IdCardData, cx: number, y: number, size: number, holoId: string): string {
  const x = cx - size / 2;
  const clipId = `photo-${data.employeeCode.replace(/\W/g, "")}`;
  const holoX = x + size - 18;
  const holoY = y + 12;
  const photoInner = data.photoDataUrl?.startsWith("data:image")
    ? `<image href="${data.photoDataUrl}" x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`
    : `<text x="${cx}" y="${y + size / 2 + 10}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${size * 0.22}" font-weight="700" fill="${NAVY}">${esc(initials(data.fullName))}</text>`;

  return `
    <defs>
      <clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="18"/></clipPath>
    </defs>
    <rect x="${x - 4}" y="${y - 4}" width="${size + 8}" height="${size + 8}" rx="22" fill="none" stroke="${TEAL_LIGHT}" stroke-width="1.5" opacity="0.55"/>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="18" fill="#F1F5F9" stroke="${NAVY}" stroke-width="2.5"/>
    ${photoInner}
    <rect x="${holoX}" y="${holoY}" width="30" height="30" rx="8" fill="url(#${holoId})" stroke="#FFFFFF" stroke-width="1.5" opacity="0.92"/>
    <circle cx="${holoX + 15}" cy="${holoY + 15}" r="9" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.7"/>`;
}

function detailField(label: string, value: string, y: number): string {
  return `
    <text x="${W / 2}" y="${y}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="700" letter-spacing="1.6" fill="${MUTED}">${esc(label)}</text>
    <text x="${W / 2}" y="${y + 22}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="800" fill="${NAVY}">${esc(value)}</text>`;
}

function signatoryBlock(data: IdCardData, x: number, y: number, ink: string): string {
  if (!data.signatoryName) return "";
  const sig = data.signatorySignatureDataUrl
    ? `<image href="${data.signatorySignatureDataUrl}" x="${x}" y="${y}" width="110" height="36" preserveAspectRatio="xMidYMid meet"/>`
    : `<path d="M${x + 8} ${y + 28} Q${x + 40} ${y + 8} ${x + 72} ${y + 26} T${x + 120} ${y + 18}" fill="none" stroke="${ink}" stroke-width="1.2" opacity="0.5"/>`;
  return `${sig}
    <line x1="${x}" y1="${y + 44}" x2="${x + 150}" y2="${y + 44}" stroke="${ink}" stroke-width="1" opacity="0.35"/>
    <text x="${x}" y="${y + 60}" font-family="system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="1.2" fill="${MUTED}">AUTHORISED SIGNATURE</text>
    <text x="${x}" y="${y + 76}" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="${ink}">${esc(data.signatoryName)}</text>`;
}

function employeeFront(data: IdCardData): string {
  const dept = (data.teamName ?? "OPERATIONS").toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${cardDefs("front")}</defs>
  <rect width="${W}" height="${H}" rx="28" fill="#FAFBFC" filter="url(#frontShadow)"/>
  <rect width="96" height="${H}" fill="url(#frontNet)" opacity="0.85"/>
  <rect x="${W - 96}" width="96" height="${H}" fill="url(#frontNet)" opacity="0.85"/>
  ${lanyardSlot()}
  ${brandHeader(30)}
  ${portraitPhoto(data, W / 2, 132, 164, "frontHolo")}
  <text x="${W / 2}" y="332" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="800" letter-spacing="1.6" fill="${INK}">${esc(data.fullName.toUpperCase())}</text>
  <text x="${W / 2}" y="360" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="${TEAL}">${esc((data.jobTitle ?? "TEAM MEMBER").toUpperCase())}</text>
  ${detailField("EMPLOYEE ID", data.employeeCode, 388)}
  ${detailField("DEPARTMENT", dept, 432)}
  ${detailField("DOB", formatDob(data.dob), 476)}
  ${detailField("BLOOD GROUP", data.bloodGroup ?? "—", 520)}
  <text x="56" y="${H - 72}" font-family="system-ui,sans-serif" font-size="9" font-weight="600" fill="${MUTED}">Valid from ${esc(formatValidFrom(data.startDate))}</text>
  <text x="${W - 56}" y="${H - 72}" text-anchor="end" font-family="system-ui,sans-serif" font-size="9" font-weight="600" fill="${MUTED}">${esc(data.email)}</text>
  <rect y="${H - 56}" width="${W}" height="56" fill="url(#frontFooter)"/>
  <rect y="${H - 58}" width="${W}" height="4" fill="${TEAL_LIGHT}"/>
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="1.8" fill="#FFFFFF">EXPIRES ${esc(data.expirationLabel ?? "DEC 2026")}</text>
</svg>`;
}

function employeeBack(data: IdCardData): string {
  const company = data.companyLegalName ?? "Ace Digital Private Limited";
  const qrSize = 188;
  const qrX = (W - qrSize) / 2;
  const phone = data.phone ?? SUPPORT_PHONE;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${cardDefs("back")}</defs>
  <rect width="${W}" height="${H}" rx="28" fill="#FAFBFC" filter="url(#backShadow)"/>
  <rect width="${W}" height="136" fill="url(#backFooter)"/>
  ${lanyardSlot()}
  <image href="${LOGO}" x="${W / 2 - 44}" y="44" width="88" height="36" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W / 2}" y="96" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" letter-spacing="2.5" fill="#FFFFFF">${esc(company.toUpperCase())}</text>
  <text x="${W / 2}" y="118" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8.5" font-weight="600" letter-spacing="1.8" fill="#99F6E4">INSPIRING YOUTH · EMPOWERING NATION</text>
  <text x="${W / 2}" y="162" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="${NAVY}">${esc(HQ_LINE)}</text>
  <text x="${W / 2}" y="184" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="${MUTED}">${esc(SUPPORT_EMAIL)} · ${esc(phone)}</text>
  <text x="${W / 2}" y="204" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" fill="${TEAL}">${esc(SUPPORT_WEB)}</text>
  <rect x="56" y="216" width="${W - 112}" height="1" fill="#E2E8F0"/>
  ${qrBlock(data, qrX, 232, qrSize)}
  <text x="${W / 2}" y="448" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="1" fill="${TEAL}">SCAN TO VERIFY EMPLOYEE ID</text>
  <text x="${W / 2}" y="468" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" fill="${MUTED}">${esc(data.verifyUrl ?? "")}</text>
  <text x="${W / 2}" y="498" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8.5" fill="${MUTED}">
    <tspan x="${W / 2}" dy="0">Property of ${esc(company)}. Return to HR if found.</tspan>
  </text>
  ${signatoryBlock(data, 56, 548, NAVY)}
  <rect y="${H - 48}" width="${W}" height="48" fill="${NAVY}"/>
  <text x="${W / 2}" y="${H - 20}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="800" letter-spacing="3.2" fill="#FFFFFF">ACE DIGITAL SECURE ID</text>
</svg>`;
}

function internFront(data: IdCardData): string {
  const company = (data.companyLegalName ?? "ACE DIGITAL").toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${networkPattern("intNet", TEAL)}
    <linearGradient id="intHdr" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#042F2E"/>
      <stop offset="100%" stop-color="${TEAL}"/>
    </linearGradient>
    <linearGradient id="intHolo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67E8F9"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="28" fill="#F0FDFA"/>
  <rect width="96" height="${H}" fill="url(#intNet)" opacity="0.45"/>
  <rect x="${W - 96}" width="96" height="${H}" fill="url(#intNet)" opacity="0.45"/>
  ${lanyardSlot()}
  <rect x="32" y="34" width="128" height="34" rx="17" fill="url(#intHdr)"/>
  <text x="96" y="56" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="800" letter-spacing="3" fill="#FFFFFF">INTERN</text>
  <image href="${LOGO}" x="${W / 2 - 48}" y="78" width="96" height="40" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W / 2}" y="132" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="800" letter-spacing="2.5" fill="${TEAL}">${esc(company)}</text>
  <text x="${W / 2}" y="150" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="2" fill="${TEAL}">INSPIRING YOUTH · EMPOWERING NATION</text>
  ${portraitPhoto(data, W / 2, 168, 152, "intHolo")}
  <text x="${W / 2}" y="348" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" font-weight="800" fill="${INK}">${esc(data.fullName.toUpperCase())}</text>
  <text x="${W / 2}" y="374" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="${TEAL}">${esc((data.program ?? "INTERNSHIP PROGRAM").toUpperCase())}</text>
  <text x="${W / 2}" y="394" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="${MUTED}">${esc(data.university ?? "")}</text>
  ${detailField("INTERN ID", data.employeeCode, 424)}
  ${detailField("MENTOR", data.mentorName ?? "ASSIGNED", 468)}
  ${detailField("DURATION", `${formatDob(data.startDate)} – ${formatDob(data.endDate)}`, 512)}
  <rect y="${H - 56}" width="${W}" height="56" fill="url(#intHdr)"/>
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="1.2" fill="#FFFFFF">VALID UNTIL ${esc(data.expirationLabel ?? "PROGRAM END")}</text>
</svg>`;
}

function internBack(data: IdCardData): string {
  const company = data.companyLegalName ?? "Ace Digital Private Limited";
  const qrSize = 188;
  const qrX = (W - qrSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="28" fill="#042F2E"/>
  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="22" fill="#0F3D38" stroke="${TEAL_LIGHT}" stroke-width="1.5"/>
  ${lanyardSlot()}
  <image href="${LOGO}" x="${W / 2 - 40}" y="52" width="80" height="34" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W / 2}" y="100" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" letter-spacing="2.5" fill="${TEAL_LIGHT}">INTERN ACCESS CARD</text>
  <text x="${W / 2}" y="124" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8.5" fill="#99F6E4">INSPIRING YOUTH · EMPOWERING NATION</text>
  <text x="${W / 2}" y="152" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#99F6E4">${esc(company)}</text>
  ${qrBlock(data, qrX, 176, qrSize)}
  <text x="${W / 2}" y="396" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#6EE7B7">Scan QR to verify intern status</text>
  <text x="56" y="438" font-family="system-ui,sans-serif" font-size="10" fill="#99F6E4">Emergency: ${esc(data.emergencyContactName ?? "—")} · ${esc(data.emergencyContactPhone ?? "—")}</text>
  ${signatoryBlock(data, 56, 508, TEAL_LIGHT)}
  <rect y="${H - 44}" width="${W}" height="44" fill="${TEAL}"/>
  <text x="${W / 2}" y="${H - 16}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="800" letter-spacing="2.5" fill="#042F2E">ACE DIGITAL INTERN ID</text>
</svg>`;
}

export function renderIdCardPair(data: IdCardData): IdCardPair {
  if (data.variant === "intern") {
    return { variant: "intern", frontSvg: internFront(data), backSvg: internBack(data) };
  }
  return { variant: "employee", frontSvg: employeeFront(data), backSvg: employeeBack(data) };
}

export function svgToDataUrl(svg: string): string {
  const b64 = Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}
