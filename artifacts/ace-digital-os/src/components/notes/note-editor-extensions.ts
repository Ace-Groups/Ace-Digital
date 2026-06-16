import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";

export type NoteEditorExtensionOptions = {
  placeholder?: string;
  /** Disable built-in undo/redo when Yjs Collaboration handles history. */
  collaborative?: boolean;
};

/** Shared TipTap extensions for solo and collaborative note editors. */
export function createNoteEditorExtensions(
  options: NoteEditorExtensionOptions = {},
): Extensions {
  const { placeholder = "Start writing your note...", collaborative = false } = options;

  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      ...(collaborative ? { undoRedo: false } : {}),
    }),
    TaskList.configure(),
    TaskItem.configure({ nested: true }),
    Underline.configure(),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Highlight.configure({ multicolor: false }),
    TextStyle.configure(),
    Color.configure(),
    Placeholder.configure({ placeholder }),
    Typography.configure(),
  ];
}
