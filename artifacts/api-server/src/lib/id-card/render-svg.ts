import type { IdCardData, IdCardPair } from "./types";

const W = 856;
const H = 540;
const LOGO_URL = "https://ace-digital-os.web.app/ace-logo.png";

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

function qrBlock(data: IdCardData, x: number, y: number, size: number): string {
  if (!data.qrSvg) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="8" fill="#FAF6F0"/>
      <text x="${x + size / 2}" y="${y + size / 2}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#5C554E">SCAN</text>`;
  }
  const inner = data.qrSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "");
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="8" fill="#FFFFFF"/>
    <svg x="${x + 4}" y="${y + 4}" width="${size - 8}" height="${size - 8}">${inner}</svg>`;
}

function signatoryBlock(data: IdCardData, x: number, y: number): string {
  if (!data.signatoryName) return "";
  const sig = data.signatorySignatureDataUrl
    ? `<image href="${data.signatorySignatureDataUrl}" x="${x}" y="${y}" width="120" height="44" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  return `${sig}
    <line x1="${x}" y1="${y + 52}" x2="${x + 160}" y2="${y + 52}" stroke="#8C8EF2" stroke-width="1"/>
    <text x="${x}" y="${y + 72}" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#E8E4FF">${esc(data.signatoryName)}</text>
    <text x="${x}" y="${y + 88}" font-family="system-ui,sans-serif" font-size="9" fill="#9CA3AF">${esc(data.signatoryDesignation ?? "")}</text>`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function photoClip(data: IdCardData, x: number, y: number, size: number): string {
  const clipId = `photo-${data.employeeCode.replace(/\W/g, "")}`;
  if (data.photoDataUrl && data.photoDataUrl.startsWith("data:image")) {
    return `
      <defs>
        <clipPath id="${clipId}"><circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2 - 2}"/></clipPath>
      </defs>
      <circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="#E8E4FF" stroke="#4B4ED3" stroke-width="3"/>
      <image href="${data.photoDataUrl}" x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
    `;
  }
  return `
    <circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="#E8E4FF" stroke="#4B4ED3" stroke-width="3"/>
    <text x="${x + size / 2}" y="${y + size / 2 + 12}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${size * 0.32}" font-weight="700" fill="#4B4ED3">${esc(initials(data.fullName))}</text>
  `;
}

function employeeFront(data: IdCardData): string {
  const accent = "#4B4ED3";
  const bg = "#FAF6F0";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="empGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4B4ED3"/>
      <stop offset="100%" stop-color="#8C8EF2"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="28" fill="${bg}"/>
  <rect width="${W}" height="88" rx="28" fill="url(#empGrad)"/>
  <rect y="60" width="${W}" height="28" fill="url(#empGrad)"/>
  <image href="${LOGO_URL}" x="36" y="24" height="40" width="120" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W - 36}" y="52" text-anchor="end" font-family="Georgia,serif" font-size="22" font-weight="700" fill="#FFFFFF">EMPLOYEE ID</text>
  ${photoClip(data, 56, 120, 168)}
  <text x="260" y="168" font-family="Georgia,serif" font-size="36" font-weight="700" fill="#1A1A1A">${esc(data.fullName)}</text>
  <text x="260" y="210" font-family="system-ui,sans-serif" font-size="20" fill="#5C554E">${esc(data.jobTitle ?? "Team Member")}</text>
  <text x="260" y="248" font-family="system-ui,sans-serif" font-size="16" fill="#7C7267">${esc(data.teamName ?? "Ace Digital")}</text>
  <rect x="260" y="272" width="220" height="44" rx="10" fill="rgba(75,78,211,0.08)" stroke="${accent}" stroke-width="1"/>
  <text x="276" y="300" font-family="Consolas,monospace" font-size="18" font-weight="700" fill="${accent}">${esc(data.employeeCode)}</text>
  <text x="56" y="${H - 48}" font-family="system-ui,sans-serif" font-size="14" fill="#7C7267">Blood group: <tspan font-weight="700" fill="#1A1A1A">${esc(data.bloodGroup ?? "—")}</tspan></text>
  <text x="${W - 56}" y="${H - 48}" text-anchor="end" font-family="system-ui,sans-serif" font-size="13" fill="#7C7267">Valid from ${esc(formatDate(data.startDate))}</text>
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="url(#empGrad)"/>
</svg>`;
}

function employeeBack(data: IdCardData): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="28" fill="#1A1A2E"/>
  <rect x="36" y="36" width="${W - 72}" height="${H - 72}" rx="16" fill="#252547" stroke="#4B4ED3" stroke-width="1" stroke-opacity="0.4"/>
  <image href="${LOGO_URL}" x="56" y="56" height="28" width="84" preserveAspectRatio="xMidYMid meet" opacity="0.9"/>
  <text x="56" y="120" font-family="system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#8C8EF2">EMERGENCY CONTACT</text>
  <text x="56" y="152" font-family="Georgia,serif" font-size="22" fill="#FFFFFF">${esc(data.emergencyContactName ?? "—")}</text>
  <text x="56" y="182" font-family="system-ui,sans-serif" font-size="16" fill="#C4B5FD">${esc(data.emergencyContactPhone ?? "—")}</text>
  <text x="56" y="240" font-family="system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#8C8EF2">OFFICIAL EMAIL</text>
  <text x="56" y="270" font-family="system-ui,sans-serif" font-size="15" fill="#E8E4FF">${esc(data.email)}</text>
  <rect x="56" y="300" width="${W - 112}" height="1" fill="#4B4ED3" opacity="0.3"/>
  <text x="56" y="320" font-family="system-ui,sans-serif" font-size="10" fill="#9CA3AF" width="${W - 280}">
    Property of Ace Digital. Scan QR to verify. If found, return to HR.
  </text>
  ${signatoryBlock(data, 56, H - 130)}
  ${qrBlock(data, W - 176, H - 176, 120)}
  <text x="${W - 116}" y="${H - 44}" text-anchor="middle" font-family="Consolas,monospace" font-size="11" font-weight="700" fill="#8C8EF2">${esc(data.employeeCode)}</text>
</svg>`;
}

function internFront(data: IdCardData): string {
  const accent = "#0D9488";
  const accent2 = "#2DD4BF";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="intGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#042F2E"/>
      <stop offset="50%" stop-color="#0F766E"/>
      <stop offset="100%" stop-color="#14B8A6"/>
    </linearGradient>
    <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#FFFFFF" opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" rx="28" fill="url(#intGrad)"/>
  <rect width="${W}" height="${H}" rx="28" fill="url(#dots)"/>
  <image href="${LOGO_URL}" x="36" y="28" height="36" width="108" preserveAspectRatio="xMidYMid meet"/>
  <rect x="${W - 200}" y="24" width="164" height="36" rx="18" fill="${accent2}"/>
  <text x="${W - 118}" y="48" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="800" letter-spacing="3" fill="#042F2E">INTERN</text>
  ${photoClip(data, 56, 108, 160)}
  <text x="248" y="156" font-family="Georgia,serif" font-size="34" font-weight="700" fill="#FFFFFF">${esc(data.fullName)}</text>
  <text x="248" y="196" font-family="system-ui,sans-serif" font-size="18" fill="#99F6E4">${esc(data.program ?? data.jobTitle ?? "Internship Program")}</text>
  <text x="248" y="228" font-family="system-ui,sans-serif" font-size="15" fill="#5EEAD4">${esc(data.university ?? data.teamName ?? "")}</text>
  <rect x="248" y="248" width="200" height="40" rx="10" fill="rgba(255,255,255,0.12)" stroke="${accent2}" stroke-width="1"/>
  <text x="264" y="274" font-family="Consolas,monospace" font-size="17" font-weight="700" fill="#FFFFFF">${esc(data.employeeCode)}</text>
  <text x="56" y="${H - 56}" font-family="system-ui,sans-serif" font-size="13" fill="#99F6E4">Mentor: <tspan fill="#FFFFFF" font-weight="600">${esc(data.mentorName ?? "Assigned at onboarding")}</tspan></text>
  <text x="${W - 56}" y="${H - 56}" text-anchor="end" font-family="system-ui,sans-serif" font-size="13" fill="#99F6E4">${esc(formatDate(data.startDate))} – ${esc(formatDate(data.endDate))}</text>
</svg>`;
}

function internBack(data: IdCardData): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="28" fill="#042F2E"/>
  <rect x="36" y="36" width="${W - 72}" height="${H - 72}" rx="16" fill="#0F3D38" stroke="#2DD4BF" stroke-width="1" stroke-opacity="0.35"/>
  <text x="56" y="80" font-family="system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#2DD4BF">INTERN ONBOARDING</text>
  <text x="56" y="118" font-family="Georgia,serif" font-size="20" fill="#FFFFFF">Ace Digital · Intern Access Card</text>
  <text x="56" y="160" font-family="system-ui,sans-serif" font-size="14" fill="#99F6E4">Program: ${esc(data.program ?? "—")}</text>
  <text x="56" y="188" font-family="system-ui,sans-serif" font-size="14" fill="#99F6E4">Duration: ${esc(formatDate(data.startDate))} to ${esc(formatDate(data.endDate))}</text>
  <text x="56" y="240" font-family="system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#2DD4BF">EMERGENCY</text>
  <text x="56" y="268" font-family="system-ui,sans-serif" font-size="16" fill="#FFFFFF">${esc(data.emergencyContactName ?? "—")} · ${esc(data.emergencyContactPhone ?? "—")}</text>
  <text x="56" y="300" font-family="system-ui,sans-serif" font-size="10" fill="#6EE7B7" width="${W - 280}">
    Carry on premises. Scan QR to verify. Report loss to HR immediately.
  </text>
  ${signatoryBlock(data, 56, H - 130)}
  ${qrBlock(data, W - 176, H - 176, 120)}
  <text x="${W - 116}" y="${H - 44}" text-anchor="middle" font-family="Consolas,monospace" font-size="11" font-weight="700" fill="#2DD4BF">${esc(data.employeeCode)}</text>
</svg>`;
}

export function renderIdCardPair(data: IdCardData): IdCardPair {
  const variant = data.variant;
  if (variant === "intern") {
    return { variant, frontSvg: internFront(data), backSvg: internBack(data) };
  }
  return { variant, frontSvg: employeeFront(data), backSvg: employeeBack(data) };
}

export function svgToDataUrl(svg: string): string {
  const b64 = Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}
