import type { AccessContext } from "@workspace/db";
import { createGenerativeModel, getMaxToolIterations, isGeminiConfigured } from "./gemini-client";
import {
  formatGeminiErrorForLog,
  formatGeminiErrorForUser,
} from "./gemini-errors";
import { withGeminiResilience } from "./gemini-keys";
import { logger } from "../logger";
import { isAgentConfigured } from "./agent-config";
import { isOpenRouterConfigured } from "./openrouter-client";
import { runOpenRouterAgent } from "./openrouter-agent";
import { executeTool, getToolRequiredPermissions } from "./tool-registry";
import { parseAgentModelResponse } from "./agent-response";
import type { AgentResult, AiMessageMetadata, PageContext } from "./types";
import { logAiAudit } from "./audit";

export { isAgentConfigured } from "./agent-config";

export type RunAgentOptions = {
  ctx: AccessContext;
  prompt: string;
  pageContext?: PageContext | null;
  history?: { role: "user" | "model"; parts: { text: string }[] }[];
  endpoint?: string;
  /** Restrict which tools the model may call for this run. Omit for role-default set. */
  allowedTools?: string[];
};

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

async function runGeminiAgent(
  options: RunAgentOptions & { started: number },
): Promise<AgentResult> {
  const { ctx, prompt, pageContext, history = [], endpoint = "agent", allowedTools, started } =
    options;
  const toolsUsed: string[] = [];

  return withGeminiResilience(async (client) => {
      const model = createGenerativeModel({ ctx, pageContext, allowedTools }, client);
      if (!model) throw new Error("GEMINI_API_KEY is not configured");

      const chat = model.startChat({ history });
      let result = await chat.sendMessage(prompt);
      let iterations = 0;
      const maxIterations = getMaxToolIterations();

      while (iterations < maxIterations) {
        const response = result.response;
        if (!response?.functionCalls) break;
        const calls = response.functionCalls();
        if (!calls?.length) break;

        iterations++;
        const responses: { functionResponse: { name: string; response: unknown } }[] = [];

        for (const call of calls) {
          const { name, args } = call;
          toolsUsed.push(name);
          const execResult = await executeTool(ctx, name, (args ?? {}) as Record<string, unknown>);

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
              text: `ACCESS DENIED: Insufficient permissions. Role '${ctx.role}' lacks: ${requiredPerms.join(", ")}.`,
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

          responses.push({ functionResponse: { name, response: output } });
        }

        result = await chat.sendMessage(responses as Parameters<typeof chat.sendMessage>[0]);
      }

      let responseText = "";
      try {
        responseText = result.response.text();
      } catch (e) {
        console.error("[AI] Error reading response:", e);
      }

      const { text, metadata } = parseAgentModelResponse(responseText);
      const finalMetadata: AiMessageMetadata | null = metadata
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
    });
}

export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const { ctx, prompt, pageContext, history = [], endpoint = "agent" } = options;
  const started = Date.now();

  if (!isAgentConfigured()) {
    return {
      text: "Ace AI is offline. Configure GEMINI_API_KEY or OPENROUTER_API_KEY on the server.",
      metadata: null,
      permissionDenied: false,
      toolsUsed: [],
    };
  }

  if (!isGeminiConfigured()) {
    return runOpenRouterAgent({
      ctx,
      prompt,
      pageContext,
      history,
      endpoint,
      allowedTools: options.allowedTools,
    });
  }

  try {
    return await runGeminiAgent({ ...options, started });
  } catch (err) {
    console.error("[AI] Gemini agent failed:", formatGeminiErrorForLog(err));

    if (isOpenRouterConfigured()) {
      try {
        logger.warn({ err: formatGeminiErrorForLog(err) }, "Falling back to OpenRouter");
        return await runOpenRouterAgent({
          ctx,
          prompt,
          pageContext,
          history,
          endpoint,
          allowedTools: options.allowedTools,
        });
      } catch (fallbackErr) {
        console.error("[AI] OpenRouter fallback failed:", fallbackErr);
      }
    }

    return {
      text: formatGeminiErrorForUser(err),
      metadata: { layout: "service_error" as const, toolsUsed: [] },
      permissionDenied: false,
      toolsUsed: [],
    };
  }
}

export function formatPermissionDeniedMessage(
  ctx: AccessContext,
  toolName: string,
): string {
  const perms = getToolRequiredPermissions(toolName).map(String);
  return `ACCESS DENIED: Role '${ctx.role}' lacks: ${perms.join(", ")}.`;
}
