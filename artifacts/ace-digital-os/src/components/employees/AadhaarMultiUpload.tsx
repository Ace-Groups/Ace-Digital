import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FilePickControl } from "@/components/ui/file-pick-control";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  MAX_AADHAAR_FILES,
  parseAadhaarDocuments,
  serializeAadhaarDocuments,
  uploadHrDocument,
  resolveDocumentUrl,
  type StoredHrDocument,
} from "@/lib/employee-documents";

type AadhaarMultiUploadProps = {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
};

export function AadhaarMultiUpload({ value, onChange, error }: AadhaarMultiUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();
  const docs = parseAadhaarDocuments(value);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    const remaining = MAX_AADHAAR_FILES - docs.length;
    if (remaining <= 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const next: StoredHrDocument[] = [...docs];
      for (const file of list.slice(0, remaining)) {
        next.push(await uploadHrDocument(file));
      }
      onChange(serializeAadhaarDocuments(next));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      toast({
        title: "Upload failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleReplace(index: number, file: File) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const doc = await uploadHrDocument(file);
      const next = [...docs];
      next[index] = doc;
      onChange(serializeAadhaarDocuments(next));
      toast({
        title: "Aadhaar file replaced",
        description: "The document copy was updated successfully.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      toast({
        title: "Replace failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    const next = docs.filter((_, i) => i !== index);
    onChange(next.length ? serializeAadhaarDocuments(next) : "");
    setUploadError(null);
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
        <ul className="space-y-2 mt-2">
          {docs.map((doc, index) => (
            <li
              key={`${doc.name}-${index}`}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-muted/40 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <a
                  href={resolveDocumentUrl(doc.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline truncate"
                  title="Click to view Aadhaar document"
                >
                  {doc.name}
                </a>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  ({(doc.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <FilePickControl
                  accept="image/*,.pdf"
                  onFile={(file) => {
                    void handleReplace(index, file);
                  }}
                >
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground font-medium hover:underline transition-colors disabled:opacity-50"
                    disabled={uploading}
                  >
                    Change
                  </button>
                </FilePickControl>
                <div className="h-3 w-[1px] bg-border" aria-hidden />
                <button
                  type="button"
                  className="text-destructive hover:text-destructive/80 font-medium hover:underline transition-colors disabled:opacity-50"
                  onClick={() => removeAt(index)}
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {error || uploadError ? (
        <p className="text-xs text-destructive">{error || uploadError}</p>
      ) : null}
    </div>
  );
}
