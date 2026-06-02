import { useMemo, useState } from "react";
import type { TaskAssignee } from "@workspace/api-client-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users2, CheckCircle2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const MAX_VISIBLE = 4;

interface TaskAssigneesDisplayProps {
  assignees?: TaskAssignee[];
  className?: string;
}

export function TaskAssigneesDisplay({ assignees, className }: TaskAssigneesDisplayProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const list = assignees ?? [];
  const count = list.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => a.fullName.toLowerCase().includes(q));
  }, [list, query]);

  if (count === 0) {
    return (
      <Badge variant="secondary" className={cn("gap-1 text-xs font-normal", className)}>
        <Users2 size={12} />
        Common
      </Badge>
    );
  }

  const visible = list.slice(0, MAX_VISIBLE);
  const overflow = count - visible.length;
  const doneCount = list.filter((a) => a.completed).length;

  const trigger = (
    <button
      type="button"
      className={cn(
        "flex max-w-full items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-2 py-1.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70",
        className,
      )}
      aria-label={`${count} assignee${count === 1 ? "" : "s"}`}
    >
      <div className="flex shrink-0 -space-x-2">
        {visible.map((a) => (
          <Avatar
            key={a.userId}
            className={cn(
              "h-7 w-7 border-2 border-background sm:h-6 sm:w-6",
              a.completed && "ring-1 ring-emerald-500/60",
            )}
          >
            <AvatarFallback
              className={cn(
                "text-[10px]",
                a.completed
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-primary/15 text-primary",
              )}
            >
              {getInitials(a.fullName)}
            </AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground sm:h-6 sm:w-6">
            +{overflow}
          </div>
        )}
      </div>
      <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
        {count === 1 ? list[0]!.fullName : `${count} people`}
      </span>
      {count > 1 && (
        <span className="hidden text-[10px] tabular-nums text-muted-foreground lg:inline">
          {doneCount}/{count}
        </span>
      )}
    </button>
  );

  if (count === 1) {
    const a = list[0]!;
    return (
      <div
        className={cn("flex items-center gap-1.5", className)}
        title={a.fullName}
      >
        <Avatar className="h-7 w-7 sm:h-6 sm:w-6">
          <AvatarFallback
            className={cn(
              "text-[10px]",
              a.completed
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-primary/15 text-primary",
            )}
          >
            {getInitials(a.fullName)}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-[7rem] truncate text-xs text-muted-foreground sm:max-w-[9rem]">
          {a.fullName.split(" ")[0]}
        </span>
        {a.completed && <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,18rem)] p-0">
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Assignees</p>
          <p className="text-xs text-muted-foreground">
            {doneCount} of {count} completed
          </p>
        </div>
        {count > 10 && (
          <div className="border-b border-border p-2">
            <Input
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9"
            />
          </div>
        )}
        <ul className="touch-scroll max-h-56 overflow-y-auto p-2">
          {filtered.map((a) => (
            <li
              key={a.userId}
              className="flex min-h-10 items-center gap-2 rounded-lg px-2 py-1.5"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                  {getInitials(a.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm">{a.fullName}</span>
              {a.completed ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" aria-label="Done" />
              ) : (
                <span className="text-[10px] text-muted-foreground">Pending</span>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-2 py-4 text-center text-xs text-muted-foreground">No matches</li>
          )}
        </ul>
        <p className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
          Edit task to change assignees
        </p>
      </PopoverContent>
    </Popover>
  );
}
