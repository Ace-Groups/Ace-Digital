import { Hash, Megaphone, ArrowLeft, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Channel } from "@workspace/api-client-react";

interface ChannelThreadHeaderProps {
  channel: Channel;
  isMobile?: boolean;
  onBack?: () => void;
  onOpenSettings?: () => void;
}

export function ChannelThreadHeader({
  channel,
  isMobile,
  onBack,
  onOpenSettings,
}: ChannelThreadHeaderProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3 sm:gap-3 sm:px-4">
      {isMobile && onBack && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={onBack}
          aria-label="Back to channels"
        >
          <ArrowLeft size={20} />
        </Button>
      )}
      {channel.type === "ANNOUNCEMENT" ? (
        <Megaphone size={18} className="text-primary shrink-0" />
      ) : (
        <Hash size={18} className="text-primary shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{channel.name}</p>
        {channel.description ? (
          <p className="truncate text-xs text-muted-foreground">{channel.description}</p>
        ) : channel.teamName ? (
          <p className="text-xs text-muted-foreground">{channel.teamName} team</p>
        ) : null}
      </div>
      {channel.memberCount != null && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Users size={14} />
          {channel.memberCount}
        </span>
      )}
      {onOpenSettings && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onOpenSettings}
          aria-label="Channel settings"
          data-testid="btn-channel-settings"
        >
          <Settings size={18} />
        </Button>
      )}
    </div>
  );
}
