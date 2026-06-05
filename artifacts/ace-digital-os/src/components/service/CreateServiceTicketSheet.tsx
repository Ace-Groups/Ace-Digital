import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateServiceTicket,
  useListClients,
  useListProjects,
  useListTasks,
  getListServiceTicketsQueryKey,
} from "@workspace/api-client-react";
import {
  NO_ASSIGNEE,
  ServiceTicketAssigneeSelect,
} from "@/components/service/ServiceTicketAssigneeSelect";
import { useQueryClient } from "@tanstack/react-query";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatClientLabel } from "@/lib/clients";
import { useToast } from "@/hooks/use-toast";
import { prependListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import type { ServiceTicket } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    linkType: z.enum(["CLIENT", "TODO"]),
    title: z.string().min(1, "Title required"),
    clientId: z.string().optional(),
    description: z.string().optional(),
    projectId: z.string().optional(),
    taskId: z.string().optional(),
    todoTaskId: z.string().optional(),
    assigneeId: z.string().optional(),
    priority: z.string(),
    category: z.string(),
    nextFollowUpAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.linkType === "CLIENT") {
      if (!data.projectId || data.projectId === NO_PROJECT) {
        ctx.addIssue({ code: "custom", message: "Project required", path: ["projectId"] });
      }
    } else if (!data.todoTaskId) {
      ctx.addIssue({ code: "custom", message: "Select a to-do", path: ["todoTaskId"] });
    }
  });

type FormValues = z.infer<typeof schema>;

const NO_PROJECT = "__none__";
const NO_CLIENT = "__none__";
const NO_TASK = "__none__";

interface CreateServiceTicketSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (ticket: ServiceTicket) => void;
}

export function CreateServiceTicketSheet({
  open,
  onOpenChange,
  onCreated,
}: CreateServiceTicketSheetProps) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canWrite = can("service_tickets:write");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTicket = useCreateServiceTicket();
  const { data: clients } = useListClients();
  const { data: projects } = useListProjects();
  const { data: tasks } = useListTasks({});
  const canAssignOthers = can("service_tickets:assign");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      linkType: "CLIENT",
      title: "",
      clientId: NO_CLIENT,
      description: "",
      priority: "MEDIUM",
      category: "SUPPORT",
      projectId: NO_PROJECT,
      taskId: NO_TASK,
      todoTaskId: "",
      assigneeId: canAssignOthers ? NO_ASSIGNEE : user?.id ? String(user.id) : NO_ASSIGNEE,
    },
  });

  const linkType = form.watch("linkType");
  const clientId = form.watch("clientId");
  const projectId = form.watch("projectId");

  const clientProjects = useMemo(() => {
    const all = projects ?? [];
    if (!clientId || clientId === NO_CLIENT) return all;
    const cid = Number(clientId);
    return all.filter((p) => p.clientId == null || p.clientId === cid);
  }, [projects, clientId]);

  const projectTasks = useMemo(() => {
    if (!projectId || projectId === NO_PROJECT) return [];
    const pid = Number(projectId);
    return (tasks ?? []).filter((t) => t.projectId === pid && t.status !== "DONE");
  }, [tasks, projectId]);

  const openTodos = useMemo(
    () => (tasks ?? []).filter((t) => t.status !== "DONE"),
    [tasks],
  );

  useEffect(() => {
    if (linkType === "CLIENT") {
      form.setValue("todoTaskId", "");
    } else {
      form.setValue("clientId", NO_CLIENT);
      form.setValue("projectId", NO_PROJECT);
      form.setValue("taskId", NO_TASK);
    }
  }, [linkType, form]);

  useEffect(() => {
    if (projectId === NO_PROJECT) form.setValue("taskId", NO_TASK);
  }, [projectId, form]);

  async function onSubmit(data: FormValues) {
    const isTodo = data.linkType === "TODO";
    const resolvedTaskId = isTodo
      ? Number(data.todoTaskId)
      : data.taskId && data.taskId !== NO_TASK
        ? Number(data.taskId)
        : undefined;
    const resolvedClientId =
      isTodo || !data.clientId || data.clientId === NO_CLIENT
        ? undefined
        : Number(data.clientId);
    const resolvedProjectId =
      !isTodo && data.projectId && data.projectId !== NO_PROJECT
        ? Number(data.projectId)
        : undefined;

    const listKey = getListServiceTicketsQueryKey();
    const tempId = -Date.now();
    const optimistic: ServiceTicket = {
      id: tempId,
      ticketNumber: "…",
      title: data.title,
      description: data.description ?? null,
      linkType: data.linkType,
      clientId: resolvedClientId ?? null,
      clientName: isTodo
        ? "Internal to-do"
        : resolvedClientId != null
          ? (() => {
              const c = clients?.find((x) => x.id === resolvedClientId);
              return c ? formatClientLabel(c.salutation, c.contactName, c.companyName) : null;
            })()
          : null,
      projectId: resolvedProjectId ?? null,
      projectName:
        resolvedProjectId != null
          ? (projects?.find((p) => p.id === resolvedProjectId)?.name ?? null)
          : null,
      taskId: resolvedTaskId ?? null,
      taskTitle: tasks?.find((t) => t.id === resolvedTaskId)?.title ?? null,
      assigneeId:
        data.assigneeId && data.assigneeId !== NO_ASSIGNEE ? Number(data.assigneeId) : user?.id ?? null,
      assigneeName: user?.fullName ?? null,
      teamId: user?.teamId ?? null,
      priority: data.priority,
      status: "OPEN",
      category: data.category,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt).toISOString() : null,
      resolvedAt: null,
      createdById: user?.id ?? 0,
      createdByName: user?.fullName ?? null,
      recordCount: 0,
      lastRecordAt: null,
      followUpOverdue: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onOpenChange(false);
    form.reset();

    await runOptimistic({
      apply: () => {
        const prev = snapshotList<ServiceTicket>(queryClient, listKey);
        prependListItem(queryClient, listKey, optimistic);
        return prev;
      },
      rollback: (prev) => setList(queryClient, listKey, prev),
      commit: () =>
        createTicket.mutateAsync({
          data: {
            title: data.title,
            linkType: data.linkType,
            description: data.description,
            clientId: resolvedClientId,
            projectId: resolvedProjectId,
            taskId: resolvedTaskId,
            assigneeId:
              data.assigneeId && data.assigneeId !== NO_ASSIGNEE
                ? Number(data.assigneeId)
                : undefined,
            priority: data.priority,
            category: data.category,
            nextFollowUpAt: data.nextFollowUpAt,
          },
        }),
      reconcile: (created) => {
        const list = queryClient.getQueryData<ServiceTicket[]>(listKey) ?? [];
        queryClient.setQueryData(
          listKey,
          list.map((t) => (t.id === tempId ? created : t)),
        );
        onCreated?.(created);
      },
    }).catch(() => {
      toast({ title: "Could not create ticket", variant: "destructive" });
    });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New service ticket"
      description="Link to a client and project, or tie the ticket to an existing to-do."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="linkType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link ticket to</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    <Label
                      htmlFor="link-client"
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2",
                        field.value === "CLIENT" && "border-primary bg-primary/10",
                      )}
                    >
                      <RadioGroupItem value="CLIENT" id="link-client" />
                      <span className="text-sm">Client, project & task</span>
                    </Label>
                    <Label
                      htmlFor="link-todo"
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2",
                        field.value === "TODO" && "border-primary bg-primary/10",
                      )}
                    >
                      <RadioGroupItem value="TODO" id="link-todo" />
                      <span className="text-sm">To-do</span>
                    </Label>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Brief issue summary" className="min-h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {linkType === "CLIENT" ? (
            <>
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="min-h-11">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientProjects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                            {p.clientName ? ` · ${p.clientName}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client (optional)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="min-h-11">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CLIENT}>None</SelectItem>
                        {(clients ?? []).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {formatClientLabel(c.salutation, c.contactName, c.companyName)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task (optional)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!projectId || projectId === NO_PROJECT}
                    >
                      <FormControl>
                        <SelectTrigger className="min-h-11">
                          <SelectValue
                            placeholder={
                              projectId && projectId !== NO_PROJECT
                                ? "None"
                                : "Select a project first"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_TASK}>None</SelectItem>
                        {projectTasks.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </>
          ) : (
            <FormField
              control={form.control}
              name="todoTaskId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To-do</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="min-h-11">
                        <SelectValue placeholder="Select open task" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {openTodos.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          No open tasks
                        </SelectItem>
                      ) : (
                        openTodos.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.title}
                            {t.projectName ? ` · ${t.projectName}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} placeholder="Details for the team" />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="min-h-11">
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="min-h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["SUPPORT", "MAINTENANCE", "BILLING", "OTHER"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {canWrite && (
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to</FormLabel>
                  <FormControl>
                    <ServiceTicketAssigneeSelect
                      value={field.value ?? NO_ASSIGNEE}
                      onValueChange={field.onChange}
                      placeholder={
                        canAssignOthers ? "Select team member" : "Assign to yourself"
                      }
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {canAssignOthers
                      ? "Choose who will own follow-ups on this ticket."
                      : "You can assign this ticket to yourself."}
                  </p>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="nextFollowUpAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next follow-up</FormLabel>
                <FormControl>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Pick date & time"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" className="min-h-11 w-full" disabled={createTicket.isPending}>
            Create ticket
          </Button>
        </form>
      </Form>
    </ResponsiveSheet>
  );
}
