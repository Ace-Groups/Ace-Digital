import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  Linkedin,
  Globe,
  ShieldCheck,
  BadgeCheck,
  Building2,
} from "lucide-react";
import {
  fetchPublicVerify,
  fetchPublicVerifyByCode,
  type VerifyEmployeeResponse,
} from "@/lib/credentials-api";
import { resolveApiUrl } from "@/lib/api-config";
import { VerifyShell } from "@/components/verify/VerifyShell";
import { VerifyCertificatePanel } from "@/components/verify/VerifyCertificatePanel";
import { AddContactButton } from "@/components/verify/AddContactButton";

function useVerifyQuery(searchKey: string) {
  const [, slugParams] = useRoute("/v/:slug");
  const [, codeParams] = useRoute("/v/verification/:employeeCode");
  const slug = slugParams?.slug ?? "";
  const employeeCode = codeParams?.employeeCode ?? "";
  return { slug, employeeCode, searchKey };
}

export default function VerifyProfilePage() {
  const searchKey = typeof window !== "undefined" ? window.location.search : "";
  const { slug, employeeCode } = useVerifyQuery(searchKey);
  const [data, setData] = useState<VerifyEmployeeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug && !employeeCode) return;
    const q = new URLSearchParams(searchKey);
    const opts = {
      kiosk: q.get("kiosk") ?? undefined,
      cert: q.get("cert") ?? undefined,
      certSig: q.get("s") ?? undefined,
    };
    setLoading(true);
    const request = employeeCode
      ? fetchPublicVerifyByCode(employeeCode, opts)
      : fetchPublicVerify(slug, opts);
    void request.then(setData).finally(() => setLoading(false));
  }, [slug, employeeCode, searchKey]);

  useEffect(() => {
    if (!data?.verifyPath || employeeCode || slug === "verification") return;
    const next = `${data.verifyPath}${searchKey}`;
    window.history.replaceState(null, "", next);
  }, [data?.verifyPath, employeeCode, slug, searchKey]);

  const scannedLabel = data?.scannedAt ? new Date(data.scannedAt).toLocaleString() : "";
  const vcardCode = data?.employeeCode ?? employeeCode;
  const vcardUrl = vcardCode
    ? resolveApiUrl(`/api/v1/public/v/verification/${encodeURIComponent(vcardCode)}.vcf`)
    : null;
  const showPublicLinks =
    data?.status === "active" && data.publicProfile?.enabled && data.mode === "public";
  const company = data?.companyLegalName ?? "Ace Digital";

  return (
    <VerifyShell>
      {loading ? (
        <div className="verify-loading">
          <Loader2 className="verify-loading-spinner" />
          <p>Verifying identity…</p>
        </div>
      ) : !data || data.status === "not_found" ? (
        <div className="verify-card verify-card--error">
          <AlertTriangle className="verify-error-icon" />
          <p className="verify-error-title">Verification unavailable</p>
          <p className="verify-error-copy">This ID could not be verified. The link may be invalid or expired.</p>
        </div>
      ) : data.status === "disabled" ? (
        <div className="verify-card verify-card--error">
          <p className="verify-error-title">Verification disabled</p>
        </div>
      ) : (
        <div className="verify-pass">
          <div className="verify-pass-glow" aria-hidden />

          <header className="verify-pass-header">
            <ShieldCheck className="verify-pass-header-icon" aria-hidden />
            <div>
              <p className="verify-pass-kicker">Ace Digital Secure ID</p>
              <p className="verify-pass-company">{company}</p>
            </div>
          </header>

          <div className="verify-pass-body">
            <div className="verify-pass-photo-wrap">
              <div className="verify-pass-photo-ring" aria-hidden />
              {data.photoUrl ? (
                <img src={data.photoUrl} alt="" className="verify-pass-photo" />
              ) : (
                <div className="verify-pass-photo verify-pass-photo--initials">
                  {data.fullName
                    ?.split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </div>
              )}
            </div>

            <div className="verify-pass-identity">
              <h1 className="verify-pass-name">{data.fullName}</h1>
              <p className="verify-pass-title">{data.jobTitle}</p>
              <div className="verify-pass-code">
                <BadgeCheck className="verify-pass-code-icon" aria-hidden />
                <span>{data.employeeCode}</span>
              </div>
            </div>

            {data.status === "active" ? (
              <div className="verify-pass-status verify-pass-status--active">
                <CheckCircle2 className="h-5 w-5" />
                {data.variant === "intern" ? "Active intern" : "Active employee"}
              </div>
            ) : (
              <div className="verify-pass-status verify-pass-status--inactive">
                <AlertTriangle className="h-5 w-5" />
                Inactive — return card to HR
              </div>
            )}

            {data.status === "inactive" && data.inactiveMessage && (
              <p className="verify-pass-warning">{data.inactiveMessage}</p>
            )}

            {data.status === "active" && vcardUrl && (
              <div className="verify-pass-cta">
                <AddContactButton
                  vcardUrl={vcardUrl}
                  filename={`${vcardCode ?? "contact"}.vcf`}
                  label="Add to Contacts"
                />
                <p className="verify-pass-cta-hint">
                  Opens your phone&apos;s contact app with name, phone, email, company address, employee ID, and website.
                </p>
              </div>
            )}

            {showPublicLinks && (
              <div className="verify-pass-links">
                {data.publicProfile?.publicPhone && (
                  <a className="verify-pass-link" href={`tel:${data.publicProfile.publicPhone}`}>
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}
                {data.publicProfile?.publicEmail && (
                  <a className="verify-pass-link" href={`mailto:${data.publicProfile.publicEmail}`}>
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                )}
                {data.publicProfile?.linkedinUrl && (
                  <a
                    className="verify-pass-link"
                    href={data.publicProfile.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                )}
                {data.publicProfile?.portfolioUrl && (
                  <a
                    className="verify-pass-link"
                    href={data.publicProfile.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Globe className="h-4 w-4" />
                    Portfolio
                  </a>
                )}
              </div>
            )}

            {data.publicProfile?.bio && showPublicLinks && (
              <p className="verify-pass-bio">{data.publicProfile.bio}</p>
            )}
          </div>

          <footer className="verify-pass-footer">
            <Building2 className="verify-pass-footer-icon" aria-hidden />
            <div>
              <p className="verify-pass-footer-label">Verified by Ace Digital</p>
              <p className="verify-pass-footer-time">{scannedLabel}</p>
            </div>
          </footer>

          {data.certificate && <VerifyCertificatePanel cert={data.certificate} />}
        </div>
      )}
    </VerifyShell>
  );
}
