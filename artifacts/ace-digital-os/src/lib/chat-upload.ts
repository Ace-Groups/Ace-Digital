import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTaskSnapshot,
} from "firebase/storage";
import type { MessageAttachment } from "@workspace/api-client-react";
import { getFirebaseStorage, canUseFirebaseStorage } from "@/lib/firebase-client";

export type UploadProgress = {
  fileName: string;
  progress: number;
};

function attachmentTypeFromFile(file: File): MessageAttachment["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

async function generateImageThumb(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return undefined;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 200;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(undefined);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    img.src = url;
  });
}

export async function uploadChatFile(
  channelId: number,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MessageAttachment> {
  const authed = await canUseFirebaseStorage();
  if (!authed) {
    throw new Error("Firebase Storage unavailable");
  }

  const uploadId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(0, 120) || "file";
  const path = `channels/${channelId}/${uploadId}/${safeName}`;
  const storageRef = ref(getFirebaseStorage(), path);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || undefined,
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap: UploadTaskSnapshot) => {
        const pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
        onProgress?.(pct);
      },
      reject,
      () => resolve(),
    );
  });

  const url = await getDownloadURL(task.snapshot.ref);
  const type = attachmentTypeFromFile(file);
  const thumbUrl = type === "image" ? await generateImageThumb(file) : undefined;

  return {
    type,
    url,
    name: file.name,
    mimeType: file.type || undefined,
    size: file.size,
    thumbUrl,
  };
}

export async function uploadChatBlob(
  channelId: number,
  blob: Blob,
  name: string,
  onProgress?: (pct: number) => void,
): Promise<MessageAttachment> {
  const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
  return uploadChatFile(channelId, file, onProgress);
}
