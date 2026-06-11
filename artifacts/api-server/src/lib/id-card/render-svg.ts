import type { IdCardData, IdCardPair } from "./types";

/** Portrait CR80 proportions (54 × 86 mm). */
const W = 540;
const H = 856;
const LOGO_URL = "https://ace-digital-os.web.app/ace-logo.png";
const NAVY = "#0B1F3A";
const TEAL = "#0D9488";
const TEAL_LIGHT = "#14B8A6";
const INK = "#1E293B";
const MUTED = "#64748B";
const HQ_LINE = "Ace Digital HQ · Chennai, India";
const SUPPORT_EMAIL = "hr@acedigital.in";
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

function networkPattern(id: string, stroke: string): string {
  return `
    <pattern id="${id}" width="48" height="48" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="6" r="2" fill="${stroke}" opacity="0.35"/>
      <circle cx="42" cy="42" r="2" fill="${stroke}" opacity="0.35"/>
      <path d="M6 6 L42 42" stroke="${stroke}" stroke-width="0.6" opacity="0.2"/>
      <path d="M42 6 L6 42" stroke="${stroke}" stroke-width="0.6" opacity="0.15"/>
    </pattern>`;
}

function lanyardSlot(): string {
  return `<rect x="${W / 2 - 36}" y="10" width="72" height="14" rx="7" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1"/>`;
}

function qrBlock(data: IdCardData, x: number, y: number, size: number): string {
  if (!data.qrSvg) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="12" fill="#FFFFFF" stroke="#CBD5E1"/>
      <text x="${x + size / 2}" y="${y + size / 2}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="${MUTED}">VERIFY QR</text>`;
  }
  const inner = data.qrSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "");
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
    <svg x="${x + 8}" y="${y + 8}" width="${size - 16}" height="${size - 16}">${inner}</svg>`;
}

function squarePhoto(data: IdCardData, cx: number, y: number, size: number): string {
  const x = cx - size / 2;
  const clipId = `photo-${data.employeeCode.replace(/\W/g, "")}`;
  if (data.photoDataUrl?.startsWith("data:image")) {
    return `
      <defs>
        <clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="16"/></clipPath>
      </defs>
      <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="16" fill="#F1F5F9" stroke="${NAVY}" stroke-width="2"/>
      <image href="${data.photoDataUrl}" x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
      <rect x="${x + size - 34}" y="${y + 8}" width="26" height="26" rx="6" fill="url(#holo)" opacity="0.85"/>
    `;
  }
  return `
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="16" fill="#E2E8F0" stroke="${NAVY}" stroke-width="2"/>
    <text x="${cx}" y="${y + size / 2 + 10}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${size * 0.22}" font-weight="700" fill="${NAVY}">${esc(initials(data.fullName))}</text>
  `;
}

function detailRow(label: string, value: string, y: number, accent: string): string {
  return `
    <text x="72" y="${y}" font-family="system-ui,sans-serif" font-size="11" font-weight="600" letter-spacing="1.2" fill="${MUTED}">${esc(label)}</text>
    <text x="72" y="${y + 22}" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${accent}">${esc(value)}</text>`;
}

function signatoryBlock(data: IdCardData, x: number, y: number, ink: string): string {
  if (!data.signatoryName) return "";
  const sig = data.signatorySignatureDataUrl
    ? `<image href="${data.signatorySignatureDataUrl}" x="${x}" y="${y}" width="110" height="36" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  return `${sig}
    <line x1="${x}" y1="${y + 44}" x2="${x + 150}" y2="${y + 44}" stroke="${ink}" stroke-width="1" opacity="0.4"/>
    <text x="${x}" y="${y + 62}" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="${ink}">${esc(data.signatoryName)}</text>
    <text x="${x}" y="${y + 78}" font-family="system-ui,sans-serif" font-size="9" fill="${MUTED}">${esc(data.signatoryDesignation ?? "Authorised Signatory")}</text>`;
}

function employeeFront(data: IdCardData): string {
  const company = (data.companyLegalName ?? "ACE DIGITAL").toUpperCase();
  const dept = data.teamName ?? "OPERATIONS";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${networkPattern("netL", NAVY)}
    <linearGradient id="holo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67E8F9"/>
      <stop offset="50%" stop-color="#A78BFA"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
    <linearGradient id="footerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="#163A5F"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="28" fill="#FAFBFC"/>
  <rect width="90" height="${H}" fill="url(#netL)"/>
  <rect x="${W - 90}" width="90" height="${H}" fill="url(#netL)"/>
  ${lanyardSlot()}
  <image href="${LOGO_URL}" x="${W / 2 - 48}" y="34" height="34" width="96" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W / 2}" y="88" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="800" letter-spacing="3" fill="${NAVY}">${esc(company)}</text>
  <line x1="120" y1="102" x2="${W - 120}" y2="102" stroke="${TEAL_LIGHT}" stroke-width="2"/>
  ${squarePhoto(data, W / 2, 118, 168)}
  <text x="${W / 2}" y="324" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="800" letter-spacing="1.5" fill="${INK}">${esc(data.fullName.toUpperCase())}</text>
  <text x="${W / 2}" y="354" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="${TEAL}">${esc((data.jobTitle ?? "TEAM MEMBER").toUpperCase())}</text>
  ${detailRow("EMPLOYEE ID", data.employeeCode, 390, NAVY)}
  ${detailRow("DOB", formatDob(data.dob), 440, NAVY)}
  ${detailRow("BLOOD GROUP", data.bloodGroup ?? "—", 490, NAVY)}
  ${detailRow("DEPARTMENT", dept.toUpperCase(), 540, NAVY)}
  <rect y="${H - 52}" width="${W}" height="52" rx="0" fill="url(#footerGrad)"/>
  <rect y="${H - 54}" width="${W}" height="3" fill="${TEAL_LIGHT}"/>
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" fill="#FFFFFF">EXPIRATION DATE: ${esc(data.expirationLabel ?? "DEC 2026")}</text>
</svg>`;
}

function employeeBack(data: IdCardData): string {
  const company = data.companyLegalName ?? "Ace Digital Private Limited";
  const qrSize = 200;
  const qrX = (W - qrSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${networkPattern("netB", TEAL)}</defs>
  <rect width="${W}" height="${H}" rx="28" fill="#FAFBFC"/>
  <rect width="${W}" height="120" fill="${NAVY}"/>
  ${lanyardSlot()}
  <image href="${LOGO_URL}" x="${W / 2 - 40}" y="38" height="28" width="80" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W / 2}" y="82" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#FFFFFF">${esc(company.toUpperCase())}</text>
  <text x="${W / 2}" y="148" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="${NAVY}">${esc(HQ_LINE)}</text>
  <text x="${W / 2}" y="172" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="${MUTED}">${esc(SUPPORT_EMAIL)} · ${esc(SUPPORT_WEB)}</text>
  <rect x="48" y="188" width="${W - 96}" height="1" fill="#E2E8F0"/>
  ${qrBlock(data, qrX, 210, qrSize)}
  <text x="${W / 2}" y="438" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="${MUTED}">
    Scan to verify at Ace Digital OS
  </text>
  <text x="${W / 2}" y="468" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8.5" fill="${MUTED}">
    <tspan x="${W / 2}" dy="0">This card remains the property of ${esc(company)}.</tspan>
    <tspan x="${W / 2}" dy="14">If found, return to HR or the address above.</tspan>
  </text>
  ${signatoryBlock(data, 56, 560, NAVY)}
  <text x="${W - 56}" y="640" text-anchor="end" font-family="system-ui,sans-serif" font-size="9" fill="${MUTED}">DATE</text>
  <line x1="${W - 160}" y1="648" x2="${W - 56}" y2="648" stroke="${NAVY}" stroke-width="1" opacity="0.35"/>
  <rect y="${H - 44}" width="${W}" height="44" fill="${NAVY}"/>
  <text x="${W / 2}" y="${H - 18}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="800" letter-spacing="3" fill="#FFFFFF">ACE DIGITAL SECURE ID</text>
</svg>`;
}

function internFront(data: IdCardData): string {
  const company = (data.companyLegalName ?? "ACE DIGITAL").toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${networkPattern("netI", TEAL)}
    <linearGradient id="intHdr" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#042F2E"/>
      <stop offset="100%" stop-color="${TEAL}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="28" fill="#F0FDFA"/>
  <rect width="90" height="${H}" fill="url(#netI)" opacity="0.5"/>
  <rect x="${W - 90}" width="90" height="${H}" fill="url(#netI)" opacity="0.5"/>
  ${lanyardSlot()}
  <rect x="36" y="30" width="120" height="32" rx="16" fill="url(#intHdr)"/>
  <text x="96" y="52" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="800" letter-spacing="3" fill="#FFFFFF">INTERN</text>
  <image href="${LOGO_URL}" x="${W / 2 - 44}" y="34" height="30" width="88" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W / 2}" y="88" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="800" letter-spacing="2" fill="${TEAL}">${esc(company)}</text>
  ${squarePhoto(data, W / 2, 108, 160)}
  <text x="${W / 2}" y="300" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" font-weight="800" fill="${INK}">${esc(data.fullName.toUpperCase())}</text>
  <text x="${W / 2}" y="328" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="${TEAL}">${esc((data.program ?? "INTERNSHIP PROGRAM").toUpperCase())}</text>
  <text x="${W / 2}" y="352" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="${MUTED}">${esc(data.university ?? "")}</text>
  ${detailRow("INTERN ID", data.employeeCode, 390, TEAL)}
  ${detailRow("MENTOR", data.mentorName ?? "ASSIGNED", 440, TEAL)}
  ${detailRow("DURATION", `${formatDob(data.startDate)} – ${formatDob(data.endDate)}`, 490, TEAL)}
  <rect y="${H - 52}" width="${W}" height="52" fill="url(#intHdr)"/>
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="1.2" fill="#FFFFFF">VALID UNTIL ${esc(data.expirationLabel ?? "PROGRAM END")}</text>
</svg>`;
}

function internBack(data: IdCardData): string {
  const company = data.companyLegalName ?? "Ace Digital Private Limited";
  const qrSize = 200;
  const qrX = (W - qrSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="28" fill="#042F2E"/>
  <rect x="32" y="32" width="${W - 64}" height="${H - 64}" rx="20" fill="#0F3D38" stroke="${TEAL_LIGHT}" stroke-width="1" opacity="0.9"/>
  ${lanyardSlot()}
  <text x="${W / 2}" y="88" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="${TEAL_LIGHT}">INTERN ACCESS CARD</text>
  <text x="${W / 2}" y="130" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#99F6E4">${esc(company)}</text>
  ${qrBlock(data, qrX, 160, qrSize)}
  <text x="${W / 2}" y="388" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#6EE7B7">Scan QR to verify intern status</text>
  <text x="56" y="430" font-family="system-ui,sans-serif" font-size="10" fill="#99F6E4">Emergency: ${esc(data.emergencyContactName ?? "—")} · ${esc(data.emergencyContactPhone ?? "—")}</text>
  ${signatoryBlock(data, 56, 500, TEAL_LIGHT)}
  <rect y="${H - 40}" width="${W}" height="40" fill="${TEAL}"/>
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
