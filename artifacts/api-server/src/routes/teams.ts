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
  requirePermission("teams:write"),
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
    const projectCount = 0;
    res.status(201).json({
      id: team.id,
      name: team.name,
      color: team.color,
      memberCount,
      projectCount,
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
      projectCount: await store.countActiveProjectsByTeam(t.id),
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

router.patch(
  "/v1/teams/:id",
  requireAuth,
  requirePermission("teams:write"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const patch: any = {};
    if (typeof req.body?.name === "string" && req.body.name.trim()) patch.name = req.body.name.trim();
    if (req.body?.color !== undefined) patch.color = req.body.color;
    const team = await store.updateTeam(id, patch);
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    const memberCount = await store.countUsersByTeam(id);
    const projectCount = await store.countActiveProjectsByTeam(id);
    res.json({
      id: team.id,
      name: team.name,
      color: team.color,
      memberCount,
      projectCount,
    });
  },
);

router.delete(
  "/v1/teams/:id",
  requireAuth,
  requirePermission("teams:delete"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    await store.deleteTeam(id);
    res.status(204).end();
  },
);

router.post(
  "/v1/teams/:id/assign-project",
  requireAuth,
  requirePermission("teams:write"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const projectId = Number(req.body?.projectId);
    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }
    const p = await store.updateProject(projectId, { teamId: id });
    if (!p) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json({ success: true });
  },
);

router.delete(
  "/v1/teams/:id/unassign-project/:projectId",
  requireAuth,
  requirePermission("teams:write"),
  async (req, res): Promise<void> => {
    const projectId = Number(req.params.projectId);
    const p = await store.updateProject(projectId, { teamId: null });
    if (!p) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(204).end();
  },
);

router.patch(
  "/v1/teams/:id/members/bulk",
  requireAuth,
  requirePermission("teams:write"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const userIds = req.body?.userIds;
    if (!Array.isArray(userIds)) {
      res.status(400).json({ error: "userIds array is required" });
      return;
    }
    await store.bulkUpdateUserTeams(userIds.map(Number), id);
    res.json({ success: true });
  },
);

export default router;
