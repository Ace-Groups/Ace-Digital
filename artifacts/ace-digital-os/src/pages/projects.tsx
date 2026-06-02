import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { ProjectDetailDialog } from "@/components/projects/ProjectDetailDialog";
import {
  useListProjects,
  useCreateProject,
  useUpdateProjectStatus,
  useListTeams,
  useListClients,
  getListProjectsQueryKey,
  type Project,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, IndianRupee, GripVertical } from "lucide-react";
import { formatCurrency, priorityColor, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};
const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-gray-50 border-gray-200",
  IN_PROGRESS: "bg-blue-50 border-blue-200",
  REVIEW: "bg-purple-50 border-purple-200",
  DONE: "bg-emerald-50 border-emerald-200",
};

const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  teamId: z.string().optional(),
  clientId: z.string().optional(),
  priority: z.string(),
  deadline: z.string().optional(),
  budget: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function ProjectsPage() {
  const isMobile = useIsMobile();
  const { data: projects, isLoading } = useListProjects();
  const { data: teams } = useListTeams();
  const { data: clients } = useListClients();
  const createProject = useCreateProject();
  const updateStatus = useUpdateProjectStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", description: "", priority: "MEDIUM" },
  });

  async function onSubmit(data: CreateForm) {
    await createProject.mutateAsync({
      data: {
        name: data.name,
        description: data.description,
        teamId: data.teamId ? Number(data.teamId) : undefined,
        clientId: data.clientId ? Number(data.clientId) : undefined,
        priority: data.priority,
        status: "TODO",
        deadline: data.deadline || undefined,
        budget: data.budget ? Number(data.budget) : undefined,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    toast({ title: "Project created!" });
    setCreateOpen(false);
    form.reset();
  }

  async function handleDrop(status: string, projectId: number) {
    await updateStatus.mutateAsync({ id: projectId, data: { status } });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  }

  function openProject(project: Project) {
    setSelectedProject(project);
    setDetailOpen(true);
  }

  async function handleDuplicate(source: Project) {
    await createProject.mutateAsync({
      data: {
        name: `${source.name} (copy)`,
        description: source.description ?? undefined,
        teamId: source.teamId ?? undefined,
        clientId: source.clientId ?? undefined,
        priority: source.priority,
        status: "TODO",
        deadline: source.deadline ?? undefined,
        budget: source.budget ?? undefined,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    toast({ title: "Project duplicated", description: "A copy was added to To Do." });
    setDetailOpen(false);
  }

  function handleDetailOpenChange(open: boolean) {
    setDetailOpen(open);
    if (!open) setSelectedProject(null);
  }

  const byStatus = STATUSES.reduce<Record<string, typeof projects>>((acc, s) => {
    acc[s] = projects?.filter((p) => p.status === s) ?? [];
    return acc;
  }, {} as Record<string, typeof projects>);

  const createForm = (
    <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-project-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea data-testid="input-project-desc" rows={2} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project-team">
                              <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teams?.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-client">
                            <SelectValue placeholder="Optional client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-project-deadline" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" data-testid="input-project-budget" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  data-testid="btn-submit-project"
                  type="submit"
                  className="w-full"
                  disabled={createProject.isPending}
                >
                  Create Project
                </Button>
              </form>
    </Form>
  );

  return (
    <AppLayout title="Projects">
      <div className="page-stack">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {projects?.length ?? 0} total projects · tap a card to edit
        </p>
        <Button
          data-testid="btn-create-project"
          className="hidden gap-2 sm:inline-flex"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} /> New Project
        </Button>
        <ResponsiveSheet open={createOpen} onOpenChange={setCreateOpen} title="Create Project">
          {createForm}
        </ResponsiveSheet>
      </div>

      <ProjectDetailDialog
        project={selectedProject}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        teams={teams}
        clients={clients?.map((c) => ({ id: c.id, companyName: c.companyName }))}
        onDuplicate={handleDuplicate}
      />

      {isMobile ? (
        <div className="space-y-6">
          {STATUSES.map((status) => (
            <section key={status}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</h3>
                <Badge variant="secondary" className="text-xs">
                  {byStatus[status]?.length ?? 0}
                </Badge>
              </div>
              <div className="space-y-2">
                {isLoading
                  ? [1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                  : byStatus[status]?.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        data-testid={`project-card-${project.id}`}
                        onClick={() => openProject(project)}
                        className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-brand-sm transition-transform active:scale-[0.99]"
                      >
                        <p className="text-sm font-medium text-foreground">{project.name}</p>
                        {project.teamName && (
                          <p className="mt-1 text-xs text-muted-foreground">{project.teamName}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs", priorityColor(project.priority))}>
                            {project.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {project.progress}%
                          </span>
                        </div>
                      </button>
                    ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-96">
        {STATUSES.map((status) => (
          <div
            key={status}
            data-testid={`kanban-col-${status.toLowerCase()}`}
            className={cn(
              "rounded-xl border-2 p-3 min-h-64 transition-colors",
              STATUS_COLORS[status],
            )}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={() => {
              if (dragging !== null) handleDrop(status, dragging);
              setDragging(null);
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">{STATUS_LABELS[status]}</span>
              <Badge variant="secondary" className="text-xs">
                {byStatus[status]?.length ?? 0}
              </Badge>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {byStatus[status]?.map((project) => (
                  <div
                    key={project.id}
                    data-testid={`project-card-${project.id}`}
                    className={cn(
                      "bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow group",
                      dragging === project.id && "opacity-50 ring-2 ring-primary/30",
                    )}
                  >
                    <div
                      draggable
                      onDragStart={() => setDragging(project.id)}
                      onDragEnd={() => setDragging(null)}
                      className="flex justify-end px-2 pt-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
                      title="Drag to move column"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={14} />
                    </div>
                    <button
                      type="button"
                      onClick={() => openProject(project)}
                      className="w-full text-left px-3 pb-3 pt-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-b-lg"
                    >
                      <p className="text-sm font-medium text-gray-900 leading-tight pr-1">
                        {project.name}
                      </p>
                      {project.teamName && (
                        <p className="text-xs text-muted-foreground mt-1">{project.teamName}</p>
                      )}
                      {project.clientName && (
                        <p className="text-xs text-muted-foreground">{project.clientName}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <Badge variant="outline" className={cn("text-xs", priorityColor(project.priority))}>
                          {project.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        {project.deadline && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(project.deadline).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                        {project.budget != null && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                            <IndianRupee size={10} />
                            {formatCurrency(project.budget)}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {isMobile && (
        <Button
          data-testid="btn-create-project-mobile"
          size="lg"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full p-0 shadow-brand-md sm:hidden"
          onClick={() => setCreateOpen(true)}
          aria-label="New project"
        >
          <Plus size={22} />
        </Button>
      )}
      </div>
    </AppLayout>
  );
}
