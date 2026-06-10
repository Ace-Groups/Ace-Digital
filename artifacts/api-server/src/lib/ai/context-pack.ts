import type { PageContext } from "./types";

/** Build a human-readable context label for the assistant UI. */
export function formatPageContextLabel(ctx: PageContext | null | undefined): string | null {
  if (!ctx?.route) return null;
  const parts: string[] = [];
  if (ctx.projectId != null) parts.push(`Project #${ctx.projectId}`);
  if (ctx.clientId != null) parts.push(`Client #${ctx.clientId}`);
  if (ctx.noteId != null) parts.push(`Note #${ctx.noteId}`);
  if (ctx.channelId != null) parts.push(`Channel #${ctx.channelId}`);
  if (parts.length === 0 && ctx.route) {
    const segment = ctx.route.split("/").filter(Boolean)[0];
    if (segment) parts.push(segment.charAt(0).toUpperCase() + segment.slice(1));
  }
  return parts.length ? parts.join(" · ") : null;
}

export function parsePageContextFromRoute(
  route: string,
  search?: string,
): PageContext {
  const ctx: PageContext = { route };
  const params = new URLSearchParams(search?.replace(/^\?/, "") ?? "");

  const idParam = params.get("id");
  if (route.startsWith("/notes") && idParam) {
    ctx.noteId = Number(idParam);
  }
  if (route.startsWith("/service/")) {
    const match = route.match(/^\/service\/(\d+)/);
    if (match) ctx.clientId = Number(match[1]);
  }
  if (route.startsWith("/projects")) {
    const match = route.match(/^\/projects\/(\d+)/);
    if (match) ctx.projectId = Number(match[1]);
  }
  if (route.startsWith("/channels")) {
    const ch = params.get("channel");
    if (ch) ctx.channelId = Number(ch);
  }
  return ctx;
}

/** Proactive suggested actions per page for v2 AI integration. */
export function getProactiveInsights(ctx: PageContext | null | undefined): string[] {
  if (!ctx?.route) return ["Summarize my open tasks", "What's on my dashboard?"];

  const route = ctx.route.split("?")[0];
  if (route === "/" || route === "") {
    return [
      "Summarize my dashboard KPIs",
      "What needs my attention today?",
      "Show pending approvals",
    ];
  }
  if (route.startsWith("/projects")) {
    return ctx.projectId
      ? [`List pending tasks for project #${ctx.projectId}`, "Check project budget status"]
      : ["List all active projects", "Which projects are behind schedule?"];
  }
  if (route.startsWith("/tasks")) {
    return ["Summarize my open tasks", "Create a task for follow-up"];
  }
  if (route.startsWith("/channels")) {
    return ctx.channelId
      ? ["Summarize recent channel activity", "Draft a status update message"]
      : ["Which channels have unread messages?"];
  }
  if (route.startsWith("/notes")) {
    return ctx.noteId
      ? ["Summarize this note", "Suggest tags for this note"]
      : ["Search my recent notes", "Create a meeting notes template"];
  }
  if (route.startsWith("/approvals")) {
    return ["List pending approvals", "Show my submitted requests"];
  }
  if (route.startsWith("/reports")) {
    return ["Generate executive narrative", "Summarize project status report"];
  }
  if (route.startsWith("/finance")) {
    return ["Summarize finance overview", "List recent expenses"];
  }
  if (route.startsWith("/calendar")) {
    return ["What's on my calendar this week?", "Schedule a team sync"];
  }
  return ["How can you help on this page?"];
}
