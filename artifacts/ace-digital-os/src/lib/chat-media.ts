import type { MessageAttachment } from "@workspace/api-client-react";
import { compactMessageAttachment } from "@/lib/chat-attachment-serialize";
import { resizeImageFile } from "@/lib/avatar";

const MAX_IMAGE_DIMENSION = 1200;
const MAX_VIDEO_BYTES = 1_500_000;
const MAX_FILE_BYTES = 350_000;
const MAX_AUDIO_BYTES = 400_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function attachmentTypeFromFile(file: File): MessageAttachment["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read audio"));
    reader.readAsDataURL(blob);
  });
}

export async function blobToAudioAttachment(blob: Blob): Promise<MessageAttachment> {
  if (blob.size > MAX_AUDIO_BYTES) {
    throw new Error("Voice message is too long (max ~2 min)");
  }
  const url = await blobToDataUrl(blob);
  if (url.length > 520_000) {
    throw new Error("Voice message is too large to send");
  }
  const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
  return compactMessageAttachment({
    type: "audio",
    url,
    name: `voice-${Date.now()}.${ext}`,
    ...(blob.type ? { mimeType: blob.type } : { mimeType: "audio/webm" }),
    size: blob.size,
  });
}

export async function fileToMessageAttachment(file: File): Promise<MessageAttachment> {
  const type = attachmentTypeFromFile(file);
  const base = {
    name: file.name,
    ...(file.type ? { mimeType: file.type } : {}),
    size: file.size,
  };

  if (type === "image") {
    const url = await resizeImageFile(file, MAX_IMAGE_DIMENSION);
    return compactMessageAttachment({ type, url, ...base, size: url.length });
  }

  if (type === "audio") {
    if (file.size > MAX_AUDIO_BYTES) {
      throw new Error("Audio must be under 400 KB");
    }
    const url = await readFileAsDataUrl(file);
    if (url.length > 520_000) {
      throw new Error("Audio is too large to send");
    }
    return compactMessageAttachment({ type, url, ...base });
  }

  if (type === "video") {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error("Video must be under 1.5 MB");
    }
    const url = await readFileAsDataUrl(file);
    if (url.length > 520_000) {
      throw new Error("Video is too large to send");
    }
    return compactMessageAttachment({ type, url, ...base });
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File must be under 350 KB");
  }
  const url = await readFileAsDataUrl(file);
  if (url.length > 520_000) {
    throw new Error("File is too large to send");
  }
  return compactMessageAttachment({ type, url, ...base });
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
