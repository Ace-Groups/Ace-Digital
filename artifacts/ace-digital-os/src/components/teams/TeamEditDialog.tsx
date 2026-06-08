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
import { Team, useUpdateTeam, useDeleteTeam, getListTeamsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const TEAM_COLORS = [
  "#5483B3",
  "#7DA0C4",
  "#052659",
  "#C1E8FF",
  "#6366f1",
  "#22c55e",
  "#f59e0b",
];

interface TeamEditDialogProps {
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
  onDeleted?: () => void;
}

export function TeamEditDialog({ team, open, onOpenChange, canEdit, canDelete, onDeleted }: TeamEditDialogProps) {
  const [name, setName] = useState(team.name);
  const [color, setColor] = useState(team.color || TEAM_COLORS[0]);
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const teamsKey = getListTeamsQueryKey();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    
    try {
      await updateTeam.mutateAsync({ id: team.id, data: { name: trimmed, color } });
      await queryClient.invalidateQueries({ queryKey: teamsKey });
      toast({ title: "Team updated" });
      onOpenChange(false);
    } catch {
      toast({ title: "Could not update team", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!canDelete) return;
    if (!confirm("Are you sure you want to delete this team? Members and projects will be unassigned.")) return;
    try {
      await deleteTeam.mutateAsync({ id: team.id });
      await queryClient.invalidateQueries({ queryKey: teamsKey });
      toast({ title: "Team deleted" });
      onOpenChange(false);
      onDeleted?.();
    } catch {
      toast({ title: "Could not delete team", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-team-name">Team name</Label>
            <Input
              id="edit-team-name"
              className="min-h-11"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit || updateTeam.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={!canEdit || updateTeam.isPending}
                  className="h-9 w-9 rounded-full border-2 transition-transform hover:scale-105 disabled:opacity-50"
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
          
          <div className="flex flex-col gap-2 pt-4">
            {canEdit && (
              <Button type="submit" className="w-full" disabled={updateTeam.isPending}>
                {updateTeam.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
            {canDelete && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteTeam.isPending}>
                Delete team
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
