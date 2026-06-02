import { Router } from "express";
import { store } from "@workspace/db";
import type { Task } from "@workspace/db";
import { canDeleteTask, canMutateTask } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

async function taskWithRelations(t: Task) {
  const assignee = t.assigneeId ? await store.findUserById(t.assigneeId) : null;
  const team = t.teamId ? await store.findTeamById(t.teamId) : null;
  const project = t.projectId ? await store.findProjectById(t.projectId) : null;
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

async function assertTaskAccess(ctx: ReturnType<typeof getAccessContext>, taskId: number) {
  const task = await store.findTaskById(taskId);
  if (!task) return { task: null as Task | null, allowed: false };
  const list = await store.listTasksForAccess(ctx, {});
  const allowed = list.some((t) => t.id === taskId);
  return { task, allowed };
}

router.get(
  "/v1/tasks",
  requireAuth,
  requirePermission("tasks:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { projectId, teamId, assigneeId, status } = req.query;
    const tasks = await store.listTasksForAccess(ctx, {
      projectId: projectId ? Number(projectId) : undefined,
      teamId: teamId ? Number(teamId) : undefined,
      assigneeId: assigneeId ? Number(assigneeId) : undefined,
      status: status as string | undefined,
    });
    res.json(await Promise.all(tasks.map(taskWithRelations)));
  },
);

router.post(
  "/v1/tasks",
  requireAuth,
  requirePermission("tasks:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { title, projectId, assigneeId, teamId, priority, dueDate, status } = req.body;
    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }
    const effectiveTeamId = teamId ?? ctx.teamId;
    if (!canMutateTask(ctx, { assigneeId: assigneeId ?? ctx.userId, teamId: effectiveTeamId })) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const task = await store.createTask({
      title,
      projectId: projectId ?? null,
      assigneeId: assigneeId ?? null,
      teamId: effectiveTeamId ?? null,
      priority: priority ?? "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status ?? "PENDING",
      createdById: req.user!.userId,
    });
    res.status(201).json(await taskWithRelations(task));
  },
);

router.get(
  "/v1/tasks/:id",
  requireAuth,
  requirePermission("tasks:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { task, allowed } = await assertTaskAccess(ctx, id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(await taskWithRelations(task));
  },
);

router.patch(
  "/v1/tasks/:id",
  requireAuth,
  requirePermission("tasks:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const existing = await store.findTaskById(id);
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (!canMutateTask(ctx, existing)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { title, projectId, assigneeId, teamId, priority, dueDate, status } = req.body;
    const task = await store.updateTask(id, {
      ...(title !== undefined && { title }),
      ...(projectId !== undefined && { projectId }),
      ...(assigneeId !== undefined && { assigneeId }),
      ...(teamId !== undefined && { teamId }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
      ...(status !== undefined && { status }),
    });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(await taskWithRelations(task));
  },
);

router.delete(
  "/v1/tasks/:id",
  requireAuth,
  requirePermission("tasks:delete"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const existing = await store.findTaskById(id);
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (!canDeleteTask(ctx, existing)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await store.deleteTask(id);
    res.sendStatus(204);
  },
);

router.patch(
  "/v1/tasks/:id/toggle",
  requireAuth,
  requirePermission("tasks:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const task = await store.findTaskById(id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (!canMutateTask(ctx, task)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const newStatus = task.status === "DONE" ? "PENDING" : "DONE";
    const updated = await store.updateTask(id, { status: newStatus });
    if (!updated) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.projectId) {
      const allTasks = await store.listTasksByProjectId(task.projectId);
      const doneCount = allTasks.filter((t) =>
        t.id === id ? newStatus === "DONE" : t.status === "DONE",
      ).length;
      const progress = allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;
      await store.updateProject(task.projectId, { progress });
    }

    res.json(await taskWithRelations(updated));
  },
);

export default router;
