import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateClient, useUpdateClient, useListTeams,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListClientsQueryKey } from "@workspace/api-client-react";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SalutationSelect } from "./SalutationSelect";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { CustomFieldsEditor } from "@/components/forms/CustomFieldsEditor";
import type { ClientCustomField } from "@/lib/clients";
import { useToast } from "@/hooks/use-toast";
import { prependListItem, replaceListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import type { Client, ClientInput, ClientUpdate } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

const schema = z.object({
  salutation: z.string().optional(),
  contactName: z.string().min(1, "Contact name required"),
  companyName: z.string().min(1, "Company name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  assignedTeamId: z.string().optional(),
  status: z.string(),
  contractValue: z.string().optional(),
  nextMeetingAt: z.string().optional(),
  notes: z.string().optional(),
  customFields: z.array(z.object({ key: z.string(), value: z.string() })),
});
type FormValues = z.infer<typeof schema>;

function toFormValues(client?: Client | null): FormValues {
  return {
    salutation: client?.salutation ?? "",
    contactName: client?.contactName ?? "",
    companyName: client?.companyName ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    assignedTeamId: client?.assignedTeamId ? String(client.assignedTeamId) : "",
    status: client?.status ?? "ACTIVE",
    contractValue: client?.contractValue ? String(client.contractValue) : "",
    nextMeetingAt: client?.nextMeetingAt
      ? new Date(client.nextMeetingAt).toISOString().slice(0, 16)
      : "",
    notes: client?.notes ?? "",
    customFields: (client?.customFields as ClientCustomField[] | null) ?? [],
  };
}

function buildCustomFields(data: FormValues) {
  return data.customFields
    .map((f) => ({ key: f.key.trim(), value: f.value.trim() }))
    .filter((f) => f.key);
}

function toCreatePayload(data: FormValues): ClientInput {
  const fields = buildCustomFields(data);
  return {
    salutation: data.salutation?.trim() || undefined,
    contactName: data.contactName,
    companyName: data.companyName,
    email: data.email,
    phone: data.phone?.trim() || undefined,
    assignedTeamId: data.assignedTeamId ? Number(data.assignedTeamId) : undefined,
    status: data.status,
    contractValue: data.contractValue ? Number(data.contractValue) : undefined,
    nextMeetingAt: data.nextMeetingAt ? new Date(data.nextMeetingAt).toISOString() : undefined,
    notes: data.notes?.trim() || undefined,
    customFields: fields.length ? fields : undefined,
  };
}

function toUpdatePayload(data: FormValues): ClientUpdate {
  const fields = buildCustomFields(data);
  return {
    salutation: data.salutation?.trim() || null,
    contactName: data.contactName,
    companyName: data.companyName,
    email: data.email,
    phone: data.phone?.trim() || undefined,
    assignedTeamId: data.assignedTeamId ? Number(data.assignedTeamId) : undefined,
    status: data.status,
    contractValue: data.contractValue ? Number(data.contractValue) : undefined,
    nextMeetingAt: data.nextMeetingAt ? new Date(data.nextMeetingAt).toISOString() : undefined,
    notes: data.notes?.trim() || null,
    customFields: fields.length ? fields : [],
  };
}

interface ClientFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved?: (client: Client) => void;
}

export function ClientFormSheet({ open, onOpenChange, client, onSaved }: ClientFormSheetProps) {
  const isEdit = Boolean(client?.id && client.id > 0);
  const { data: teams } = useListTeams();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const clientsKey = getListClientsQueryKey();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(client),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(client));
  }, [open, client, form]);

  async function onSubmit(data: FormValues) {
    onOpenChange(false);

    if (isEdit && client) {
      const payload = toUpdatePayload(data);
      const optimistic: Client = {
        ...client,
        ...payload,
        assignedTeamId: payload.assignedTeamId ?? null,
        contractValue: payload.contractValue ?? null,
        nextMeetingAt: payload.nextMeetingAt ?? null,
        notes: payload.notes ?? null,
        customFields: payload.customFields ?? null,
        salutation: payload.salutation ?? null,
      };
      try {
        await runOptimistic({
          apply: () => {
            const prev = snapshotList<Client>(queryClient, clientsKey);
            replaceListItem(queryClient, clientsKey, client.id, optimistic);
            return prev;
          },
          rollback: (prev) => setList(queryClient, clientsKey, prev),
          commit: () => updateClient.mutateAsync({ id: client.id, data: payload }),
          reconcile: () => void queryClient.invalidateQueries({ queryKey: clientsKey }),
        });
        toast({ title: "Client updated" });
        onSaved?.(optimistic);
      } catch {
        toast({ title: "Could not update client", variant: "destructive" });
      }
      return;
    }

    const payload = toCreatePayload(data);
    const tempId = -Date.now();
    const optimistic: Client = {
      id: tempId,
      contactName: payload.contactName,
      companyName: payload.companyName,
      email: payload.email,
      phone: payload.phone ?? null,
      assignedTeamId: payload.assignedTeamId ?? null,
      status: payload.status ?? "ACTIVE",
      contractValue: payload.contractValue ?? null,
      salutation: payload.salutation ?? null,
      notes: payload.notes ?? null,
      customFields: payload.customFields ?? null,
      nextMeetingAt: payload.nextMeetingAt ?? null,
    };
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Client>(queryClient, clientsKey);
          prependListItem(queryClient, clientsKey, optimistic);
          return prev;
        },
        rollback: (prev) => setList(queryClient, clientsKey, prev),
        commit: () => createClient.mutateAsync({ data: payload }),
        reconcile: () => void queryClient.invalidateQueries({ queryKey: clientsKey }),
      });
      toast({ title: "Client added!" });
      form.reset(toFormValues());
    } catch {
      toast({ title: "Could not add client", variant: "destructive" });
    }
  }

  const pending = createClient.isPending || updateClient.isPending;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit client" : "Add client"}
      className="sm:max-w-lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-2">
          <FormField control={form.control} name="companyName" render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl><Input data-testid="input-client-company" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
            <FormField control={form.control} name="salutation" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <SalutationSelect value={field.value ?? ""} onChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="contactName" render={({ field }) => (
              <FormItem>
                <FormLabel>Contact name</FormLabel>
                <FormControl><Input data-testid="input-client-contact" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="assignedTeamId" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned team</FormLabel>
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
                    {["ACTIVE", "LEAD", "PROSPECT", "INACTIVE"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="contractValue" render={({ field }) => (
            <FormItem>
              <FormLabel>Contract value</FormLabel>
              <FormControl>
                <CurrencyInput
                  data-testid="input-client-value"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="nextMeetingAt" render={({ field }) => (
            <FormItem>
              <FormLabel>Next meeting</FormLabel>
              <FormControl><Input type="datetime-local" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Internal notes about this client..."
                  rows={3}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="customFields" render={({ field }) => (
            <FormItem>
              <FormControl>
                <CustomFieldsEditor value={field.value} onChange={field.onChange} />
              </FormControl>
            </FormItem>
          )} />
          <Button data-testid="btn-submit-client" type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add client"}
          </Button>
        </form>
      </Form>
    </ResponsiveSheet>
  );
}
