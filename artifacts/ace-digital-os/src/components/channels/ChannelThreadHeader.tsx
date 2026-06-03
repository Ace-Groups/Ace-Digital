import { Hash, Megaphone, ArrowLeft, Settings, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import {
  getListChannelMembersQueryKey,
  useListChannelMembers,
} from "@workspace/api-client-react";
import type { Channel } from "@workspace/api-client-react";

export type ReplyTarget = {
  id: number;
  body: string;
  senderName?: string | null;
};

interface ChannelThreadHeaderProps {
  channel: Channel;
  channelId: number;
  isMobile?: boolean;
  onBack?: () => void;
  onOpenSettings?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function ChannelThreadHeader({
  channel,
  channelId,
  isMobile,
  onBack,
  onOpenSettings,
  searchQuery = "",
  onSearchChange,
}: ChannelThreadHeaderProps) {
  const { data: members } = useListChannelMembers(channelId, {
    query: {
      enabled: channelId > 0,
      queryKey: getListChannelMembersQueryKey(channelId),
      staleTime: 60_000,
    },
  });

  const previewMembers = (members ?? []).slice(0, 5);

  return (
    <div className="flex shrink-0 flex-col border-b border-border">
      <div className="flex min-h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        {isMobile && onBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            onClick={onBack}
            aria-label="Back to channels"
          >
            <ArrowLeft size={20} />
          </Button>
        )}
        {channel.type === "ANNOUNCEMENT" ? (
          <Megaphone size={20} className="shrink-0 text-primary" />
        ) : (
          <Hash size={20} className="shrink-0 text-primary" />
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="truncate font-semibold leading-tight text-foreground">{channel.name}</p>
          {channel.description ? (
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {channel.description}
            </p>
          ) : channel.teamName ? (
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {channel.teamName} team
            </p>
          ) : null}
        </div>
        {previewMembers.length > 0 && (
          <div className="flex -space-x-2 shrink-0" aria-hidden>
            {previewMembers.map((m) => (
              <UserAvatar
                key={m.userId}
                avatarUrl={m.avatarUrl}
                fullName={m.fullName}
                className="h-7 w-7 border-2 border-background"
                iconSize={12}
              />
            ))}
          </div>
        )}
        {channel.memberCount != null && (
          <span className="flex h-11 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Users size={16} className="shrink-0" />
            {channel.memberCount}
          </span>
        )}
        {onOpenSettings && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            onClick={onOpenSettings}
            aria-label="Channel settings"
            data-testid="btn-channel-settings"
          >
            <Settings size={20} />
          </Button>
        )}
      </div>
      {onSearchChange && (
        <div className="border-t border-border/60 px-3 py-2 sm:px-4">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search in conversation"
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
