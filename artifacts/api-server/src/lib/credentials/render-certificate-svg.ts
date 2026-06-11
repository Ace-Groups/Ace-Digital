import QRCode from "qrcode";

export type CertificateRenderData = {
  recipientName: string;
  program: string | null;
  university: string | null;
  startDate: string | null;
  endDate: string | null;
  certificateCode: string;
  issuedAt: string;
  companyLegalName: string;
  companySealDataUrl: string | null;
  issuerName: string;
  issuerDesignation: string;
  issuerSignatureDataUrl: string | null;
  verifyUrl: string;
};

const W = 1240;
const H = 1754;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export async function renderCertificateSvg(data: CertificateRenderData): Promise<string> {
  const qrSvg = await QRCode.toString(data.verifyUrl, {
    type: "svg",
    margin: 0,
    width: 140,
    color: { dark: "#1A1A2E", light: "#FFFFFF" },
  });
  const qrInner = qrSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "");

  const sealBlock = data.companySealDataUrl
    ? `<image href="${data.companySealDataUrl}" x="100" y="${H - 320}" width="140" height="140" preserveAspectRatio="xMidYMid meet"/>`
    : `<circle cx="170" cy="${H - 250}" r="60" fill="none" stroke="#4B4ED3" stroke-width="3"/>
       <text x="170" y="${H - 245}" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="#4B4ED3">ACE</text>
       <text x="170" y="${H - 228}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#4B4ED3">DIGITAL</text>`;

  const sigBlock = data.issuerSignatureDataUrl
    ? `<image href="${data.issuerSignatureDataUrl}" x="${W - 380}" y="${H - 340}" width="180" height="70" preserveAspectRatio="xMidYMid meet"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4B4ED3"/>
      <stop offset="100%" stop-color="#8C8EF2"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#FAF6F0"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="24" fill="#FFFFFF" stroke="url(#borderGrad)" stroke-width="4"/>
  <text x="${W / 2}" y="200" text-anchor="middle" font-family="Georgia,serif" font-size="52" font-weight="700" fill="#1A1A2E" letter-spacing="2">Certificate of Internship</text>
  <text x="${W / 2}" y="250" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#5C554E">Completion</text>
  <line x1="320" y1="290" x2="${W - 320}" y2="290" stroke="#E8E4FF" stroke-width="2"/>
  <text x="${W / 2}" y="360" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#7C7267">This is to certify that</text>
  <text x="${W / 2}" y="440" text-anchor="middle" font-family="Georgia,serif" font-size="56" font-weight="700" fill="#4B4ED3">${esc(data.recipientName)}</text>
  <text x="${W / 2}" y="520" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#1A1A2E">
    has successfully completed the internship program
  </text>
  <text x="${W / 2}" y="570" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" font-weight="600" fill="#4B4ED3">${esc(data.program ?? "Internship Program")}</text>
  ${data.university ? `<text x="${W / 2}" y="615" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#5C554E">${esc(data.university)}</text>` : ""}
  <text x="${W / 2}" y="680" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" fill="#7C7267">
    Duration: ${esc(formatDate(data.startDate))} to ${esc(formatDate(data.endDate))}
  </text>
  <text x="${W / 2}" y="760" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" fill="#5C554E" width="${W - 200}">
    During this period, the intern demonstrated dedication, professionalism, and a strong commitment to learning.
    We wish them continued success in their future endeavors.
  </text>
  ${sealBlock}
  ${sigBlock}
  <line x1="${W - 380}" y1="${H - 250}" x2="${W - 120}" y2="${H - 250}" stroke="#1A1A2E" stroke-width="1"/>
  <text x="${W - 250}" y="${H - 220}" text-anchor="middle" font-family="Georgia,serif" font-size="20" font-weight="700" fill="#1A1A2E">${esc(data.issuerName)}</text>
  <text x="${W - 250}" y="${H - 190}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#5C554E">${esc(data.issuerDesignation)}</text>
  <text x="${W - 250}" y="${H - 160}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#7C7267">${esc(data.companyLegalName)}</text>
  <text x="${W - 250}" y="${H - 130}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#7C7267">Issued ${esc(formatDate(data.issuedAt))}</text>
  <rect x="100" y="${H - 180}" width="160" height="160" fill="#FFFFFF"/>
  <svg x="100" y="${H - 180}" width="140" height="140">${qrInner}</svg>
  <text x="180" y="${H - 20}" text-anchor="middle" font-family="Consolas,monospace" font-size="13" fill="#4B4ED3">${esc(data.certificateCode)}</text>
  <text x="${W / 2}" y="${H - 50}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#9CA3AF">Verify at ${esc(data.verifyUrl)}</text>
</svg>`;
}
