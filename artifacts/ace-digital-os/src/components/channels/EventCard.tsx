import { useRsvpEvent, getGetChannelMessagesQueryKey, useLinkChatToCalendar, useCheckCalendarChatLink, getCheckCalendarChatLinkQueryKey } from "@workspace/api-client-react";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import type { Message } from "@workspace/api-client-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type EventMeta = {
  title: string;
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  rsvps: { going: number[]; maybe: number[]; no: number[] };
};

const RSVP_OPTIONS = [
  { status: "going" as const, label: "Going" },
  { status: "maybe" as const, label: "Maybe" },
  { status: "no" as const, label: "Can't go" },
];

interface EventCardProps {
  msg: Message;
  channelId: number;
  isMe?: boolean;
}

export function EventCard({ msg, channelId, isMe }: EventCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const rsvpEvent = useRsvpEvent({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData<Message[]>(
          getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS),
          (old) =>
          (old ?? []).map((m) => (m.id === updated.id ? updated : m)),
        );
      },
    },
  });
  const linkChat = useLinkChatToCalendar();
  const { toast } = useToast();
  const { data: linkStatus } = useCheckCalendarChatLink(
    { channelId, messageId: msg.id },
    { query: { enabled: !!msg.id, queryKey: getCheckCalendarChatLinkQueryKey({ channelId, messageId: msg.id }) } },
  );
  const meta = msg.metadata as EventMeta | undefined;
  if (!meta?.title) return null;

  const myStatus = RSVP_OPTIONS.find(({ status }) =>
    meta.rsvps?.[status]?.includes(user?.id ?? -1),
  )?.status;

  async function handleRsvp(status: "going" | "maybe" | "no") {
    if (rsvpEvent.isPending) return;
    await rsvpEvent.mutateAsync({
      id: channelId,
      messageId: msg.id,
      data: { status },
    });
  }

  const going = meta.rsvps?.going?.length ?? 0;

  return (
    <div
      className={cn(
        "w-full max-w-sm space-y-3 rounded-2xl border px-4 py-3",
        isMe ? "border-primary/30 bg-primary/10" : "border-border bg-muted/40",
      )}
    >
      <div className="flex items-start gap-2">
        <CalendarDays size={18} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-semibold">{meta.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(meta.startAt)}
            {meta.endAt ? ` – ${formatRelativeTime(meta.endAt)}` : ""}
          </p>
          {meta.location ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={12} />
              {meta.location}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {RSVP_OPTIONS.map(({ status, label }) => (
          <button
            key={status}
            type="button"
            disabled={rsvpEvent.isPending}
            onClick={() => void handleRsvp(status)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              myStatus === status
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background/80 hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {going} going · {(meta.rsvps?.maybe?.length ?? 0) + (meta.rsvps?.no?.length ?? 0)} other responses
      </p>
      <button
        type="button"
        disabled={linkChat.isPending || linkStatus?.linked}
        onClick={async () => {
          try {
            const event = await linkChat.mutateAsync({
              data: { channelId, messageId: msg.id },
            });
            toast({ title: "Added to your calendar" });
            void event;
          } catch {
            toast({ title: "Could not add to calendar", variant: "destructive" });
          }
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/60 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        <CalendarPlus size={14} />
        {linkStatus?.linked ? "On your calendar" : "Add to my calendar"}
      </button>
      {linkStatus?.linked && linkStatus.eventId ? (
        <Link href={`/calendar?event=${linkStatus.eventId}`} className="block text-center text-[11px] text-primary">
          View in calendar
        </Link>
      ) : null}
    </div>
  );
}
