import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useUpdateChannel,
  useListChannelMembers,
  getListChannelsQueryKey,
  getGetChannelQueryKey,
  getListChannelMembersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { canManageChannel } from "@workspace/rbac";
import { ChannelMembersPanel } from "./ChannelMembersPanel";
import { ChannelIcon } from "./ChannelIcon";
import type { Channel } from "@workspace/api-client-react";
import { Archive, ImageOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  channel: Channel | null;
  onArchived?: () => void;
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ChannelSettingsSheet({
  open,
  onClose,
  channel,
  onArchived,
}: ChannelSettingsSheetProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateChannel = useUpdateChannel();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const { data: members } = useListChannelMembers(channel?.id ?? 0, {
    query: {
      enabled: open && !!channel?.id,
      queryKey: getListChannelMembersQueryKey(channel?.id ?? 0),
      staleTime: 0,
    },
  });

  const ctx = user
    ? { userId: user.id, role: user.role, teamId: user.teamId }
    : null;

  const myRoleFromMembers = members?.find((m) => m.userId === user?.id)?.role;
  const membership =
    channel?.myRole || myRoleFromMembers
      ? { role: channel?.myRole ?? myRoleFromMembers ?? "member" }
      : null;

  const canManage = Boolean(
    ctx &&
      channel &&
      canManageChannel(ctx, membership, {
        createdById: channel.createdById ?? null,
      }),
  );

  const previewChannel = useMemo(
    () =>
      channel
        ? {
            ...channel,
            name: name.trim() || channel.name,
            avatarUrl: avatarUrl.trim() || channel.avatarUrl || null,
          }
        : null,
    [channel, name, avatarUrl],
  );

  const isDirty = useMemo(() => {
    if (!channel) return false;
    return (
      name.trim() !== channel.name ||
      (description.trim() || "") !== (channel.description ?? "") ||
      (avatarUrl.trim() || "") !== (channel.avatarUrl ?? "")
    );
  }, [channel, name, description, avatarUrl]);

  useEffect(() => {
    if (channel && open) {
      setName(channel.name);
      setDescription(channel.description ?? "");
      setAvatarUrl(channel.avatarUrl ?? "");
    }
  }, [channel, open]);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
    if (channel) {
      await queryClient.invalidateQueries({ queryKey: getGetChannelQueryKey(channel.id) });
      await queryClient.invalidateQueries({
        queryKey: getListChannelMembersQueryKey(channel.id),
      });
    }
  }

  async function handleSave() {
    if (!channel || !name.trim()) return;
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
      toast({
        title: "Update failed",
        description: "Check the channel name and image URL, then try again.",
        variant: "destructive",
      });
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
      setArchiveConfirmOpen(false);
      onArchived?.();
      onClose();
    } catch {
      toast({ title: "Could not archive channel", variant: "destructive" });
    }
  }

  if (!channel || !previewChannel) return null;

  const saveButton = (
    <Button
      type="button"
      onClick={() => void handleSave()}
      disabled={updateChannel.isPending || !name.trim() || !isDirty}
      className={cn("w-full", isMobile && "min-h-11 text-base")}
    >
      {updateChannel.isPending ? (
        <>
          <Loader2 size={16} className="mr-2 animate-spin" /> Saving…
        </>
      ) : (
        "Save changes"
      )}
    </Button>
  );

  return (
    <>
      <ResponsiveSheet
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title="Channel settings"
        description={
          canManage
            ? "Update this channel’s profile, members, and visibility."
            : "View channel details and members."
        }
        className={isMobile ? undefined : "max-w-lg"}
      >
        <div className={cn("space-y-8", isMobile && "pb-2")}>
          {canManage ? (
            <>
              <SettingsSection
                title="Channel icon"
                description="Use a public https image link, or leave blank for the default."
              >
                <div
                  className={cn(
                    "flex gap-4",
                    isMobile ? "flex-col items-center text-center" : "flex-row items-start",
                  )}
                >
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted",
                      isMobile ? "size-24" : "size-16",
                    )}
                  >
                    <ChannelIcon
                      channel={previewChannel}
                      size={isMobile ? 56 : 40}
                      className="rounded-2xl"
                    />
                  </div>
                  <div className={cn("min-w-0 space-y-2", isMobile ? "w-full" : "flex-1")}>
                    <Label htmlFor="settings-avatar" className={isMobile ? "sr-only" : undefined}>
                      Image URL
                    </Label>
                    <Input
                      id="settings-avatar"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/icon.png"
                      className={isMobile ? "min-h-11 text-base" : undefined}
                      inputMode="url"
                      autoCapitalize="off"
                      autoCorrect="off"
                    />
                    {avatarUrl.trim() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground"
                        onClick={() => setAvatarUrl("")}
                      >
                        <ImageOff size={14} />
                        Remove icon
                      </Button>
                    ) : null}
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection title="Details">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="settings-name">Channel name</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        #
                      </span>
                      <Input
                        id="settings-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={cn("pl-7", isMobile && "min-h-11 text-base")}
                        autoCapitalize="off"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lowercase letters, numbers, and hyphens only.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-desc">Description</Label>
                    <Textarea
                      id="settings-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this channel for?"
                      rows={isMobile ? 3 : 2}
                      className={isMobile ? "min-h-[5rem] text-base" : "resize-none"}
                    />
                  </div>
                  {!isMobile && saveButton}
                </div>
              </SettingsSection>

              <SettingsSection
                title="Members"
                description={`${members?.length ?? channel.memberCount ?? 0} people in this channel`}
              >
                <ChannelMembersPanel
                  channelId={channel.id}
                  canManage={canManage}
                  active={open}
                />
              </SettingsSection>

              <SettingsSection title="Danger zone">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10",
                    isMobile && "min-h-11",
                  )}
                  onClick={() => setArchiveConfirmOpen(true)}
                  disabled={updateChannel.isPending}
                >
                  <Archive size={16} /> Archive channel
                </Button>
                <p className="text-xs text-muted-foreground">
                  Archived channels are hidden from the list. History is kept.
                </p>
              </SettingsSection>

              {isMobile && (
                <div className="sticky bottom-0 z-10 -mx-1 border-t border-border/80 bg-background/95 px-1 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
                  {saveButton}
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className={cn(
                  "flex items-center gap-4 rounded-xl border border-border/60 bg-muted/20 p-4",
                  isMobile && "flex-col text-center",
                )}
              >
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                  <ChannelIcon channel={channel} size={40} className="rounded-2xl" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">#{channel.name}</p>
                  {channel.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{channel.description}</p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No description</p>
                  )}
                  {channel.teamName ? (
                    <p className="mt-1 text-xs text-muted-foreground">{channel.teamName} team</p>
                  ) : null}
                </div>
              </div>
              <SettingsSection title="Members">
                <ChannelMembersPanel
                  channelId={channel.id}
                  canManage={false}
                  active={open}
                />
              </SettingsSection>
              <p className="text-center text-xs text-muted-foreground">
                Only channel owners can edit settings. Contact an owner if you need changes.
              </p>
            </>
          )}
        </div>
      </ResponsiveSheet>

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="Archive this channel?"
        description={
          <>
            <strong>#{channel.name}</strong> will be hidden from the channel list. Members can
            still access it if they have a direct link until you restore it from the database.
          </>
        }
        confirmLabel="Archive"
        variant="destructive"
        loading={updateChannel.isPending}
        onConfirm={() => void handleArchive()}
      />
    </>
  );
}
