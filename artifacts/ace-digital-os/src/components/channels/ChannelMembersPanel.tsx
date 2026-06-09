import { useMemo, useState } from "react";
import {
  useListChannelMembers,
  useAddChannelMember,
  useRemoveChannelMember,
  getListChannelMembersQueryKey,
  getListChannelsQueryKey,
  type ChannelMember,
} from "@workspace/api-client-react";
import { appendListItem, patchList, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import { useQueryClient } from "@tanstack/react-query";
import { useListEmployees } from "@workspace/api-client-react";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, UserMinus, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelMembersPanelProps {
  channelId: number;
  canManage: boolean;
  /** Refetch members when settings opens */
  active?: boolean;
}

export function ChannelMembersPanel({
  channelId,
  canManage,
  active = true,
}: ChannelMembersPanelProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useListChannelMembers(channelId, {
    query: {
      enabled: channelId > 0 && active,
      queryKey: getListChannelMembersQueryKey(channelId),
      staleTime: 30_000,
    },
  });
  const { data: employees } = useListEmployees();
  const addMember = useAddChannelMember();
  const removeMember = useRemoveChannelMember();
  const [memberSearch, setMemberSearch] = useState("");

  const memberIds = new Set(members?.map((m) => m.userId) ?? []);
  const available =
    employees?.filter((e) => !memberIds.has(e.id) && e.status === "active") ?? [];

  const filteredAvailable = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        (e.email?.toLowerCase().includes(q) ?? false),
    );
  }, [available, memberSearch]);

  const membersKey = getListChannelMembersQueryKey(channelId);

  async function handleAdd(userId: number) {
    const emp = employees?.find((e) => e.id === userId);
    const optimistic: ChannelMember = {
      userId,
      fullName: emp?.fullName ?? "Member",
      email: emp?.email,
      avatarUrl: emp?.avatarUrl ?? null,
      role: "member",
      joinedAt: new Date().toISOString(),
    };
    setMemberSearch("");
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<ChannelMember>(queryClient, membersKey);
          appendListItem(queryClient, membersKey, optimistic);
          return prev;
        },
        rollback: (prev) => setList(queryClient, membersKey, prev),
        commit: () =>
          addMember.mutateAsync({
            id: channelId,
            data: { userId, role: "member" },
          }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: membersKey });
          void queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
        },
      });
      toast({ title: "Member added" });
    } catch {
      toast({ title: "Could not add member", variant: "destructive" });
    }
  }

  async function handleRemove(userId: number, fullName: string) {
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<ChannelMember>(queryClient, membersKey);
          patchList<ChannelMember>(queryClient, membersKey, (list) =>
            list.filter((m) => m.userId !== userId),
          );
          return prev;
        },
        rollback: (prev) => setList(queryClient, membersKey, prev),
        commit: () => removeMember.mutateAsync({ id: channelId, userId }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: membersKey });
          void queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
        },
      });
      toast({ title: `${fullName} removed` });
    } catch {
      toast({
        title: "Could not remove member",
        description: "You cannot remove the last owner.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
          <p className="text-sm font-medium">Add member</p>
          {available.length === 0 ? (
            <p className="text-xs text-muted-foreground">Everyone on the team is already here.</p>
          ) : (
            <>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name or email"
                  className={cn("pl-9", isMobile && "min-h-11 text-base")}
                />
              </div>
              {memberSearch.trim() && filteredAvailable.length > 0 && (
                <ul
                  className={cn(
                    "touch-scroll space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-background p-1",
                    isMobile ? "max-h-40" : "max-h-36",
                  )}
                >
                  {filteredAvailable.slice(0, 8).map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 text-left transition-colors hover:bg-muted/60 active:bg-muted",
                          isMobile ? "min-h-11 py-2" : "min-h-9 py-1.5",
                        )}
                        onClick={() => void handleAdd(e.id)}
                        disabled={addMember.isPending}
                      >
                        <UserPlus size={16} className="shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {e.fullName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {memberSearch.trim() && filteredAvailable.length === 0 && (
                <p className="text-xs text-muted-foreground">No matches.</p>
              )}
              {!memberSearch.trim() && (
                <p className="text-xs text-muted-foreground">
                  Search to find someone to add.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {members?.map((m) => (
          <li
            key={m.userId}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3",
              isMobile ? "min-h-[3.25rem] py-2.5" : "py-2",
              m.unavailable && "opacity-80",
            )}
          >
            <UserAvatar
              avatarUrl={m.avatarUrl}
              fullName={m.fullName}
              className={cn("h-9 w-9 shrink-0", m.unavailable && "grayscale")}
              iconSize={16}
            />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-medium">
                <span className="truncate">{m.fullName}</span>
                {m.unavailable && (
                  <span className="shrink-0 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    Unavailable
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
              {m.role}
            </Badge>
            {canManage && (
              <Button
                type="button"
                variant={isMobile ? "outline" : "ghost"}
                size={isMobile ? "sm" : "icon"}
                className={cn(
                  "shrink-0",
                  !isMobile && "h-8 w-8 text-muted-foreground hover:text-destructive",
                  isMobile && "min-h-9 gap-1 border-destructive/30 text-destructive",
                )}
                onClick={() => void handleRemove(m.userId, m.fullName)}
                disabled={removeMember.isPending}
                aria-label={`Remove ${m.fullName}`}
              >
                {isMobile ? (
                  <>
                    <UserMinus size={14} />
                    Remove
                  </>
                ) : (
                  <X size={14} />
                )}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
