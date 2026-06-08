import { Team } from "@workspace/api-client-react";
import { Users2, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamCardProps {
  team: Team;
  isSelected: boolean;
  onClick: () => void;
}

export function TeamCard({ team, isSelected, onClick }: TeamCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md",
        isSelected ? "border-primary bg-primary/5 shadow-sm" : "bg-card hover:border-primary/50"
      )}
    >
      <div 
        className="absolute left-0 top-0 h-full w-1.5 transition-all group-hover:w-2"
        style={{ backgroundColor: team.color || "hsl(var(--primary))" }}
      />
      <div className="flex items-start justify-between pl-2">
        <h3 className="font-semibold text-lg">{team.name}</h3>
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground pl-2">
        <div className="flex items-center gap-1.5">
          <Users2 className="h-4 w-4" />
          <span className="tabular-nums">{team.memberCount}</span> members
        </div>
        <div className="flex items-center gap-1.5">
          <FolderKanban className="h-4 w-4" />
          <span className="tabular-nums">{team.projectCount ?? 0}</span> projects
        </div>
      </div>
    </div>
  );
}
