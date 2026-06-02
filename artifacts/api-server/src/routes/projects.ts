import { Router } from "express";
import { store } from "@workspace/db";
import type { Project } from "@workspace/db";
import { canWriteProject } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

async function projectWithRelations(p: Project) {
  const team = p.teamId ? await store.findTeamById(p.teamId) : null;
  const client = p.clientId ? await store.findClientById(p.clientId) : null;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    teamId: p.teamId,
    teamName: team?.name ?? null,
    priority: p.priority,
    status: p.status,
    progress: p.progress,
    deadline: p.deadline?.toISOString() ?? null,
    budget: p.budget ? Number(p.budget) : null,
    clientId: p.clientId,
    clientName: client?.companyName ?? null,
    createdById: p.createdById,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get(
  "/v1/projects",
  requireAuth,
  requirePermission("projects:read"),
  async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const { status, teamId } = req.query;
  const projects = await store.listProjectsForAccess(ctx, {
    status: status as string | undefined,
    teamId: teamId ? Number(teamId) : undefined,
  });
  res.json(await Promise.all(projects.map(projectWithRelations)));
  },
);

router.post(
  "/v1/projects",
  requireAuth,
  requirePermission("projects:write"),
  async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const { name, description, teamId, priority, status, deadline, budget, clientId } = req.body;
  const effectiveTeamId = teamId ?? ctx.teamId;
  if (!canWriteProject(ctx, effectiveTeamId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const project = await store.createProject({
    name,
    description: description ?? null,
    teamId: teamId ?? null,
    priority: priority ?? "MEDIUM",
    status: status ?? "TODO",
    progress: 0,
    deadline: deadline ? new Date(deadline) : null,
    budget: budget ? String(budget) : null,
    clientId: clientId ?? null,
    createdById: req.user!.userId,
  });

  if (budget && Number(budget) > 500000) {
    await store.createApproval({
      type: "PROJECT_BUDGET",
      title: `Budget Approval for "${name}"`,
      description: `Project budget exceeds ₹5,00,000. Requires management approval.`,
      amount: String(budget),
      requestedById: req.user!.userId,
      teamId: teamId ?? null,
      status: "PENDING",
      reviewedById: null,
      reviewedAt: null,
      note: null,
    });
  }

  await store.insertActivityLog({
    actorId: req.user!.userId,
    action: "created project",
    entityType: "project",
    entityId: project.id,
    metadata: { name },
  });

  res.status(201).json(await projectWithRelations(project));
  },
);

router.get(
  "/v1/projects/:id",
  requireAuth,
  requirePermission("projects:read"),
  async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const project = await store.findProjectById(id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const allowed = await store.listProjectsForAccess(ctx, {});
  if (!allowed.some((p) => p.id === id)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(await projectWithRelations(project));
  },
);

router.patch(
  "/v1/projects/:id",
  requireAuth,
  requirePermission("projects:write"),
  async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const existing = await store.findProjectById(id);
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!canWriteProject(ctx, existing.teamId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name, description, teamId, priority, status, progress, deadline, budget, clientId } = req.body;
  const project = await store.updateProject(id, {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(teamId !== undefined && { teamId }),
    ...(priority !== undefined && { priority }),
    ...(status !== undefined && { status }),
    ...(progress !== undefined && { progress }),
    ...(deadline !== undefined && { deadline: new Date(deadline) }),
    ...(budget !== undefined && { budget: String(budget) }),
    ...(clientId !== undefined && { clientId }),
  });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await projectWithRelations(project));
  },
);

router.delete(
  "/v1/projects/:id",
  requireAuth,
  requirePermission("projects:delete"),
  async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await store.deleteProject(id);
  res.sendStatus(204);
  },
);

router.patch(
  "/v1/projects/:id/status",
  requireAuth,
  requirePermission("projects:write"),
  async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const existing = await store.findProjectById(id);
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!canWriteProject(ctx, existing.teamId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: "Status is required" });
    return;
  }
  const project = await store.updateProject(id, { status });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await store.insertActivityLog({
    actorId: req.user!.userId,
    action: `moved project to ${status}`,
    entityType: "project",
    entityId: id,
    metadata: { status },
  });
  res.json(await projectWithRelations(project));
  },
);

export default router;
