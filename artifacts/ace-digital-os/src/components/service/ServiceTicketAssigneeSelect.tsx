import {
  getListServiceTicketAssigneesQueryKey,
  useListServiceTicketAssignees,
} from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";

export const NO_ASSIGNEE = "__none__";

interface ServiceTicketAssigneeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  allowUnassigned?: boolean;
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
}

export function ServiceTicketAssigneeSelect({
  value,
  onValueChange,
  allowUnassigned = true,
  disabled = false,
  placeholder = "Select assignee",
  triggerClassName = "min-h-11",
}: ServiceTicketAssigneeSelectProps) {
  const { can } = usePermissions();
  const canLoad = can("service_tickets:write") || can("service_tickets:assign");

  const { data: assignees, isLoading } = useListServiceTicketAssignees({
    query: {
      enabled: canLoad,
      queryKey: getListServiceTicketAssigneesQueryKey(),
    },
  });

  if (!canLoad) return null;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={isLoading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowUnassigned && <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>}
        {(assignees ?? []).map((e) => (
          <SelectItem key={e.id} value={String(e.id)}>
            {e.fullName}
            {e.teamName ? ` · ${e.teamName}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
