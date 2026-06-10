import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PageContext } from "./types";
import { getToolDeclarations } from "./tool-registry";

const apiKey = process.env.GEMINI_API_KEY?.trim() || "";

let genAI: GoogleGenerativeAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(apiKey);
}

export function getGeminiClient(): GoogleGenerativeAI | null {
  if (!apiKey) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

export function getMaxToolIterations(): number {
  const n = Number(process.env.AI_MAX_TOOL_ITERATIONS);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 15) : 8;
}

export function buildSystemInstruction(ctx: {
  role: string;
  pageContext?: PageContext | null;
}): string {
  const contextLine = ctx.pageContext
    ? `\nCurrent page context: ${JSON.stringify(ctx.pageContext)}`
    : "";

  return `You are Ace, the AI assistant for Ace Digital OS — an internal company operating system.
You help employees query projects, tasks, finance, clients, service tickets, calendar, notes, approvals, and activity.
You must use available tools to fetch real data; never invent IDs, numbers, or records.
If a tool requires an identifier (projectId, clientId, etc.) and the user did not provide one, ask for it.
Respect RBAC: if a tool returns permission denied, explain clearly what access is missing.
User role: ${ctx.role}.${contextLine}

When responding, return JSON in this exact structure:
{
  "text": "Your natural language response in Markdown.",
  "table": null | {
    "columns": ["Column 1", "Column 2"],
    "rows": [{ "Column 1": "value", "Column 2": "value" }]
  }
}
Use the table field when presenting tabular data; otherwise set table to null.
Mention which data sources you used when relevant.

Action tools (create_task, update_task_status, create_calendar_event, post_channel_message, submit_approval) mutate data.
Always call them WITHOUT confirmed=true first to get a confirmation payload, then explain the pending action to the user.
Only re-call with confirmed=true after the user explicitly confirms.`;
}

export function createGenerativeModel(ctx: {
  role: string;
  pageContext?: PageContext | null;
}) {
  const client = getGeminiClient();
  if (!client) return null;

  return client.getGenerativeModel({
    model: getGeminiModelName(),
    tools: [{ functionDeclarations: getToolDeclarations() }],
    generationConfig: {
      responseMimeType: "application/json",
    },
    systemInstruction: buildSystemInstruction(ctx),
  });
}
