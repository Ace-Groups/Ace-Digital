import type { MessageAttachment } from "@workspace/api-client-react";
import { canUseFirebaseStorage } from "@/lib/firebase-client";
import { uploadChatBlob, uploadChatFile } from "@/lib/chat-upload";
import { fileToMessageAttachment } from "@/lib/chat-media";

/** Prefer Firebase Storage when authed; otherwise compress and send inline via API. */
export async function prepareChatAttachment(
  channelId: number,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<MessageAttachment> {
  if (await canUseFirebaseStorage()) {
    try {
      return await uploadChatFile(channelId, file, onProgress);
    } catch {
      /* fall through to inline */
    }
  }
  return fileToMessageAttachment(file);
}

export async function prepareChatBlobAttachment(
  channelId: number,
  blob: Blob,
  name: string,
  onProgress?: (pct: number) => void,
): Promise<MessageAttachment> {
  if (await canUseFirebaseStorage()) {
    try {
      return await uploadChatBlob(channelId, blob, name, onProgress);
    } catch {
      /* fall through */
    }
  }
  const { blobToAudioAttachment } = await import("@/lib/chat-media");
  return blobToAudioAttachment(blob);
}
