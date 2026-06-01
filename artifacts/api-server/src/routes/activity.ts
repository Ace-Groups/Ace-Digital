import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/v1/activity", requireAuth, async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const logs = await store.listActivityLogs(limit);
  res.json(
    logs.map((l) => ({
      id: l.id,
      actorId: l.actorId,
      actorName: l.actorName,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    })),
  );
});

router.get("/v1/notifications", requireAuth, async (req, res): Promise<void> => {
  const notifications = await store.listNotificationsByUser(req.user!.userId, 50);
  res.json(
    notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      body: n.body,
      read: n.read === "true",
      link: n.link,
      createdAt: n.createdAt.toISOString(),
    })),
  );
});

router.patch("/v1/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const notification = await store.markNotificationRead(id);
  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json({
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    body: notification.body,
    read: true,
    link: notification.link,
    createdAt: notification.createdAt.toISOString(),
  });
});

export default router;
