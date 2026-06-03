const MENTION_TOKEN = /@\[(\d+)\]/g;

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
