import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListClients } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Mail, Phone, Calendar, Building2 } from "lucide-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { formatContactName } from "@/lib/clients";
import { ClientFormSheet } from "@/components/clients/ClientFormSheet";
import { ClientDetailSheet } from "@/components/clients/ClientDetailSheet";
import type { Client } from "@workspace/api-client-react";

export default function ClientsPage() {
  const { data: clients, isLoading } = useListClients();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);

  const activeClients = clients?.filter((c) => c.status === "ACTIVE") ?? [];
  const totalValue = activeClients.reduce((s, c) => s + (c.contractValue ?? 0), 0);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openDetail(client: Client) {
    setSelected(client);
    setDetailOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setFormOpen(true);
  }

  return (
    <AppLayout title="Clients">
      <div className="page-stack">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{activeClients.length}</span> active clients
            {" · "}
            <span className="font-semibold text-emerald-600">{formatCurrency(totalValue)}</span> total contracts
          </div>
          <Button data-testid="btn-add-client" className="gap-2" onClick={openAdd}>
            <Plus size={16} /> Add Client
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
          ) : clients?.map((client) => {
            const contact = formatContactName(client.salutation, client.contactName);
            const customFields = (client.customFields ?? []) as { key: string; value: string }[];
            return (
              <Card
                key={client.id}
                data-testid={`client-card-${client.id}`}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openDetail(client)}
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{client.companyName}</p>
                        <p className="text-xs text-muted-foreground">{contact}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 text-xs", statusColor(client.status ?? ""))}>
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
                        <span>
                          Meeting:{" "}
                          {new Date(client.nextMeetingAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short",
                          })}
                        </span>
                      </div>
                    )}
                    {client.notes && (
                      <p className="line-clamp-2 pt-1 text-foreground/70">{client.notes}</p>
                    )}
                  </div>
                  {customFields.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {customFields.slice(0, 3).map((f) => (
                        <Badge key={f.key} variant="secondary" className="text-[10px] font-normal">
                          {f.key}
                        </Badge>
                      ))}
                      {customFields.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          +{customFields.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned to</p>
                      <p className="text-sm font-medium">{client.assignedTeamName ?? "—"}</p>
                    </div>
                    {client.contractValue != null && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Contract</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(client.contractValue)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <ClientFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
      />
      <ClientDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        client={selected}
        onEdit={openEdit}
      />
    </AppLayout>
  );
}
