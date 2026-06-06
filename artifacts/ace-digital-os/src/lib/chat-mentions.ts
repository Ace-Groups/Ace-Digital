/** Parse @mentions and #channel links from message body (supports autocomplete tokens). */

const MENTION_TOKEN = /@\[(\d+)\]/g;
const CHANNEL_TOKEN = /#\[(\d+)\]/g;

export type ComposerTrigger =
  | { kind: "user"; query: string }
  | { kind: "channel"; query: string };

export type MessageBodyNameMaps = {
  userNames?: Map<number, string>;
  channelNames?: Map<number, string>;
};

export function channelDisplayLabel(channel: {
  type: string;
  name: string;
  dmPeerName?: string | null;
}): string {
  if (channel.type === "DM" && channel.dmPeerName) return channel.dmPeerName;
  return channel.name;
}

export function insertMentionToken(
  body: string,
  cursor: number,
  _userId: number,
  label: string,
): string {
  const before = body.slice(0, cursor).replace(/@([A-Za-z0-9_.\- ]*)$/, "");
  const after = body.slice(cursor);
  const token = `@${label} `;
  return `${before}${token}${after}`;
}

export function insertChannelToken(
  body: string,
  cursor: number,
  _channelId: number,
  label: string,
): string {
  const before = body.slice(0, cursor).replace(/#([A-Za-z0-9_.\- ]*)$/, "");
  const after = body.slice(cursor);
  const token = `#${label} `;
  return `${before}${token}${after}`;
}

export function encodeMentions(
  body: string,
  members?: { userId: number; fullName: string }[] | null,
  channels?: { id: number; name: string }[] | null,
): string {
  let result = body;
  if (members) {
    const sortedMembers = [...members].sort((a, b) => b.fullName.length - a.fullName.length);
    for (const m of sortedMembers) {
      const escapedName = m.fullName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`@${escapedName}\\b`, "g");
      result = result.replace(regex, `@[${m.userId}]`);
    }
  }
  if (channels) {
    const sortedChannels = [...channels].sort((a, b) => b.name.length - a.name.length);
    for (const c of sortedChannels) {
      const escapedName = c.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`#${escapedName}\\b`, "g");
      result = result.replace(regex, `#[${c.id}]`);
    }
  }
  return result;
}

export function triggerQueryAtCursor(body: string, cursor: number): ComposerTrigger | null {
  const head = body.slice(0, cursor);
  const userMatch = head.match(/@([A-Za-z0-9_.\- ]*)$/);
  if (userMatch) return { kind: "user", query: userMatch[1] ?? "" };
  const channelMatch = head.match(/#([A-Za-z0-9_.\- ]*)$/);
  if (channelMatch) return { kind: "channel", query: channelMatch[1] ?? "" };
  return null;
}

export function mentionQueryAtCursor(body: string, cursor: number): string | null {
  const trigger = triggerQueryAtCursor(body, cursor);
  return trigger?.kind === "user" ? trigger.query : null;
}

export function displayMessageBody(
  body: string,
  maps?: MessageBodyNameMaps | Map<number, string>,
): string {
  const userNames = maps instanceof Map ? maps : maps?.userNames;
  const channelNames = maps instanceof Map ? undefined : maps?.channelNames;

  let text = body.replace(MENTION_TOKEN, (_, id) => {
    const uid = Number(id);
    const name = userNames?.get(uid);
    return name ? `@${name}` : `@user`;
  });
  text = text.replace(CHANNEL_TOKEN, (_, id) => {
    const cid = Number(id);
    const name = channelNames?.get(cid);
    return name ? `#${name}` : `#channel`;
  });
  return text;
}

export function extractMentionedUserIds(
  body: string,
  members: { userId: number; fullName: string }[],
): number[] {
  const ids = new Set<number>();
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const uid = Number(match[1]);
    if (uid > 0) ids.add(uid);
  }
  const lowerBody = body.toLowerCase();
  for (const m of members) {
    const needle = `@${m.fullName.toLowerCase()}`;
    if (lowerBody.includes(needle)) ids.add(m.userId);
  }
  return [...ids];
}

export function extractMentionedChannelIds(body: string): number[] {
  const ids = new Set<number>();
  for (const match of body.matchAll(CHANNEL_TOKEN)) {
    const cid = Number(match[1]);
    if (cid > 0) ids.add(cid);
  }
  return [...ids];
}

export function matchScore(text: string, query: string): number {
  if (!query.trim()) return 1;
  const t = text.toLowerCase();
  const q = query.trim().toLowerCase();
  if (t.startsWith(q)) return 3;
  if (t.split(/\s+/).some((word) => word.startsWith(q))) return 2;
  if (t.includes(q)) return 1;
  return 0;
}
