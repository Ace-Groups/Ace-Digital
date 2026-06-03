import { useLinkChatToCalendar, useCheckCalendarChatLink, getCheckCalendarChatLinkQueryKey } from "@workspace/api-client-react";
import type { Message } from "@workspace/api-client-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Check, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type PollMeta = {
  question: string;
  options: { id: string; label: string }[];
  votes: Record<string, number[]>;
  allowMultiple?: boolean;
  closesAt?: string;
};

interface PollCardProps {
  msg: Message;
  channelId: number;
  isMe?: boolean;
  onVote?: (optionId: string) => void;
}

export function PollCard({ msg, channelId, isMe, onVote }: PollCardProps) {
  const { user } = useAuth();
  const linkChat = useLinkChatToCalendar();
  const { toast } = useToast();
  const { data: linkStatus } = useCheckCalendarChatLink(
    { channelId, messageId: msg.id },
    { query: { enabled: !!msg.id, queryKey: getCheckCalendarChatLinkQueryKey({ channelId, messageId: msg.id }) } },
  );
  const meta = msg.metadata as PollMeta | undefined;
  if (!meta?.question || !meta.options?.length) return null;

  const totalVotes = Object.values(meta.votes ?? {}).reduce((n, arr) => n + arr.length, 0);
  const myVotes = new Set(
    Object.entries(meta.votes ?? {})
      .filter(([, ids]) => ids.includes(user?.id ?? -1))
      .map(([id]) => id),
  );

  function handleVote(optionId: string) {
    if (onVote) {
      onVote(optionId);
      return;
    }
  }

  return (
    <div
      className={cn(
        "w-full max-w-sm space-y-3 rounded-2xl border px-4 py-3",
        isMe ? "border-primary/30 bg-primary/10" : "border-border bg-muted/40",
      )}
    >
      <p className="text-sm font-semibold">{meta.question}</p>
      <div className="space-y-2">
        {meta.options.map((opt) => {
          const count = meta.votes?.[opt.id]?.length ?? 0;
          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const selected = myVotes.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleVote(opt.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                selected
                  ? "border-primary bg-primary/15"
                  : "border-border/80 bg-background/60 hover:bg-muted/60",
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary/10 transition-[width]"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {selected && <Check size={14} className="text-primary" />}
                  {opt.label}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        {meta.allowMultiple ? " · multiple choice" : ""}
        {meta.closesAt ? ` · closes ${formatRelativeTime(meta.closesAt)}` : ""}
      </p>
      {(meta.closesAt || true) && (
        <button
          type="button"
          disabled={linkChat.isPending || linkStatus?.linked}
          onClick={async () => {
            try {
              await linkChat.mutateAsync({
                data: {
                  channelId,
                  messageId: msg.id,
                  reminderAt: meta.closesAt,
                },
              });
              toast({ title: "Added deadline to your calendar" });
            } catch {
              toast({ title: "Could not add to calendar", variant: "destructive" });
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/60 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          <CalendarPlus size={14} />
          {linkStatus?.linked ? "On your calendar" : "Add deadline to calendar"}
        </button>
      )}
      {linkStatus?.linked && linkStatus.eventId ? (
        <Link href={`/calendar?event=${linkStatus.eventId}`} className="block text-center text-[11px] text-primary">
          View in calendar
        </Link>
      ) : null}
    </div>
  );
}
