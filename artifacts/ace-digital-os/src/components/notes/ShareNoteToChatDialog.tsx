import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useListChannels,
  useSendMessage,
} from "@workspace/api-client-react";
import { Search, MessageSquare, Hash, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareNoteToChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteTitle: string;
  noteContent: string;
  noteId: number;
  authorName?: string;
}

/** Strip HTML tags for a text preview */
function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

export function ShareNoteToChatDialog({
  open,
  onOpenChange,
  noteTitle,
  noteContent,
  noteId,
  authorName,
}: ShareNoteToChatDialogProps) {
  const { toast } = useToast();
  const { data: channels } = useListChannels();
  const sendMessage = useSendMessage();
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    return channels.filter((ch) => {
      if (!search.trim()) return true;
      const name = ch.dmPeerName || ch.name || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [channels, search]);

  const handleSend = async (channelId: number) => {
    setSending(true);
    try {
      const textPreview = stripHtml(noteContent).slice(0, 200);
      const body = `📝 **${noteTitle}**\n\n${textPreview}${textPreview.length >= 200 ? "..." : ""}\n\n_— Shared by ${authorName ?? "a team member"}_`;

      await sendMessage.mutateAsync({
        id: channelId,
        data: {
          body,
          messageKind: "text",
          metadata: {
            noteId,
            noteTitle,
            isNoteShare: true,
          },
        },
      });

      toast({ title: "Note shared to chat!" });
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to share note", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Share to Chat
          </DialogTitle>
          <DialogDescription>
            Choose a channel or DM to share this note.
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-sm font-semibold truncate">{noteTitle}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {stripHtml(noteContent).slice(0, 120)}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Channel list */}
        <ScrollArea className="h-[260px] -mx-2">
          <div className="space-y-0.5 px-2">
            {filteredChannels.map((ch) => {
              const isDm = ch.type === "dm";
              const displayName = ch.dmPeerName || ch.name || "Former teammate";
              return (
                <button
                  key={ch.id}
                  type="button"
                  disabled={sending}
                  onClick={() => handleSend(ch.id)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent border border-transparent disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0">
                    {isDm ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      <Hash className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isDm ? "Direct Message" : "Channel"}
                      {ch.memberCount ? ` · ${ch.memberCount} members` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
            {filteredChannels.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No channels found.
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
