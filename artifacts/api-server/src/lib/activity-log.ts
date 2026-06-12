import { store } from "@workspace/db";

export async function logActivity(
  actorId: number,
  action: string,
  entityType: string,
  entityId?: number | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  await store.insertActivityLog({
    actorId,
    action,
    entityType,
    entityId: entityId ?? null,
    metadata: metadata ?? null,
  });
}
