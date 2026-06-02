import type { Request } from "express";
import type { AccessContext } from "@workspace/db";
import { store } from "@workspace/db";

export function getAccessContext(req: Request): AccessContext {
  const u = req.user!;
  return {
    userId: u.userId,
    role: u.role,
    teamId: u.teamId ?? null,
  };
}

/** Refresh teamId from DB when JWT may be stale */
export async function getAccessContextFresh(req: Request): Promise<AccessContext> {
  const user = await store.findUserById(req.user!.userId);
  if (!user) {
    return getAccessContext(req);
  }
  return {
    userId: user.id,
    role: user.role,
    teamId: user.teamId,
  };
}
