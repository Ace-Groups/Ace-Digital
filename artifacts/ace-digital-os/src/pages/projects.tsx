import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StaggerItem, StaggerList } from "@/components/design";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Calendar,
  IndianRupee,
  GripVertical,
  CircleDashed,
  Timer,
  ShieldCheck,
  CheckCircle2,
  Target,
  Layers3,
} from "lucide-react";
import { formatCurrency, priorityColor, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  patchListItem,
  prependListItem,
  replaceListItem,
  setList,
  snapshotList,
} from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};
const STATUS_COLORS: Record<string, string> = {
  TODO: "border-slate-500/25 bg-slate-500/10",
  IN_PROGRESS: "border-sky-500/30 bg-sky-500/10",
  REVIEW: "border-amber-500/30 bg-amber-500/10",
  DONE: "border-emerald-500/30 bg-emerald-500/10",
};
const STATUS_ACCENTS: Record<string, string> = {
  TODO: "text-slate-300",
  IN_PROGRESS: "text-sky-300",
  REVIEW: "text-amber-300",
  DONE: "text-emerald-300",
};
const STATUS_ICON: Record<string, typeof CircleDashed> = {
  TODO: CircleDashed,
  IN_PROGRESS: Timer,
  REVIEW: ShieldCheck,
  DONE: CheckCircle2,
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
    const projectsKey = getListProjectsQueryKey();
    const tempId = -Date.now();
    const optimistic: Project = {
      id: tempId,
      name: data.name,
      description: data.description ?? null,
      teamId: data.teamId ? Number(data.teamId) : null,
      clientId: data.clientId ? Number(data.clientId) : null,
      priority: data.priority,
      status: "TODO",
      progress: 0,
      deadline: data.deadline || null,
      budget: data.budget ? Number(data.budget) : null,
    };
    setCreateOpen(false);
    form.reset();
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Project>(queryClient, projectsKey);
          prependListItem(queryClient, projectsKey, optimistic);
          return prev;
        },
        rollback: (prev) => setList(queryClient, projectsKey, prev),
        commit: () =>
          createProject.mutateAsync({
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
          }),
        reconcile: (created) => replaceListItem(queryClient, projectsKey, tempId, created),
      });
      toast({ title: "Project created!" });
    } catch {
      toast({ title: "Couldn't create project", variant: "destructive" });
    }
  }

  async function handleDrop(status: string, projectId: number) {
    const projectsKey = getListProjectsQueryKey();
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Project>(queryClient, projectsKey);
          patchListItem(queryClient, projectsKey, projectId, (p) => ({ ...p, status }));
          return prev;
        },
        rollback: (prev) => setList(queryClient, projectsKey, prev),
        commit: () => updateStatus.mutateAsync({ id: projectId, data: { status } }),
        reconcile: (updated) =>
          patchListItem(queryClient, projectsKey, projectId, () => updated),
      });
    } catch {
      toast({ title: "Couldn't move project", variant: "destructive" });
    }
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
  const totalProjects = projects?.length ?? 0;
  const avgProgress = useMemo(() => {
    if (!projects || projects.length === 0) return 0;
    return Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length);
  }, [projects]);
  const doneProjects = byStatus.DONE?.length ?? 0;
  const inFlightProjects = (byStatus.IN_PROGRESS?.length ?? 0) + (byStatus.REVIEW?.length ?? 0);

  const createForm = (
    <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mobile-form space-y-4">
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
                          <DatePicker
                            inModal
                            data-testid="input-project-deadline"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder="Select deadline"
                          />
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
      <StaggerList className="page-stack">
      <StaggerItem>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Layers3 size={13} /> Total Projects</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{totalProjects}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Target size={13} /> Active Pipeline</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{inFlightProjects}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 size={13} /> Completion</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{totalProjects === 0 ? "0%" : `${Math.round((doneProjects / totalProjects) * 100)}%`}</p>
            <p className="text-xs text-muted-foreground">Avg progress {avgProgress}%</p>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {totalProjects} total projects
            </p>
            <p className="mt-1 text-xs text-muted-foreground/90">
              Drag a card to move status, or tap any card to edit details.
            </p>
          </div>
          <Button
            data-testid="btn-create-project"
            className="hidden shrink-0 gap-2 sm:inline-flex active:scale-[0.98]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} /> New Project
          </Button>
          <ResponsiveSheet open={createOpen} onOpenChange={setCreateOpen} title="Create Project">
            {createForm}
          </ResponsiveSheet>
        </div>
      </StaggerItem>

      <ProjectDetailDialog
        project={selectedProject}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        teams={teams}
        clients={clients?.map((c) => ({ id: c.id, companyName: c.companyName }))}
        onDuplicate={handleDuplicate}
      />

      <StaggerItem>
        {!isLoading && totalProjects === 0 && (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center">
            <h3 className="text-base font-semibold">No projects yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Start by creating your first project. It will appear in To Do and can then be moved across the workflow.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Create First Project
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((status) => (
            <section
              key={status}
              data-testid={`kanban-col-${status.toLowerCase()}`}
              className={cn(
                "relative rounded-2xl border p-3 sm:p-4 transition-colors",
                STATUS_COLORS[status],
              )}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={() => {
                if (dragging !== null) void handleDrop(status, dragging);
                setDragging(null);
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = STATUS_ICON[status];
                    return <Icon size={14} className={cn("shrink-0", STATUS_ACCENTS[status])} />;
                  })()}
                  <h3 className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</h3>
                </div>
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {byStatus[status]?.length ?? 0}
                </Badge>
              </div>

              <div className="space-y-2 min-h-[10rem]">
                {isLoading
                  ? [1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                  : byStatus[status]?.map((project) => (
                      <article
                        key={project.id}
                        data-testid={`project-card-${project.id}`}
                        className={cn(
                          "rounded-xl border border-border/80 bg-card/95 shadow-brand-sm transition-all duration-200",
                          "hover:border-primary/30 hover:shadow-brand-md",
                          dragging === project.id && "opacity-50 ring-2 ring-primary/30",
                        )}
                      >
                        <div
                          draggable
                          onDragStart={() => setDragging(project.id)}
                          onDragEnd={() => setDragging(null)}
                          className="flex justify-end px-2 pt-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
                          title="Drag to move"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical size={14} />
                        </div>
                        <button
                          type="button"
                          onClick={() => openProject(project)}
                          className="w-full rounded-b-xl px-3 pb-3 pt-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <p className="pr-1 text-sm font-medium leading-tight text-foreground">
                            {project.name}
                          </p>
                          <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">
                            {project.teamName ?? "Unassigned team"}
                            {project.clientName ? ` · ${project.clientName}` : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn("text-xs", priorityColor(project.priority))}>
                              {project.priority}
                            </Badge>
                            <span className="text-xs tabular-nums text-muted-foreground">{project.progress}%</span>
                          </div>
                          <div className="mt-2">
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            {project.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(project.deadline).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            )}
                            {project.budget != null && (
                              <span className="ml-auto flex items-center gap-1 tabular-nums">
                                <IndianRupee size={10} />
                                {formatCurrency(project.budget)}
                              </span>
                            )}
                          </div>
                        </button>
                      </article>
                    ))}
                {!isLoading && (byStatus[status]?.length ?? 0) === 0 && (
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-4 text-center text-xs text-muted-foreground">
                    <p>No projects in {STATUS_LABELS[status].toLowerCase()}.</p>
                    {status === "TODO" && (
                      <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-primary transition-colors hover:bg-primary/10"
                      >
                        <Plus size={12} /> Add project
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </StaggerItem>

      <StaggerItem>
        <Button
          data-testid="btn-create-project-mobile"
          size="lg"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full p-0 shadow-brand-md active:scale-[0.98] sm:hidden"
          onClick={() => setCreateOpen(true)}
          aria-label="New project"
        >
          <Plus size={22} />
        </Button>
      </StaggerItem>
      </StaggerList>
    </AppLayout>
  );
}
