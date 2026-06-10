import { store } from "@workspace/db";
import type { AccessContext } from "@workspace/rbac";
import { canApproveApproval } from "@workspace/rbac";
import { createNotificationWithPush } from "./push-notify";

function accessCtxForUser(user: {
  id: number;
  role: string;
  teamId: number | null;
}): AccessContext {
  return { userId: user.id, role: user.role, teamId: user.teamId };
}

export async function listApprovalReviewerIds(approval: {
  type: string;
  teamId: number | null;
  requestedById: number;
}): Promise<number[]> {
  const users = await store.listUsers({ status: "active" });
  return users
    .filter((u) => u.id !== approval.requestedById)
    .filter((u) =>
      canApproveApproval(accessCtxForUser(u), {
        type: approval.type,
        requestedById: approval.requestedById,
        teamId: approval.teamId,
        status: "PENDING",
      }),
    )
    .map((u) => u.id);
}

export async function notifyApprovalReviewers(
  approval: {
    type: string;
    title: string;
    teamId: number | null;
    requestedById: number;
  },
  requesterName: string,
): Promise<void> {
  const reviewerIds = await listApprovalReviewerIds(approval);
  await Promise.all(
    reviewerIds.map((userId) =>
      createNotificationWithPush({
        userId,
        title: "Approval requested",
        body: `${requesterName} submitted: ${approval.title}`,
        link: "/approvals",
      }),
    ),
  );
}

export async function notifyApprovalRequester(
  approval: { title: string; requestedById: number },
  status: "APPROVED" | "REJECTED",
  reviewerName: string,
): Promise<void> {
  await createNotificationWithPush({
    userId: approval.requestedById,
    title: status === "APPROVED" ? "Approval granted" : "Approval rejected",
    body: `${reviewerName} ${status === "APPROVED" ? "approved" : "rejected"} "${approval.title}"`,
    link: "/approvals",
  });
}
