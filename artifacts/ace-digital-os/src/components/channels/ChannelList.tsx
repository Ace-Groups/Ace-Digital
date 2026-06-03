import { Hash, Megaphone, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatUnreadBadge } from "@/lib/chat-display";
import type { Channel } from "@workspace/api-client-react";

interface ChannelListProps {
  channels: Channel[] | undefined;
  isLoading: boolean;
  selectedChannelId: number | null;
  onSelect: (id: number) => void;
  onCreateClick: () => void;
  canCreate: boolean;
  isMobile?: boolean;
}

export function ChannelList({
  channels,
  isLoading,
  selectedChannelId,
  onSelect,
  onCreateClick,
  canCreate,
  isMobile,
}: ChannelListProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground",
        isMobile ? "min-h-0 w-full flex-1" : "w-64 shrink-0 border-r border-sidebar-border",
      )}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
        <h2 className="text-sm font-semibold">Chat</h2>
        {canCreate && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={onCreateClick}
            aria-label="Create channel"
            data-testid="btn-create-channel"
          >
            <Plus size={18} />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full bg-white/10" />
            ))}
          </div>
        ) : !channels?.length ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm text-sidebar-foreground/60">No channels yet</p>
            {canCreate && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={onCreateClick}
              >
                <Plus size={14} /> Create channel
              </Button>
            )}
          </div>
        ) : (
          channels.map((ch) => {
            const unread = ch.unreadCount ?? 0;
            const isSelected = selectedChannelId === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                data-testid={`channel-item-${ch.id}`}
                onClick={() => onSelect(ch.id)}
                className={cn(
                  "mb-0.5 flex w-full min-h-12 flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors active:scale-[0.99]",
                  isSelected
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  {ch.type === "ANNOUNCEMENT" ? (
                    <Megaphone size={16} className="shrink-0" />
                  ) : (
                    <Hash size={16} className="shrink-0" />
                  )}
                  <span
                    className={cn(
                      "truncate flex-1",
                      unread > 0 && !isSelected && "font-semibold text-sidebar-foreground",
                    )}
                  >
                    {ch.name}
                  </span>
                  {unread > 0 && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                        isSelected
                          ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                          : "bg-red-500 text-white",
                      )}
                      aria-label={`${unread} unread`}
                    >
                      {formatUnreadBadge(unread)}
                    </span>
                  )}
                </div>
                {ch.lastMessagePreview ? (
                  <p
                    className={cn(
                      "truncate pl-7 text-xs",
                      isSelected ? "opacity-80" : "opacity-50",
                    )}
                  >
                    {ch.lastMessagePreview}
                  </p>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
