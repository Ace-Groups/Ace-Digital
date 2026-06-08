import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import {
  useListApprovals, useCreateApproval, useApproveApproval, useRejectApproval,
  getListApprovalsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  appendListItem,
  patchListItem,
  setList,
  snapshotList,
} from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import type { Approval } from "@workspace/api-client-react";

const TYPES = ["LEAVE", "EXPENSE", "HIRING", "PROJECT_BUDGET", "OTHER"];

const createSchema = z.object({
  type: z.string(),
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  amount: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function ApprovalsPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState("all");
  const listParams = filterStatus !== "all" ? { status: filterStatus } : {};
  const approvalsKey = getListApprovalsQueryKey(listParams);
  const { data: approvals, isLoading } = useListApprovals(listParams);
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
    const tempId = -Date.now();
    const optimistic: Approval = {
      id: tempId,
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      amount: data.amount ? Number(data.amount) : null,
      requestedById: user?.id,
      requesterName: user?.fullName ?? null,
      teamId: user?.teamId ?? null,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    setOpen(false);
    form.reset();
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Approval>(queryClient, approvalsKey);
          appendListItem(queryClient, approvalsKey, optimistic);
          return prev;
        },
        rollback: (prev) => setList(queryClient, approvalsKey, prev),
        commit: () =>
          createApproval.mutateAsync({
            data: {
              type: data.type,
              title: data.title,
              description: data.description,
              amount: data.amount ? Number(data.amount) : undefined,
            },
          }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey() });
        },
      });
      toast({ title: "Approval request submitted!" });
    } catch {
      toast({ title: "Could not submit request", variant: "destructive" });
    }
  }

  async function handleApprove(id: number) {
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Approval>(queryClient, approvalsKey);
          patchListItem(queryClient, approvalsKey, id, (a) => ({
            ...a,
            status: "APPROVED",
            reviewedAt: new Date().toISOString(),
          }));
          return prev;
        },
        rollback: (prev) => setList(queryClient, approvalsKey, prev),
        commit: () => approveApproval.mutateAsync({ id, data: {} }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey() });
        },
      });
      toast({ title: "Approved!" });
    } catch {
      toast({ title: "Could not approve", variant: "destructive" });
    }
  }

  async function handleReject(id: number) {
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Approval>(queryClient, approvalsKey);
          patchListItem(queryClient, approvalsKey, id, (a) => ({
            ...a,
            status: "REJECTED",
            note: "Rejected",
            reviewedAt: new Date().toISOString(),
          }));
          return prev;
        },
        rollback: (prev) => setList(queryClient, approvalsKey, prev),
        commit: () => rejectApproval.mutateAsync({ id, data: { note: "Rejected" } }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: getListApprovalsQueryKey() });
        },
      });
      toast({ title: "Rejected", variant: "destructive" });
    } catch {
      toast({ title: "Could not reject", variant: "destructive" });
    }
  }

  const pending = approvals?.filter((a) => a.status === "PENDING").length ?? 0;

  return (
    <AppLayout title="Approvals">
      <div className="page-stack">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <Button
          data-testid="btn-create-approval"
          className="hidden gap-2 sm:inline-flex"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} /> New Request
        </Button>
        <ResponsiveSheet open={open} onOpenChange={setOpen} title="Submit Approval Request">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mobile-form space-y-4">
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
        </ResponsiveSheet>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : approvals?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No approval requests found</div>
        ) : approvals?.map((a) => (
          <Card key={a.id} data-testid={`approval-card-${a.id}`} className="transition-shadow hover:shadow-brand-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{a.type?.replace("_", " ")}</Badge>
                    <span className="font-semibold text-sm text-foreground">{a.title}</span>
                  </div>
                  {a.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{a.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>By <span className="font-medium text-foreground">{a.requesterName}</span></span>
                    {a.teamName && <span>· {a.teamName}</span>}
                    {a.amount != null && <span>· <span className="font-medium text-foreground">{formatCurrency(a.amount)}</span></span>}
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
                <div className="flex flex-col gap-2 sm:items-end sm:shrink-0">
                  <Badge variant="outline" className={cn("w-fit text-xs", statusColor(a.status ?? ""))}>
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
                    <div className={cn("flex gap-2", isMobile && "w-full")}>
                      <Button
                        type="button"
                        data-testid={`btn-approve-${a.id}`}
                        onClick={() => handleApprove(a.id)}
                        className={cn(
                          "gap-2 bg-emerald-600 hover:bg-emerald-700",
                          isMobile && "min-h-11 flex-1",
                        )}
                      >
                        <CheckCircle2 size={18} />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        data-testid={`btn-reject-${a.id}`}
                        onClick={() => handleReject(a.id)}
                        className={cn(
                          "gap-2 border-red-200 text-red-600 hover:bg-red-50",
                          isMobile && "min-h-11 flex-1",
                        )}
                      >
                        <XCircle size={18} />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isMobile && (
        <Button
          data-testid="btn-create-approval-mobile"
          size="lg"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 h-14 w-14 rounded-full p-0 shadow-brand-md sm:hidden"
          onClick={() => setOpen(true)}
          aria-label="New approval request"
        >
          <Plus size={22} />
        </Button>
      )}
      </div>
    </AppLayout>
  );
}
