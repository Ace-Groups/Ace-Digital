import type { AccessContext } from "@workspace/db";
import { buildSystemInstruction } from "./gemini-client";
import { chatOpenRouter, type OpenRouterMessage } from "./openrouter-client";
import type { AgentResult, PageContext } from "./types";
import { logAiAudit } from "./audit";

const FALLBACK_SYSTEM_NOTE = `
You are running in BACKUP mode (OpenRouter free model). Live workspace tools are unavailable in this mode.
Do not invent project IDs, employee records, financial figures, or other workspace data.
If the user asks for live data you cannot fetch, say clearly that live workspace lookup is temporarily unavailable and answer from the conversation context only.
Keep responses concise and helpful.`;

function toOpenRouterMessages(
  ctx: AccessContext,
  pageContext: PageContext | null | undefined,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  prompt: string,
): OpenRouterMessage[] {
  const messages: OpenRouterMessage[] = [
    {
      role: "system",
      content: `${buildSystemInstruction({ role: ctx.role, pageContext })}${FALLBACK_SYSTEM_NOTE}`,
    },
  ];

  for (const turn of history) {
    messages.push({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.parts.map((p) => p.text).join("\n"),
    });
  }

  messages.push({ role: "user", content: prompt });
  return messages;
}

function parseFallbackResponse(responseText: string): {
  text: string;
  metadata: AgentResult["metadata"];
} {
  try {
    const parsed = JSON.parse(responseText) as {
      text?: string;
      table?: { columns?: string[]; rows?: Record<string, unknown>[] };
    };
    const text = parsed.text?.trim() || responseText;
    if (parsed.table?.columns?.length && parsed.table.rows) {
      return {
        text,
        metadata: {
          layout: "table",
          tableData: { columns: parsed.table.columns, rows: parsed.table.rows },
          toolsUsed: ["openrouter:fallback"],
        },
      };
    }
    return { text, metadata: { toolsUsed: ["openrouter:fallback"] } };
  } catch {
    return { text: responseText, metadata: { toolsUsed: ["openrouter:fallback"] } };
  }
}

export async function runOpenRouterAgent(options: {
  ctx: AccessContext;
  prompt: string;
  pageContext?: PageContext | null;
  history?: { role: "user" | "model"; parts: { text: string }[] }[];
  endpoint?: string;
}): Promise<AgentResult> {
  const { ctx, prompt, pageContext, history = [], endpoint = "openrouter/fallback" } = options;
  const started = Date.now();

  const messages = toOpenRouterMessages(ctx, pageContext, history, prompt);
  const raw = await chatOpenRouter(messages);
  const { text, metadata } = parseFallbackResponse(raw);

  void logAiAudit({
    userId: ctx.userId,
    endpoint,
    tools: ["openrouter:fallback"],
    durationMs: Date.now() - started,
    denied: false,
  });

  return {
    text,
    metadata,
    permissionDenied: false,
    toolsUsed: ["openrouter:fallback"],
  };
}
