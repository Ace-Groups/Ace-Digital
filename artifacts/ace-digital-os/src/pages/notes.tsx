import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileChromeFlags } from "@/contexts/MobileChromeContext";
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
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Note } from "@workspace/api-client-react";
import { format } from "date-fns";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { CollaborativeNoteEditor } from "@/components/notes/CollaborativeNoteEditor";
import {
  NotePresenceDynamicIsland,
  type NoteCollabPresenceState,
} from "@/components/notes/NotePresenceDynamicIsland";
import { isFirebaseCollabEnabled } from "@/lib/firebase-rtdb";
import { ShareNoteDialog } from "@/components/notes/ShareNoteDialog";
import { ShareNoteToChatDialog } from "@/components/notes/ShareNoteToChatDialog";
import { NoteAiActions } from "@/components/ai/NoteAiActions";
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
  const { socket } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: notes, isLoading } = useListNotes();
  const [collaborators, setCollaborators] = useState<
    { userId: number; fullName: string; avatarUrl: string | null }[]
  >([]);
  const [collabPresence, setCollabPresence] = useState<NoteCollabPresenceState | null>(
    null,
  );
  const collabIslandEnabled = isFirebaseCollabEnabled();
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
  const hasInitialNoteOpened = useRef(false);

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

  // Manage socket note rooms and collaborators sync
  const lastJoinedNoteIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!socket) return;

    const currentNoteId = selectedNoteId;
    const lastNoteId = lastJoinedNoteIdRef.current;

    if (lastNoteId && lastNoteId !== currentNoteId) {
      socket.emit("leave_note", lastNoteId);
      setCollaborators([]);
      setCollabPresence(null);
      lastJoinedNoteIdRef.current = null;
    }

    if (currentNoteId) {
      socket.emit("join_note", currentNoteId, (res: { ok?: boolean; error?: string }) => {
        if (res?.error) {
          console.error("Failed to join note room:", res.error);
        } else {
          lastJoinedNoteIdRef.current = currentNoteId;
        }
      });
    }

    return () => {
      if (lastJoinedNoteIdRef.current) {
        socket.emit("leave_note", lastJoinedNoteIdRef.current);
        lastJoinedNoteIdRef.current = null;
      }
    };
  }, [selectedNoteId, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleNoteTitleEdited = (payload: {
      noteId: number;
      title: string;
      senderId: number;
    }) => {
      if (payload.noteId === selectedNoteId && payload.senderId !== user?.id) {
        setTitle(payload.title);
        lastSavedRef.current = {
          ...lastSavedRef.current,
          title: payload.title,
        };
      }
    };

    const handleNoteUsers = (payload: {
      noteId: number;
      users: { userId: number; fullName: string; avatarUrl: string | null }[];
    }) => {
      if (payload.noteId === selectedNoteId) {
        setCollaborators(payload.users.filter((u) => u.userId !== user?.id));
      }
    };

    const handleNoteSaved = (payload: {
      noteId: number;
      note: Note;
      senderId: number;
    }) => {
      if (payload.noteId === selectedNoteId && payload.senderId !== user?.id) {
        setTitle(payload.note.title);
        lastSavedRef.current = {
          ...lastSavedRef.current,
          title: payload.note.title,
        };
      }
    };

    const handleNotesRefresh = (payload: {
      noteId: number;
      type: "create" | "update" | "delete";
      senderId: number;
    }) => {
      void queryClient.invalidateQueries({
        queryKey: getListNotesQueryKey(),
      });

      if (
        payload.type === "delete" &&
        payload.noteId === selectedNoteId &&
        payload.senderId !== user?.id
      ) {
        setSelectedNoteId(null);
        setCreating(false);
        toast({ title: "This note was deleted by the owner" });
      }
    };

    socket.on("note:title_edited", handleNoteTitleEdited);
    socket.on("note:users", handleNoteUsers);
    socket.on("note:saved", handleNoteSaved);
    socket.on("notes:refresh", handleNotesRefresh);

    return () => {
      socket.off("note:title_edited", handleNoteTitleEdited);
      socket.off("note:users", handleNoteUsers);
      socket.off("note:saved", handleNoteSaved);
      socket.off("notes:refresh", handleNotesRefresh);
    };
  }, [selectedNoteId, socket, user?.id, queryClient, toast]);

  const broadcastTitleEdit = useCallback(
    (newTitle: string) => {
      if (selectedNoteId && socket) {
        socket.emit("note:title_edit", {
          noteId: selectedNoteId,
          title: newTitle,
        });
      }
    },
    [selectedNoteId, socket],
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
      broadcastTitleEdit(val);
      scheduleAutoSave(val, content);
    },
    [content, scheduleAutoSave, broadcastTitleEdit],
  );

  // Content change — Yjs handles real-time body sync; REST save exports HTML to Postgres.
  const handleContentChange = useCallback(
    (html: string) => {
      setContent(html);
      scheduleAutoSave(title, html);
    },
    [title, scheduleAutoSave],
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

  // Handle initial opening of note based on query parameters
  useEffect(() => {
    if (hasInitialNoteOpened.current || !notes || notes.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) {
      const noteId = parseInt(idParam, 10);
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        hasInitialNoteOpened.current = true;
        if (note.createdById === user?.id) {
          setTab("mine");
        } else {
          setTab("shared");
        }
        openNote(note);
      }
    }
  }, [notes, user?.id, openNote]);

  // Sync selected note ID to window location search query parameters
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedNoteId) {
      url.searchParams.set("id", selectedNoteId.toString());
      window.history.replaceState(null, "", url.pathname + url.search);
    } else {
      url.searchParams.delete("id");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [selectedNoteId]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();

  const isEditorActive = selectedNote != null || creating;

  useMobileChromeFlags({
    immersivePage: isMobile,
    hideBottomNav: isMobile,
  });

  const closeEditor = useCallback(() => {
    setSelectedNoteId(null);
    setCreating(false);
    setCollabPresence(null);
  }, []);

  return (
    <AppLayout title="" fillViewport>
      <div className="notes-workspace flex flex-1 min-h-0">
        {/* ── List panel ── */}
        <div
          className={`notes-list-panel ${
            isEditorActive ? "notes-list-panel--hidden-mobile" : ""
          }`}
        >
          <div className="notes-list-header">
            <div className="notes-list-header-top">
              <div className="min-w-0">
                <h2 className="notes-list-title">Notes</h2>
                {!isLoading && (
                  <p className="notes-list-subtitle">
                    {filteredNotes.length}{" "}
                    {filteredNotes.length === 1 ? "note" : "notes"}
                  </p>
                )}
              </div>
              <Button size="sm" className="shrink-0" onClick={handleNewNote}>
                <Plus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">New</span>
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="notes-list-search pl-9"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="notes-list-tabs" role="tablist" aria-label="Note filters">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "mine"}
                className={`notes-list-tab ${tab === "mine" ? "is-active" : ""}`}
                onClick={() => setTab("mine")}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                My Notes
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "shared"}
                className={`notes-list-tab ${tab === "shared" ? "is-active" : ""}`}
                onClick={() => setTab("shared")}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
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

        {/* ── Editor panel ── */}
        <div
          className={`notes-editor-panel ${
            isEditorActive ? "notes-editor-panel--active" : ""
          }`}
        >
          {isEditorActive ? (
            <>
              <header className="notes-editor-header">
                <div className="notes-editor-header-main">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="notes-editor-back md:hidden"
                    onClick={closeEditor}
                    aria-label="Back to notes"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <Input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Note title..."
                    className="notes-editor-title-input"
                  />

                  <div className="notes-editor-actions">
                    {!collabIslandEnabled && collaborators.length > 0 && (
                      <div
                        className="notes-editor-collab-avatars hidden sm:flex"
                        title="Collaborators active on this note"
                      >
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {collaborators.map((collab) => (
                            <div
                              key={collab.userId}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background"
                              title={`${collab.fullName} is editing`}
                            >
                              {collab.fullName ? getInitials(collab.fullName) : "?"}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="hidden md:flex items-center gap-1">
                      {selectedNote && selectedNote.createdById === user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3"
                          onClick={() => setShareDialogOpen(true)}
                          title="Share with employees"
                        >
                          <Share2 className="h-4 w-4 mr-1.5" />
                          Share
                        </Button>
                      )}
                      {selectedNote && <NoteAiActions noteId={selectedNote.id} />}
                      {selectedNote && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3"
                          onClick={() => setChatDialogOpen(true)}
                          title="Share to chat"
                        >
                          <MessageSquare className="h-4 w-4 mr-1.5" />
                          Chat
                        </Button>
                      )}
                      {selectedNote && selectedNote.createdById === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={handleDelete}
                          title="Delete note"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 md:hidden">
                      {selectedNote && <NoteAiActions noteId={selectedNote.id} />}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="Note actions"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {selectedNote && selectedNote.createdById === user?.id && (
                            <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Share
                            </DropdownMenuItem>
                          )}
                          {selectedNote && (
                            <DropdownMenuItem onClick={() => setChatDialogOpen(true)}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Share to chat
                            </DropdownMenuItem>
                          )}
                          {selectedNote && selectedNote.createdById === user?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={handleDelete}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {selectedNoteId && collabIslandEnabled && collabPresence && (
                  <div className="notes-editor-presence">
                    <NotePresenceDynamicIsland
                      status={collabPresence.status}
                      peers={collabPresence.peers}
                      error={collabPresence.error}
                    />
                  </div>
                )}

                {selectedNote && (selectedNote.sharedUserIds?.length ?? 0) > 0 && (
                  <div className="notes-editor-shared-bar">
                    <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="shrink-0">Shared with:</span>
                    <div className="notes-editor-shared-chips">
                      {selectedNote.sharedUserIds!.map((uid) => {
                        const emp = employeeMap.get(uid);
                        return (
                          <span key={uid} className="notes-editor-shared-chip">
                            {emp?.fullName ?? `User #${uid}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </header>

              {/* Editor */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {selectedNoteId && user ? (
                  <CollaborativeNoteEditor
                    noteId={selectedNoteId}
                    initialHtml={content}
                    user={{ id: user.id, fullName: user.fullName }}
                    onHtmlChange={handleContentChange}
                    onPresenceChange={setCollabPresence}
                    placeholder="Start writing your note..."
                  />
                ) : (
                  <NoteEditor
                    content={content}
                    onChange={handleContentChange}
                    placeholder="Start writing your note..."
                  />
                )}
              </div>
            </>
          ) : (
            <div className="notes-empty-state">
              <div className="notes-empty-state-inner">
                <div className="notes-empty-state-icon">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Select a note or create a new one
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pick a note from the list or start fresh with a new one.
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
