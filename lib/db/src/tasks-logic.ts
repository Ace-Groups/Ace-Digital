export type AssigneeCompletionMap = Record<string, boolean>;

export function computeTaskProgress(
  assigneeIds: number[],
  completions: AssigneeCompletionMap,
): number {
  if (assigneeIds.length === 0) return 0;
  const done = assigneeIds.filter((id) => completions[String(id)] === true).length;
  return Math.round((done / assigneeIds.length) * 100);
}

export function deriveTaskStatus(
  progress: number,
  assigneeIds: number[],
  currentStatus?: string,
): string {
  if (assigneeIds.length === 0) {
    return progress >= 100 || currentStatus === "DONE" ? "DONE" : currentStatus ?? "PENDING";
  }
  if (progress >= 100) return "DONE";
  if (progress > 0) return "IN_PROGRESS";
  return "PENDING";
}

export function normalizeAssigneeIds(
  assigneeIds?: number[] | null,
  assigneeId?: number | null,
): number[] {
  const fromList = (assigneeIds ?? []).filter((id) => Number.isFinite(id));
  if (fromList.length > 0) return [...new Set(fromList)];
  if (assigneeId != null) return [assigneeId];
  return [];
}

export function buildInitialCompletions(
  assigneeIds: number[],
  existing?: AssigneeCompletionMap,
): AssigneeCompletionMap {
  const out: AssigneeCompletionMap = {};
  for (const id of assigneeIds) {
    out[String(id)] = existing?.[String(id)] ?? false;
  }
  return out;
}
