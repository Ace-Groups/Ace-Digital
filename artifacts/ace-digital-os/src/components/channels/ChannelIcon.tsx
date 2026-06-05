import { Hash, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Channel } from "@workspace/api-client-react";
import { parseChannelIcon, getChannelIconComponent } from "@/lib/channel-icons";

interface ChannelIconProps {
  channel: Pick<Channel, "type" | "avatarUrl" | "name">;
  size?: number;
  className?: string;
}

export function ChannelIcon({ channel, size = 16, className }: ChannelIconProps) {
  const iconId = parseChannelIcon(channel.avatarUrl);
  if (iconId) {
    const Icon = getChannelIconComponent(iconId);
    return <Icon size={size} className={cn("shrink-0", className)} />;
  }
  if (channel.avatarUrl && !channel.avatarUrl.startsWith("icon:")) {
    return (
      <img
        src={channel.avatarUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-md object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  if (channel.type === "ANNOUNCEMENT") {
    return <Megaphone size={size} className={cn("shrink-0", className)} />;
  }
  return <Hash size={size} className={cn("shrink-0", className)} />;
}
