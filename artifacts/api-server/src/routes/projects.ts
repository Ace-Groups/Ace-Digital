import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, teamsTable, clientsTable, approvalsTable, activityLogsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function projectWithRelations(p: typeof projectsTable.$inferSelect) {
  const team = p.teamId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, p.teamId)))[0]
    : null;
  const client = p.clientId
    ? (await db.select().from(clientsTable).where(eq(clientsTable.id, p.clientId)))[0]
    : null;
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

router.get("/v1/projects", requireAuth, async (req, res): Promise<void> => {
  const { status, teamId } = req.query;
  let query = db.select().from(projectsTable);
  const conditions = [];
  if (status) conditions.push(eq(projectsTable.status, status as string));
  if (teamId) conditions.push(eq(projectsTable.teamId, Number(teamId)));
  const projects = conditions.length
    ? await db.select().from(projectsTable).where(and(...conditions)).orderBy(sql`${projectsTable.createdAt} DESC`)
    : await db.select().from(projectsTable).orderBy(sql`${projectsTable.createdAt} DESC`);
  const result = await Promise.all(projects.map(projectWithRelations));
  res.json(result);
});

router.post("/v1/projects", requireAuth, async (req, res): Promise<void> => {
  const { name, description, teamId, priority, status, deadline, budget, clientId } = req.body;
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [project] = await db.insert(projectsTable).values({
    name,
    description: description ?? null,
    teamId: teamId ?? null,
    priority: priority ?? "MEDIUM",
    status: status ?? "TODO",
    deadline: deadline ? new Date(deadline) : null,
    budget: budget ? String(budget) : null,
    clientId: clientId ?? null,
    createdById: req.user!.userId,
  }).returning();

  if (budget && Number(budget) > 500000) {
    await db.insert(approvalsTable).values({
      type: "PROJECT_BUDGET",
      title: `Budget Approval for "${name}"`,
      description: `Project budget exceeds ₹5,00,000. Requires management approval.`,
      amount: String(budget),
      requestedById: req.user!.userId,
      teamId: teamId ?? null,
      status: "PENDING",
    });
  }

  await db.insert(activityLogsTable).values({
    actorId: req.user!.userId,
    action: "created project",
    entityType: "project",
    entityId: project.id,
    metadata: { name },
  });

  res.status(201).json(await projectWithRelations(project));
});

router.get("/v1/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await projectWithRelations(project));
});

router.patch("/v1/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { name, description, teamId, priority, status, progress, deadline, budget, clientId } = req.body;
  const [project] = await db.update(projectsTable).set({
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(teamId !== undefined && { teamId }),
    ...(priority !== undefined && { priority }),
    ...(status !== undefined && { status }),
    ...(progress !== undefined && { progress }),
    ...(deadline !== undefined && { deadline: new Date(deadline) }),
    ...(budget !== undefined && { budget: String(budget) }),
    ...(clientId !== undefined && { clientId }),
  }).where(eq(projectsTable.id, id)).returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await projectWithRelations(project));
});

router.delete("/v1/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.sendStatus(204);
});

router.patch("/v1/projects/:id/status", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: "Status is required" });
    return;
  }
  const [project] = await db.update(projectsTable).set({ status }).where(eq(projectsTable.id, id)).returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.insert(activityLogsTable).values({
    actorId: req.user!.userId,
    action: `moved project to ${status}`,
    entityType: "project",
    entityId: id,
    metadata: { status },
  });
  res.json(await projectWithRelations(project));
});

export default router;
