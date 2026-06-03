import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateServiceRecord,
  getGetServiceTicketQueryKey,
  type ServiceTicketDetail,
  type ServiceRecord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";

const schema = z.object({
  recordType: z.string(),
  body: z.string().min(1, "Follow-up notes required"),
  statusAfter: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const NO_STATUS = "__keep__";

interface AddServiceRecordFormProps {
  ticketId: number;
  currentStatus: string;
}

export function AddServiceRecordForm({ ticketId, currentStatus }: AddServiceRecordFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRecord = useCreateServiceRecord();
  const [submitting, setSubmitting] = useState(false);
  const detailKey = getGetServiceTicketQueryKey(ticketId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recordType: "NOTE",
      body: "",
      statusAfter: NO_STATUS,
    },
  });

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    const tempRecordId = -Date.now();

    await runOptimistic({
      apply: () => {
        const prev = queryClient.getQueryData<ServiceTicketDetail>(detailKey);
        if (!prev) return prev;
        const optimisticRecord: ServiceRecord = {
          id: tempRecordId,
          ticketId,
          recordType: data.recordType,
          body: data.body,
          statusAfter: data.statusAfter && data.statusAfter !== NO_STATUS ? data.statusAfter : null,
          nextFollowUpAt: data.nextFollowUpAt
            ? new Date(data.nextFollowUpAt).toISOString()
            : null,
          createdById: 0,
          authorName: "You",
          createdAt: new Date().toISOString(),
        };
        const nextStatus =
          data.statusAfter && data.statusAfter !== NO_STATUS ? data.statusAfter : prev.status;
        queryClient.setQueryData<ServiceTicketDetail>(detailKey, {
          ...prev,
          status: nextStatus,
          recordCount: (prev.recordCount ?? 0) + 1,
          lastRecordAt: optimisticRecord.createdAt,
          nextFollowUpAt: data.nextFollowUpAt
            ? optimisticRecord.nextFollowUpAt
            : prev.nextFollowUpAt,
          records: [optimisticRecord, ...(prev.records ?? [])],
        });
        return prev;
      },
      rollback: (prev) => prev && queryClient.setQueryData(detailKey, prev),
      commit: () =>
        createRecord.mutateAsync({
          id: ticketId,
          data: {
            recordType: data.recordType,
            body: data.body,
            statusAfter: data.statusAfter && data.statusAfter !== NO_STATUS ? data.statusAfter : undefined,
            nextFollowUpAt: data.nextFollowUpAt,
          },
        }),
      reconcile: (res) => {
        const prior = queryClient
          .getQueryData<ServiceTicketDetail>(detailKey)
          ?.records?.filter((r) => r.id !== tempRecordId) ?? [];
        queryClient.setQueryData<ServiceTicketDetail>(detailKey, {
          ...res.ticket,
          records: [res.record, ...prior],
        });
      },
    })
      .then(() => form.reset({ recordType: "NOTE", body: "", statusAfter: NO_STATUS }))
      .catch(() => toast({ title: "Could not save follow-up", variant: "destructive" }))
      .finally(() => setSubmitting(false));
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-xl border border-border bg-card/80 p-3 sm:p-4"
      >
        <p className="text-sm font-medium text-foreground">Add follow-up</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="recordType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {["NOTE", "PHONE", "EMAIL", "ONSITE", "STATUS_CHANGE", "RESOLUTION"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="statusAfter"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Update status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="min-h-11">
                      <SelectValue placeholder={`Keep ${currentStatus}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_STATUS}>Keep {currentStatus}</SelectItem>
                    {["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
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
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder="What happened? Next steps?"
                  className="min-h-[5rem] resize-y"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nextFollowUpAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Next follow-up</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} className="min-h-11" />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={submitting}>
          Save follow-up
        </Button>
      </form>
    </Form>
  );
}
