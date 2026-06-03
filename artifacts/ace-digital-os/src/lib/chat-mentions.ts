/** Parse @mentions from message body (supports @Full Name tokens from autocomplete). */

const MENTION_TOKEN = /@\[(\d+)\]/g;
const MENTION_PLAIN = /@([A-Za-z][A-Za-z0-9_.\- ]{0,48})/g;

export function insertMentionToken(body: string, cursor: number, userId: number, label: string): string {
  const before = body.slice(0, cursor).replace(/@([A-Za-z0-9_.\- ]*)$/, "");
  const after = body.slice(cursor);
  const token = `@[${userId}] `;
  return `${before}${token}${after}`;
}

export function displayMessageBody(body: string, nameById?: Map<number, string>): string {
  return body.replace(MENTION_TOKEN, (_, id) => {
    const uid = Number(id);
    const name = nameById?.get(uid);
    return name ? `@${name}` : `@user`;
  });
}

export function extractMentionedUserIds(body: string, members: { userId: number; fullName: string }[]): number[] {
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

export function mentionQueryAtCursor(body: string, cursor: number): string | null {
  const head = body.slice(0, cursor);
  const match = head.match(/@([A-Za-z0-9_.\- ]*)$/);
  return match ? match[1] ?? "" : null;
}
