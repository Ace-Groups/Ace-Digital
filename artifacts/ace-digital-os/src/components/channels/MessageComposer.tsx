import { useRef, useState } from "react";
import { Mic, Paperclip, Send, Trash2, X } from "lucide-react";
import type { MessageAttachment, MessageInput } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/chat-media";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";
import { useToast } from "@/hooks/use-toast";
import { AttachSheet, type AttachAction } from "@/components/channels/AttachSheet";
import { CreatePollSheet } from "@/components/channels/CreatePollSheet";
import { CreateEventSheet } from "@/components/channels/CreateEventSheet";
import {
  MAX_FILES_PER_MESSAGE,
  MAX_MEDIA_PER_MESSAGE,
  MAX_PENDING_ATTACHMENTS,
} from "@/lib/chat-constants";
import { prepareChatAttachment, prepareChatBlobAttachment } from "@/lib/chat-attachments";
import { partitionAttachments, buildSendBatches } from "@/lib/chat-batch";
import { compactMessageAttachments } from "@/lib/chat-attachment-serialize";

const GALLERY_ACCEPT = "image/*,video/*";
const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,application/*";

type PendingFile = {
  file: File;
  previewUrl?: string;
  progress?: number;
};

interface MessageComposerProps {
  channelId: number;
  channelName: string;
  disabled?: boolean;
  sending?: boolean;
  onSend: (payload: MessageInput, previewAttachments?: MessageAttachment[]) => Promise<void>;
  onQueuePending: (
    payload: MessageInput,
    previewAttachments?: MessageAttachment[],
  ) => string;
  onFlushPending: (
    clientId: string,
    payload: MessageInput,
    previewAttachments?: MessageAttachment[],
  ) => Promise<void>;
  onMarkPendingFailed: (clientId: string) => void;
}

function formatRecordTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MessageComposer({
  channelId,
  channelName: _channelName,
  disabled,
  sending,
  onSend,
  onQueuePending,
  onFlushPending,
  onMarkPendingFailed,
}: MessageComposerProps) {
  const { toast } = useToast();
  const keyboardOffset = useKeyboardOffset();
  const [message, setMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voice = useVoiceRecorder();
  const isRecording = voice.state === "recording";

  const hasText = message.trim().length > 0;
  const hasAttachments = pendingFiles.length > 0;
  const hasContent = hasText || hasAttachments;
  const showSend = hasContent && !isRecording;
  const showMic =
    !hasContent && !isRecording && voice.state !== "unsupported" && !disabled;

  const canSend = !disabled && !sending && !isRecording && (hasText || hasAttachments);
  const attachDisabled = disabled || pendingFiles.length >= MAX_PENDING_ATTACHMENTS;

  async function addFiles(files: FileList | null) {
    if (!files?.length || disabled) return;
    const remaining = MAX_PENDING_ATTACHMENTS - pendingFiles.length;
    if (remaining <= 0) {
      toast({ title: `Maximum ${MAX_PENDING_ATTACHMENTS} attachments`, variant: "destructive" });
      return;
    }
    const slice = Array.from(files).slice(0, remaining);
    const next: PendingFile[] = slice.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setPendingFiles((prev) => [...prev, ...next]);
  }

  function handleAttachAction(action: AttachAction) {
    if (action === "gallery") galleryInputRef.current?.click();
    else if (action === "document") documentInputRef.current?.click();
    else if (action === "poll") setPollOpen(true);
    else if (action === "event") setEventOpen(true);
  }

  function clearComposerUI() {
    setMessage("");
    setPendingFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function revokeSnapshotPreviews(files: PendingFile[]) {
    for (const pf of files) {
      if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
    }
  }

  async function resolveAttachmentsFromSnapshot(
    files: PendingFile[],
    onFileProgress?: (index: number, pct: number) => void,
  ): Promise<MessageAttachment[]> {
    const results = await Promise.all(
      files.map((pf, i) =>
        prepareChatAttachment(channelId, pf.file, (pct) => onFileProgress?.(i, pct)),
      ),
    );
    return compactMessageAttachments(results);
  }

  function attachmentTypeFromFile(file: File): MessageAttachment["type"] {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "file";
  }

  function previewsFromSnapshot(files: PendingFile[]): MessageAttachment[] {
    return compactMessageAttachments(
      files.map((pf) => ({
        type: attachmentTypeFromFile(pf.file),
        url: pf.previewUrl ?? URL.createObjectURL(pf.file),
        name: pf.file.name,
        ...(pf.file.type ? { mimeType: pf.file.type } : {}),
        size: pf.file.size,
      })),
    );
  }

  async function sendAttachmentBatches(
    caption: string,
    attachments: MessageAttachment[],
    queuedIds: string[],
  ) {
    const { media, files } = partitionAttachments(attachments);
    const batches = [
      ...buildSendBatches(media, "media"),
      ...buildSendBatches(files, "file"),
    ];
    if (!batches.length && caption.trim()) {
      await onSend({ body: caption.trim() });
      return;
    }
    for (let i = 0; i < batches.length; i++) {
      await onFlushPending(
        queuedIds[i]!,
        {
          body: i === 0 ? caption.trim() : "",
          attachments: batches[i],
        },
        batches[i],
      );
    }
  }

  async function sendPayload(payload: MessageInput, preview?: MessageAttachment[]) {
    try {
      await onSend(payload, preview);
    } catch {
      /* parent shows toast */
    }
  }

  async function handleSend() {
    if (!canSend) return;
    const caption = message.trim();
    const filesSnapshot = [...pendingFiles];
    clearComposerUI();

    if (filesSnapshot.length) {
      const previewAtts = previewsFromSnapshot(filesSnapshot);
      const { media, files } = partitionAttachments(previewAtts);
      const previewBatches = [
        ...buildSendBatches(media, "media"),
        ...buildSendBatches(files, "file"),
      ];
      const queuedIds = previewBatches.map((batch, i) =>
        onQueuePending(
          { body: i === 0 ? caption : "", attachments: batch },
          batch,
        ),
      );

      try {
        const attachments = await resolveAttachmentsFromSnapshot(filesSnapshot);
        revokeSnapshotPreviews(filesSnapshot);
        await sendAttachmentBatches(caption, attachments, queuedIds);
      } catch (err) {
        for (const id of queuedIds) onMarkPendingFailed(id);
        setMessage(caption);
        setPendingFiles(filesSnapshot);
        toast({
          title: "Failed to send",
          description: err instanceof Error ? err.message : "Upload failed",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      await onSend({ body: caption });
    } catch (err) {
      setMessage(caption);
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "Send failed",
        variant: "destructive",
      });
    }
  }

  async function handleVoiceSend() {
    try {
      const blob = await voice.stop();
      const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
      const name = `voice-${Date.now()}.${ext}`;
      const att = await prepareChatBlobAttachment(channelId, blob, name);
      await sendPayload({ body: "", attachments: [att] }, [att]);
    } catch (err) {
      if (err instanceof Error && err.message !== "Not recording") {
        toast({
          title: "Voice message failed",
          description: err.message,
          variant: "destructive",
        });
      }
    }
  }

  async function handleMicPress() {
    try {
      await voice.start();
    } catch (err) {
      toast({
        title: "Microphone access needed",
        description: err instanceof Error ? err.message : "Allow microphone to send voice notes",
        variant: "destructive",
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showSend) void handleSend();
    }
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  return (
    <>
      <div
        className="z-10 shrink-0 border-t border-border bg-card/95 px-2 py-2 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2.5"
        style={{ transform: keyboardOffset ? `translateY(-${keyboardOffset}px)` : undefined }}
      >
        {pendingFiles.length > 0 && !isRecording && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 touch-scroll px-1">
            {pendingFiles.map((pf, i) => (
              <div
                key={`pending-${i}-${pf.file.name}`}
                className="relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40"
              >
                {pf.previewUrl ? (
                  <img src={pf.previewUrl} alt="" className="h-14 w-14 object-cover" />
                ) : pf.file.type.startsWith("video/") ? (
                  <div className="flex h-14 w-14 items-center justify-center bg-violet-500/10 text-[10px] font-medium text-violet-400">
                    Video
                  </div>
                ) : (
                  <div className="flex h-14 min-w-[5.5rem] max-w-[7rem] flex-col justify-center px-2">
                    <p className="truncate text-xs font-medium">{pf.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(pf.file.size)}</p>
                  </div>
                )}
                {pf.progress != null && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
                    <div
                      className="h-full bg-primary transition-[width]"
                      style={{ width: `${pf.progress}%` }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow-sm"
                  onClick={() =>
                    setPendingFiles((prev) => {
                      const removed = prev[i];
                      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
                      return prev.filter((_, idx) => idx !== i);
                    })
                  }
                  aria-label="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2 py-1.5">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-destructive active:bg-destructive/10"
              onClick={() => voice.cancel()}
              aria-label="Cancel recording"
            >
              <Trash2 size={22} />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-sm tabular-nums text-foreground">
                {formatRecordTime(voice.seconds)}
              </span>
              <span className="truncate text-xs text-muted-foreground">Tap send when done</span>
            </div>
            <button
              type="button"
              disabled={sending || disabled}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
              onClick={() => void handleVoiceSend()}
              aria-label="Send voice message"
            >
              <Send size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-1 sm:gap-1.5">
            <button
              type="button"
              data-testid="btn-attach"
              disabled={attachDisabled}
              onClick={() => setAttachOpen(true)}
              className={cn(
                "mb-0.5 flex h-11 w-10 shrink-0 items-center justify-center rounded-full sm:w-11",
                "text-muted-foreground transition-colors hover:bg-muted/60 active:bg-muted disabled:opacity-40",
              )}
              aria-label="Attach"
            >
              <Paperclip size={22} />
            </button>

            <div
              className={cn(
                "flex min-h-11 min-w-0 flex-1 items-center rounded-3xl border border-border/80",
                "bg-muted/30 px-3 py-1.5 shadow-sm",
              )}
            >
              <textarea
                ref={textareaRef}
                data-testid="input-message"
                rows={1}
                disabled={disabled}
                placeholder="Message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  autoResize();
                }}
                onKeyDown={handleKeyDown}
                className="max-h-32 min-h-[2.25rem] w-full resize-none border-0 bg-transparent py-1.5 text-base leading-snug shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 sm:text-[0.9375rem]"
              />
            </div>

            {showSend && (
              <button
                type="button"
                data-testid="btn-send-message"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            )}

            {showMic && (
              <button
                type="button"
                data-testid="btn-voice-message"
                onClick={() => void handleMicPress()}
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-[0.97]"
                aria-label="Record voice message"
              >
                <Mic size={22} />
              </button>
            )}
          </div>
        )}

        <input
          ref={galleryInputRef}
          type="file"
          accept={GALLERY_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <AttachSheet open={attachOpen} onOpenChange={setAttachOpen} onAction={handleAttachAction} />
      <CreatePollSheet
        open={pollOpen}
        onOpenChange={setPollOpen}
        onCreate={(meta) =>
          void sendPayload({ body: "", messageKind: "poll", metadata: meta })
        }
      />
      <CreateEventSheet
        open={eventOpen}
        onOpenChange={setEventOpen}
        onCreate={(meta) =>
          void sendPayload({ body: "", messageKind: "event", metadata: meta })
        }
      />
    </>
  );
}

export { MAX_MEDIA_PER_MESSAGE, MAX_FILES_PER_MESSAGE };
