import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useDeleteClient, getListClientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Client } from "@workspace/api-client-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { formatContactName } from "@/lib/clients";
import { Mail, Phone, Calendar, Building2, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { removeListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ClientDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onEdit: (client: Client) => void;
}

export function ClientDetailSheet({
  open,
  onOpenChange,
  client,
  onEdit,
}: ClientDetailSheetProps) {
  const deleteClient = useDeleteClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const clientsKey = getListClientsQueryKey();

  if (!client) return null;

  async function handleDelete() {
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Client>(queryClient, clientsKey);
          removeListItem(queryClient, clientsKey, client!.id);
          return prev;
        },
        rollback: (prev) => setList(queryClient, clientsKey, prev),
        commit: () => deleteClient.mutateAsync({ id: client!.id }),
        reconcile: () => void queryClient.invalidateQueries({ queryKey: clientsKey }),
      });
      toast({ title: "Client removed" });
      onOpenChange(false);
    } catch {
      toast({ title: "Could not delete client", variant: "destructive" });
    }
  }

  const contact = formatContactName(client.salutation, client.contactName);
  const fields = (client.customFields ?? []) as { key: string; value: string }[];

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={client.companyName}
      className="sm:max-w-md"
    >
      <div className="space-y-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold">{contact}</p>
              <Badge variant="outline" className={cn("mt-1 text-xs", statusColor(client.status ?? ""))}>
                {client.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail size={14} /><span>{client.email}</span>
          </div>
          {client.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone size={14} /><span>{client.phone}</span>
            </div>
          )}
          {client.nextMeetingAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={14} />
              <span>
                Next meeting:{" "}
                {new Date(client.nextMeetingAt).toLocaleString("en-IN", {
                  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Assigned team</p>
            <p className="font-medium">{client.assignedTeamName ?? "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Contract value</p>
            <p className="font-bold text-primary">
              {client.contractValue ? formatCurrency(client.contractValue) : "—"}
            </p>
          </div>
        </div>

        {client.notes && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
            <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{client.notes}</p>
          </div>
        )}

        {fields.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Custom fields</p>
            <div className="flex flex-wrap gap-2">
              {fields.map((f) => (
                <Badge key={f.key} variant="secondary" className="font-normal">
                  {f.key}: {f.value}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1 gap-2" onClick={() => { onOpenChange(false); onEdit(client); }}>
            <Pencil size={16} /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2 text-destructive hover:text-destructive">
                <Trash2 size={16} /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete client?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {client.companyName}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
