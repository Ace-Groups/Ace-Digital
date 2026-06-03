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
    <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-4">
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
  );
}
