import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import {
  deleteUserPushToken,
  isPushInfrastructureAvailable,
  upsertUserPushToken,
  type PushTokenPlatform,
} from "../lib/push-tokens";

const pushTokensRouter = Router();

const PLATFORMS = new Set<PushTokenPlatform>(["web", "expo", "ios", "android"]);

pushTokensRouter.post("/v1/push-tokens", requireAuth, async (req, res, next) => {
  try {
    if (!isPushInfrastructureAvailable()) {
      res.status(503).json({ error: "Push notifications are not configured" });
      return;
    }

    const ctx = getAccessContext(req);
    const platform = req.body?.platform as PushTokenPlatform;
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const deviceLabel =
      typeof req.body?.deviceLabel === "string" ? req.body.deviceLabel.trim() : null;

    if (!PLATFORMS.has(platform) || !token) {
      res.status(400).json({ error: "Invalid platform or token" });
      return;
    }

    await upsertUserPushToken({
      userId: ctx.userId,
      platform,
      token,
      deviceLabel,
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

pushTokensRouter.delete("/v1/push-tokens", requireAuth, async (req, res, next) => {
  try {
    if (!isPushInfrastructureAvailable()) {
      res.status(503).json({ error: "Push notifications are not configured" });
      return;
    }

    const ctx = getAccessContext(req);
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    await deleteUserPushToken(ctx.userId, token);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default pushTokensRouter;
