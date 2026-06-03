import { Hash, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Channel } from "@workspace/api-client-react";

interface ChannelIconProps {
  channel: Pick<Channel, "type" | "avatarUrl" | "name">;
  size?: number;
  className?: string;
}

export function ChannelIcon({ channel, size = 16, className }: ChannelIconProps) {
  if (channel.avatarUrl) {
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
