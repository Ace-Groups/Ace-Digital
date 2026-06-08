import { useMemo } from "react";
import { Project, useUnassignTeamProject, getListProjectsQueryKey, getListTeamsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderKanban, MoreHorizontal, Unlink, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface TeamProjectsTabProps {
  teamId: number;
  projects: Project[];
  canManageProjects: boolean;
  onProjectClick: (p: Project) => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "TODO": return <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">To Do</Badge>;
    case "IN_PROGRESS": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300">In Progress</Badge>;
    case "REVIEW": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300">Review</Badge>;
    case "DONE": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300">Done</Badge>;
    case "CANCELLED": return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export function TeamProjectsTab({ teamId, projects, canManageProjects, onProjectClick }: TeamProjectsTabProps) {
  const unassignProject = useUnassignTeamProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (a.status === "DONE" && b.status !== "DONE") return 1;
      if (a.status !== "DONE" && b.status === "DONE") return -1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [projects]);

  async function handleUnassign(project: Project) {
    if (!confirm(`Unassign "${project.name}" from this team?`)) return;
    try {
      await unassignProject.mutateAsync({ id: teamId, projectId: project.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() })
      ]);
      toast({ title: "Project unassigned" });
    } catch {
      toast({ title: "Failed to unassign", variant: "destructive" });
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <ScrollArea className="flex-1 -mx-4 px-4">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
            <FolderKanban className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No projects assigned</p>
            <p className="text-sm">Assign projects to this team to track their work.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
            {sorted.map((project) => (
              <div 
                key={project.id} 
                onClick={() => onProjectClick(project)}
                className="group relative flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 overflow-hidden">
                    <h4 className="truncate font-semibold text-base">{project.name}</h4>
                    <p className="line-clamp-2 text-sm text-muted-foreground mt-1 min-h-10">
                      {project.description || "No description provided."}
                    </p>
                  </div>
                  {canManageProjects && (
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onProjectClick(project)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open project
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleUnassign(project)}>
                            <Unlink className="mr-2 h-4 w-4" />
                            Unassign from team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-auto pt-2">
                  {getStatusBadge(project.status)}
                  {project.deadline && (
                    <span className="text-xs text-muted-foreground font-medium">
                      Due {format(new Date(project.deadline), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
