import { useState } from "react";
import { ArrowLeft, Settings, Users, Search, X, Star } from "lucide-react";
import { ChannelIcon } from "@/components/channels/ChannelIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import {
  getListChannelMembersQueryKey,
  useListChannelMembers,
} from "@workspace/api-client-react";
import type { Channel } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

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
  activeTab?: "messages" | "files" | "pins";
  onTabChange?: (tab: "messages" | "files" | "pins") => void;
  starred?: boolean;
  onToggleStar?: () => void;
}

export function ChannelThreadHeader({
  channel,
  channelId,
  isMobile,
  onBack,
  onOpenSettings,
  searchQuery = "",
  onSearchChange,
  activeTab = "messages",
  onTabChange,
  starred = false,
  onToggleStar,
}: ChannelThreadHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(Boolean(searchQuery.trim()));
  const { data: members } = useListChannelMembers(channelId, {
    query: {
      enabled: channelId > 0,
      queryKey: getListChannelMembersQueryKey(channelId),
      staleTime: 60_000,
    },
  });

  const previewMembers = (members ?? []).slice(0, 4);
  const showSearchRow = onSearchChange && (searchOpen || searchQuery.trim().length > 0);
  const title =
    channel.type === "DM" ? (channel.dmPeerName ?? channel.name) : channel.name;
  const titlePrefix = channel.type === "DM" ? "" : "#";

  function closeSearch() {
    setSearchOpen(false);
    onSearchChange?.("");
  }

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-b border-border bg-[var(--chat-bg)]/95 backdrop-blur-sm",
        isMobile && "pt-[env(safe-area-inset-top)]",
      )}
    >
      <div className="flex min-h-11 items-center gap-1.5 px-2 sm:min-h-12 sm:gap-2 sm:px-4">
        {isMobile && onBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0"
            onClick={onBack}
            aria-label="Back to channels"
          >
            <ArrowLeft size={20} />
          </Button>
        )}
        <ChannelIcon channel={channel} size={18} className="shrink-0 text-primary" />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {titlePrefix}
            {title}
          </p>
          {!isMobile && (channel.description || channel.teamName) && (
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {channel.description ?? `${channel.teamName} team`}
            </p>
          )}
        </div>
        {previewMembers.length > 0 && (
          <div className="hidden shrink-0 -space-x-1.5 sm:flex" aria-hidden>
            {previewMembers.map((m) => (
              <UserAvatar
                key={m.userId}
                avatarUrl={m.avatarUrl}
                fullName={m.fullName}
                className="h-6 w-6 border-2 border-card"
                iconSize={10}
              />
            ))}
          </div>
        )}
        {channel.memberCount != null && (
          <span className="hidden shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground sm:flex">
            <Users size={14} />
            {channel.memberCount}
          </span>
        )}
        {onToggleStar && channel.type !== "DM" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0"
            onClick={onToggleStar}
            aria-label={starred ? "Unstar channel" : "Star channel"}
          >
            <Star size={18} className={cn(starred && "fill-amber-400 text-amber-400")} />
          </Button>
        )}
        {onSearchChange && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("size-10 shrink-0", searchOpen && "bg-muted")}
            onClick={() => {
              if (searchOpen && !searchQuery.trim()) setSearchOpen(false);
              else setSearchOpen(true);
            }}
            aria-label="Search in conversation"
            aria-expanded={showSearchRow}
          >
            <Search size={18} />
          </Button>
        )}
        {onOpenSettings && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0"
            onClick={onOpenSettings}
            aria-label="Channel settings"
            data-testid="btn-channel-settings"
          >
            <Settings size={18} />
          </Button>
        )}
      </div>
      {onTabChange && (
        <div className="flex gap-3 border-t border-border/60 px-3 sm:gap-4 sm:px-4">
          {(["messages", "files", "pins"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                "min-h-10 border-b-2 py-2 text-sm font-medium capitalize transition-colors sm:min-h-0",
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      )}
      {showSearchRow && onSearchChange && (
        <div className="border-t border-border/60 px-3 pb-2 pt-1.5 sm:px-4">
          <div className="relative mx-auto w-full max-w-3xl">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search messages"
              className="h-8 border-border/80 bg-muted/40 pl-8 pr-8 text-sm"
              autoFocus
            />
            <button
              type="button"
              className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={closeSearch}
              aria-label="Close search"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
