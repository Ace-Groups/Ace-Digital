import {
  getListChannelPinsQueryKey,
  useListChannelPins,
  type ChannelPin,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";
import { MessageBody } from "@/components/channels/MessageBody";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Pin } from "lucide-react";

interface ChannelPinsPanelProps {
  channelId: number;
  onJumpToMessage?: (messageId: number) => void;
}

export function ChannelPinsPanel({ channelId, onJumpToMessage }: ChannelPinsPanelProps) {
  const { data, isPending } = useListChannelPins(channelId, {
    query: {
      enabled: channelId > 0,
      queryKey: getListChannelPinsQueryKey(channelId),
    },
  });

  const pins = data ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isPending ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !pins.length ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Pin size={24} className="opacity-40" />
            <p>No pinned messages yet</p>
            <p className="text-xs">Pin important messages from the message menu</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {pins.map((pin: ChannelPin) => (
              <li key={pin.messageId}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40",
                  )}
                  onClick={() => onJumpToMessage?.(pin.messageId)}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={pin.message.senderAvatar}
                      fullName={pin.message.senderName}
                      className="size-6 rounded-md"
                      iconSize={10}
                    />
                    <span className="text-sm font-medium">{pin.message.senderName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(pin.message.createdAt)}
                    </span>
                    <Pin size={12} className="ml-auto shrink-0 text-amber-500" aria-hidden />
                  </div>
                  {pin.message.body?.trim() ? (
                    <div className="line-clamp-3 text-sm text-foreground/90">
                      <MessageBody body={pin.message.body} />
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Attachment</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Pinned {formatRelativeTime(pin.pinnedAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
