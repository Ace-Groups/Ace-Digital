import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListApprovals, useCreateApproval, useApproveApproval, useRejectApproval,
  getListApprovalsQueryKey,
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { statusColor, cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";

const TYPES = ["LEAVE", "EXPENSE", "HIRING", "PROJECT_BUDGET", "OTHER"];

const createSchema = z.object({
  type: z.string(),
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  amount: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function ApprovalsPage() {
  const [filterStatus, setFilterStatus] = useState("all");
  const { data: approvals, isLoading } = useListApprovals(
    filterStatus !== "all" ? { status: filterStatus } : {}
  );
  const createApproval = useCreateApproval();
  const approveApproval = useApproveApproval();
  const rejectApproval = useRejectApproval();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canApprove } = usePermissions();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: "EXPENSE", title: "" },
  });

  async function onSubmit(data: CreateForm) {
    await createApproval.mutateAsync({
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        amount: data.amount ? Number(data.amount) : undefined,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey() });
    toast({ title: "Approval request submitted!" });
    setOpen(false);
    form.reset();
  }

  async function handleApprove(id: number) {
    await approveApproval.mutateAsync({ id, data: {} });
    queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey() });
    toast({ title: "Approved!" });
  }

  async function handleReject(id: number) {
    await rejectApproval.mutateAsync({ id, data: { note: "Rejected" } });
    queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey() });
    toast({ title: "Rejected", variant: "destructive" });
  }

  const pending = approvals?.filter((a) => a.status === "PENDING").length ?? 0;

  return (
    <AppLayout title="Approvals">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {pending > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock size={14} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-700">{pending} pending</span>
            </div>
          )}
          <div className="flex gap-1">
            {["all", "PENDING", "APPROVED", "REJECTED"].map((s) => (
              <button
                key={s}
                data-testid={`filter-approval-${s.toLowerCase()}`}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full font-medium transition-colors",
                  filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-create-approval" className="gap-2">
              <Plus size={16} /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Submit Approval Request</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input data-testid="input-approval-title" placeholder="Brief title..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea data-testid="input-approval-desc" rows={3} placeholder="Details..." {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹) — if applicable</FormLabel>
                    <FormControl><Input data-testid="input-approval-amount" type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
                <Button data-testid="btn-submit-approval" type="submit" className="w-full" disabled={createApproval.isPending}>
                  Submit Request
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : approvals?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No approval requests found</div>
        ) : approvals?.map((a) => (
          <Card key={a.id} data-testid={`approval-card-${a.id}`} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{a.type?.replace("_", " ")}</Badge>
                    <span className="font-semibold text-sm text-gray-900">{a.title}</span>
                  </div>
                  {a.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{a.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>By <span className="font-medium text-gray-700">{a.requesterName}</span></span>
                    {a.teamName && <span>· {a.teamName}</span>}
                    {a.amount != null && <span>· <span className="font-medium text-gray-700">{formatCurrency(a.amount)}</span></span>}
                    {a.createdAt && <span>· {formatRelativeTime(a.createdAt)}</span>}
                  </div>
                  {a.status !== "PENDING" && a.reviewerName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
                      <span className="font-medium">{a.reviewerName}</span>
                      {a.note && ` · "${a.note}"`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={cn("text-xs", statusColor(a.status ?? ""))}>
                    {a.status}
                  </Badge>
                  {a.requestedById != null &&
                  canApprove({
                    type: a.type,
                    requestedById: a.requestedById,
                    teamId: a.teamId ?? null,
                    status: a.status ?? "PENDING",
                  }) &&
                  a.status === "PENDING" && (
                    <div className="flex gap-1">
                      <button
                        data-testid={`btn-approve-${a.id}`}
                        onClick={() => handleApprove(a.id)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                        title="Approve"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        data-testid={`btn-reject-${a.id}`}
                        onClick={() => handleReject(a.id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                        title="Reject"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
