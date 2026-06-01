import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListProjects, useCreateProject, useUpdateProjectStatus, useListTeams,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, DollarSign, TrendingUp, GripVertical } from "lucide-react";
import { formatCurrency, priorityColor, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", DONE: "Done",
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
  priority: z.string(),
  deadline: z.string().optional(),
  budget: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function ProjectsPage() {
  const { data: projects, isLoading } = useListProjects();
  const { data: teams } = useListTeams();
  const createProject = useCreateProject();
  const updateStatus = useUpdateProjectStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
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
        priority: data.priority,
        status: "TODO",
        deadline: data.deadline || undefined,
        budget: data.budget ? Number(data.budget) : undefined,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    toast({ title: "Project created!" });
    setOpen(false);
    form.reset();
  }

  async function handleDrop(status: string, projectId: number) {
    await updateStatus.mutateAsync({ id: projectId, data: { status } });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  }

  const byStatus = STATUSES.reduce<Record<string, typeof projects>>((acc, s) => {
    acc[s] = projects?.filter((p) => p.status === s) ?? [];
    return acc;
  }, {} as Record<string, typeof projects>);

  return (
    <AppLayout title="Projects">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{projects?.length ?? 0} total projects</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-create-project" className="gap-2">
              <Plus size={16} /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl><Input data-testid="input-project-name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea data-testid="input-project-desc" rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="teamId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-team">
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="deadline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline</FormLabel>
                      <FormControl><Input type="date" data-testid="input-project-deadline" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="budget" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (₹)</FormLabel>
                      <FormControl><Input type="number" data-testid="input-project-budget" {...field} /></FormControl>
                    </FormItem>
                  )} />
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
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-4 gap-4 min-h-96">
        {STATUSES.map((status) => (
          <div
            key={status}
            data-testid={`kanban-col-${status.toLowerCase()}`}
            className={cn("rounded-xl border-2 p-3 min-h-64 transition-colors", STATUS_COLORS[status])}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => { if (dragging !== null) handleDrop(status, dragging); setDragging(null); }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">{STATUS_LABELS[status]}</span>
              <Badge variant="secondary" className="text-xs">
                {byStatus[status]?.length ?? 0}
              </Badge>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {byStatus[status]?.map((project) => (
                  <div
                    key={project.id}
                    data-testid={`project-card-${project.id}`}
                    draggable
                    onDragStart={() => setDragging(project.id)}
                    onDragEnd={() => setDragging(null)}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-900 leading-tight">{project.name}</p>
                      <GripVertical size={14} className="text-gray-300 shrink-0 mt-0.5" />
                    </div>
                    {project.teamName && (
                      <p className="text-xs text-muted-foreground mb-2">{project.teamName}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-xs", priorityColor(project.priority))}>
                        {project.priority}
                      </Badge>
                    </div>
                    {/* Progress */}
                    <div className="mt-2">
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {project.deadline && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(project.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      {project.budget && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign size={10} />
                          {formatCurrency(project.budget)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
