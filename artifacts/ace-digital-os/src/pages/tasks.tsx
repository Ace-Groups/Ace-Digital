import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import {
  useListTasks, useCreateTask, useToggleTask, useListProjects, useListEmployees, useListTeams,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, User, Filter } from "lucide-react";
import { priorityColor, statusColor, cn, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().min(1, "Title required"),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  priority: z.string(),
  dueDate: z.string().optional(),
  status: z.string(),
});
type CreateForm = z.infer<typeof createSchema>;

const STATUSES = ["PENDING", "IN_PROGRESS", "DONE"];

function getProjectIdFromUrl(): number | undefined {
  const id = new URLSearchParams(window.location.search).get("projectId");
  if (!id) return undefined;
  const n = Number(id);
  return Number.isFinite(n) ? n : undefined;
}

export default function TasksPage() {
  const isMobile = useIsMobile();
  const projectIdFilter = getProjectIdFromUrl();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const taskParams = useMemo(() => {
    const base: { status?: string; projectId?: number } = {};
    if (filterStatus !== "all") base.status = filterStatus;
    if (projectIdFilter) base.projectId = projectIdFilter;
    return base;
  }, [filterStatus, projectIdFilter]);

  const { data: projects } = useListProjects();
  const filteredProject = projects?.find((p) => p.id === projectIdFilter);
  const { data: tasks, isLoading } = useListTasks(taskParams);
  const { data: employees } = useListEmployees({});
  const { data: teams } = useListTeams();
  const toggleTask = useToggleTask();
  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      title: "",
      priority: "MEDIUM",
      status: "PENDING",
      projectId: projectIdFilter ? String(projectIdFilter) : "",
    },
  });

  useEffect(() => {
    if (projectIdFilter) {
      form.setValue("projectId", String(projectIdFilter));
    }
  }, [projectIdFilter, form]);

  async function onSubmit(data: CreateForm) {
    await createTask.mutateAsync({
      data: {
        title: data.title,
        projectId: data.projectId ? Number(data.projectId) : undefined,
        assigneeId: data.assigneeId ? Number(data.assigneeId) : undefined,
        teamId: data.teamId ? Number(data.teamId) : undefined,
        priority: data.priority,
        dueDate: data.dueDate || undefined,
        status: data.status,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    toast({ title: "Task created!" });
    setOpen(false);
    form.reset();
  }

  async function handleToggle(id: number) {
    await toggleTask.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  }

  const createForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Task Title</FormLabel>
            <FormControl><Input data-testid="input-task-title" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="teamId" render={({ field }) => (
            <FormItem>
              <FormLabel>Team</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger></FormControl>
                <SelectContent>
                  {teams?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="assigneeId" render={({ field }) => (
            <FormItem>
              <FormLabel>Assignee</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger></FormControl>
                <SelectContent>
                  {employees?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl><Input type="date" data-testid="input-task-due" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <Button data-testid="btn-submit-task" type="submit" className="h-11 w-full sm:h-10" disabled={createTask.isPending}>
          Create Task
        </Button>
      </form>
    </Form>
  );

  return (
    <AppLayout title="Tasks">
      <div className="page-stack">
      {projectIdFilter && filteredProject && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-2.5 text-sm">
          <span>
            Showing tasks for <strong>{filteredProject.name}</strong>
          </span>
          <Link href="/tasks">
            <button type="button" className="text-primary text-xs font-medium hover:underline">
              Clear filter
            </button>
          </Link>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter size={14} className="shrink-0 text-muted-foreground" />
          <div className="flex gap-1">
            {["all", ...STATUSES].map((s) => (
              <button
                key={s}
                type="button"
                data-testid={`filter-${s.toLowerCase()}`}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filterStatus === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <Button
          data-testid="btn-create-task"
          className="hidden gap-2 sm:inline-flex"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} /> New Task
        </Button>
        <ResponsiveSheet open={open} onOpenChange={setOpen} title="Create Task">
          {createForm}
        </ResponsiveSheet>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : tasks?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No tasks found</div>
          ) : (
            <div className="divide-y divide-border">
              {tasks?.map((task) => (
                <div
                  key={task.id}
                  data-testid={`task-row-${task.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
                >
                  <Checkbox
                    data-testid={`task-toggle-${task.id}`}
                    checked={task.status === "DONE"}
                    onCheckedChange={() => handleToggle(task.id)}
                    className="border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", task.status === "DONE" && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.projectName && (
                        <span className="text-xs text-muted-foreground">{task.projectName}</span>
                      )}
                      {task.teamName && (
                        <span className="text-xs text-muted-foreground">• {task.teamName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                    {task.assigneeName && (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary/15 text-primary">
                            {getInitials(task.assigneeName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground hidden sm:block">{task.assigneeName}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <Badge variant="outline" className={cn("text-xs", priorityColor(task.priority))}>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", statusColor(task.status))}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isMobile && (
        <Button
          data-testid="btn-create-task-fab"
          size="lg"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full p-0 shadow-brand-md sm:hidden"
          onClick={() => setOpen(true)}
          aria-label="New task"
        >
          <Plus size={22} />
        </Button>
      )}
      </div>
    </AppLayout>
  );
}
