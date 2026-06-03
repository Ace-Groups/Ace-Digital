import type { Message } from "@workspace/api-client-react";

type ReactionsMap = Record<string, number[]>;

export function toggleReactionMetadata(
  msg: Message,
  userId: number,
  emoji: string,
): Message {
  const meta = { ...((msg.metadata ?? {}) as Record<string, unknown>) };
  const reactions = { ...((meta.reactions as ReactionsMap) ?? {}) };
  const current = [...(reactions[emoji] ?? [])];
  const idx = current.indexOf(userId);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(userId);
  }
  if (current.length) {
    reactions[emoji] = current;
  } else {
    delete reactions[emoji];
  }
  return { ...msg, metadata: { ...meta, reactions } };
}

export function markMessageDeletedOptimistic(msg: Message): Message {
  return { ...msg, deleted: true, body: "" };
}

type PollMeta = {
  question: string;
  options: { id: string; label: string }[];
  votes: Record<string, number[]>;
  allowMultiple?: boolean;
  closesAt?: string;
};

export function votePollMetadata(
  msg: Message,
  userId: number,
  optionId: string,
): Message {
  const meta = { ...(msg.metadata as PollMeta) };
  const votes = { ...(meta.votes ?? {}) };
  for (const key of Object.keys(votes)) {
    votes[key] = (votes[key] ?? []).filter((uid) => uid !== userId);
  }
  if (!meta.allowMultiple) {
    votes[optionId] = [userId];
  } else {
    votes[optionId] = [...(votes[optionId] ?? []), userId];
  }
  return { ...msg, metadata: { ...meta, votes } };
}

type EventMeta = {
  title: string;
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  rsvps: { going: number[]; maybe: number[]; no: number[] };
};

export function rsvpEventMetadata(
  msg: Message,
  userId: number,
  status: "going" | "maybe" | "no",
): Message {
  const meta = { ...(msg.metadata as EventMeta) };
  const rsvps = {
    going: (meta.rsvps?.going ?? []).filter((uid) => uid !== userId),
    maybe: (meta.rsvps?.maybe ?? []).filter((uid) => uid !== userId),
    no: (meta.rsvps?.no ?? []).filter((uid) => uid !== userId),
  };
  rsvps[status].push(userId);
  return { ...msg, metadata: { ...meta, rsvps } };
}
