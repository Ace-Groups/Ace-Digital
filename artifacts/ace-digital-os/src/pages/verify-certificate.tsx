import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { fetchCertificateVerify } from "@/lib/credentials-api";
import { VerifyShell } from "@/components/verify/VerifyShell";

/** Legacy certificate links redirect to unified profile verify URL. */
export default function VerifyCertificateRedirectPage() {
  const [, params] = useRoute("/verify/cert/:code");
  const [, setLocation] = useLocation();
  const code = params?.code ?? "";

  useEffect(() => {
    if (!code) return;
    const sig = new URLSearchParams(window.location.search).get("s") ?? undefined;
    void fetchCertificateVerify(code, sig).then((data) => {
      if (data.profileVerifyPath) {
        setLocation(data.profileVerifyPath);
        return;
      }
      if (data.profileSlug) {
        const q = new URLSearchParams();
        q.set("cert", code);
        if (sig) q.set("s", sig);
        setLocation(`/v/${data.profileSlug}?${q.toString()}`);
      }
    });
  }, [code, setLocation]);

  return (
    <VerifyShell subtitle="Redirecting to Ace Verify">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </VerifyShell>
  );
}
