/** Cheap equality checks to avoid redundant RecordList / React Query updates. */

type MessageRow = {
  id: number;
  body?: string | null;
  deleted?: boolean | null;
  status?: string;
};

export function sameOrderedMessageIds(
  a: { id: number }[],
  b: { id: number }[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.id !== b[i]!.id) return false;
  }
  return true;
}

/** True when lists have the same ids and visible row state (pending status, body, deleted). */
export function sameMessageListSnapshot(a: MessageRow[], b: MessageRow[]): boolean {
  if (!sameOrderedMessageIds(a, b)) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    const leftStatus = "status" in left ? String(left.status ?? "") : "";
    const rightStatus = "status" in right ? String(right.status ?? "") : "";
    if (leftStatus !== rightStatus) return false;
    if ((left.body ?? "") !== (right.body ?? "")) return false;
    if (Boolean(left.deleted) !== Boolean(right.deleted)) return false;
  }
  return true;
}
