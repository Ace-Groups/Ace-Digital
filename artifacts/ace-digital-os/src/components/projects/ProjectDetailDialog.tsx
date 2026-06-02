import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  useUpdateProject,
  useDeleteProject,
  useListTasks,
  getListProjectsQueryKey,
  type Project,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  IndianRupee,
  ListTodo,
  Trash2,
  Building2,
  Users,
} from "lucide-react";
import { formatCurrency, priorityColor, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

const editSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  teamId: z.string().optional(),
  clientId: z.string().optional(),
  priority: z.string(),
  status: z.string(),
  progress: z.coerce.number().min(0).max(100),
  deadline: z.string().optional(),
  budget: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

type Team = { id: number; name: string };
type Client = { id: number; companyName: string };

type Props = {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams?: Team[];
  clients?: Client[];
  onDeleted?: () => void;
  onDuplicate?: (project: Project) => void;
};

function toFormValues(project: Project): EditForm {
  return {
    name: project.name,
    description: project.description ?? "",
    teamId: project.teamId != null ? String(project.teamId) : "__none__",
    clientId: project.clientId != null ? String(project.clientId) : "__none__",
    priority: project.priority,
    status: project.status,
    progress: project.progress ?? 0,
    deadline: project.deadline ? project.deadline.slice(0, 10) : "",
    budget: project.budget != null ? String(project.budget) : "",
  };
}

export function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
  teams,
  clients,
  onDeleted,
  onDuplicate,
}: Props) {
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: projectTasks } = useListTasks(
    project ? { projectId: project.id } : undefined,
    { query: { enabled: open && !!project, staleTime: 15_000 } } as never,
  );

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      description: "",
      priority: "MEDIUM",
      status: "TODO",
      progress: 0,
    },
  });

  useEffect(() => {
    if (project && open) {
      form.reset(toFormValues(project));
    }
  }, [project, open, form]);

  async function onSave(data: EditForm) {
    if (!project) return;
    const teamId =
      data.teamId && data.teamId !== "__none__" ? Number(data.teamId) : null;
    const clientId =
      data.clientId && data.clientId !== "__none__" ? Number(data.clientId) : null;

    await updateProject.mutateAsync({
      id: project.id,
      data: {
        name: data.name,
        description: data.description || undefined,
        teamId,
        clientId,
        priority: data.priority,
        status: data.status,
        progress: data.progress,
        deadline: data.deadline || undefined,
        budget: data.budget ? Number(data.budget) : undefined,
      } as Parameters<typeof updateProject.mutateAsync>[0]["data"],
    });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    toast({ title: "Project updated" });
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!project) return;
    await deleteProject.mutateAsync({ id: project.id });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    toast({ title: "Project deleted" });
    setDeleteOpen(false);
    onOpenChange(false);
    onDeleted?.();
  }

  async function markComplete() {
    if (!project) return;
    form.setValue("status", "DONE");
    form.setValue("progress", 100);
    await updateProject.mutateAsync({
      id: project.id,
      data: { status: "DONE", progress: 100 },
    });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    toast({ title: "Marked as complete" });
    onOpenChange(false);
  }

  const pendingTasks = projectTasks?.filter((t) => t.status !== "DONE").length ?? 0;
  const totalTasks = projectTasks?.length ?? 0;

  if (!project) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-testid="project-detail-dialog"
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-xl leading-tight">{project.name}</DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", priorityColor(project.priority))}>
                    {project.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABELS[project.status] ?? project.status}
                  </span>
                  {project.createdAt && (
                    <span className="text-xs text-muted-foreground">
                      · Created {new Date(project.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                data-testid={`quick-status-${s.toLowerCase()}`}
                onClick={() => form.setValue("status", s)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full border font-medium transition-colors",
                  form.watch("status") === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project name</FormLabel>
                    <FormControl>
                      <Input data-testid="edit-project-name" {...field} />
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
                      <Textarea data-testid="edit-project-desc" rows={3} placeholder="Goals, scope, notes…" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="progress"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Progress</FormLabel>
                      <span className="text-sm font-medium tabular-nums">{field.value}%</span>
                    </div>
                    <FormControl>
                      <Slider
                        data-testid="edit-project-progress"
                        min={0}
                        max={100}
                        step={5}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                      />
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
                      <FormLabel className="flex items-center gap-1">
                        <Users size={14} /> Team
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger data-testid="edit-project-team">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Unassigned</SelectItem>
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
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Building2 size={14} /> Client
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger data-testid="edit-project-client">
                            <SelectValue placeholder="No client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No client</SelectItem>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="edit-project-priority">
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
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board column</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="edit-project-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Calendar size={14} /> Deadline
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          inModal
                          data-testid="edit-project-deadline"
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
                      <FormLabel className="flex items-center gap-1">
                        <IndianRupee size={14} /> Budget
                      </FormLabel>
                      <FormControl>
                        <Input type="number" data-testid="edit-project-budget" placeholder="0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {project.budget != null && Number(form.watch("budget") || 0) > 500000 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Budgets over ₹5,00,000 may require management approval.
                </p>
              )}

              <Separator />

              <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <ListTodo size={16} className="text-muted-foreground" />
                  <span>
                    <span className="font-medium">{totalTasks}</span> tasks
                    {pendingTasks > 0 && (
                      <span className="text-muted-foreground"> · {pendingTasks} open</span>
                    )}
                  </span>
                </div>
                <Link href={`/tasks?projectId=${project.id}`}>
                  <Button type="button" variant="outline" size="sm" className="gap-1" data-testid="btn-view-project-tasks">
                    View tasks
                    <ExternalLink size={14} />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="submit"
                  className="flex-1 min-w-[120px]"
                  disabled={updateProject.isPending}
                  data-testid="btn-save-project"
                >
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1"
                  onClick={markComplete}
                  disabled={updateProject.isPending || project.status === "DONE"}
                >
                  <CheckCircle2 size={16} />
                  Complete
                </Button>
                {onDuplicate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Duplicate project"
                    onClick={() => onDuplicate(project)}
                  >
                    <Copy size={16} />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  title="Delete project"
                  data-testid="btn-delete-project"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project?"
        description={
          <>
            This permanently removes <strong>{project.name}</strong>
            {totalTasks > 0 && ` and unlinks ${totalTasks} task(s)`}. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleteProject.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
