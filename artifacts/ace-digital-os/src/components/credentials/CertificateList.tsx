import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import {
  listInternshipCertificates,
  listUserCertificates,
  downloadCertificatePdf,
  buildProfileCertificatePath,
} from "@/lib/credentials-api";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  internshipId?: number;
  userId?: number;
  verifySlug?: string | null;
};

export function CertificateList({ internshipId, userId, verifySlug: verifySlugProp }: Props) {
  const { user } = useAuth();
  const verifySlug =
    verifySlugProp ?? (user as { verifySlug?: string } | null)?.verifySlug ?? null;
  const query = useQuery({
    queryKey: internshipId
      ? ["/api/v1/internships", internshipId, "certificates"]
      : ["/api/v1/users", userId, "certificates"],
    queryFn: () =>
      internshipId != null
        ? listInternshipCertificates(internshipId)
        : listUserCertificates(userId!),
    enabled: internshipId != null || userId != null,
  });

  if (!query.data?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Certificates
      </p>
      {query.data.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
        >
          <div>
            <p className="font-mono text-sm">{c.certificateCode}</p>
            <p className="text-xs text-muted-foreground capitalize">{c.status}</p>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void downloadCertificatePdf(c.id, c.certificateCode)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" asChild>
              <a
                href={
                  verifySlug
                    ? buildProfileCertificatePath(verifySlug, c.certificateCode)
                    : `/verify/cert/${encodeURIComponent(c.certificateCode)}`
                }
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
