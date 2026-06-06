import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getListChannelsQueryKey,
  getListDmsQueryKey,
  getListEmployeesQueryKey,
  useListEmployees,
  useOpenDm,
  ApiError,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/UserAvatar";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OpenDmDialogProps {
  open: boolean;
  onClose: () => void;
  onOpened?: (channelId: number) => void;
}

export function OpenDmDialog({ open, onClose, onOpened }: OpenDmDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const openDm = useOpenDm();
  const [query, setQuery] = useState("");

  const { data: employees, isPending } = useListEmployees(undefined, {
    query: {
      enabled: open,
      queryKey: getListEmployeesQueryKey(),
    },
  });

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (employees ?? [])
      .filter((e) => e.id !== user?.id)
      .filter(
        (e) =>
          !q ||
          e.fullName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [employees, query, user?.id]);

  async function handleSelect(userId: number) {
    try {
      const channel = await openDm.mutateAsync({ data: { userId } });
      await queryClient.invalidateQueries({ queryKey: getListDmsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
      onOpened?.(channel.id);
      setQuery("");
      onClose();
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not open direct message";
      toast({ title: detail, variant: "destructive" });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuery("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message someone</DialogTitle>
          <DialogDescription>Start a direct message with a teammate</DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          autoFocus
          className="mb-2"
        />
        <div className="max-h-[50vh] overflow-y-auto">
          {isPending ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !candidates.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No people found</p>
          ) : (
            <ul className="space-y-0.5">
              {candidates.map((emp) => (
                <li key={emp.id}>
                  <button
                    type="button"
                    disabled={openDm.isPending}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted/60",
                      openDm.isPending && "opacity-60",
                    )}
                    onClick={() => void handleSelect(emp.id)}
                  >
                    <UserAvatar
                      avatarUrl={emp.avatarUrl}
                      fullName={emp.fullName}
                      className="size-9 rounded-md"
                      iconSize={14}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{emp.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
