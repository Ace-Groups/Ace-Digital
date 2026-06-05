import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import {
  useCreateChannel, useListEmployees, useListTeams,
  getListChannelsQueryKey, getListEmployeesQueryKey, type Channel,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { prependListItem, replaceListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIconPicker } from "./ChannelIconPicker";
import {
  encodeChannelIcon, defaultIconForChannelType, type ChannelIconId,
} from "@/lib/channel-icons";
import { useIsMobile } from "@/hooks/use-mobile";

interface CreateChannelSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (channelId: number) => void;
}

export function CreateChannelSheet({ open, onClose, onCreated }: CreateChannelSheetProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { can } = usePermissions();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const createChannel = useCreateChannel();
  const channelsKey = getListChannelsQueryKey();
  const canCreateAnnouncement = can("channels:all");
  const { data: employees } = useListEmployees(undefined, {
    query: {
      enabled: open && (can("employees:read") || can("channels:write")),
      queryKey: getListEmployeesQueryKey(),
    },
  });
  const { data: teams } = useListTeams();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"TEAM" | "ANNOUNCEMENT">("TEAM");
  const [teamId, setTeamId] = useState("");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [iconId, setIconId] = useState<ChannelIconId>("hash");
  const [inviteSearch, setInviteSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(!isMobile);

  function reset() {
    setName("");
    setDescription("");
    setType("TEAM");
    setTeamId("");
    setMemberIds([]);
    setIconId("hash");
    setInviteSearch("");
    setShowAdvanced(!isMobile);
  }

  function toggleMember(id: number) {
    setMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user) return;
    const typeVal = canCreateAnnouncement ? type : "TEAM";
    const iconUrl = typeVal === "ANNOUNCEMENT" && iconId === "hash"
      ? defaultIconForChannelType("ANNOUNCEMENT")
      : encodeChannelIcon(iconId);
    const normalized = name.trim().toLowerCase().replace(/\s+/g, "-");
    const tempId = -Date.now();
    const optimistic: Channel = {
      id: tempId,
      name: normalized,
      description: description.trim() || null,
      avatarUrl: iconUrl,
      teamId: teamId ? Number(teamId) : null,
      teamName: null,
      type: typeVal,
      visibility: "PRIVATE",
      archived: false,
      memberCount: 1,
      myRole: "owner",
      unreadCount: 0,
      lastPostAt: null,
      lastMessagePreview: null,
      lastReadMessageId: null,
      createdAt: new Date().toISOString(),
    };
    reset();
    onClose();
    try {
      const channel = await runOptimistic({
        apply: () => {
          const prev = snapshotList<Channel>(queryClient, channelsKey);
          prependListItem(queryClient, channelsKey, optimistic);
          return prev;
        },
        rollback: (prev) => setList(queryClient, channelsKey, prev),
        commit: () =>
          createChannel.mutateAsync({
            data: {
              name: name.trim(),
              description: description.trim() || undefined,
              type: typeVal,
              teamId: teamId ? Number(teamId) : undefined,
              memberIds: memberIds.length > 0 ? memberIds : undefined,
              avatarUrl: iconUrl,
            },
          }),
        reconcile: (created) => replaceListItem(queryClient, channelsKey, tempId, created),
      });
      toast({ title: "Channel created", description: `#${channel.name} is ready.` });
      onCreated?.(channel.id);
    } catch {
      toast({ title: "Could not create channel", variant: "destructive" });
    }
  }

  const filteredEmployees = (employees ?? []).filter((emp) =>
    emp.fullName.toLowerCase().includes(inviteSearch.toLowerCase()),
  );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}
      title="Create channel"
      description="Create a new team or announcement channel"
      className="sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-2">
        <div className="space-y-2">
          <Label>Channel icon</Label>
          <ChannelIconPicker
            value={iconId}
            onChange={(id) => setIconId(id)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch-name">Name</Label>
          <Input
            id="ch-name"
            data-testid="input-channel-name"
            placeholder="e.g. product-launch"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch-desc">Description (optional)</Label>
          <Input
            id="ch-desc"
            placeholder="What is this channel for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {canCreateAnnouncement && (
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                const t = v as "TEAM" | "ANNOUNCEMENT";
                setType(t);
                if (t === "ANNOUNCEMENT") setIconId("megaphone");
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TEAM">Team channel</SelectItem>
                <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {isMobile && (
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            Team & invites
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        {showAdvanced && (
          <>
            {type === "TEAM" && (
              <div className="space-y-2">
                <Label>Link to team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {teams?.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Invite people</Label>
              <Input
                placeholder="Search people..."
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
                {filteredEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className={cn(
                      "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      memberIds.includes(emp.id) && "bg-primary/10",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={memberIds.includes(emp.id)}
                      onChange={() => toggleMember(emp.id)}
                      className="rounded border-border"
                    />
                    <span className="truncate">{emp.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
        <Button
          type="submit"
          className="w-full min-h-[44px] gap-2"
          disabled={!name.trim() || createChannel.isPending}
          data-testid="btn-submit-channel"
        >
          {createChannel.isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Creating…</>
          ) : (
            "Create channel"
          )}
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
