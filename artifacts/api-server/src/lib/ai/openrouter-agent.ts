import type { AccessContext } from "@workspace/db";
import { buildSystemInstruction, getMaxToolIterations } from "./gemini-client";
import {
  chatOpenRouterCompletion,
  type OpenRouterChatMessage,
} from "./openrouter-client";
import { toOpenRouterTools } from "./openrouter-tools";
import { executeTool, getToolDeclarations } from "./tool-registry";
import { parseAgentModelResponse } from "./agent-response";
import type { AgentResult, PageContext } from "./types";
import { logAiAudit } from "./audit";

function isPendingConfirmation(output: unknown): output is {
  status: "pending_confirmation";
  actionType: string;
  summary: string;
  payload: Record<string, unknown>;
} {
  return (
    !!output &&
    typeof output === "object" &&
    (output as { status?: unknown }).status === "pending_confirmation"
  );
}

async function prefetchWorkspaceContext(
  ctx: AccessContext,
  prompt: string,
  pageContext: PageContext | null | undefined,
  availableToolNames: string[],
): Promise<{ note: string; tools: string[] }> {
  const tools: string[] = [];
  const notes: string[] = [];

  if (pageContext?.noteId != null && availableToolNames.includes("get_note")) {
    const noteResult = await executeTool(ctx, "get_note", {
      noteId: String(pageContext.noteId),
    });
    if (noteResult.ok) {
      tools.push("get_note");
      notes.push(
        `Live note content for Note #${pageContext.noteId} (already fetched — summarize or answer from this):\n${JSON.stringify(noteResult.output)}`,
      );
    }
  }

  if (
    availableToolNames.includes("get_dashboard_snapshot") &&
    /\b(dashboard|kpi|kpis|needs my attention|summarize my)\b/i.test(prompt)
  ) {
    const result = await executeTool(ctx, "get_dashboard_snapshot", {});
    if (result.ok) {
      tools.push("get_dashboard_snapshot");
      notes.push(
        `Live dashboard snapshot for this user (already fetched — use these numbers in your answer):\n${JSON.stringify(result.output)}`,
      );
    }
  }

  return {
    note: notes.length ? `\n\n${notes.join("\n\n")}` : "",
    tools,
  };
}

function buildInitialMessages(
  ctx: AccessContext,
  pageContext: PageContext | null | undefined,
  availableTools: string[],
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  prompt: string,
): OpenRouterChatMessage[] {
  const messages: OpenRouterChatMessage[] = [
    {
      role: "system",
      content: buildSystemInstruction({
        role: ctx.role,
        pageContext,
        availableTools,
        responseFormat: "markdown",
      }),
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

export async function runOpenRouterAgent(options: {
  ctx: AccessContext;
  prompt: string;
  pageContext?: PageContext | null;
  history?: { role: "user" | "model"; parts: { text: string }[] }[];
  endpoint?: string;
  allowedTools?: string[];
}): Promise<AgentResult> {
  const {
    ctx,
    prompt,
    pageContext,
    history = [],
    endpoint = "openrouter",
    allowedTools,
  } = options;
  const started = Date.now();
  const toolsUsed: string[] = [];

  const declarations = getToolDeclarations({ ctx, allowedTools });
  const availableToolNames = declarations.map((d) => d.name ?? "").filter(Boolean);
  const openRouterTools = toOpenRouterTools(declarations);

  let messages = buildInitialMessages(
    ctx,
    pageContext,
    availableToolNames,
    history,
    prompt,
  );

  const prefetch = await prefetchWorkspaceContext(ctx, prompt, pageContext, availableToolNames);
  if (prefetch.note) {
    const system = messages[0];
    if (system?.role === "system") {
      messages = [{ ...system, content: system.content + prefetch.note }, ...messages.slice(1)];
    }
    toolsUsed.push(...prefetch.tools);
  }

  const maxIterations = getMaxToolIterations();
  let iterations = 0;
  let lastAssistantText = "";

  while (iterations <= maxIterations) {
    const { message } = await chatOpenRouterCompletion({
      messages,
      tools: openRouterTools.length ? openRouterTools : undefined,
    });

    if (message.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls,
      });

      for (const call of message.tool_calls) {
        const name = call.function.name;
        toolsUsed.push(name);

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }

        const execResult = await executeTool(ctx, name, args);

        if (!execResult.ok && execResult.permissionDenied) {
          const requiredPerms = execResult.requiredPermissions.map(String);
          void logAiAudit({
            userId: ctx.userId,
            endpoint,
            tools: toolsUsed,
            durationMs: Date.now() - started,
            denied: true,
          });
          return {
            text:
              `You don't have permission to access that data. Your role (${ctx.role}) is missing: ${requiredPerms.join(", ")}. ` +
              `I can still help with: ${availableToolNames.slice(0, 8).join(", ")}${availableToolNames.length > 8 ? ", …" : ""}.`,
            metadata: {
              layout: "permission_denied",
              errorDetails: {
                userId: ctx.userId,
                role: ctx.role,
                requiredPermissions: requiredPerms,
              },
              toolsUsed,
            },
            permissionDenied: true,
            toolsUsed,
          };
        }

        const output = execResult.ok ? execResult.output : execResult.output;

        if (execResult.ok && isPendingConfirmation(output)) {
          void logAiAudit({
            userId: ctx.userId,
            endpoint,
            tools: toolsUsed,
            durationMs: Date.now() - started,
            denied: false,
          });
          return {
            text: `${output.summary}. Review the details and confirm to proceed.`,
            metadata: {
              layout: "action_confirmation",
              pendingAction: {
                actionType: output.actionType,
                summary: output.summary,
                payload: output.payload,
              },
              toolsUsed,
            },
            permissionDenied: false,
            toolsUsed,
          };
        }

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(output),
        });
      }

      iterations++;
      continue;
    }

    lastAssistantText = message.content?.trim() ?? "";
    break;
  }

  if (!lastAssistantText && toolsUsed.length > 0) {
    lastAssistantText =
      "I fetched your workspace data but couldn't format a reply. Please try asking again.";
  }

  const { text, metadata } = parseAgentModelResponse(lastAssistantText);
  const finalMetadata = metadata
    ? { ...metadata, toolsUsed }
    : toolsUsed.length
      ? { toolsUsed }
      : null;

  void logAiAudit({
    userId: ctx.userId,
    endpoint,
    tools: toolsUsed,
    durationMs: Date.now() - started,
    denied: false,
  });

  return {
    text,
    metadata: finalMetadata,
    permissionDenied: false,
    toolsUsed,
  };
}
