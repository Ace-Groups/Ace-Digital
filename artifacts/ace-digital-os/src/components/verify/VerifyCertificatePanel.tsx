import { CheckCircle2, XCircle, Award } from "lucide-react";
import type { CertificateVerifyPayload } from "@/lib/credentials-api";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function VerifyCertificatePanel({ cert }: { cert: CertificateVerifyPayload }) {
  if (cert.status === "not_found" || cert.status === "invalid_sig" || cert.status === "mismatch") {
    return (
      <div className="verify-cert-panel verify-cert-panel--error">
        <XCircle className="h-5 w-5" />
        <p className="font-semibold">Certificate could not be verified</p>
      </div>
    );
  }

  const isValid = cert.valid && cert.status === "active";

  return (
    <div className="verify-cert-panel">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Award className="h-4 w-4" />
        Internship certificate
      </div>
      {isValid ? (
        <div className="verify-badge verify-badge--active mt-3">
          <CheckCircle2 className="h-5 w-5" />
          VALID CERTIFICATE
        </div>
      ) : (
        <div className="verify-badge verify-badge--inactive mt-3">
          <XCircle className="h-5 w-5" />
          {cert.status === "revoked" ? "REVOKED" : "INVALID"}
        </div>
      )}
      <p className="mt-3 font-mono text-sm text-primary">{cert.certificateCode}</p>
      <p className="text-sm text-muted-foreground">{cert.program}</p>
      {cert.university && <p className="text-sm">{cert.university}</p>}
      <p className="text-sm text-muted-foreground">
        {fmt(cert.startDate)} — {fmt(cert.endDate)}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Issued {fmt(cert.issuedAt)} by {cert.issuerName}
        {cert.issuerDesignation ? ` · ${cert.issuerDesignation}` : ""}
      </p>
      {cert.status === "revoked" && (
        <p className="mt-2 text-sm text-red-700">
          Revoked {fmt(cert.revokedAt)}. {cert.revokeReason}
        </p>
      )}
    </div>
  );
}
