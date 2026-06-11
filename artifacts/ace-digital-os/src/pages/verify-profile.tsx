import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  Linkedin,
  UserPlus,
  Globe,
  ShieldCheck,
} from "lucide-react";
import {
  fetchPublicVerify,
  fetchPublicVerifyByCode,
  type VerifyEmployeeResponse,
} from "@/lib/credentials-api";
import { resolveApiUrl } from "@/lib/api-config";
import { VerifyShell } from "@/components/verify/VerifyShell";
import { VerifyCertificatePanel } from "@/components/verify/VerifyCertificatePanel";

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

  const scannedLabel = data?.scannedAt ? new Date(data.scannedAt).toLocaleString() : "";
  const subtitle = data?.certificate ? "Ace Verify · Profile & certificate" : "Ace Digital Secure ID";
  const vcardCode = data?.employeeCode ?? employeeCode;
  const vcardUrl = vcardCode
    ? resolveApiUrl(`/api/v1/public/v/verification/${encodeURIComponent(vcardCode)}.vcf`)
    : null;
  const showPublicLinks =
    data?.status === "active" && data.publicProfile?.enabled && data.mode === "public";

  return (
    <VerifyShell subtitle={subtitle}>
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      ) : !data || data.status === "not_found" ? (
        <div className="verify-card p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-4 font-semibold">Verification unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">This ID could not be verified.</p>
        </div>
      ) : data.status === "disabled" ? (
        <div className="verify-card p-8 text-center">
          <p className="font-semibold">Verification disabled</p>
        </div>
      ) : (
        <div className="verify-card">
          <div className="verify-card-hero">
            <ShieldCheck className="verify-card-hero-icon" aria-hidden />
            <span>Official Ace Digital verification</span>
          </div>

          <div className="flex flex-col items-center gap-4 p-8 text-center">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt="" className="verify-photo" />
            ) : (
              <div className="verify-photo">
                {data.fullName
                  ?.split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{data.fullName}</h1>
              <p className="text-sm text-muted-foreground">{data.jobTitle}</p>
              <p className="mt-2 font-mono text-xs font-semibold tracking-wide text-primary">
                {data.employeeCode}
              </p>
            </div>

            {data.status === "active" ? (
              <div className="verify-badge verify-badge--active">
                <CheckCircle2 className="h-5 w-5" />
                {data.variant === "intern" ? "ACTIVE INTERN" : "ACTIVE EMPLOYEE"}
              </div>
            ) : (
              <div className="verify-badge verify-badge--inactive">
                <AlertTriangle className="h-5 w-5" />
                INACTIVE / RETURN CARD
              </div>
            )}

            <p className="text-xs text-muted-foreground">Verified at {scannedLabel}</p>
            {data.status === "inactive" && data.inactiveMessage && (
              <p className="text-sm text-red-700">{data.inactiveMessage}</p>
            )}
          </div>

          {data.certificate && <VerifyCertificatePanel cert={data.certificate} />}

          {data.status === "active" && vcardUrl && (
            <div className="verify-contact">
              <p className="verify-contact-title">Save this contact</p>
              <p className="verify-contact-copy">
                Add {data.fullName?.split(" ")[0] ?? "this employee"} to your phone in one tap.
              </p>
              <a className="verify-contact-btn" href={vcardUrl} download>
                <UserPlus className="h-5 w-5" />
                Add to Contacts
              </a>
            </div>
          )}

          {showPublicLinks && (
            <div className="verify-nexme">
              {data.publicProfile?.bio && (
                <p className="text-center text-sm text-muted-foreground">{data.publicProfile.bio}</p>
              )}
              <div className="verify-actions">
                {data.publicProfile?.publicPhone && (
                  <a href={`tel:${data.publicProfile.publicPhone}`}>
                    <Phone className="h-4 w-4" /> Call
                  </a>
                )}
                {data.publicProfile?.publicEmail && (
                  <a href={`mailto:${data.publicProfile.publicEmail}`}>
                    <Mail className="h-4 w-4" /> Email
                  </a>
                )}
                {data.publicProfile?.linkedinUrl && (
                  <a href={data.publicProfile.linkedinUrl} target="_blank" rel="noreferrer">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                )}
                {data.publicProfile?.portfolioUrl && (
                  <a href={data.publicProfile.portfolioUrl} target="_blank" rel="noreferrer">
                    <Globe className="h-4 w-4" /> Portfolio
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </VerifyShell>
  );
}
