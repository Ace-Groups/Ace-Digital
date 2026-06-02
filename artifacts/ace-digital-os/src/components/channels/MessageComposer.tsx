import { useRef, useState } from "react";
import { ImagePlus, Paperclip, Send, Video, X } from "lucide-react";
import type { MessageAttachment } from "@workspace/api-client-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fileToMessageAttachment, formatFileSize } from "@/lib/chat-media";
import { EmojiPickerSheet } from "@/components/channels/EmojiPickerSheet";
import { useToast } from "@/hooks/use-toast";

const MAX_ATTACHMENTS = 5;

interface MessageComposerProps {
  channelName: string;
  disabled?: boolean;
  sending?: boolean;
  onSend: (payload: { body: string; attachments?: MessageAttachment[] }) => void | Promise<void>;
}

export function MessageComposer({
  channelName,
  disabled,
  sending,
  onSend,
}: MessageComposerProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend =
    !disabled &&
    !sending &&
    (message.trim().length > 0 || attachments.length > 0);

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

  async function handleSend() {
    if (!canSend) return;
    const body = message.trim();
    const payload = {
      body,
      attachments: attachments.length ? attachments : undefined,
    };
    try {
      await onSend(payload);
      setMessage("");
      setAttachments([]);
    } catch {
      /* parent shows toast */
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-card/95 px-3 py-2 backdrop-blur-sm sm:px-4 sm:py-3">
      {attachments.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 touch-scroll">
          {attachments.map((att, i) => (
            <div
              key={`pending-${i}-${att.name}`}
              className="relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40"
            >
              {att.type === "image" ? (
                <img src={att.url} alt="" className="h-16 w-16 object-cover" />
              ) : (
                <div className="flex h-16 w-28 flex-col justify-center px-2">
                  <p className="truncate text-xs font-medium">{att.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(att.size)}
                  </p>
                </div>
              )}
              <button
                type="button"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow-sm"
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1 rounded-2xl border border-border bg-muted/30 p-1.5 sm:gap-2 sm:p-2">
        <div className="flex shrink-0 items-center">
          <EmojiPickerSheet
            open={emojiOpen}
            onOpenChange={setEmojiOpen}
            onPick={(emoji) => setMessage((m) => m + emoji)}
          />
          <button
            type="button"
            disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors active:bg-muted disabled:opacity-40"
            onClick={() => imageInputRef.current?.click()}
            aria-label="Add photo"
          >
            <ImagePlus size={20} className="text-emerald-500" />
          </button>
          <button
            type="button"
            disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors active:bg-muted disabled:opacity-40"
            onClick={() => videoInputRef.current?.click()}
            aria-label="Add video"
          >
            <Video size={20} className="text-violet-500" />
          </button>
          <button
            type="button"
            disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors active:bg-muted disabled:opacity-40"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add file"
          >
            <Paperclip size={20} className="text-sky-500" />
          </button>
        </div>

        <Textarea
          data-testid="input-message"
          rows={1}
          disabled={disabled}
          placeholder={`Message #${channelName}...`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-base shadow-none focus-visible:ring-0 sm:min-h-10 sm:text-sm"
        />

        <button
          type="button"
          data-testid="btn-send-message"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
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
