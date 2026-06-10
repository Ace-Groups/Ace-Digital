import type { Editor } from "@tiptap/react";
import type { Awareness } from "y-protocols/awareness";
import { useEffect, useRef } from "react";

const TYPING_IDLE_MS = 2000;

/** Broadcasts `typing: true` on awareness while the editor is actively changing. */
export function useTypingAwareness(
  editor: Editor | null,
  awareness: Awareness | null,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor || !awareness) return;

    const clearTyping = () => {
      awareness.setLocalStateField("typing", false);
    };

    const pulseTyping = () => {
      awareness.setLocalStateField("typing", true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(clearTyping, TYPING_IDLE_MS);
    };

    editor.on("update", pulseTyping);

    return () => {
      editor.off("update", pulseTyping);
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTyping();
    };
  }, [editor, awareness]);
}
