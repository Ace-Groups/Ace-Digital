import { getAuthToken } from "@/lib/api";
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
  const res = await fetch("/api/v1/ai/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Stream failed" }));
    onEvent({ type: "error", error: String(err.error ?? res.statusText) });
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onEvent({ type: "error", error: "No response body" });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

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
          onEvent({ type: "start", conversationId: Number(parsed.conversationId) });
        } else if (eventType === "chunk") {
          onEvent({ type: "chunk", text: String(parsed.text ?? "") });
        } else if (eventType === "done") {
          onEvent({
            type: "done",
            conversationId: Number(parsed.conversationId),
            text: String(parsed.text ?? ""),
            metadata: parsed.metadata,
            toolsUsed: Array.isArray(parsed.toolsUsed) ? parsed.toolsUsed.map(String) : [],
          });
        } else if (eventType === "error") {
          onEvent({ type: "error", error: String(parsed.error ?? "Unknown error") });
        }
      } catch {
        /* skip malformed */
      }
    }
  }
}
