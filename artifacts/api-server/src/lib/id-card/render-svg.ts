import type { IdCardData, IdCardPair } from "./types";
import { aceLogoDataUrl } from "./logo-data";

/** Portrait CR80 — 54 × 86 mm at 10px/mm */
const W = 540;
const H = 856;
const LOGO = aceLogoDataUrl();
const NAVY = "#0B1F3A";
const TEAL = "#0D9488";
const TEAL_LINE = "#14B8A6";
const INK = "#1E293B";
const MUTED = "#64748B";
const HQ =
  "Ace Digital HQ, Coimbatore, Tamil Nadu 641004";
const HR_EMAIL = "hr@mybexo.com";
const HR_PHONE = "+91 90871 72072";
const WEB = "www.ace-digital-os.web.app";

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

function defs(id: string): string {
  return `
    <pattern id="${id}Net" width="52" height="52" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="2.5" fill="${NAVY}" opacity="0.22"/>
      <circle cx="44" cy="44" r="2.5" fill="${NAVY}" opacity="0.22"/>
      <path d="M8 8 L44 44" stroke="${NAVY}" stroke-width="0.65" opacity="0.12"/>
      <path d="M44 8 L8 44" stroke="${NAVY}" stroke-width="0.65" opacity="0.1"/>
    </pattern>
    <linearGradient id="${id}Holo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5EEAD4"/>
      <stop offset="35%" stop-color="#818CF8"/>
      <stop offset="70%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
    <linearGradient id="${id}Footer" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="#123456"/>
    </linearGradient>`;
}

function lanyard(): string {
  return `<rect x="${W / 2 - 38}" y="14" width="76" height="14" rx="7" fill="#E8EDF4" stroke="#C5D0DE" stroke-width="1"/>`;
}

function edgePattern(netId: string): string {
  return `
    <rect x="0" y="0" width="78" height="${H}" fill="url(#${netId})" opacity="0.55"/>
    <rect x="${W - 78}" y="0" width="78" height="${H}" fill="url(#${netId})" opacity="0.55"/>`;
}

function brandBlock(y: number): string {
  return `
    ${lanyard()}
    <image href="${LOGO}" x="${W / 2 - 56}" y="${y}" width="112" height="48" preserveAspectRatio="xMidYMid meet"/>
    <text x="${W / 2}" y="${y + 68}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="16" font-weight="800" letter-spacing="4" fill="${NAVY}">ACE DIGITAL</text>
    <text x="${W / 2}" y="${y + 90}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="2.2" fill="${TEAL}">INSPIRING YOUTH</text>
    <text x="${W / 2}" y="${y + 106}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="2.2" fill="${TEAL}">EMPOWERING NATION</text>
    <line x1="110" y1="${y + 118}" x2="${W - 110}" y2="${y + 118}" stroke="${TEAL_LINE}" stroke-width="2.5" stroke-linecap="round"/>`;
}

function photoWithHolo(data: IdCardData, y: number, size: number): string {
  const cx = W / 2;
  const x = cx - size / 2;
  const clip = `ph-${data.employeeCode.replace(/\W/g, "")}`;
  const inner = data.photoDataUrl?.startsWith("data:image")
    ? `<image href="${data.photoDataUrl}" x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/>`
    : `<text x="${cx}" y="${y + size / 2 + 12}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="${size * 0.24}" font-weight="800" fill="${NAVY}">${esc(initials(data.fullName))}</text>`;
  const holoX = x + size - 22;
  const holoY = y + 14;
  return `
    <defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="14"/></clipPath></defs>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="14" fill="#F8FAFC" stroke="${NAVY}" stroke-width="2.5"/>
    ${inner}
    <rect x="${holoX}" y="${holoY}" width="36" height="36" rx="8" fill="url(#frontHolo)" stroke="#fff" stroke-width="2"/>
    <circle cx="${holoX + 18}" cy="${holoY + 18}" r="11" fill="none" stroke="#fff" stroke-width="0.9" opacity="0.75"/>
    <ellipse cx="${holoX + 18}" cy="${holoY + 18}" rx="11" ry="6" fill="none" stroke="#fff" stroke-width="0.6" opacity="0.55"/>`;
}

function infoLine(label: string, value: string, y: number): string {
  return `
    <text x="${W / 2}" y="${y}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" font-weight="700" letter-spacing="1.8" fill="${MUTED}">${esc(label)}</text>
    <text x="${W / 2}" y="${y + 24}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="15" font-weight="800" fill="${INK}">${esc(value)}</text>`;
}

function qrPanel(data: IdCardData, x: number, y: number, size: number): string {
  if (!data.qrSvg) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="8" fill="#fff" stroke="#CBD5E1"/>`;
  }
  const inner = data.qrSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "");
  return `
    <rect x="${x - 10}" y="${y - 10}" width="${size + 20}" height="${size + 20}" rx="14" fill="#fff" stroke="${TEAL_LINE}" stroke-width="2"/>
    <svg x="${x}" y="${y}" width="${size}" height="${size}">${inner}</svg>`;
}

function microPrint(y: number): string {
  const text = "ACE DIGITAL SECURE ID · ";
  let out = "";
  for (let i = 0; i < 14; i++) {
    out += `<text x="${40 + i * 36}" y="${y}" font-family="'Segoe UI',system-ui,sans-serif" font-size="7" font-weight="600" fill="${NAVY}" opacity="0.12">${text}</text>`;
  }
  return out;
}

function employeeFront(data: IdCardData): string {
  const dept = (data.teamName ?? "Operations").toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs("front")}</defs>
  <rect width="${W}" height="${H}" rx="26" fill="#FFFFFF"/>
  ${edgePattern("frontNet")}
  ${brandBlock(28)}
  ${photoWithHolo(data, 148, 172)}
  <text x="${W / 2}" y="352" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="24" font-weight="800" letter-spacing="2" fill="${INK}">${esc(data.fullName.toUpperCase())}</text>
  <text x="${W / 2}" y="382" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="2.5" fill="${TEAL}">${esc((data.jobTitle ?? "TEAM MEMBER").toUpperCase())}</text>
  ${infoLine("EMPLOYEE ID", data.employeeCode, 408)}
  ${infoLine("DOB", formatDob(data.dob), 456)}
  ${infoLine("BLOOD GROUP", data.bloodGroup ?? "—", 504)}
  ${infoLine("DEPARTMENT", dept, 552)}
  <rect y="${H - 58}" width="${W}" height="4" fill="${TEAL_LINE}"/>
  <rect y="${H - 54}" width="${W}" height="54" fill="url(#frontFooter)"/>
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#FFFFFF">EXPIRATION DATE: ${esc(data.expirationLabel ?? "DEC 2026")}</text>
</svg>`;
}

function employeeBack(data: IdCardData): string {
  const company = data.companyLegalName ?? "Ace Digital Private Limited";
  const phone = data.phone ?? HR_PHONE;
  const qr = 216;
  const qrX = (W - qr) / 2;
  const sig = data.signatorySignatureDataUrl
    ? `<image href="${data.signatorySignatureDataUrl}" x="52" y="668" width="120" height="38" preserveAspectRatio="xMidYMid meet"/>`
    : `<path d="M60 692 Q100 672 140 690 T200 682" fill="none" stroke="${NAVY}" stroke-width="1.2" opacity="0.45"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs("back")}</defs>
  <rect width="${W}" height="${H}" rx="26" fill="#FFFFFF"/>
  ${edgePattern("backNet")}
  ${lanyard()}
  <image href="${LOGO}" x="48" y="44" width="72" height="32" preserveAspectRatio="xMidYMid meet"/>
  <text x="48" y="92" font-family="'Segoe UI',system-ui,sans-serif" font-size="13" font-weight="800" letter-spacing="2" fill="${NAVY}">ACE DIGITAL</text>
  <text x="48" y="110" font-family="'Segoe UI',system-ui,sans-serif" font-size="8" font-weight="600" letter-spacing="1.5" fill="${TEAL}">INSPIRING YOUTH · EMPOWERING NATION</text>
  <text x="48" y="148" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" font-weight="800" fill="${NAVY}">HQ:</text>
  <text x="48" y="166" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" fill="${INK}">${esc(HQ)}</text>
  <text x="48" y="194" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" font-weight="800" fill="${NAVY}">PHONE:</text>
  <text x="48" y="212" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" fill="${INK}">${esc(phone)}</text>
  <text x="48" y="240" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" font-weight="800" fill="${NAVY}">EMAIL:</text>
  <text x="48" y="258" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" fill="${INK}">${esc(HR_EMAIL)}</text>
  <text x="48" y="286" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" font-weight="800" fill="${NAVY}">WEBSITE:</text>
  <text x="48" y="304" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" fill="${TEAL}">${esc(WEB)}</text>
  ${microPrint(330)}
  ${qrPanel(data, qrX, 348, qr)}
  <text x="${W / 2}" y="592" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="8.5" fill="${MUTED}">
    <tspan x="${W / 2}" dy="0">This card remains the property of ${esc(company)} and must be</tspan>
    <tspan x="${W / 2}" dy="14">returned upon termination. If found, return to HR at the address above.</tspan>
  </text>
  ${sig}
  <line x1="52" y1="714" x2="200" y2="714" stroke="${NAVY}" stroke-width="1" opacity="0.35"/>
  <text x="52" y="730" font-family="'Segoe UI',system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="1.2" fill="${MUTED}">AUTHORISED SIGNATURE</text>
  ${data.signatoryName ? `<text x="52" y="746" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" font-weight="700" fill="${NAVY}">${esc(data.signatoryName)}</text>` : ""}
  <text x="${W - 52}" y="730" text-anchor="end" font-family="'Segoe UI',system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="1.2" fill="${MUTED}">DATE</text>
  <line x1="${W - 180}" y1="714" x2="${W - 52}" y2="714" stroke="${NAVY}" stroke-width="1" opacity="0.35"/>
  <rect y="${H - 50}" width="${W}" height="50" fill="url(#backFooter)"/>
  <text x="${W / 2}" y="${H - 20}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" font-weight="800" letter-spacing="3.5" fill="#FFFFFF">ACE DIGITAL SECURE ID</text>
</svg>`;
}

function internFront(data: IdCardData): string {
  const dept = (data.program ?? "Internship Program").toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs("front")}</defs>
  <rect width="${W}" height="${H}" rx="26" fill="#F0FDFA"/>
  ${edgePattern("frontNet")}
  <rect x="36" y="36" width="110" height="28" rx="14" fill="${TEAL}"/>
  <text x="91" y="55" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="11" font-weight="800" letter-spacing="2.5" fill="#fff">INTERN</text>
  ${brandBlock(36)}
  ${photoWithHolo(data, 156, 160)}
  <text x="${W / 2}" y="348" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="22" font-weight="800" fill="${INK}">${esc(data.fullName.toUpperCase())}</text>
  <text x="${W / 2}" y="376" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="${TEAL}">${esc(dept)}</text>
  ${infoLine("INTERN ID", data.employeeCode, 404)}
  ${infoLine("MENTOR", data.mentorName ?? "ASSIGNED", 452)}
  ${infoLine("UNIVERSITY", data.university ?? "—", 500)}
  <rect y="${H - 58}" width="${W}" height="4" fill="${TEAL_LINE}"/>
  <rect y="${H - 54}" width="${W}" height="54" fill="${NAVY}"/>
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="1.8" fill="#FFFFFF">VALID UNTIL ${esc(data.expirationLabel ?? "PROGRAM END")}</text>
</svg>`;
}

function internBack(data: IdCardData): string {
  const company = data.companyLegalName ?? "Ace Digital Private Limited";
  const qr = 200;
  const qrX = (W - qr) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs("back")}</defs>
  <rect width="${W}" height="${H}" rx="26" fill="#042F2E"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="20" fill="#0C3D38" stroke="${TEAL_LINE}" stroke-width="1.5"/>
  ${lanyard()}
  <image href="${LOGO}" x="${W / 2 - 44}" y="52" width="88" height="36" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W / 2}" y="104" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="11" font-weight="800" letter-spacing="2" fill="#99F6E4">INTERN ACCESS · ACE DIGITAL</text>
  <text x="${W / 2}" y="128" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="9" fill="#6EE7B7">${esc(company)}</text>
  ${qrPanel(data, qrX, 160, qr)}
  <text x="${W / 2}" y="392" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="9" fill="#99F6E4">Scan to verify intern status</text>
  <text x="52" y="430" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" fill="#99F6E4">Emergency: ${esc(data.emergencyContactName ?? "—")} · ${esc(data.emergencyContactPhone ?? "—")}</text>
  <rect y="${H - 46}" width="${W}" height="46" fill="${TEAL}"/>
  <text x="${W / 2}" y="${H - 18}" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" font-weight="800" letter-spacing="2.5" fill="#042F2E">ACE DIGITAL INTERN ID</text>
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
