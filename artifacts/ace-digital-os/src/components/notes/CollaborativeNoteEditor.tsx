import { useEditor, EditorContent } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { useEffect, useMemo, useRef } from "react";
import type { Doc } from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { Loader2 } from "lucide-react";
import { useYjsFirebaseSync, type YjsSyncStatus } from "@/hooks/use-yjs-firebase-sync";
import { useNoteAwareness } from "@/hooks/use-note-awareness";
import { useTypingAwareness } from "@/hooks/use-typing-awareness";
import { isFirebaseCollabEnabled } from "@/lib/firebase-rtdb";
import { createNoteEditorExtensions } from "@/components/notes/note-editor-extensions";
import { NoteEditorToolbar } from "@/components/notes/NoteEditorToolbar";
import { NoteEditor } from "@/components/notes/NoteEditor";
import type { NoteCollabPresenceState } from "@/components/notes/NotePresenceDynamicIsland";

export interface CollaborativeNoteEditorProps {
  noteId: number;
  initialHtml: string;
  user: { id: number; fullName: string };
  onHtmlChange: (html: string) => void;
  onPresenceChange?: (presence: NoteCollabPresenceState | null) => void;
  placeholder?: string;
  editable?: boolean;
}

type CollabEditorSurfaceProps = {
  ydoc: Doc;
  provider: { awareness: Awareness };
  user: { id: number; fullName: string };
  userColor: string;
  onHtmlChange: (html: string) => void;
  onPresenceChange?: (presence: NoteCollabPresenceState | null) => void;
  placeholder: string;
  editable: boolean;
  status: YjsSyncStatus;
  error: Error | null;
};

function CollabEditorSurface({
  ydoc,
  provider,
  user,
  userColor,
  onHtmlChange,
  onPresenceChange,
  placeholder,
  editable,
  status,
  error,
}: CollabEditorSurfaceProps) {
  const onHtmlChangeRef = useRef(onHtmlChange);
  onHtmlChangeRef.current = onHtmlChange;

  const onPresenceChangeRef = useRef(onPresenceChange);
  onPresenceChangeRef.current = onPresenceChange;

  const extensions = useMemo(
    () => [
      ...createNoteEditorExtensions({ placeholder, collaborative: true }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({
        provider,
        user: { name: user.fullName, color: userColor },
      }),
    ],
    [ydoc, provider, placeholder, user.fullName, userColor],
  );

  const editor = useEditor({
    extensions,
    editable,
    autofocus: false,
    onUpdate: ({ editor: e }) => {
      onHtmlChangeRef.current(e.getHTML());
    },
  });

  const peers = useNoteAwareness(provider.awareness, user.id);
  useTypingAwareness(editor, provider.awareness);

  useEffect(() => {
    editor?.commands.updateUser({
      name: user.fullName,
      color: userColor,
    });
  }, [editor, user.fullName, userColor]);

  useEffect(() => {
    onPresenceChangeRef.current?.({ status, peers, error });
  }, [status, peers, error]);

  useEffect(() => {
    return () => {
      onPresenceChangeRef.current?.(null);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="note-editor note-editor-collab">
      {editable && <NoteEditorToolbar editor={editor} />}

      <div className="note-editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function CollaborativeNoteEditor({
  noteId,
  initialHtml,
  user,
  onHtmlChange,
  onPresenceChange,
  placeholder = "Start writing your note...",
  editable = true,
}: CollaborativeNoteEditorProps) {
  const collabEnabled = isFirebaseCollabEnabled();

  const { ydoc, provider, status, error, userColor } = useYjsFirebaseSync({
    noteId,
    userId: user.id,
    userName: user.fullName,
    initialHtml,
    enabled: collabEnabled && editable,
  });

  useEffect(() => {
    if (!collabEnabled || !onPresenceChange) return;
    if (!provider) {
      onPresenceChange({
        status: status === "loading" ? "loading" : "offline",
        peers: [],
        error,
      });
    }
  }, [collabEnabled, provider, status, error, onPresenceChange]);

  if (!collabEnabled) {
    return (
      <NoteEditor
        content={initialHtml}
        onChange={onHtmlChange}
        placeholder={placeholder}
        editable={editable}
      />
    );
  }

  if (!ydoc || !provider) {
    return (
      <div className="note-editor flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Loading collaborative editor…</span>
      </div>
    );
  }

  return (
    <CollabEditorSurface
      ydoc={ydoc}
      provider={provider}
      user={user}
      userColor={userColor}
      onHtmlChange={onHtmlChange}
      onPresenceChange={onPresenceChange}
      placeholder={placeholder}
      editable={editable}
      status={status}
      error={error}
    />
  );
}
