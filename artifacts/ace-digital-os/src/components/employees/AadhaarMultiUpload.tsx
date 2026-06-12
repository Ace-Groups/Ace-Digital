import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FilePickControl } from "@/components/ui/file-pick-control";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MAX_AADHAAR_FILES,
  parseAadhaarDocuments,
  serializeAadhaarDocuments,
  uploadHrDocument,
  type StoredHrDocument,
} from "@/lib/employee-documents";

type AadhaarMultiUploadProps = {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
};

export function AadhaarMultiUpload({ value, onChange, error }: AadhaarMultiUploadProps) {
  const [uploading, setUploading] = useState(false);
  const docs = parseAadhaarDocuments(value);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    const remaining = MAX_AADHAAR_FILES - docs.length;
    if (remaining <= 0) return;
    setUploading(true);
    try {
      const next: StoredHrDocument[] = [...docs];
      for (const file of list.slice(0, remaining)) {
        next.push(await uploadHrDocument(file));
      }
      onChange(serializeAadhaarDocuments(next));
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    const next = docs.filter((_, i) => i !== index);
    onChange(next.length ? serializeAadhaarDocuments(next) : "");
  }

  return (
    <div className="space-y-2">
      <FilePickControl
        accept="image/*,.pdf"
        multiple
        aria-label="Upload Aadhaar card copies"
        className="inline-flex w-full sm:w-auto"
        disabled={uploading || docs.length >= MAX_AADHAAR_FILES}
        onFiles={(files) => {
          void handleFiles(files);
        }}
      >
        <span className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full gap-2 sm:w-auto")}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {uploading ? "Uploading…" : "Choose files"}
        </span>
      </FilePickControl>
      <p className="text-xs text-muted-foreground">
        PDF or image, up to {MAX_AADHAAR_FILES} files, 10 MB each.
      </p>
      {docs.length > 0 ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {docs.map((doc, index) => (
            <li key={`${doc.name}-${index}`} className="flex items-center justify-between gap-2">
              <span className="truncate">{doc.name}</span>
              <button
                type="button"
                className="shrink-0 text-destructive hover:underline"
                onClick={() => removeAt(index)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
