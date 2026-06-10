import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { createNoteEditorExtensions } from "@/components/notes/note-editor-extensions";
import { NoteEditorToolbar } from "@/components/notes/NoteEditorToolbar";

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function NoteEditor({
  content,
  onChange,
  placeholder = "Start writing your note...",
  editable = true,
}: NoteEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const lastSentContentRef = useRef(content);

  const editor = useEditor({
    extensions: createNoteEditorExtensions({ placeholder }),
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      lastSentContentRef.current = html;
      onChangeRef.current(html);
    },
  });

  // Sync content from outside when editing a different note or receiving remote title-only saves
  useEffect(() => {
    if (editor && content !== lastSentContentRef.current) {
      lastSentContentRef.current = content;
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, { emitUpdate: false });
      const maxPos = editor.state.doc.content.size;
      try {
        editor.commands.setTextSelection({
          from: Math.min(from, maxPos),
          to: Math.min(to, maxPos),
        });
      } catch {
        // Ignore selection restore failures
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="note-editor">
      {editable && <NoteEditorToolbar editor={editor} />}

      <div className="note-editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
