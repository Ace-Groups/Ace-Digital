import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateServiceTicket,
  useListClients,
  useListEmployees,
  useListProjects,
  getListServiceTicketsQueryKey,
  getListEmployeesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { prependListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import type { ServiceTicket } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";

const schema = z.object({
  title: z.string().min(1, "Title required"),
  clientId: z.string().min(1, "Client required"),
  description: z.string().optional(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.string(),
  category: z.string(),
  nextFollowUpAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const NO_PROJECT = "__none__";
const NO_ASSIGNEE = "__none__";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTicket = useCreateServiceTicket();
  const { data: clients } = useListClients();
  const { data: projects } = useListProjects();
  const { data: employees } = useListEmployees(undefined, {
    query: { enabled: can("employees:read"), queryKey: getListEmployeesQueryKey() },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      clientId: "",
      description: "",
      priority: "MEDIUM",
      category: "SUPPORT",
      projectId: NO_PROJECT,
      assigneeId: user?.id ? String(user.id) : NO_ASSIGNEE,
    },
  });

  async function onSubmit(data: FormValues) {
    const listKey = getListServiceTicketsQueryKey();
    const tempId = -Date.now();
    const optimistic: ServiceTicket = {
      id: tempId,
      ticketNumber: "…",
      title: data.title,
      description: data.description ?? null,
      clientId: Number(data.clientId),
      clientName: clients?.find((c) => c.id === Number(data.clientId))?.companyName ?? null,
      projectId: data.projectId && data.projectId !== NO_PROJECT ? Number(data.projectId) : null,
      projectName: null,
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
            clientId: Number(data.clientId),
            description: data.description,
            projectId:
              data.projectId && data.projectId !== NO_PROJECT ? Number(data.projectId) : undefined,
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
      description="Create a client support ticket and schedule follow-up."
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
                  <Input {...field} placeholder="Brief issue summary" className="min-h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="min-h-11">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(clients ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.companyName}
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} placeholder="Details for the team" />
                </FormControl>
                <FormMessage />
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
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project (optional)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="min-h-11">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PROJECT}>None</SelectItem>
                    {(projects ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          {can("employees:read") && (
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="min-h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>
                      {(employees ?? []).map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          <Button type="submit" className="min-h-11 w-full" disabled={createTicket.isPending}>
            Create ticket
          </Button>
        </form>
      </Form>
    </ResponsiveSheet>
  );
}
