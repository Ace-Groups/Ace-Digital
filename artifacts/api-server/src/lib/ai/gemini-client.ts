import type { GoogleGenerativeAI } from "@google/generative-ai";
import type { AccessContext } from "@workspace/db";
import type { PageContext } from "./types";
import { getToolDeclarations } from "./tool-registry";
import {
  getGeminiApiKeys,
  getGeminiClientForKey,
  isAnyGeminiKeyConfigured,
  resolveGeminiModelName,
} from "./gemini-keys";

export function isGeminiConfigured(): boolean {
  return isAnyGeminiKeyConfigured();
}

export function getGeminiClient(): ReturnType<typeof getGeminiClientForKey> | null {
  const keys = getGeminiApiKeys();
  if (!keys.length) return null;
  return getGeminiClientForKey(keys[0]!);
}

export function getGeminiModelName(): string {
  return resolveGeminiModelName();
}

export function getMaxToolIterations(): number {
  const n = Number(process.env.AI_MAX_TOOL_ITERATIONS);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 15) : 6;
}

export function buildSystemInstruction(ctx: {
  role: string;
  pageContext?: PageContext | null;
  availableTools?: string[];
  responseFormat?: "json" | "markdown";
}): string {
  const contextLine = ctx.pageContext
    ? `\nCurrent page context: ${JSON.stringify(ctx.pageContext)}`
    : "";
  const toolsLine = ctx.availableTools?.length
    ? `\nTools you can call for this user: ${ctx.availableTools.join(", ")}.`
    : "";
  const capabilityLine = ctx.availableTools?.length
    ? `\nWhen the user asks what they can access, summarize capabilities from the tools above for role "${ctx.role}" — do not claim access to tools not listed.`
    : "";

  return `You are Ace, the AI assistant for Ace Digital — an internal company workspace.
You help employees query projects, tasks, finance, clients, service tickets, calendar, notes, approvals, and activity.
You must use available tools to fetch real data; never invent IDs, numbers, or records.
If a tool requires an identifier (projectId, clientId, etc.) and the user did not provide one, ask for it — except when that ID is already in the current page context (e.g. noteId while viewing a note).
When noteId is in page context, call get_note immediately for note-related questions.
For dashboard or KPI questions, call get_dashboard_snapshot first when it is available.

Security and RBAC:
- You can ONLY use the tools provided to you. Tools the user's role cannot access are not available — never claim to perform them, and never reveal or guess data you could not fetch with an available tool.
- If a tool returns permission denied, explain clearly and briefly what access is missing. Do not work around it.
User role: ${ctx.role}.${contextLine}${toolsLine}${capabilityLine}

Creating records (employees, channels, projects, clients, tickets, notes, tasks, events, approvals):
1. Infer field values from the user's natural language.
2. Use lookup tools (lookup_employee, list_teams) to resolve names to IDs when needed.
3. Apply sensible defaults (e.g. new hires default to the employee role and an auto-generated password; channels default to type TEAM).
4. If a REQUIRED field is still missing, ask ONE concise follow-up question and do NOT call the create tool yet.
5. When you have enough information, call the create tool WITHOUT confirmed=true. This returns a confirmation request that the user must approve in the UI — do not ask them to type "yes".
6. Never attempt to create records for roles or teams the user is not allowed to manage.
${ctx.availableTools?.length ? "\nYou have live workspace tools — use them to fetch real data. Never say you are in backup mode or that live data is unavailable." : ""}

${
  ctx.responseFormat === "markdown"
    ? `When responding, write clear Markdown for the user. Do not wrap your answer in JSON or code blocks.`
    : `When responding, return JSON in this exact structure:
{
  "text": "Your natural language response in Markdown.",
  "table": null | {
    "columns": ["Column 1", "Column 2"],
    "rows": [{ "Column 1": "value", "Column 2": "value" }]
  }
}
Use the table field when presenting tabular data; otherwise set table to null.`
}`;
}

export function createGenerativeModel(
  opts: {
    ctx: AccessContext;
    pageContext?: PageContext | null;
    allowedTools?: string[];
  },
  client?: GoogleGenerativeAI,
) {
  const gemini = client ?? getGeminiClient();
  if (!gemini) return null;

  const declarations = getToolDeclarations({
    ctx: opts.ctx,
    allowedTools: opts.allowedTools,
  });

  // JSON response mode conflicts with function calling on Gemini — only enable when tool-free.
  const generationConfig = declarations.length
    ? undefined
    : { responseMimeType: "application/json" as const };

  return gemini.getGenerativeModel({
    model: getGeminiModelName(),
    tools: declarations.length ? [{ functionDeclarations: declarations }] : undefined,
    generationConfig,
    systemInstruction: buildSystemInstruction({
      role: opts.ctx.role,
      pageContext: opts.pageContext,
      availableTools: declarations.map((d) => d.name).filter((n): n is string => Boolean(n)),
    }),
  });
}
