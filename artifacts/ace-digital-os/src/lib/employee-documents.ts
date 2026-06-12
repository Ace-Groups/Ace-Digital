import { resolveApiUrl } from "@/lib/api-config";
import { authHeader } from "@/lib/api";

export const MAX_AADHAAR_DOCUMENT_BYTES = 10_000_000;
export const MAX_AADHAAR_FILES = 5;
export const MAX_PROFILE_PHOTO_BYTES = 2_500_000;

export type StoredHrDocument = {
  name: string;
  type: string;
  size: number;
  url: string;
  storagePath?: string;
  uploadedAt: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadHrDocument(file: File): Promise<StoredHrDocument> {
  if (file.size > MAX_AADHAAR_DOCUMENT_BYTES) {
    throw new Error("Each file must be 10 MB or smaller");
  }
  const dataBase64 = await fileToBase64(file);
  const res = await fetch(resolveApiUrl("/api/v1/hr-documents"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      dataBase64,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<StoredHrDocument>;
}

export function parseAadhaarDocuments(value?: string | null): StoredHrDocument[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is StoredHrDocument =>
          !!item &&
          typeof item === "object" &&
          typeof (item as StoredHrDocument).name === "string" &&
          typeof (item as StoredHrDocument).url === "string",
      );
    }
    if (parsed && typeof parsed === "object" && "name" in parsed) {
      const legacy = parsed as StoredHrDocument & { dataUrl?: string };
      if (legacy.url) return [legacy];
      if (legacy.dataUrl) {
        return [
          {
            name: legacy.name,
            type: legacy.type ?? "application/octet-stream",
            size: legacy.size ?? 0,
            url: legacy.dataUrl,
            uploadedAt: legacy.uploadedAt ?? new Date().toISOString(),
          },
        ];
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function serializeAadhaarDocuments(docs: StoredHrDocument[]): string {
  return JSON.stringify(docs);
}

export function getDocumentName(value?: string | null) {
  const docs = parseAadhaarDocuments(value);
  if (!docs.length) return "";
  if (docs.length === 1) return docs[0]!.name;
  return `${docs.length} files`;
}

export function getAadhaarDocumentNames(value?: string | null): string[] {
  return parseAadhaarDocuments(value).map((doc) => doc.name);
}

/** @deprecated Use uploadHrDocument for new uploads */
export function readEmployeeDocument(file: File): Promise<string> {
  return uploadHrDocument(file).then((doc) => serializeAadhaarDocuments([doc]));
}
