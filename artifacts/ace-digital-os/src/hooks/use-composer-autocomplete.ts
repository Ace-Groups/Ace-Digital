import { useCallback, useEffect, useMemo, useState } from "react";
import type { Channel, ChannelMember } from "@workspace/api-client-react";
import {
  channelDisplayLabel,
  matchScore,
  triggerQueryAtCursor,
} from "@/lib/chat-mentions";

const MAX_CANDIDATES = 12;

export type ComposerCandidate =
  | {
      kind: "user";
      userId: number;
      label: string;
      avatarUrl?: string | null;
    }
  | {
      kind: "channel";
      channelId: number;
      label: string;
      subtitle?: string | null;
      channel: Pick<Channel, "type" | "avatarUrl" | "name" | "dmPeerAvatar">;
    }
  | {
      kind: "bot";
      label: string;
      insertToken: string;
    };

type UseComposerAutocompleteArgs = {
  body: string;
  cursor: number;
  members: ChannelMember[] | undefined;
  channels: Channel[] | undefined;
  currentUserId?: number;
};

export function useComposerAutocomplete({
  body,
  cursor,
  members,
  channels,
  currentUserId,
}: UseComposerAutocompleteArgs) {
  const [activeIndex, setActiveIndex] = useState(0);

  const trigger = triggerQueryAtCursor(body, cursor);
  const open = trigger !== null;

  const candidates = useMemo((): ComposerCandidate[] => {
    if (!trigger) return [];

    if (trigger.kind === "user") {
      const query = trigger.query;
      const botCandidates: ComposerCandidate[] = [];
      const q = query.toLowerCase();
      if (
        !q ||
        "acebot".startsWith(q) ||
        "ace".startsWith(q) ||
        "bot".startsWith(q)
      ) {
        botCandidates.push({
          kind: "bot",
          label: "AceBot",
          insertToken: "@AceBot",
        });
      }
      const memberCandidates = (members ?? [])
        .filter((m) => m.userId !== currentUserId)
        .map((m) => ({
          member: m,
          score: Math.max(
            matchScore(m.fullName, query),
            matchScore(m.email ?? "", query),
          ),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.member.fullName.localeCompare(b.member.fullName))
        .slice(0, MAX_CANDIDATES)
        .map(({ member }) => ({
          kind: "user" as const,
          userId: member.userId,
          label: member.fullName,
          avatarUrl: member.avatarUrl,
        }));
      return [...botCandidates, ...memberCandidates].slice(0, MAX_CANDIDATES);
    }

    const query = trigger.query;
    return (channels ?? [])
      .filter((c) => !c.archived)
      .map((c) => {
        const label = channelDisplayLabel(c);
        const score = Math.max(
          matchScore(label, query),
          matchScore(c.name, query),
          c.type === "DM" && c.dmPeerName ? matchScore(c.dmPeerName, query) : 0,
        );
        return { channel: c, score, label };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, MAX_CANDIDATES)
      .map(({ channel, label }) => ({
        kind: "channel" as const,
        channelId: channel.id,
        label,
        subtitle: channel.type === "DM" ? "Direct message" : channel.type === "ANNOUNCEMENT" ? "Announcement" : null,
        channel: {
          type: channel.type,
          avatarUrl: channel.type === "DM" ? (channel.dmPeerAvatar ?? channel.avatarUrl) : channel.avatarUrl,
          name: channel.name,
          dmPeerAvatar: channel.dmPeerAvatar,
        },
      }));
  }, [trigger, members, channels, currentUserId]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trigger?.kind, trigger?.query, candidates.length]);

  const moveActive = useCallback(
    (delta: number) => {
      if (!candidates.length) return;
      setActiveIndex((i) => (i + delta + candidates.length) % candidates.length);
    },
    [candidates.length],
  );

  return {
    open,
    kind: trigger?.kind ?? null,
    query: trigger?.query ?? "",
    candidates,
    loading: false,
    activeIndex,
    setActiveIndex,
    moveActive,
  };
}
