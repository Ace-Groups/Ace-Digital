import { logger } from "../logger";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

export type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

/** Default: OpenRouter's free-model router (picks a :free model with needed capabilities). */
export function getOpenRouterModelName(): string {
  return process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
}

export async function chatOpenRouter(messages: OpenRouterMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = getOpenRouterModelName();
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() || "https://ace-digital-os.web.app";

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
      messages,
      max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS) || 4096,
      temperature: 0.4,
    }),
  });

  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: { message?: { content?: string | null } }[];
  } | null;

  if (!res.ok) {
    const detail = body?.error?.message ?? res.statusText ?? "OpenRouter request failed";
    logger.warn({ status: res.status, model, detail }, "OpenRouter chat failed");
    throw new Error(detail);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("OpenRouter returned an empty response");
  }

  return content.trim();
}
