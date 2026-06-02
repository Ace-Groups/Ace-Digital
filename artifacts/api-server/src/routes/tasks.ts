import { Router } from "express";
import { store } from "@workspace/db";
import type { Task } from "@workspace/db";
import {
  canDeleteTask,
  canEditTask,
  canToggleTaskCompletion,
} from "@workspace/rbac";
import { canSeeTask, normalizeAssigneeIds } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

async function taskWithRelations(t: Task) {
  const ids = normalizeAssigneeIds(t.assigneeIds, t.assigneeId);
  const completions = t.assigneeCompletions ?? {};
  const assignees = await Promise.all(
    ids.map(async (userId) => {
      const u = await store.findUserById(userId);
      return {
        userId,
        fullName: u?.fullName ?? "Unknown",
        completed: completions[String(userId)] === true,
      };
    }),
  );
  const creator = t.createdById ? await store.findUserById(t.createdById) : null;
  const team = t.teamId ? await store.findTeamById(t.teamId) : null;
  const project = t.projectId ? await store.findProjectById(t.projectId) : null;
  const legacyAssignee = t.assigneeId ? await store.findUserById(t.assigneeId) : null;
  return {
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    projectName: project?.name ?? null,
    assigneeId: t.assigneeId,
    assigneeName: legacyAssignee?.fullName ?? assignees[0]?.fullName ?? null,
    assigneeIds: ids,
    assignees,
    teamId: t.teamId,
    teamName: team?.name ?? null,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    status: t.status,
    progress: t.progress ?? 0,
    createdById: t.createdById,
    createdByName: creator?.fullName ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

async function assertTaskAccess(ctx: ReturnType<typeof getAccessContext>, taskId: number) {
  const task = await store.findTaskById(taskId);
  if (!task) return { task: null as Task | null, allowed: false };
  return { task, allowed: canSeeTask(ctx, task) };
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
    const { title, projectId, assigneeId, assigneeIds, teamId, priority, dueDate, status } =
      req.body;
    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }
    const ids = normalizeAssigneeIds(
      Array.isArray(assigneeIds) ? assigneeIds : undefined,
      assigneeId ?? null,
    );
    const effectiveTeamId = teamId ?? ctx.teamId;
    const task = await store.createTask({
      title,
      projectId: projectId ?? null,
      assigneeId: ids[0] ?? null,
      assigneeIds: ids,
      assigneeCompletions: {},
      progress: 0,
      teamId: effectiveTeamId ?? null,
      priority: priority ?? "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status ?? "PENDING",
      createdById: ctx.userId,
    });
    const withAssignees = ids.length
      ? await store.replaceTaskAssignees(task.id, ids)
      : task;
    res.status(201).json(await taskWithRelations(withAssignees ?? task));
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
    if (!canEditTask(ctx, existing)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { title, projectId, assigneeId, assigneeIds, teamId, priority, dueDate, status } =
      req.body;
    let task = await store.updateTask(id, {
      ...(title !== undefined && { title }),
      ...(projectId !== undefined && { projectId }),
      ...(teamId !== undefined && { teamId }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
      ...(status !== undefined && { status }),
    });
    if (assigneeIds !== undefined || assigneeId !== undefined) {
      const ids = normalizeAssigneeIds(
        Array.isArray(assigneeIds) ? assigneeIds : undefined,
        assigneeId ?? null,
      );
      task = await store.replaceTaskAssignees(id, ids, true);
    }
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
    if (!canSeeTask(ctx, task)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!canToggleTaskCompletion(ctx, task)) {
      res.status(403).json({ error: "Only assignees can update their completion" });
      return;
    }
    const updated = await store.toggleTaskAssigneeCompletion(id, ctx.userId);
    if (!updated) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.projectId) {
      const allTasks = await store.listTasksByProjectId(task.projectId);
      const avgProgress =
        allTasks.length > 0
          ? Math.round(
              allTasks.reduce((sum, t) => sum + (t.id === id ? updated.progress : t.progress), 0) /
                allTasks.length,
            )
          : 0;
      await store.updateProject(task.projectId, { progress: avgProgress });
    }

    res.json(await taskWithRelations(updated));
  },
);

export default router;
