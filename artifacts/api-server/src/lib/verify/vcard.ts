import type { User } from "@workspace/db";

function escVcard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function buildVcard(user: User, orgName: string): string {
  const name = user.fullName;
  const parts = name.split(/\s+/).filter(Boolean);
  const last = parts.pop() ?? "";
  const first = parts.join(" ") || last;
  const email = user.publicEmail ?? user.email;
  const phone = user.publicPhone ?? user.phone ?? "";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escVcard(name)}`,
    `N:${escVcard(last)};${escVcard(first)};;;`,
    `ORG:${escVcard(orgName)}`,
    user.jobTitle ? `TITLE:${escVcard(user.jobTitle)}` : null,
    email ? `EMAIL;TYPE=WORK:${escVcard(email)}` : null,
    phone ? `TEL;TYPE=WORK:${escVcard(phone)}` : null,
    user.officeAddress ? `ADR;TYPE=WORK:;;${escVcard(user.officeAddress)};;;;` : null,
    user.linkedinUrl ? `URL:${escVcard(user.linkedinUrl)}` : null,
    user.portfolioUrl && user.portfolioUrl !== user.linkedinUrl
      ? `URL:${escVcard(user.portfolioUrl)}`
      : null,
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}
