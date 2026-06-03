import { Link } from "wouter";
import { Hash, MessageSquare } from "lucide-react";
import { useListChannels } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUnreadBadge } from "@/lib/chat-display";
import { cn } from "@/lib/utils";

export function ChatWidget() {
  const { data: channels, isLoading } = useListChannels();

  const top = (channels ?? []).slice(0, 3);
  const totalUnread = (channels ?? []).reduce((n, c) => n + (c.unreadCount ?? 0), 0);

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
          <span className="flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" aria-hidden />
            Team chat
          </span>
          {totalUnread > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white">
              {formatUnreadBadge(totalUnread)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No channels yet</p>
        ) : (
          <ul className="space-y-1">
            {top.map((ch) => (
              <li key={ch.id}>
                <Link
                  href={`/channels?channel=${ch.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/80",
                    (ch.unreadCount ?? 0) > 0 && "font-medium",
                  )}
                >
                  <Hash size={14} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{ch.name}</span>
                  {(ch.unreadCount ?? 0) > 0 && (
                    <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                      {formatUnreadBadge(ch.unreadCount ?? 0)}
                    </span>
                  )}
                </Link>
                {ch.lastMessagePreview ? (
                  <p className="truncate pl-9 pr-2 text-xs text-muted-foreground">
                    {ch.lastMessagePreview}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/channels"
          className="mt-3 block text-center text-xs font-medium text-primary hover:underline"
        >
          Open chat
        </Link>
      </CardContent>
    </Card>
  );
}
