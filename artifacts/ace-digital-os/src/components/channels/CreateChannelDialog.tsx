import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateChannel, useListEmployees, useListTeams, getListChannelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (channelId: number) => void;
}

export function CreateChannelDialog({ open, onClose, onCreated }: CreateChannelDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createChannel = useCreateChannel();
  const { data: employees } = useListEmployees();
  const { data: teams } = useListTeams();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"TEAM" | "ANNOUNCEMENT">("TEAM");
  const [teamId, setTeamId] = useState<string>("");
  const [memberIds, setMemberIds] = useState<number[]>([]);

  function reset() {
    setName("");
    setDescription("");
    setType("TEAM");
    setTeamId("");
    setMemberIds([]);
  }

  function toggleMember(id: number) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const channel = await createChannel.mutateAsync({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          teamId: teamId ? Number(teamId) : undefined,
          memberIds: memberIds.length > 0 ? memberIds : undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
      toast({ title: "Channel created", description: `#${channel.name} is ready.` });
      reset();
      onCreated?.(channel.id);
      onClose();
    } catch {
      toast({
        title: "Could not create channel",
        description: "Check the name (lowercase letters, numbers, hyphens) and try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mobile-form space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ch-name">Name</Label>
            <Input
              id="ch-name"
              data-testid="input-channel-name"
              placeholder="e.g. product-launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-desc">Description (optional)</Label>
            <Input
              id="ch-desc"
              placeholder="What is this channel for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "TEAM" | "ANNOUNCEMENT")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEAM">Team channel</SelectItem>
                <SelectItem value="ANNOUNCEMENT">Announcement (read-only for most)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "TEAM" && (
            <div className="space-y-2">
              <Label>Link to team (adds all team members)</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Invite people</Label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
              {employees?.map((emp) => (
                <label
                  key={emp.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                    memberIds.includes(emp.id) && "bg-primary/10",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={memberIds.includes(emp.id)}
                    onChange={() => toggleMember(emp.id)}
                    className="rounded border-border"
                  />
                  <span className="truncate">{emp.fullName}</span>
                </label>
              ))}
            </div>
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={!name.trim() || createChannel.isPending}
            data-testid="btn-submit-channel"
          >
            {createChannel.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Creating…</>
            ) : (
              "Create channel"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
