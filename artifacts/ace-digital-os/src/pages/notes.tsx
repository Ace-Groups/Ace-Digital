import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import {
  useListNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  getListNotesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Note } from "@workspace/api-client-react";
import { format } from "date-fns";

export default function NotesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: notes, isLoading } = useListNotes();

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const handleOpenDialog = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
    } else {
      setEditingNote(null);
      setTitle("");
      setContent("");
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required.",
        variant: "destructive",
      });
      return;
    }

    if (editingNote) {
      updateNote.mutate(
        { id: editingNote.id, data: { title, content } },
        {
          onSuccess: () => {
            toast({ title: "Note updated successfully" });
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          },
          onError: () => {
            toast({ title: "Failed to update note", variant: "destructive" });
          },
        }
      );
    } else {
      createNote.mutate(
        { data: { title, content, sharedUserIds: [] } },
        {
          onSuccess: () => {
            toast({ title: "Note created successfully" });
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          },
          onError: () => {
            toast({ title: "Failed to create note", variant: "destructive" });
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteNote.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Note deleted" });
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to delete note", variant: "destructive" });
        },
      }
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Notes"
        description="Create and share notes with your team"
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            New Note
          </Button>
        }
      />
      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">Loading notes...</div>
        ) : !notes || notes.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
            No notes found. Create your first note!
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <Card key={note.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
                  <CardDescription className="text-xs">
                    Last updated {format(new Date(note.updatedAt), "PPp")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ScrollArea className="h-32 w-full pr-4 text-sm whitespace-pre-wrap text-muted-foreground">
                    {note.content}
                  </ScrollArea>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleOpenDialog(note)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {note.createdById === user?.id && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this note?")) {
                            handleDelete(note.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "New Note"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createNote.isPending || updateNote.isPending}
            >
              {editingNote ? "Save Changes" : "Create Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
