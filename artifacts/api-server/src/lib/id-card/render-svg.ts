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
const BORDER = "#E2E8F0";
const MARGIN = 56;
const HR_EMAIL = "hr@acedigital.cc";
const HR_PHONE = "+91 90871 72072";
const WEBSITE = "acedigital.cc";
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return ["—"];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function cardShell(id: string, fill = "#FFFFFF"): string {
  return `
    <defs>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;display=swap');
      </style>
      <linearGradient id="${id}Footer" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${NAVY}"/>
        <stop offset="100%" stop-color="#123456"/>
      </linearGradient>
      <linearGradient id="${id}Accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${TEAL_LINE}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${TEAL_LINE}"/>
        <stop offset="100%" stop-color="${TEAL_LINE}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" rx="24" fill="${fill}"/>
    <rect x="0" y="0" width="${W}" height="6" fill="url(#${id}Accent)"/>
    <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#${id}Accent)"/>`;
}

function brandHeader(y: number, compact = false): string {
  const logoW = compact ? 88 : 104;
  const logoH = compact ? 38 : 44;
  const logoX = W / 2 - logoW / 2;
  const titleSize = compact ? 14 : 15;
  const tagSize = compact ? 8 : 8.5;
  return `
    <image href="${LOGO}" x="${logoX}" y="${y}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>
    <text x="${W / 2}" y="${y + logoH + 18}" text-anchor="middle" font-family="${FONT}" font-size="${titleSize}" font-weight="800" letter-spacing="3.2" fill="${NAVY}">ACE DIGITAL</text>
    <text x="${W / 2}" y="${y + logoH + 34}" text-anchor="middle" font-family="${FONT}" font-size="${tagSize}" font-weight="700" letter-spacing="1.8" fill="${TEAL}">INSPIRING YOUTH · EMPOWERING NATION</text>
    <line x1="${MARGIN}" y1="${y + logoH + 44}" x2="${W - MARGIN}" y2="${y + logoH + 44}" stroke="${TEAL_LINE}" stroke-width="2" stroke-linecap="round"/>`;
}

function portraitPhoto(data: IdCardData, y: number, w: number, h: number): string {
  const x = (W - w) / 2;
  const clip = `ph-${data.employeeCode.replace(/\W/g, "")}`;
  const inner = data.photoDataUrl?.startsWith("data:image")
    ? `<image href="${data.photoDataUrl}" x="${x}" y="${y}" width="${w}" height="${h}" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/>`
    : `<text x="${W / 2}" y="${y + h / 2 + 10}" text-anchor="middle" font-family="${FONT}" font-size="${Math.round(h * 0.22)}" font-weight="800" fill="${NAVY}">${esc(initials(data.fullName))}</text>`;
  return `
    <defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/></clipPath></defs>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#F8FAFC" stroke="${NAVY}" stroke-width="2"/>
    ${inner}`;
}

/** Label left, value right — single baseline alignment */
function dataRow(label: string, value: string, y: number): string {
  return `
    <text x="${MARGIN}" y="${y}" font-family="${FONT}" font-size="9" font-weight="700" letter-spacing="1.4" fill="${MUTED}">${esc(label)}</text>
    <text x="${W - MARGIN}" y="${y}" text-anchor="end" font-family="${FONT}" font-size="12" font-weight="700" fill="${INK}">${esc(value)}</text>
    <line x1="${MARGIN}" y1="${y + 10}" x2="${W - MARGIN}" y2="${y + 10}" stroke="${BORDER}" stroke-width="1"/>`;
}

const LABEL_COL_W = 84;
const VALUE_X = MARGIN + LABEL_COL_W + 6;

function backField(label: string, lines: string[], startY: number): { svg: string; height: number } {
  const labelY = startY + 12;
  let valueSvg = `<text x="${VALUE_X}" y="${labelY}" font-family="${FONT}" font-size="10.5" font-weight="600" fill="${INK}">${esc(lines[0] ?? "—")}</text>`;
  lines.slice(1).forEach((line, i) => {
    valueSvg += `<text x="${VALUE_X}" y="${labelY + (i + 1) * 14}" font-family="${FONT}" font-size="10.5" font-weight="600" fill="${INK}">${esc(line)}</text>`;
  });
  const height = Math.max(30, 18 + lines.length * 14);
  const ruleY = startY + height - 4;
  return {
    height,
    svg: `
    <text x="${MARGIN}" y="${labelY}" font-family="${FONT}" font-size="9" font-weight="800" letter-spacing="1.2" fill="${NAVY}">${esc(label)}</text>
    ${valueSvg}
    <line x1="${MARGIN}" y1="${ruleY}" x2="${W - MARGIN}" y2="${ruleY}" stroke="${BORDER}" stroke-width="0.75"/>`,
  };
}

function formatPhone(phone: string | null | undefined): string {
  const p = phone?.trim();
  if (!p) return HR_PHONE;
  return p;
}

function qrBlock(data: IdCardData, size: number, y: number): string {
  const pad = 12;
  const box = size + pad * 2;
  const x = (W - box) / 2;
  if (!data.qrSvg) {
    return `<rect x="${x}" y="${y}" width="${box}" height="${box}" rx="12" fill="#fff" stroke="${BORDER}"/>`;
  }
  const inner = data.qrSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "");
  const viewBoxMatch = data.qrSvg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 37 37";
  return `
    <rect x="${x}" y="${y}" width="${box}" height="${box}" rx="14" fill="#FFFFFF" stroke="${TEAL_LINE}" stroke-width="2"/>
    <svg x="${x + pad}" y="${y + pad}" width="${size}" height="${size}" viewBox="${viewBox}">${inner}</svg>`;
}

function footerBar(text: string, gradId: string): string {
  return `
    <rect y="${H - 52}" width="${W}" height="3" fill="${TEAL_LINE}"/>
    <rect y="${H - 49}" width="${W}" height="49" fill="url(#${gradId}Footer)"/>
    <text x="${W / 2}" y="${H - 20}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="700" letter-spacing="2" fill="#FFFFFF">${esc(text)}</text>`;
}

function employeeFront(data: IdCardData): string {
  const dept = (data.teamName ?? "Operations").toUpperCase();
  const photoY = 142; // Shifted down for balance
  const photoW = 176; // Made photo wider
  const photoH = 212; // Made photo taller
  const infoStart = photoY + photoH + 36; // 142 + 212 + 36 = 390
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${cardShell("front")}
  ${brandHeader(24)}
  ${portraitPhoto(data, photoY, photoW, photoH)}
  <text x="${W / 2}" y="${infoStart}" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="800" letter-spacing="1.5" fill="${INK}">${esc(data.fullName.toUpperCase())}</text>
  <text x="${W / 2}" y="${infoStart + 28}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" letter-spacing="2" fill="${TEAL}">${esc((data.jobTitle ?? "TEAM MEMBER").toUpperCase())}</text>
  <line x1="${MARGIN}" y1="${infoStart + 42}" x2="${W - MARGIN}" y2="${infoStart + 42}" stroke="${BORDER}" stroke-width="1"/>
  ${dataRow("EMPLOYEE ID", data.employeeCode, infoStart + 72)}
  ${dataRow("DATE OF BIRTH", formatDob(data.dob), infoStart + 112)}
  ${dataRow("BLOOD GROUP", data.bloodGroup ?? "—", infoStart + 152)}
  ${dataRow("DEPARTMENT", dept, infoStart + 192)}
  ${footerBar(`EXPIRATION DATE: ${data.expirationLabel ?? "DEC 2026"}`, "front")}
</svg>`;
}

function employeeBack(data: IdCardData): string {
  const company = data.companyLegalName ?? "Ace Digital Private Limited";
  const phone = formatPhone(data.phone);
  const email = data.email?.trim() || HR_EMAIL;
  const addressLines = data.addressLine?.trim()
    ? wrapText(data.addressLine, 40)
    : ["—"];
  const qrSize = 176;
  const sigY = 662;
  const issueYear = data.issuedYear ?? String(new Date().getFullYear());

  let y = 112;
  const fields = [
    { label: "DOB", lines: [formatDob(data.dob)] },
    { label: "ADDRESS", lines: addressLines },
    { label: "PHONE", lines: [phone] },
    { label: "EMAIL", lines: [email] },
    { label: "WEBSITE", lines: [WEBSITE] },
  ];

  let fieldsSvg = "";
  for (const field of fields) {
    const block = backField(field.label, field.lines, y);
    fieldsSvg += block.svg;
    y += block.height;
  }
  const qrY = y + 14;

  const sig = data.signatorySignatureDataUrl
    ? `<image href="${data.signatorySignatureDataUrl}" x="${MARGIN}" y="${sigY - 8}" width="128" height="40" preserveAspectRatio="xMidYMid meet"/>`
    : `<path d="M${MARGIN + 4} ${sigY + 22} Q${MARGIN + 44} ${sigY + 6} ${MARGIN + 84} ${sigY + 18} T${MARGIN + 124} ${sigY + 14}" fill="none" stroke="${NAVY}" stroke-width="1.1" opacity="0.5"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${cardShell("back")}
  ${brandHeader(24, true)}
  ${fieldsSvg}
  ${qrBlock(data, qrSize, qrY)}
  <text x="${W / 2}" y="${qrY + qrSize + 36}" text-anchor="middle" font-family="${FONT}" font-size="8.5" fill="${MUTED}">
    <tspan x="${W / 2}" dy="0">This card remains the property of ${esc(company)} and must be</tspan>
    <tspan x="${W / 2}" dy="13">returned upon termination. If found, return to HR at the address above.</tspan>
  </text>
  ${sig}
  <line x1="${MARGIN}" y1="${sigY + 38}" x2="${MARGIN + 148}" y2="${sigY + 38}" stroke="${NAVY}" stroke-width="0.9" opacity="0.35"/>
  <text x="${MARGIN}" y="${sigY + 52}" font-family="${FONT}" font-size="8" font-weight="700" letter-spacing="1.1" fill="${MUTED}">AUTHORIZED SIGNATURE</text>
  ${data.signatoryName ? `<text x="${MARGIN}" y="${sigY + 66}" font-family="${FONT}" font-size="9.5" font-weight="700" fill="${NAVY}">${esc(data.signatoryName)}</text>` : ""}
  <line x1="${W - MARGIN - 100}" y1="${sigY + 38}" x2="${W - MARGIN}" y2="${sigY + 38}" stroke="${NAVY}" stroke-width="0.9" opacity="0.35"/>
  <text x="${W - MARGIN - 100}" y="${sigY + 52}" font-family="${FONT}" font-size="8" font-weight="700" letter-spacing="1.1" fill="${MUTED}">DATE</text>
  <text x="${W - MARGIN}" y="${sigY + 66}" text-anchor="end" font-family="${FONT}" font-size="10" font-weight="700" fill="${INK}">${esc(issueYear)}</text>
  ${footerBar("ACE DIGITAL SECURE ID", "back")}
</svg>`;
}

function internFront(data: IdCardData): string {
  const dept = (data.program ?? "Internship Program").toUpperCase();
  const photoY = 152; // Shifted down for balance
  const photoW = 176; // Made photo wider
  const photoH = 212; // Made photo taller
  const infoStart = photoY + photoH + 36; // 152 + 212 + 36 = 400
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${cardShell("front", "#F0FDFA")}
  <rect x="${MARGIN}" y="28" width="96" height="26" rx="13" fill="${TEAL}"/>
  <text x="${MARGIN + 48}" y="46" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="800" letter-spacing="2" fill="#fff">INTERN</text>
  ${brandHeader(36)}
  ${portraitPhoto(data, photoY, photoW, photoH)}
  <text x="${W / 2}" y="${infoStart}" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK}">${esc(data.fullName.toUpperCase())}</text>
  <text x="${W / 2}" y="${infoStart + 26}" text-anchor="middle" font-family="${FONT}" font-size="10.5" font-weight="700" letter-spacing="2" fill="${TEAL}">${esc(dept)}</text>
  <line x1="${MARGIN}" y1="${infoStart + 38}" x2="${W - MARGIN}" y2="${infoStart + 38}" stroke="${BORDER}" stroke-width="1"/>
  ${dataRow("INTERN ID", data.employeeCode, infoStart + 74)}
  ${dataRow("MENTOR", data.mentorName ?? "ASSIGNED", infoStart + 120)}
  ${dataRow("UNIVERSITY", data.university ?? "—", infoStart + 166)}
  ${footerBar(`VALID UNTIL ${data.expirationLabel ?? "PROGRAM END"}`, "front")}
</svg>`;
}

function internBack(data: IdCardData): string {
  const company = data.companyLegalName ?? "Ace Digital Private Limited";
  const qrSize = 180;
  const qrY = 168;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${cardShell("back", "#042F2E")}
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="18" fill="#0C3D38" stroke="${TEAL_LINE}" stroke-width="1.5"/>
  <image href="${LOGO}" x="${W / 2 - 44}" y="48" width="88" height="36" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W / 2}" y="100" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="800" letter-spacing="2" fill="#99F6E4">INTERN ACCESS · ACE DIGITAL</text>
  <text x="${W / 2}" y="120" text-anchor="middle" font-family="${FONT}" font-size="9" fill="#6EE7B7">${esc(company)}</text>
  ${qrBlock(data, qrSize, qrY)}
  <text x="${W / 2}" y="${qrY + qrSize + 36}" text-anchor="middle" font-family="${FONT}" font-size="9" fill="#99F6E4">Scan to verify intern status</text>
  <text x="${MARGIN}" y="430" font-family="${FONT}" font-size="10" fill="#99F6E4">Emergency: ${esc(data.emergencyContactName ?? "—")} · ${esc(data.emergencyContactPhone ?? "—")}</text>
  ${footerBar("ACE DIGITAL INTERN ID", "back")}
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
