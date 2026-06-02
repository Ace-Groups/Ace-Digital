import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import { employeeWithProfile } from "../lib/employee-serializer";

const router = Router();

router.post(
  "/v1/teams",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const color = req.body?.color;
    if (!name) {
      res.status(400).json({ error: "Team name is required" });
      return;
    }
    const team = await store.createTeam({
      name,
      color: typeof color === "string" ? color : null,
    });
    const memberCount = await store.countUsersByTeam(team.id);
    res.status(201).json({
      id: team.id,
      name: team.name,
      color: team.color,
      memberCount,
    });
  },
);

router.get("/v1/teams", requireAuth, async (_req, res): Promise<void> => {
  const teams = await store.listTeams();
  const result = await Promise.all(
    teams.map(async (t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      memberCount: await store.countUsersByTeam(t.id),
    })),
  );
  res.json(result);
});

router.get("/v1/teams/:id/members", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const members = await store.listUsers({ teamId: id });
  res.json(await Promise.all(members.map((m) => employeeWithProfile(m, ctx))));
});

export default router;
