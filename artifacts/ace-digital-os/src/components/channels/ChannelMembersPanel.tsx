import { useState } from "react";
import {
  useListChannelMembers,
  useAddChannelMember,
  useRemoveChannelMember,
  getListChannelMembersQueryKey,
  getListChannelsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useListEmployees } from "@workspace/api-client-react";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X, UserPlus } from "lucide-react";

interface ChannelMembersPanelProps {
  channelId: number;
  canManage: boolean;
}

export function ChannelMembersPanel({ channelId, canManage }: ChannelMembersPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useListChannelMembers(channelId, {
    query: {
      enabled: channelId > 0,
      queryKey: getListChannelMembersQueryKey(channelId),
    },
  });
  const { data: employees } = useListEmployees();
  const addMember = useAddChannelMember();
  const removeMember = useRemoveChannelMember();
  const [addUserId, setAddUserId] = useState("");

  const memberIds = new Set(members?.map((m) => m.userId) ?? []);
  const available = employees?.filter((e) => !memberIds.has(e.id)) ?? [];

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: getListChannelMembersQueryKey(channelId),
    });
    await queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
  }

  async function handleAdd() {
    if (!addUserId) return;
    try {
      await addMember.mutateAsync({
        id: channelId,
        data: { userId: Number(addUserId), role: "member" },
      });
      setAddUserId("");
      await invalidate();
      toast({ title: "Member added" });
    } catch {
      toast({ title: "Could not add member", variant: "destructive" });
    }
  }

  async function handleRemove(userId: number) {
    try {
      await removeMember.mutateAsync({ id: channelId, userId });
      await invalidate();
      toast({ title: "Member removed" });
    } catch {
      toast({
        title: "Could not remove member",
        description: "You cannot remove the last owner.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  }

  return (
    <div className="space-y-4">
      {canManage && available.length > 0 && (
        <div className="flex gap-2">
          <Select value={addUserId} onValueChange={setAddUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add a person…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            onClick={handleAdd}
            disabled={!addUserId || addMember.isPending}
            aria-label="Add member"
          >
            <UserPlus size={18} />
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {members?.map((m) => (
          <li
            key={m.userId}
            className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
          >
            <UserAvatar
              avatarUrl={m.avatarUrl}
              fullName={m.fullName}
              className="h-8 w-8"
              iconSize={14}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
              {m.role}
            </Badge>
            {canManage && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(m.userId)}
                disabled={removeMember.isPending}
                aria-label={`Remove ${m.fullName}`}
              >
                <X size={14} />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
