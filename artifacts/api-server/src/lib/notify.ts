import { store } from "@workspace/db";

export async function notifyTaskAssignees(
  assigneeIds: number[],
  taskTitle: string,
  actorId: number,
): Promise<void> {
  const unique = [...new Set(assigneeIds)].filter((id) => id !== actorId);
  await Promise.all(
    unique.map((userId) =>
      store.createNotification({
        userId,
        title: "Task assigned",
        body: `You were assigned to "${taskTitle}"`,
        link: "/tasks",
      }),
    ),
  );
}

export function assigneeIdsFromTask(task: {
  assigneeIds?: number[] | null;
  assigneeId?: number | null;
}): number[] {
  if (task.assigneeIds?.length) return [...task.assigneeIds];
  if (task.assigneeId != null) return [task.assigneeId];
  return [];
}
