import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListClients, useCreateClient, useListTeams, getListClientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Mail, Phone, Calendar, Building2 } from "lucide-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { prependListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import type { Client } from "@workspace/api-client-react";

const createSchema = z.object({
  contactName: z.string().min(1, "Contact name required"),
  companyName: z.string().min(1, "Company name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  assignedTeamId: z.string().optional(),
  status: z.string(),
  contractValue: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function ClientsPage() {
  const { data: clients, isLoading } = useListClients();
  const { data: teams } = useListTeams();
  const createClient = useCreateClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { contactName: "", companyName: "", email: "", status: "ACTIVE" },
  });

  async function onSubmit(data: CreateForm) {
    const clientsKey = getListClientsQueryKey();
    const tempId = -Date.now();
    const optimistic: Client = {
      id: tempId,
      contactName: data.contactName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone ?? null,
      assignedTeamId: data.assignedTeamId ? Number(data.assignedTeamId) : null,
      status: data.status,
      contractValue: data.contractValue ? Number(data.contractValue) : null,
    };
    setOpen(false);
    form.reset();
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Client>(queryClient, clientsKey);
          prependListItem(queryClient, clientsKey, optimistic);
          return prev;
        },
        rollback: (prev) => setList(queryClient, clientsKey, prev),
        commit: () =>
          createClient.mutateAsync({
            data: {
              contactName: data.contactName,
              companyName: data.companyName,
              email: data.email,
              phone: data.phone,
              assignedTeamId: data.assignedTeamId ? Number(data.assignedTeamId) : undefined,
              status: data.status,
              contractValue: data.contractValue ? Number(data.contractValue) : undefined,
            },
          }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: clientsKey });
        },
      });
      toast({ title: "Client added!" });
    } catch {
      toast({ title: "Could not add client", variant: "destructive" });
    }
  }

  const activeClients = clients?.filter((c) => c.status === "ACTIVE") ?? [];
  const totalValue = activeClients.reduce((s, c) => s + (c.contractValue ?? 0), 0);

  return (
    <AppLayout title="Clients">
      <div className="page-stack">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{activeClients.length}</span> active clients
            {" · "}
            <span className="font-semibold text-emerald-600">{formatCurrency(totalValue)}</span> total contracts
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-client" className="gap-2">
              <Plus size={16} /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mobile-form space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl><Input data-testid="input-client-company" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl><Input data-testid="input-client-contact" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input data-testid="input-client-email" type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input data-testid="input-client-phone" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="assignedTeamId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Team</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {teams?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["ACTIVE", "PROSPECT", "INACTIVE"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="contractValue" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Value (₹)</FormLabel>
                    <FormControl><Input data-testid="input-client-value" type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
                <Button data-testid="btn-submit-client" type="submit" className="w-full" disabled={createClient.isPending}>
                  Add Client
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
        ) : clients?.map((client) => (
          <Card key={client.id} data-testid={`client-card-${client.id}`} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C1E8FF] flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{client.companyName}</p>
                    <p className="text-xs text-muted-foreground">{client.contactName}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-xs shrink-0", statusColor(client.status ?? ""))}>
                  {client.status}
                </Badge>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail size={11} />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={11} />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.nextMeetingAt && (
                  <div className="flex items-center gap-2">
                    <Calendar size={11} />
                    <span>Meeting: {new Date(client.nextMeetingAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Assigned to</p>
                  <p className="text-sm font-medium">{client.assignedTeamName ?? "—"}</p>
                </div>
                {client.contractValue && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Contract Value</p>
                    <p className="text-sm font-bold text-[#052659]">{formatCurrency(client.contractValue)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </AppLayout>
  );
}
