import { Hash, Megaphone, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
        isMobile ? "min-h-[50dvh] w-full rounded-xl" : "w-64 shrink-0 border-r border-sidebar-border",
      )}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
        <h2 className="text-sm font-semibold">Channels</h2>
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
          channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              data-testid={`channel-item-${ch.id}`}
              onClick={() => onSelect(ch.id)}
              className={cn(
                "mb-0.5 flex w-full min-h-11 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                selectedChannelId === ch.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              {ch.type === "ANNOUNCEMENT" ? (
                <Megaphone size={16} className="shrink-0" />
              ) : (
                <Hash size={16} className="shrink-0" />
              )}
              <span className="truncate flex-1">{ch.name}</span>
              {ch.memberCount != null && ch.memberCount > 0 && (
                <span className="text-[10px] opacity-60">{ch.memberCount}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
