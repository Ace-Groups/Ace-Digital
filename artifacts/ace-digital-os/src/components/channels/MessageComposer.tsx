import { useRef, useState } from "react";
import { Mic, Send, Smile, Trash2, X } from "lucide-react";
import type { MessageAttachment } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  blobToAudioAttachment,
  fileToMessageAttachment,
  formatFileSize,
} from "@/lib/chat-media";
import { EmojiPickerSheet } from "@/components/channels/EmojiPickerSheet";
import { ComposerAttachMenu } from "@/components/channels/ComposerAttachMenu";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useToast } from "@/hooks/use-toast";

const MAX_ATTACHMENTS = 5;

interface MessageComposerProps {
  channelName: string;
  disabled?: boolean;
  sending?: boolean;
  onSend: (payload: { body: string; attachments?: MessageAttachment[] }) => void | Promise<void>;
}

function formatRecordTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MessageComposer({
  channelName: _channelName,
  disabled,
  sending,
  onSend,
}: MessageComposerProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voice = useVoiceRecorder();
  const isRecording = voice.state === "recording";

  const hasText = message.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const hasContent = hasText || hasAttachments;
  const showSend = hasContent && !isRecording;
  const showMic =
    !hasContent && !isRecording && voice.state !== "unsupported" && !disabled;

  const canSend =
    !disabled && !sending && !isRecording && (hasText || hasAttachments);

  async function addFiles(files: FileList | null) {
    if (!files?.length || disabled) return;
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      toast({ title: `Maximum ${MAX_ATTACHMENTS} attachments`, variant: "destructive" });
      return;
    }
    const slice = Array.from(files).slice(0, remaining);
    const next: MessageAttachment[] = [];
    for (const file of slice) {
      try {
        next.push(await fileToMessageAttachment(file));
      } catch (err) {
        toast({
          title: file.name,
          description: err instanceof Error ? err.message : "Could not attach file",
          variant: "destructive",
        });
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  }

  async function sendPayload(payload: {
    body: string;
    attachments?: MessageAttachment[];
  }) {
    try {
      await onSend(payload);
      setMessage("");
      setAttachments([]);
    } catch {
      /* parent shows toast */
    }
  }

  async function handleSend() {
    if (!canSend) return;
    await sendPayload({
      body: message.trim(),
      attachments: attachments.length ? attachments : undefined,
    });
  }

  async function handleVoiceSend() {
    try {
      const blob = await voice.stop();
      const att = await blobToAudioAttachment(blob);
      await sendPayload({ body: "", attachments: [att] });
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
    <div className="shrink-0 border-t border-border bg-card/95 px-2 py-2 backdrop-blur-sm pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2.5">
      {attachments.length > 0 && !isRecording && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 touch-scroll px-1">
          {attachments.map((att, i) => (
            <div
              key={`pending-${i}-${att.name}`}
              className="relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40"
            >
              {att.type === "image" ? (
                <img src={att.url} alt="" className="h-14 w-14 object-cover" />
              ) : att.type === "audio" ? (
                <div className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 bg-primary/10">
                  <Mic size={18} className="text-primary" />
                  <span className="text-[9px] text-muted-foreground">Voice</span>
                </div>
              ) : (
                <div className="flex h-14 min-w-[5.5rem] max-w-[7rem] flex-col justify-center px-2">
                  <p className="truncate text-xs font-medium">{att.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
                </div>
              )}
              <button
                type="button"
                className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow-sm"
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
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
            <span className="truncate text-xs text-muted-foreground">Recording voice…</span>
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
        <div className="flex items-end gap-2">
          <div
            className={cn(
              "flex min-h-11 flex-1 items-end gap-0.5 rounded-3xl border border-border/80",
              "bg-muted/30 pl-1 pr-1 py-1 shadow-sm",
            )}
          >
            <EmojiPickerSheet
              open={emojiOpen}
              onOpenChange={setEmojiOpen}
              onPick={(emoji) => {
                setMessage((m) => m + emoji);
                requestAnimationFrame(autoResize);
              }}
              trigger={
                <button
                  type="button"
                  disabled={disabled}
                  className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/80 active:bg-muted disabled:opacity-40"
                  aria-label="Emoji"
                >
                  <Smile size={22} className="text-amber-500/90" />
                </button>
              }
            />

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
              className="max-h-32 min-h-[2.25rem] flex-1 resize-none border-0 bg-transparent px-1 py-2 text-base leading-snug shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 sm:text-[0.9375rem]"
            />

            <ComposerAttachMenu
              disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
              onOpenMedia={() => mediaInputRef.current?.click()}
              onOpenFiles={() => fileInputRef.current?.click()}
              className="mb-0.5"
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
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
