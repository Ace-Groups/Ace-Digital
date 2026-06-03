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
import { useCreateTeam, getListTeamsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { prependListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";

const TEAM_COLORS = [
  "#5483B3",
  "#7DA0C4",
  "#052659",
  "#C1E8FF",
  "#6366f1",
  "#22c55e",
  "#f59e0b",
];

interface TeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (team: { id: number; name: string }) => void;
}

export function TeamCreateDialog({ open, onOpenChange, onCreated }: TeamCreateDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const createTeam = useCreateTeam();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const teamsKey = getListTeamsQueryKey();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const tempId = -Date.now();
    onOpenChange(false);
    setName("");
    setColor(TEAM_COLORS[0]);
    onCreated({ id: tempId, name: trimmed });
    try {
      const team = await runOptimistic({
        apply: () => {
          const prev = snapshotList<{ id: number; name: string; color?: string }>(
            queryClient,
            teamsKey,
          );
          prependListItem(queryClient, teamsKey, { id: tempId, name: trimmed, color });
          return prev;
        },
        rollback: (prev) => setList(queryClient, teamsKey, prev),
        commit: () => createTeam.mutateAsync({ data: { name: trimmed, color } }),
        reconcile: (created) => {
          onCreated({ id: created.id, name: created.name });
          void queryClient.invalidateQueries({ queryKey: teamsKey });
        },
      });
      toast({ title: `Team "${team.name}" ready` });
    } catch {
      toast({ title: "Could not create team", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="mobile-form space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              className="min-h-11"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Operations"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-9 w-9 rounded-full border-2 transition-transform hover:scale-105"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "hsl(var(--foreground))" : "transparent",
                  }}
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="min-h-11 w-full" disabled={createTeam.isPending}>
            {createTeam.isPending ? "Creating…" : "Create team"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
