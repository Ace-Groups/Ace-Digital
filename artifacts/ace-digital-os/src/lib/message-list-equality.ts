/** Cheap equality checks to avoid redundant RecordList / React Query updates. */

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
