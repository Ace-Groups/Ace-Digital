import type { User } from "@workspace/db";

const DEFAULT_HQ = "Ace Digital HQ, Coimbatore, Tamil Nadu 641004";

function escVcard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function normalizeTel(phone: string): string {
  return phone.replace(/[^\d+]/g, "").trim();
}

export type BuildVcardOptions = {
  user: User;
  orgName: string;
  employeeCode: string;
  companyWebsite: string;
  companyAddress?: string;
  verifyUrl: string;
};

export function buildVcard(opts: BuildVcardOptions): string {
  const { user, orgName, employeeCode, companyWebsite, verifyUrl } = opts;
  const name = user.fullName.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const last = parts.pop() ?? "";
  const first = parts.join(" ") || last;
  const email = (user.publicEmail ?? user.email)?.trim();
  const phone = normalizeTel(user.publicPhone ?? user.phone ?? "");
  const address = (user.officeAddress?.trim() || opts.companyAddress?.trim() || DEFAULT_HQ);
  const website = companyWebsite.replace(/\/$/, "");
  const noteParts = [
    "Ace Digital verified employee.",
    `Employee ID: ${employeeCode}.`,
    `Verify: ${verifyUrl}`,
  ];

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "PRODID:-//Ace Digital//Ace Verify//EN",
    `FN:${escVcard(name)}`,
    `N:${escVcard(last)};${escVcard(first)};;;`,
    `ORG:${escVcard(orgName)}`,
    user.jobTitle ? `TITLE:${escVcard(user.jobTitle)}` : null,
    phone ? `TEL;TYPE=CELL,WORK:${escVcard(phone)}` : null,
    email ? `EMAIL;TYPE=INTERNET,WORK:${escVcard(email)}` : null,
    `ADR;TYPE=WORK:;;${escVcard(address)};;;;`,
    `URL;TYPE=WORK:${escVcard(website)}`,
    user.linkedinUrl ? `URL;TYPE=PROFILE:${escVcard(user.linkedinUrl)}` : null,
    user.portfolioUrl && user.portfolioUrl !== user.linkedinUrl
      ? `URL:${escVcard(user.portfolioUrl)}`
      : null,
    `URL:${escVcard(verifyUrl)}`,
    `NOTE:${escVcard(noteParts.join(" "))}`,
    `UID:${escVcard(employeeCode)}@ace-digital.verify`,
    `REV:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    "END:VCARD",
  ].filter(Boolean);

  return `${lines.join("\r\n")}\r\n`;
}
