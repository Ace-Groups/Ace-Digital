import { Router } from "express";
import { store } from "@workspace/db";
import type { Task } from "@workspace/db";
import { requireAuth } from "../lib/auth";

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

router.get("/v1/tasks", requireAuth, async (req, res): Promise<void> => {
  const { projectId, teamId, assigneeId, status } = req.query;
  const tasks = await store.listTasks({
    projectId: projectId ? Number(projectId) : undefined,
    teamId: teamId ? Number(teamId) : undefined,
    assigneeId: assigneeId ? Number(assigneeId) : undefined,
    status: status as string | undefined,
  });
  res.json(await Promise.all(tasks.map(taskWithRelations)));
});

router.post("/v1/tasks", requireAuth, async (req, res): Promise<void> => {
  const { title, projectId, assigneeId, teamId, priority, dueDate, status } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const task = await store.createTask({
    title,
    projectId: projectId ?? null,
    assigneeId: assigneeId ?? null,
    teamId: teamId ?? null,
    priority: priority ?? "MEDIUM",
    dueDate: dueDate ? new Date(dueDate) : null,
    status: status ?? "PENDING",
    createdById: req.user!.userId,
  });
  res.status(201).json(await taskWithRelations(task));
});

router.get("/v1/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const task = await store.findTaskById(id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(await taskWithRelations(task));
});

router.patch("/v1/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
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
});

router.delete("/v1/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await store.deleteTask(id);
  res.sendStatus(204);
});

router.patch("/v1/tasks/:id/toggle", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const task = await store.findTaskById(id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
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
});

export default router;
