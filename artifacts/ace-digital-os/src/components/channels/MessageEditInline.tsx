import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageEditInlineProps {
  initialBody: string;
  onSave: (body: string) => void;
  onCancel: () => void;
  className?: string;
}

export function MessageEditInline({
  initialBody,
  onSave,
  onCancel,
  className,
}: MessageEditInlineProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  function handleSave() {
    const body = textareaRef.current?.value.trim() ?? "";
    if (!body) return;
    onSave(body);
  }

  return (
    <div
      className={cn("mt-1 space-y-2 rounded-lg border border-border bg-muted/30 p-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Textarea
        ref={textareaRef}
        defaultValue={initialBody}
        rows={3}
        className="min-h-[72px] resize-y bg-background text-sm"
        aria-label="Edit message"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSave();
          }
        }}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
}
