import { getAuthToken } from "@/lib/api";
import { resolveApiUrl } from "@/lib/api-config";
import type { AiChatInput } from "@workspace/api-client-react";

export type AiStreamEvent =
  | { type: "start"; conversationId: number }
  | { type: "chunk"; text: string }
  | { type: "done"; conversationId: number; text: string; metadata: unknown; toolsUsed: string[] }
  | { type: "error"; error: string };

export async function streamAiChat(
  input: AiChatInput,
  onEvent: (event: AiStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getAuthToken();
  let sawTerminal = false;
  const emit = (event: AiStreamEvent) => {
    if (event.type === "done" || event.type === "error") sawTerminal = true;
    onEvent(event);
  };

  let res: Response;
  try {
    res = await fetch(resolveApiUrl("/api/v1/ai/chat/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) return;
    emit({
      type: "error",
      error: err instanceof Error ? err.message : "Could not reach Ace AI.",
    });
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const message =
      (err && typeof err === "object" && "error" in err && String((err as { error: unknown }).error)) ||
      (res.status === 429
        ? "AI rate limit exceeded. Try again shortly."
        : res.status >= 500
          ? "Ace AI server error. Please try again."
          : res.statusText || "Stream failed");
    emit({ type: "error", error: message });
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    emit({ type: "error", error: "No response body" });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part.split("\n");
        let eventType = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7);
          if (line.startsWith("data: ")) data = line.slice(6);
        }
        if (!data) continue;
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          if (eventType === "start") {
            emit({ type: "start", conversationId: Number(parsed.conversationId) });
          } else if (eventType === "chunk") {
            emit({ type: "chunk", text: String(parsed.text ?? "") });
          } else if (eventType === "done") {
            emit({
              type: "done",
              conversationId: Number(parsed.conversationId),
              text: String(parsed.text ?? ""),
              metadata: parsed.metadata,
              toolsUsed: Array.isArray(parsed.toolsUsed) ? parsed.toolsUsed.map(String) : [],
            });
          } else if (eventType === "error") {
            emit({ type: "error", error: String(parsed.error ?? "Unknown error") });
          }
        } catch {
          /* skip malformed */
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return;
    emit({
      type: "error",
      error: err instanceof Error ? err.message : "Connection to Ace AI was lost.",
    });
    return;
  }

  // SSE ended without a done/error event — surface a failure so the UI unblocks.
  if (!sawTerminal && !signal?.aborted) {
    emit({ type: "error", error: "Ace AI ended the response unexpectedly." });
  }
}
