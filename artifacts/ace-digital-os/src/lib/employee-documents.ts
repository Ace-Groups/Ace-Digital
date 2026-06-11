export const MAX_AADHAAR_DOCUMENT_BYTES = 1_000_000;
export const MAX_PROFILE_PHOTO_BYTES = 2_500_000;

export function readEmployeeDocument(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_AADHAAR_DOCUMENT_BYTES) {
      reject(new Error("Use a file under 1 MB"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      resolve(
        JSON.stringify({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        }),
      );
    };
    reader.readAsDataURL(file);
  });
}

export function getDocumentName(value?: string | null) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as { name?: string };
    return parsed.name ?? "";
  } catch {
    return "";
  }
}
