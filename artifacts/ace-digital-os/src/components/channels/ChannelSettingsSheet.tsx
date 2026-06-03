import { useEffect, useState } from "react";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useUpdateChannel,
  getListChannelsQueryKey,
  getGetChannelQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChannelMembersPanel } from "./ChannelMembersPanel";
import { ChannelIcon } from "./ChannelIcon";
import type { Channel } from "@workspace/api-client-react";
import { Loader2, Archive } from "lucide-react";

interface ChannelSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  channel: Channel | null;
  canManage: boolean;
  onArchived?: () => void;
}

export function ChannelSettingsSheet({
  open,
  onClose,
  channel,
  canManage,
  onArchived,
}: ChannelSettingsSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateChannel = useUpdateChannel();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setDescription(channel.description ?? "");
      setAvatarUrl(channel.avatarUrl ?? "");
    }
  }, [channel]);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
    if (channel) {
      await queryClient.invalidateQueries({ queryKey: getGetChannelQueryKey(channel.id) });
    }
  }

  async function handleSave() {
    if (!channel) return;
    const trimmedAvatar = avatarUrl.trim();
    try {
      await updateChannel.mutateAsync({
        id: channel.id,
        data: {
          name: name.trim(),
          description: description.trim() || null,
          avatarUrl: trimmedAvatar ? trimmedAvatar : null,
        },
      });
      await invalidate();
      toast({ title: "Channel updated" });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  }

  async function handleArchive() {
    if (!channel) return;
    try {
      await updateChannel.mutateAsync({
        id: channel.id,
        data: { archived: true },
      });
      await invalidate();
      toast({ title: "Channel archived" });
      onArchived?.();
      onClose();
    } catch {
      toast({ title: "Could not archive channel", variant: "destructive" });
    }
  }

  if (!channel) return null;

  return (
    <ResponsiveSheet open={open} onOpenChange={(v) => !v && onClose()} title="Channel settings">
      <div className="space-y-6 px-1 pb-6">
        {canManage ? (
          <>
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                <ChannelIcon
                  channel={{
                    ...channel,
                    avatarUrl: avatarUrl.trim() || channel.avatarUrl || null,
                  }}
                  size={40}
                  className="rounded-xl"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="settings-avatar">Channel image URL</Label>
                <Input
                  id="settings-avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://…"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a public image link (https). Leave empty for the default icon.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-desc">Description</Label>
                <Input
                  id="settings-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={updateChannel.isPending || !name.trim()}
                className="w-full"
              >
                {updateChannel.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" /> Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Members</h3>
              <ChannelMembersPanel channelId={channel.id} canManage={canManage} />
            </div>
            <div className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleArchive}
                disabled={updateChannel.isPending}
              >
                <Archive size={16} /> Archive channel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                <ChannelIcon channel={channel} size={32} className="rounded-xl" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{channel.name}</p>
                {channel.description ? (
                  <p className="text-sm text-muted-foreground">{channel.description}</p>
                ) : null}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Members</h3>
              <ChannelMembersPanel channelId={channel.id} canManage={false} />
            </div>
          </>
        )}
      </div>
    </ResponsiveSheet>
  );
}
