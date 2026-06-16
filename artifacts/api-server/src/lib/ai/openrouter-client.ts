import { logger } from "../logger";
import type { OpenRouterTool } from "./openrouter-tools";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

export type OpenRouterToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type OpenRouterChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenRouterToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

/** Default: OpenRouter's free-model router (picks a :free model with needed capabilities). */
export function getOpenRouterModelName(): string {
  return process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
}

type OpenRouterCompletionBody = {
  error?: { message?: string };
  choices?: {
    finish_reason?: string;
    message?: {
      role?: "assistant";
      content?: string | null;
      tool_calls?: OpenRouterToolCall[];
    };
  }[];
};

export async function chatOpenRouterCompletion(options: {
  messages: OpenRouterChatMessage[];
  tools?: OpenRouterTool[];
}): Promise<{
  message: Extract<OpenRouterChatMessage, { role: "assistant" }>;
  finishReason?: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = getOpenRouterModelName();
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() || "https://acedigital.cc";

  const res = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": "Ace Digital",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      tools: options.tools?.length ? options.tools : undefined,
      tool_choice: options.tools?.length ? "auto" : undefined,
      max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS) || 4096,
      temperature: 0.3,
    }),
  });

  const body = (await res.json().catch(() => null)) as OpenRouterCompletionBody | null;

  if (!res.ok) {
    const detail = body?.error?.message ?? res.statusText ?? "OpenRouter request failed";
    logger.warn({ status: res.status, model, detail }, "OpenRouter chat failed");
    throw new Error(detail);
  }

  const choice = body?.choices?.[0];
  const message = choice?.message;
  if (!message || message.role !== "assistant") {
    throw new Error("OpenRouter returned an invalid assistant message");
  }

  if (!message.content?.trim() && !message.tool_calls?.length) {
    throw new Error("OpenRouter returned an empty response");
  }

  return {
    message: {
      role: "assistant",
      content: message.content ?? null,
      tool_calls: message.tool_calls,
    },
    finishReason: choice.finish_reason,
  };
}

/** Plain text chat without tools (legacy helper). */
export async function chatOpenRouter(messages: OpenRouterChatMessage[]): Promise<string> {
  const { message } = await chatOpenRouterCompletion({ messages });
  if (message.tool_calls?.length) {
    throw new Error("OpenRouter returned tool calls in plain chat mode");
  }
  const content = message.content?.trim();
  if (!content) {
    throw new Error("OpenRouter returned an empty response");
  }
  return content;
}
