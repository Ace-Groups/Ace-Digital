import { store } from "@workspace/db";
import type { Task } from "@workspace/db";

export type ServiceTicketLinkType = "CLIENT" | "TODO";

export type ResolvedServiceTicketLinks = {
  linkType: ServiceTicketLinkType;
  clientId: number | null;
  projectId: number | null;
  taskId: number | null;
  teamId: number | null;
  assigneeId: number | null;
};

export async function resolveLinksFromTask(task: Task): Promise<{
  clientId: number | null;
  projectId: number | null;
  teamId: number | null;
  assigneeId: number | null;
}> {
  let clientId: number | null = null;
  const projectId = task.projectId ?? null;
  if (projectId != null) {
    const project = await store.findProjectById(projectId);
    clientId = project?.clientId ?? null;
  }
  return {
    clientId,
    projectId,
    teamId: task.teamId ?? null,
    assigneeId: task.assigneeId ?? null,
  };
}

export async function resolveServiceTicketCreateLinks(input: {
  linkType: ServiceTicketLinkType;
  clientId?: number | null;
  projectId?: number | null;
  taskId?: number | null;
  defaultTeamId: number | null;
  defaultAssigneeId: number;
}): Promise<{ ok: true; links: ResolvedServiceTicketLinks } | { ok: false; error: string }> {
  const linkType = input.linkType;

  if (linkType === "TODO") {
    if (input.taskId == null) {
      return { ok: false, error: "Select a to-do task" };
    }
    const task = await store.findTaskById(input.taskId);
    if (!task) return { ok: false, error: "Task not found" };
    const fromTask = await resolveLinksFromTask(task);
    return {
      ok: true,
      links: {
        linkType: "TODO",
        clientId: fromTask.clientId,
        projectId: fromTask.projectId,
        taskId: task.id,
        teamId: fromTask.teamId ?? input.defaultTeamId,
        assigneeId: fromTask.assigneeId ?? input.defaultAssigneeId,
      },
    };
  }

  if (input.clientId == null) {
    return { ok: false, error: "Client is required" };
  }
  const client = await store.findClientById(input.clientId);
  if (!client) return { ok: false, error: "Client not found" };

  let projectId = input.projectId ?? null;
  if (projectId != null) {
    const project = await store.findProjectById(projectId);
    if (!project) return { ok: false, error: "Project not found" };
    if (project.clientId != null && project.clientId !== input.clientId) {
      return { ok: false, error: "Project does not belong to this client" };
    }
  }

  let taskId = input.taskId ?? null;
  if (taskId != null) {
    const task = await store.findTaskById(taskId);
    if (!task) return { ok: false, error: "Task not found" };
    if (projectId != null && task.projectId != null && task.projectId !== projectId) {
      return { ok: false, error: "Task does not belong to this project" };
    }
    if (projectId == null && task.projectId != null) {
      projectId = task.projectId;
    }
  }

  return {
    ok: true,
    links: {
      linkType: "CLIENT",
      clientId: input.clientId,
      projectId,
      taskId,
      teamId: input.defaultTeamId,
      assigneeId: input.defaultAssigneeId,
    },
  };
}
