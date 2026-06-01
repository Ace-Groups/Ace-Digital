import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
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

export default function TasksPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { data: tasks, isLoading } = useListTasks(
    filterStatus !== "all" ? { status: filterStatus } : {}
  );
  const { data: projects } = useListProjects();
  const { data: employees } = useListEmployees({});
  const { data: teams } = useListTeams();
  const toggleTask = useToggleTask();
  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", priority: "MEDIUM", status: "PENDING" },
  });

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

  return (
    <AppLayout title="Tasks">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <div className="flex gap-1">
            {["all", ...STATUSES].map((s) => (
              <button
                key={s}
                data-testid={`filter-${s.toLowerCase()}`}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full font-medium transition-colors",
                  filterStatus === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-create-task" className="gap-2">
              <Plus size={16} /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl><Input data-testid="input-task-title" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                <Button data-testid="btn-submit-task" type="submit" className="w-full" disabled={createTask.isPending}>
                  Create Task
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
            <div className="divide-y divide-gray-50">
              {tasks?.map((task) => (
                <div
                  key={task.id}
                  data-testid={`task-row-${task.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    data-testid={`task-toggle-${task.id}`}
                    checked={task.status === "DONE"}
                    onCheckedChange={() => handleToggle(task.id)}
                    className="border-gray-300"
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
                  <div className="flex items-center gap-3 shrink-0">
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
    </AppLayout>
  );
}
