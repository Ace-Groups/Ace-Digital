import type { AiPageContext } from "@workspace/api-client-react";

/** Client-side proactive insights mirroring server context-pack. */
export function getProactiveInsights(ctx: AiPageContext): string[] {
  if (!ctx?.route) {
    return ["Summarize my open tasks", "What's on my dashboard?"];
  }

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
      : ["Search my recent notes"];
  }
  if (route.startsWith("/approvals")) {
    return ["List pending approvals", "Show my submitted requests"];
  }
  if (route.startsWith("/reports")) {
    return ["Generate executive narrative", "Summarize project status report"];
  }
  if (route.startsWith("/calendar")) {
    return ["What's on my calendar this week?", "Schedule a team sync"];
  }
  return ["How can you help on this page?"];
}
