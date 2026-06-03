import { useCallback, useRef, useState, type RefObject } from "react";
import { Bold, Code, Italic, Link2, List, Mic, Paperclip, Send, Strikethrough, Trash2, Type, X } from "lucide-react";
import {
  insertMarkdownPrefix,
  wrapMarkdownLink,
  wrapMarkdownSelection,
} from "@/lib/chat-markdown";
import { UserAvatar } from "@/components/UserAvatar";
import { useMentionAutocomplete } from "@/hooks/use-mention-autocomplete";
import { insertMentionToken } from "@/lib/chat-mentions";
import type { ReplyTarget } from "@/components/channels/ChannelThreadHeader";
import type { MessageAttachment, MessageInput } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/chat-media";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";
import { useIsMobile } from "@/hooks/use-mobile";
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

export interface MessageComposerProps {
  channelId: number;
  channelName: string;
  disabled?: boolean;
  sending?: boolean;
  replyTo?: ReplyTarget | null;
  composerRef?: RefObject<HTMLTextAreaElement | null>;
  onClearReply?: () => void;
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
  /** Slack-style bordered composer with format toolbar */
  slackStyle?: boolean;
}

function formatRecordTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MessageComposer({
  channelId,
  channelName,
  disabled,
  sending,
  replyTo,
  composerRef,
  onClearReply,
  onSend,
  onQueuePending,
  onFlushPending,
  onMarkPendingFailed,
  slackStyle = false,
}: MessageComposerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const keyboardOffset = useKeyboardOffset();
  const [message, setMessage] = useState("");
  const [cursor, setCursor] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const setTextareaRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      textareaRef.current = el;
      if (composerRef) composerRef.current = el;
    },
    [composerRef],
  );

  const mention = useMentionAutocomplete(channelId, message, cursor);

  const voice = useVoiceRecorder();
  const isRecording = voice.state === "recording";

  const hasText = message.trim().length > 0;
  const hasAttachments = pendingFiles.length > 0;
  const hasContent = hasText || hasAttachments;
  const showSend = hasContent && !isRecording;
  const showMic =
    !hasContent && !isRecording && voice.state !== "unsupported" && !disabled;

  const canSend = !disabled && !isRecording && (hasText || hasAttachments);
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

  function pickMention(userId: number, fullName: string) {
    const el = textareaRef.current;
    const pos = el?.selectionStart ?? cursor;
    const next = insertMentionToken(message, pos, userId, fullName);
    setMessage(next);
    requestAnimationFrame(() => {
      el?.focus();
      const c = next.length;
      el?.setSelectionRange(c, c);
      setCursor(c);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mention.open && mention.candidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        mention.moveActive(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        mention.moveActive(-1);
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        const c = mention.candidates[mention.activeIndex];
        if (c) {
          e.preventDefault();
          pickMention(c.userId, c.fullName);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
    }
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

  function applyFormat(
    fn: (text: string, start: number, end: number) => { value: string; cursor: number },
  ) {
    const el = textareaRef.current;
    if (!el) return;
    const { value, cursor: next } = fn(el.value, el.selectionStart, el.selectionEnd);
    setMessage(value);
    setCursor(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next, next);
      autoResize();
    });
  }

  const placeholder = slackStyle
    ? `Message #${channelName}`
    : "Message";

  return (
    <>
      <div
        className={cn(
          "z-10 shrink-0",
          slackStyle ? "bg-transparent" : "border-t border-border bg-card/95 backdrop-blur-sm",
        )}
        style={
          slackStyle
            ? undefined
            : {
                paddingBottom:
                  keyboardOffset > 0
                    ? `${keyboardOffset}px`
                    : "max(0.5rem, env(safe-area-inset-bottom))",
              }
        }
      >
        <div className={cn(slackStyle ? "px-3 py-2" : "mx-auto w-full max-w-3xl px-3 py-2 sm:px-4")}>
        {slackStyle && (
          <div className="mb-2 flex items-center gap-0.5 border-b border-border/60 pb-2">
            <button
              type="button"
              className={cn(
                "flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:bg-muted",
                isMobile ? "size-10" : "size-8",
              )}
              aria-label="Toggle formatting"
              onClick={() => setFormatOpen((o) => !o)}
            >
              <Type size={16} />
            </button>
            {formatOpen && (
              <>
                {[
                  { icon: Bold, label: "Bold", fn: () => applyFormat((t, s, e) => wrapMarkdownSelection(t, s, e, "**")) },
                  { icon: Italic, label: "Italic", fn: () => applyFormat((t, s, e) => wrapMarkdownSelection(t, s, e, "_")) },
                  { icon: Strikethrough, label: "Strikethrough", fn: () => applyFormat((t, s, e) => wrapMarkdownSelection(t, s, e, "~~")) },
                  { icon: Code, label: "Code", fn: () => applyFormat((t, s, e) => wrapMarkdownSelection(t, s, e, "`")) },
                  { icon: List, label: "List", fn: () => applyFormat((t, s, e) => insertMarkdownPrefix(t, s, e, "- ")) },
                  { icon: Link2, label: "Link", fn: () => applyFormat(wrapMarkdownLink) },
                ].map(({ icon: Icon, label, fn }) => (
                  <button
                    key={label}
                    type="button"
                    className={cn(
                      "flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:bg-muted",
                      isMobile ? "size-10" : "size-8",
                    )}
                    aria-label={label}
                    onClick={fn}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </>
            )}
          </div>
        )}
        {replyTo && (
          <div className="mb-1.5 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                Replying to {replyTo.senderName ?? "message"}
              </p>
              <p className="line-clamp-2 text-sm">{replyTo.body.trim() || "Message"}</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onClearReply?.()}
              aria-label="Cancel reply"
            >
              <X size={16} />
            </button>
          </div>
        )}

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
          <div className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-muted/40 px-2">
            <button
              type="button"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-destructive active:bg-destructive/10"
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
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
              onClick={() => void handleVoiceSend()}
              aria-label="Send voice message"
            >
              <Send size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              data-testid="btn-attach"
              disabled={attachDisabled}
              onClick={() => setAttachOpen(true)}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full",
                "text-muted-foreground transition-colors hover:bg-muted/60 active:bg-muted disabled:opacity-40",
                isMobile ? "size-11" : "size-10",
              )}
              aria-label="Attach"
            >
              <Paperclip size={20} className="shrink-0" />
            </button>

            <div className="relative min-w-0 flex-1">
              {mention.open && mention.candidates.length > 0 && (
                <ul
                  className="absolute bottom-full left-0 z-20 mb-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-md"
                  role="listbox"
                >
                  {mention.candidates.map((c, i) => (
                    <li key={c.userId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === mention.activeIndex}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                          i === mention.activeIndex && "bg-muted",
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickMention(c.userId, c.fullName);
                        }}
                      >
                        <UserAvatar
                          avatarUrl={c.avatarUrl}
                          fullName={c.fullName}
                          className="h-7 w-7"
                          iconSize={12}
                        />
                        <span className="truncate">{c.fullName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div
                className={cn(
                  "flex min-h-10 min-w-0 flex-1 items-center px-3.5",
                  slackStyle
                    ? "rounded-md bg-transparent"
                    : "rounded-2xl border border-border/80 bg-muted/30 shadow-sm",
                )}
              >
                <textarea
                  ref={setTextareaRef}
                  data-testid="input-message"
                  rows={1}
                  disabled={disabled}
                  placeholder={placeholder}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setCursor(e.target.selectionStart);
                    autoResize();
                  }}
                  onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "my-1.5 max-h-32 min-h-6 w-full resize-none border-0 bg-transparent py-0 leading-5 shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0",
                    isMobile ? "text-base" : "text-[0.9375rem]",
                  )}
                />
              </div>
            </div>

            {showSend && (
              <button
                type="button"
                data-testid="btn-send-message"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                  isMobile ? "size-11" : "size-10",
                )}
                aria-label="Send message"
              >
                <Send size={18} className="shrink-0" />
              </button>
            )}

            {showMic && (
              <button
                type="button"
                data-testid="btn-voice-message"
                onClick={() => void handleMicPress()}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-[0.97]",
                  isMobile ? "size-11" : "size-10",
                )}
                aria-label="Record voice message"
              >
                <Mic size={20} className="shrink-0" />
              </button>
            )}
          </div>
        )}

        </div>

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
