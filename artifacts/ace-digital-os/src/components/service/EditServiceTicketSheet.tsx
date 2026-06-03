import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListClients,
  useListProjects,
  useListTasks,
  useUpdateServiceTicket,
  getGetServiceTicketQueryKey,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { patchListItem } from "@/lib/optimistic";
import type { ServiceTicket, ServiceTicketDetail } from "@workspace/api-client-react";
import { usePermissions } from "@/hooks/use-permissions";

const NO_PROJECT = "__none__";
const NO_CLIENT = "__none__";
const NO_TASK = "__none__";

function buildSchema(requireProject: boolean) {
  return z
    .object({
      title: z.string().min(1, "Title required"),
      description: z.string().optional(),
      projectId: z.string().optional(),
      clientId: z.string().optional(),
      taskId: z.string().optional(),
      assigneeId: z.string().optional(),
      priority: z.string(),
      category: z.string(),
      nextFollowUpAt: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (requireProject && (!data.projectId || data.projectId === NO_PROJECT)) {
        ctx.addIssue({ code: "custom", message: "Project required", path: ["projectId"] });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface EditServiceTicketSheetProps {
  ticket: ServiceTicketDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditServiceTicketSheet({ ticket, open, onOpenChange }: EditServiceTicketSheetProps) {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTicket = useUpdateServiceTicket();
  const { data: clients } = useListClients();
  const { data: projects } = useListProjects();
  const { data: tasks } = useListTasks({});
  const canWrite = can("service_tickets:write");
  const canAssignOthers = can("service_tickets:assign");

  const isTodo = ticket.linkType === "TODO";

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(!isTodo)),
    defaultValues: {
      title: ticket.title,
      description: ticket.description ?? "",
      projectId: ticket.projectId ? String(ticket.projectId) : NO_PROJECT,
      clientId: ticket.clientId ? String(ticket.clientId) : NO_CLIENT,
      taskId: ticket.taskId ? String(ticket.taskId) : NO_TASK,
      assigneeId: ticket.assigneeId ? String(ticket.assigneeId) : NO_ASSIGNEE,
      priority: ticket.priority,
      category: ticket.category,
      nextFollowUpAt: ticket.nextFollowUpAt
        ? new Date(ticket.nextFollowUpAt).toISOString().slice(0, 16)
        : "",
    },
  });

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

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: ticket.title,
      description: ticket.description ?? "",
      projectId: ticket.projectId ? String(ticket.projectId) : NO_PROJECT,
      clientId: ticket.clientId ? String(ticket.clientId) : NO_CLIENT,
      taskId: ticket.taskId ? String(ticket.taskId) : NO_TASK,
      assigneeId: ticket.assigneeId ? String(ticket.assigneeId) : NO_ASSIGNEE,
      priority: ticket.priority,
      category: ticket.category,
      nextFollowUpAt: ticket.nextFollowUpAt
        ? new Date(ticket.nextFollowUpAt).toISOString().slice(0, 16)
        : "",
    });
  }, [open, ticket, form]);

  useEffect(() => {
    if (projectId === NO_PROJECT) form.setValue("taskId", NO_TASK);
  }, [projectId, form]);

  async function onSubmit(data: FormValues) {
    const detailKey = getGetServiceTicketQueryKey(ticket.id);
    const listKey = getListServiceTicketsQueryKey();

    const resolvedClientId =
      data.clientId && data.clientId !== NO_CLIENT ? Number(data.clientId) : null;
    const resolvedProjectId =
      data.projectId && data.projectId !== NO_PROJECT ? Number(data.projectId) : null;
    const resolvedTaskId =
      isTodo && ticket.taskId
        ? ticket.taskId
        : data.taskId && data.taskId !== NO_TASK
          ? Number(data.taskId)
          : null;

    try {
      const updated = await updateTicket.mutateAsync({
        id: ticket.id,
        data: {
          title: data.title,
          description: data.description,
          linkType: ticket.linkType,
          clientId: isTodo ? undefined : resolvedClientId,
          projectId: resolvedProjectId,
          taskId: isTodo ? ticket.taskId ?? undefined : resolvedTaskId,
          assigneeId:
            data.assigneeId && data.assigneeId !== NO_ASSIGNEE ? Number(data.assigneeId) : null,
          priority: data.priority,
          category: data.category,
          nextFollowUpAt: data.nextFollowUpAt || null,
        },
      });

      const prev = queryClient.getQueryData<ServiceTicketDetail>(detailKey);
      if (prev) {
        queryClient.setQueryData(detailKey, { ...prev, ...updated, records: prev.records });
      }
      patchListItem(queryClient, listKey, ticket.id, () => updated as ServiceTicket);
      onOpenChange(false);
      toast({ title: "Ticket updated" });
    } catch {
      toast({ title: "Could not update ticket", variant: "destructive" });
    }
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit ticket"
      description={
        isTodo
          ? "Update details for this to-do-linked ticket."
          : "Update ticket details, project, and follow-up schedule."
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} className="min-h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isTodo && (
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
                            {c.companyName}
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
                          <SelectValue placeholder="None" />
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
          )}

          {isTodo && ticket.taskTitle && (
            <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Linked to-do: <span className="font-medium text-foreground">{ticket.taskTitle}</span>
            </p>
          )}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} placeholder="Issue details" />
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
                  <Input type="datetime-local" {...field} className="min-h-11" />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" className="min-h-11 w-full" disabled={updateTicket.isPending}>
            Save changes
          </Button>
        </form>
      </Form>
    </ResponsiveSheet>
  );
}
