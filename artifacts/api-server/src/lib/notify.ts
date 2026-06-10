import { store } from "@workspace/db";
import { createNotificationWithPush } from "./push-notify";

export async function notifyTaskAssignees(
  assigneeIds: number[],
  taskTitle: string,
  actorId: number,
): Promise<void> {
  const unique = [...new Set(assigneeIds)].filter((id) => id !== actorId);
  await Promise.all(
    unique.map((userId) =>
      createNotificationWithPush({
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

export async function notifyServiceTicketAssignee(
  assigneeId: number,
  ticketTitle: string,
  ticketId: number,
  actorId: number,
): Promise<void> {
  if (assigneeId === actorId) return;
  await createNotificationWithPush({
    userId: assigneeId,
    title: "Service ticket assigned",
    body: `You were assigned: "${ticketTitle}"`,
    link: `/service/${ticketId}`,
  });
}

export async function notifySalaryPosted(
  userId: number,
  month: number,
  year: number,
  totalPay: number,
  actorId: number,
): Promise<void> {
  if (userId === actorId) return;
  await createNotificationWithPush({
    userId,
    title: "Salary posted",
    body: `Your ${month}/${year} salary is ready (₹${totalPay.toLocaleString("en-IN")})`,
    link: "/finance",
  });
}

export async function notifyTeamProjectAssignment(
  teamId: number,
  projectName: string,
  actorId: number,
): Promise<void> {
  const users = await store.listUsers({ teamId, status: "active" });
  await Promise.all(
    users
      .filter((u) => u.id !== actorId)
      .map((u) =>
        createNotificationWithPush({
          userId: u.id,
          title: "Project assigned to your team",
          body: `"${projectName}" was assigned to your team`,
          link: "/projects",
        }),
      ),
  );
}
