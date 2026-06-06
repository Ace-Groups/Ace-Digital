import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import {
  useListNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useListEmployees,
  getListNotesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Share2,
  MessageSquare,
  Search,
  FileText,
  Users,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Note } from "@workspace/api-client-react";
import { format } from "date-fns";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { ShareNoteDialog } from "@/components/notes/ShareNoteDialog";
import { ShareNoteToChatDialog } from "@/components/notes/ShareNoteToChatDialog";
import "@/styles/note-editor.css";

/** Strip HTML for preview text */
function stripHtml(html: string): string {
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || d.innerText || "").trim();
}

/** Extract task checklist stats from HTML content */
function getChecklistStats(html: string): {
  total: number;
  done: number;
} | null {
  if (!html.includes("data-type=\"taskList\"") && !html.includes("data-checked"))
    return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const items = doc.querySelectorAll("li[data-type='taskItem']");
  if (items.length === 0) return null;
  let done = 0;
  items.forEach((li) => {
    if (li.getAttribute("data-checked") === "true") done++;
  });
  return { total: items.length, done };
}

export default function NotesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useListNotes();
  const { data: employees } = useListEmployees();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // State
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auto-save debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{ title: string; content: string }>({
    title: "",
    content: "",
  });

  // Build employee lookup
  const employeeMap = useMemo(() => {
    const m = new Map<number, { fullName: string; avatarUrl?: string | null }>();
    if (employees) {
      for (const e of employees) {
        m.set(e.id, { fullName: e.fullName, avatarUrl: e.avatarUrl });
      }
    }
    return m;
  }, [employees]);

  // Filter notes by tab + search
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    let list = notes;
    if (tab === "mine") {
      list = list.filter((n) => n.createdById === user?.id);
    } else {
      list = list.filter(
        (n) =>
          n.createdById !== user?.id &&
          (n.sharedUserIds?.includes(user?.id ?? -1) ||
            (n.teamId != null && n.teamId === (user as any)?.teamId))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          stripHtml(n.content).toLowerCase().includes(q)
      );
    }
    return list;
  }, [notes, tab, search, user]);

  // Selected note
  const selectedNote = useMemo(() => {
    if (selectedNoteId == null || !notes) return null;
    return notes.find((n) => n.id === selectedNoteId) ?? null;
  }, [notes, selectedNoteId]);

  // Open a note in the editor
  const openNote = useCallback(
    (note: Note) => {
      // Save pending changes on the current note
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSelectedNoteId(note.id);
      setTitle(note.title);
      setContent(note.content);
      lastSavedRef.current = { title: note.title, content: note.content };
      setCreating(false);
    },
    []
  );

  // Create new note
  const handleNewNote = useCallback(() => {
    setCreating(true);
    setSelectedNoteId(null);
    setTitle("");
    setContent("");
    lastSavedRef.current = { title: "", content: "" };
  }, []);

  // Save (create or update)
  const doSave = useCallback(
    (t: string, c: string, noteId: number | null) => {
      if (!t.trim() && !stripHtml(c).trim()) return;
      const titleToSave = t.trim() || "Untitled";

      if (noteId == null) {
        // Creating
        createNote.mutate(
          { data: { title: titleToSave, content: c, sharedUserIds: [] } },
          {
            onSuccess: (data: Note) => {
              setCreating(false);
              setSelectedNoteId(data.id);
              lastSavedRef.current = { title: data.title, content: data.content };
              queryClient.invalidateQueries({
                queryKey: getListNotesQueryKey(),
              });
            },
          }
        );
      } else {
        if (
          t === lastSavedRef.current.title &&
          c === lastSavedRef.current.content
        )
          return;
        updateNote.mutate(
          { id: noteId, data: { title: titleToSave, content: c } },
          {
            onSuccess: () => {
              lastSavedRef.current = { title: titleToSave, content: c };
              queryClient.invalidateQueries({
                queryKey: getListNotesQueryKey(),
              });
            },
          }
        );
      }
    },
    [createNote, updateNote, queryClient]
  );

  // Debounced auto-save
  const scheduleAutoSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        doSave(newTitle, newContent, creating ? null : selectedNoteId);
      }, 1200);
    },
    [doSave, creating, selectedNoteId]
  );

  // Title change
  const handleTitleChange = useCallback(
    (val: string) => {
      setTitle(val);
      scheduleAutoSave(val, content);
    },
    [content, scheduleAutoSave]
  );

  // Content change
  const handleContentChange = useCallback(
    (html: string) => {
      setContent(html);
      scheduleAutoSave(title, html);
    },
    [title, scheduleAutoSave]
  );

  // Delete
  const handleDelete = useCallback(() => {
    if (!selectedNote) return;
    if (!confirm("Are you sure you want to delete this note?")) return;
    deleteNote.mutate(
      { id: selectedNote.id },
      {
        onSuccess: () => {
          toast({ title: "Note deleted" });
          setSelectedNoteId(null);
          setCreating(false);
          queryClient.invalidateQueries({
            queryKey: getListNotesQueryKey(),
          });
        },
        onError: () => {
          toast({ title: "Failed to delete note", variant: "destructive" });
        },
      }
    );
  }, [selectedNote, deleteNote, queryClient, toast]);

  // Share handler
  const handleShareSave = useCallback(
    (userIds: number[]) => {
      if (!selectedNote) return;
      updateNote.mutate(
        { id: selectedNote.id, data: { sharedUserIds: userIds } },
        {
          onSuccess: () => {
            toast({ title: "Sharing updated" });
            setShareDialogOpen(false);
            queryClient.invalidateQueries({
              queryKey: getListNotesQueryKey(),
            });
          },
          onError: () => {
            toast({
              title: "Failed to update sharing",
              variant: "destructive",
            });
          },
        }
      );
    },
    [selectedNote, updateNote, queryClient, toast]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();

  const isEditorActive = selectedNote != null || creating;

  return (
    <AppLayout>
      <div className="flex h-full min-h-0">
        {/* ── Left Sidebar ── */}
        <div
          className={`flex flex-col border-r bg-card/50 ${
            isEditorActive ? "hidden md:flex" : "flex"
          }`}
          style={{ width: 320, minWidth: 280, maxWidth: 360 }}
        >
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Notes</h2>
              <Button size="sm" onClick={handleNewNote}>
                <Plus className="mr-1 h-4 w-4" />
                New
              </Button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Tabs */}
            <div className="flex rounded-lg bg-muted p-0.5">
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === "mine"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("mine")}
              >
                <FileText className="inline-block mr-1 h-3.5 w-3.5" />
                My Notes
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === "shared"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("shared")}
              >
                <Users className="inline-block mr-1 h-3.5 w-3.5" />
                Shared
              </button>
            </div>
          </div>

          {/* Note list */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {tab === "mine"
                    ? "No notes yet. Create your first note!"
                    : "No shared notes."}
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = selectedNoteId === note.id;
                  const preview = stripHtml(note.content).slice(0, 80);
                  const stats = getChecklistStats(note.content);
                  const shared = note.sharedUserIds ?? [];
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => openNote(note)}
                      className={`note-list-item w-full text-left ${
                        isSelected ? "is-selected" : ""
                      }`}
                    >
                      <span className="note-list-item-title">{note.title}</span>
                      {preview && (
                        <span className="note-list-item-preview">
                          {preview}
                        </span>
                      )}
                      <div className="note-list-item-meta">
                        <span className="note-list-item-date">
                          {format(new Date(note.updatedAt), "MMM d, h:mm a")}
                        </span>
                        <div className="flex items-center gap-2">
                          {stats && (
                            <div className="note-checklist-progress">
                              <div className="note-checklist-bar">
                                <div
                                  className="note-checklist-bar-fill"
                                  style={{
                                    width: `${
                                      stats.total > 0
                                        ? (stats.done / stats.total) * 100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <span>
                                {stats.done}/{stats.total}
                              </span>
                            </div>
                          )}
                          {shared.length > 0 && (
                            <div className="note-shared-avatars">
                              {shared.slice(0, 3).map((uid) => {
                                const emp = employeeMap.get(uid);
                                return (
                                  <div
                                    key={uid}
                                    className="avatar-circle"
                                    title={emp?.fullName ?? "User"}
                                  >
                                    {emp
                                      ? getInitials(emp.fullName)
                                      : "?"}
                                  </div>
                                );
                              })}
                              {shared.length > 3 && (
                                <div className="avatar-circle">
                                  +{shared.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          {shared.length > 0 ? (
                            <span className="note-badge note-badge-shared">
                              Shared
                            </span>
                          ) : (
                            <span className="note-badge note-badge-personal">
                              Personal
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── Right Panel (Editor) ── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {isEditorActive ? (
            <>
              {/* Editor header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-card/50">
                {/* Back button on mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => {
                    setSelectedNoteId(null);
                    setCreating(false);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* Title input */}
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note title..."
                  className="flex-1 border-none bg-transparent text-lg font-bold shadow-none focus-visible:ring-0 px-0 h-auto"
                />

                {/* Actions */}
                <div className="flex items-center gap-1 ml-auto">
                  {selectedNote &&
                    selectedNote.createdById === user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShareDialogOpen(true)}
                        title="Share with employees"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Share</span>
                      </Button>
                    )}
                  {selectedNote && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setChatDialogOpen(true)}
                      title="Share to chat"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Chat</span>
                    </Button>
                  )}
                  {selectedNote &&
                    selectedNote.createdById === user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={handleDelete}
                        title="Delete note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                </div>
              </div>

              {/* Shared users bar */}
              {selectedNote &&
                (selectedNote.sharedUserIds?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 px-5 py-2 border-b bg-primary/5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>Shared with:</span>
                    {selectedNote.sharedUserIds!.map((uid) => {
                      const emp = employeeMap.get(uid);
                      return (
                        <span
                          key={uid}
                          className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          {emp?.fullName ?? `User #${uid}`}
                        </span>
                      );
                    })}
                  </div>
                )}

              {/* Editor */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <NoteEditor
                  content={content}
                  onChange={handleContentChange}
                  placeholder="Start writing your note..."
                />
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Select a note or create a new one
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use the sidebar to browse your notes, or click{" "}
                    <strong>New</strong> to get started.
                  </p>
                </div>
                <Button onClick={handleNewNote}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {selectedNote && (
        <>
          <ShareNoteDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            sharedUserIds={selectedNote.sharedUserIds ?? []}
            onSave={handleShareSave}
            saving={updateNote.isPending}
          />
          <ShareNoteToChatDialog
            open={chatDialogOpen}
            onOpenChange={setChatDialogOpen}
            noteTitle={selectedNote.title}
            noteContent={selectedNote.content}
            noteId={selectedNote.id}
            authorName={user?.fullName}
          />
        </>
      )}
    </AppLayout>
  );
}
