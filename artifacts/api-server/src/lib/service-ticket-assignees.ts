import { store } from "@workspace/db";
import type { AccessContext } from "@workspace/db";
import { canAccessOrgData, hasPermission } from "@workspace/rbac";

export type ServiceTicketAssigneeOption = {
  id: number;
  fullName: string;
  teamId: number | null;
  teamName: string | null;
};

export async function listServiceTicketAssignees(
  ctx: AccessContext,
): Promise<ServiceTicketAssigneeOption[]> {
  const self = await store.findUserById(ctx.userId);
  if (!self) return [];

  const canAssignOthers = hasPermission(ctx, "service_tickets:assign");

  if (!canAssignOthers) {
    const team = self.teamId ? await store.findTeamById(self.teamId) : null;
    return [
      {
        id: self.id,
        fullName: self.fullName,
        teamId: self.teamId,
        teamName: team?.name ?? null,
      },
    ];
  }

  const users = await store.listUsers({ status: "active" });
  let candidates = users.filter((u) => u.status !== "inactive");

  if (!canAccessOrgData(ctx) && ctx.role !== "client_manager") {
    if (ctx.role === "team_lead" && ctx.teamId != null) {
      candidates = candidates.filter((u) => u.teamId === ctx.teamId);
    }
  }

  const teamIds = [...new Set(candidates.map((u) => u.teamId).filter((id): id is number => id != null))];
  const teamNames = new Map<number, string>();
  await Promise.all(
    teamIds.map(async (tid) => {
      const team = await store.findTeamById(tid);
      if (team) teamNames.set(tid, team.name);
    }),
  );

  return candidates
    .map((u) => ({
      id: u.id,
      fullName: u.fullName,
      teamId: u.teamId,
      teamName: u.teamId != null ? (teamNames.get(u.teamId) ?? null) : null,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function assertServiceTicketAssignee(
  ctx: AccessContext,
  assigneeId: number | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (assigneeId == null) return { ok: true };

  if (!hasPermission(ctx, "service_tickets:assign") && assigneeId !== ctx.userId) {
    return { ok: false, error: "Cannot assign ticket to another user" };
  }

  const allowed = await listServiceTicketAssignees(ctx);
  if (!allowed.some((a) => a.id === assigneeId)) {
    return { ok: false, error: "Assignee is not available for this ticket" };
  }

  return { ok: true };
}
