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

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setDescription(channel.description ?? "");
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
    try {
      await updateChannel.mutateAsync({
        id: channel.id,
        data: {
          name: name.trim(),
          description: description.trim() || null,
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
                  <><Loader2 size={16} className="animate-spin mr-2" /> Saving…</>
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
          <div>
            <h3 className="text-sm font-semibold mb-3">Members</h3>
            <ChannelMembersPanel channelId={channel.id} canManage={false} />
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}
