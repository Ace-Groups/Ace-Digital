import type { Editor } from "@tiptap/react";
import { useCallback } from "react";
import { hapticLight } from "@/lib/haptics";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from "lucide-react";

interface NoteEditorToolbarProps {
  editor: Editor;
}

export function NoteEditorToolbar({ editor }: NoteEditorToolbarProps) {
  const setHeading = useCallback(
    (value: string) => {
      if (value === "paragraph") {
        editor.chain().focus().setParagraph().run();
      } else {
        const level = parseInt(value, 10) as 1 | 2 | 3;
        editor.chain().focus().toggleHeading({ level }).run();
      }
    },
    [editor],
  );

  const handleTaskListClick = useCallback(() => {
    if (editor.isActive("taskList")) {
      editor.chain().focus().toggleTaskList().run();
    } else {
      const { selection } = editor.state;
      const { $from } = selection;
      const currentBlockText = $from.parent.textContent;
      if (currentBlockText.trim().length > 0) {
        editor.chain().focus().splitBlock().toggleTaskList().run();
      } else {
        editor.chain().focus().toggleTaskList().run();
      }
    }
  }, [editor]);

  const currentHeading = editor.isActive("heading", { level: 1 })
    ? "1"
    : editor.isActive("heading", { level: 2 })
      ? "2"
      : editor.isActive("heading", { level: 3 })
        ? "3"
        : "paragraph";

  return (
    <div className="note-editor-toolbar" onPointerDown={hapticLight}>
      <div className="note-editor-toolbar-group">
        <select
          className="note-heading-select"
          value={currentHeading}
          onChange={(e) => setHeading(e.target.value)}
          aria-label="Text style"
        >
          <option value="paragraph">Paragraph</option>
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
        </select>
      </div>

      <div className="note-editor-toolbar-group">
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("bold") ? "is-active" : ""}`}
              onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold />
        </button>
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("italic") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic />
        </button>
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("underline") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon />
        </button>
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("strike") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough />
        </button>
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("highlight") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Highlight"
        >
          <Highlighter />
        </button>
        <input
          type="color"
          className="note-color-input"
          title="Text Color"
          value={editor.getAttributes("textStyle").color || "#ffffff"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </div>

      <div className="note-editor-toolbar-group">
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List />
        </button>
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered List"
        >
          <ListOrdered />
        </button>
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("taskList") ? "is-active" : ""}`}
          onClick={handleTaskListClick}
          title="Task List"
        >
          <CheckSquare />
        </button>
      </div>

      <div className="note-editor-toolbar-group">
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <Quote />
        </button>
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive("codeBlock") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        >
          <Code />
        </button>
        <button
          type="button"
          className="note-toolbar-btn"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus />
        </button>
      </div>

      <div className="note-editor-toolbar-group">
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive({ textAlign: "left" }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align Left"
        >
          <AlignLeft />
        </button>
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive({ textAlign: "center" }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align Center"
        >
          <AlignCenter />
        </button>
        <button
          type="button"
          className={`note-toolbar-btn ${editor.isActive({ textAlign: "right" }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align Right"
        >
          <AlignRight />
        </button>
      </div>

      <div className="note-editor-toolbar-group">
        <button
          type="button"
          className="note-toolbar-btn"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo />
        </button>
        <button
          type="button"
          className="note-toolbar-btn"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo />
        </button>
      </div>
    </div>
  );
}
