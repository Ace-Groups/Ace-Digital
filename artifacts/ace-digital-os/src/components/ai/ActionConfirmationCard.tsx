import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import {
  useAiActionConfirm,
  getGetAiConversationQueryKey,
  type AiPendingAction,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { hapticSuccess } from "@/lib/haptics";

type ActionConfirmationCardProps = {
  pendingAction: AiPendingAction;
  conversationId?: number;
};

/** Human-friendly labels for known action types. */
const ACTION_LABELS: Record<string, string> = {
  create_task: "Create task",
  update_task_status: "Update task status",
  create_calendar_event: "Create calendar event",
  post_channel_message: "Post channel message",
  submit_approval: "Submit approval request",
  create_employee: "Create employee",
  create_channel: "Create channel",
  create_project: "Create project",
  create_client: "Create client",
  create_service_ticket: "Create service ticket",
  create_note: "Create note",
};

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/_/g, " ");
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ActionConfirmationCard({
  pendingAction,
  conversationId,
}: ActionConfirmationCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resolved, setResolved] = useState<"confirmed" | "cancelled" | null>(null);

  const confirm = useAiActionConfirm({
    mutation: {
      onSuccess: async () => {
        hapticSuccess();
        setResolved("confirmed");
        toast({ title: "Done", description: `${actionLabel} completed.` });
        if (conversationId) {
          await queryClient.invalidateQueries({
            queryKey: getGetAiConversationQueryKey(conversationId),
          });
        }
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : "You may not have permission for this action.";
        toast({ title: "Action failed", description: message, variant: "destructive" });
      },
    },
  });

  const actionLabel = ACTION_LABELS[pendingAction.actionType] ?? formatFieldName(pendingAction.actionType);
  const entries = Object.entries(pendingAction.payload ?? {}).filter(
    ([key]) => key !== "confirmed",
  );

  if (resolved === "confirmed") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={14} />
        <span>{actionLabel} completed.</span>
      </div>
    );
  }

  if (resolved === "cancelled") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <X size={14} />
        <span>Action cancelled.</span>
      </div>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 border-b border-primary/15 px-3 py-2 text-xs font-semibold text-primary">
        <ShieldCheck size={14} />
        <span>Confirm action: {actionLabel}</span>
      </div>
      {entries.length > 0 && (
        <dl className="divide-y divide-border/50 px-3 py-1.5 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-3 py-1">
              <dt className="w-28 shrink-0 text-muted-foreground">{formatFieldName(key)}</dt>
              <dd className="min-w-0 flex-1 break-words font-medium text-foreground">
                {formatValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex items-center justify-end gap-2 border-t border-primary/15 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          disabled={confirm.isPending}
          onClick={() => setResolved("cancelled")}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={confirm.isPending}
          onClick={() =>
            confirm.mutate({
              data: {
                conversationId,
                actionType: pendingAction.actionType,
                payload: pendingAction.payload,
              },
            })
          }
        >
          {confirm.isPending ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <CheckCircle2 size={14} className="mr-1.5" />
          )}
          Confirm
        </Button>
      </div>
    </div>
  );
}
