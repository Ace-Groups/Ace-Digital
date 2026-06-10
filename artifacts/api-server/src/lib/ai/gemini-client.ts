import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AccessContext } from "@workspace/db";
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

Security and RBAC:
- You can ONLY use the tools provided to you. Tools the user's role cannot access are not available — never claim to perform them, and never reveal or guess data you could not fetch with an available tool.
- If a tool returns permission denied, explain clearly and briefly what access is missing. Do not work around it.
User role: ${ctx.role}.${contextLine}

Creating records (employees, channels, projects, clients, tickets, notes, tasks, events, approvals):
1. Infer field values from the user's natural language.
2. Use lookup tools (lookup_employee, list_teams) to resolve names to IDs when needed.
3. Apply sensible defaults (e.g. new hires default to the employee role and an auto-generated password; channels default to type TEAM).
4. If a REQUIRED field is still missing, ask ONE concise follow-up question and do NOT call the create tool yet.
5. When you have enough information, call the create tool WITHOUT confirmed=true. This returns a confirmation request that the user must approve in the UI — do not ask them to type "yes".
6. Never attempt to create records for roles or teams the user is not allowed to manage.

When responding, return JSON in this exact structure:
{
  "text": "Your natural language response in Markdown.",
  "table": null | {
    "columns": ["Column 1", "Column 2"],
    "rows": [{ "Column 1": "value", "Column 2": "value" }]
  }
}
Use the table field when presenting tabular data; otherwise set table to null.`;
}

export function createGenerativeModel(opts: {
  ctx: AccessContext;
  pageContext?: PageContext | null;
  allowedTools?: string[];
}) {
  const client = getGeminiClient();
  if (!client) return null;

  const declarations = getToolDeclarations({
    ctx: opts.ctx,
    allowedTools: opts.allowedTools,
  });

  // JSON response mode conflicts with function calling on Gemini — only enable when tool-free.
  const generationConfig = declarations.length
    ? undefined
    : { responseMimeType: "application/json" as const };

  return client.getGenerativeModel({
    model: getGeminiModelName(),
    tools: declarations.length ? [{ functionDeclarations: declarations }] : undefined,
    generationConfig,
    systemInstruction: buildSystemInstruction({
      role: opts.ctx.role,
      pageContext: opts.pageContext,
    }),
  });
}
