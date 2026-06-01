import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, usersTable, teamsTable, projectsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function taskWithRelations(t: typeof tasksTable.$inferSelect) {
  const assignee = t.assigneeId
    ? (await db.select().from(usersTable).where(eq(usersTable.id, t.assigneeId)))[0]
    : null;
  const team = t.teamId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, t.teamId)))[0]
    : null;
  const project = t.projectId
    ? (await db.select().from(projectsTable).where(eq(projectsTable.id, t.projectId)))[0]
    : null;
  return {
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    projectName: project?.name ?? null,
    assigneeId: t.assigneeId,
    assigneeName: assignee?.fullName ?? null,
    teamId: t.teamId,
    teamName: team?.name ?? null,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/v1/tasks", requireAuth, async (req, res): Promise<void> => {
  const { projectId, teamId, assigneeId, status } = req.query;
  const conditions = [];
  if (projectId) conditions.push(eq(tasksTable.projectId, Number(projectId)));
  if (teamId) conditions.push(eq(tasksTable.teamId, Number(teamId)));
  if (assigneeId) conditions.push(eq(tasksTable.assigneeId, Number(assigneeId)));
  if (status) conditions.push(eq(tasksTable.status, status as string));
  const tasks = conditions.length
    ? await db.select().from(tasksTable).where(and(...conditions)).orderBy(sql`${tasksTable.createdAt} DESC`)
    : await db.select().from(tasksTable).orderBy(sql`${tasksTable.createdAt} DESC`);
  const result = await Promise.all(tasks.map(taskWithRelations));
  res.json(result);
});

router.post("/v1/tasks", requireAuth, async (req, res): Promise<void> => {
  const { title, projectId, assigneeId, teamId, priority, dueDate, status } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const [task] = await db.insert(tasksTable).values({
    title,
    projectId: projectId ?? null,
    assigneeId: assigneeId ?? null,
    teamId: teamId ?? null,
    priority: priority ?? "MEDIUM",
    dueDate: dueDate ? new Date(dueDate) : null,
    status: status ?? "PENDING",
    createdById: req.user!.userId,
  }).returning();
  res.status(201).json(await taskWithRelations(task));
});

router.get("/v1/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(await taskWithRelations(task));
});

router.patch("/v1/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { title, projectId, assigneeId, teamId, priority, dueDate, status } = req.body;
  const [task] = await db.update(tasksTable).set({
    ...(title !== undefined && { title }),
    ...(projectId !== undefined && { projectId }),
    ...(assigneeId !== undefined && { assigneeId }),
    ...(teamId !== undefined && { teamId }),
    ...(priority !== undefined && { priority }),
    ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
    ...(status !== undefined && { status }),
  }).where(eq(tasksTable.id, id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(await taskWithRelations(task));
});

router.delete("/v1/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.sendStatus(204);
});

router.patch("/v1/tasks/:id/toggle", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const newStatus = task.status === "DONE" ? "PENDING" : "DONE";
  const [updated] = await db.update(tasksTable).set({ status: newStatus }).where(eq(tasksTable.id, id)).returning();

  if (task.projectId) {
    const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, task.projectId));
    const doneCount = allTasks.filter((t) => (t.id === id ? newStatus === "DONE" : t.status === "DONE")).length;
    const total = allTasks.length;
    const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    await db.update(projectsTable).set({ progress }).where(eq(projectsTable.id, task.projectId));
  }

  res.json(await taskWithRelations(updated));
});

export default router;
