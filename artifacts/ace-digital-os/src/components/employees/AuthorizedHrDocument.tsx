import { useEffect, useState } from "react";
import { fetchAuthorizedDocumentBlob } from "@/lib/employee-documents";

type Props = {
  url: string;
  name: string;
  isPdf: boolean;
};

export function AuthorizedHrDocument({ url, name, isPdf }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const next = await fetchAuthorizedDocumentBlob(url);
        if (cancelled) {
          if (next.startsWith("blob:")) URL.revokeObjectURL(next);
          return;
        }
        if (next.startsWith("blob:")) objectUrl = next;
        setSrc(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open document");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (error) {
    return <p className="text-sm text-destructive px-4 text-center">{error}</p>;
  }
  if (!src) {
    return <p className="text-sm text-muted-foreground">Opening document…</p>;
  }
  if (isPdf) {
    return <iframe src={src} className="w-full h-full border-none" title={name} />;
  }
  return (
    <img
      src={src}
      alt={name || "Aadhaar Card"}
      className="max-w-full max-h-full object-contain rounded-lg p-2"
    />
  );
}
