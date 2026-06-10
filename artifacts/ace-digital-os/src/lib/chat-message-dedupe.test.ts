import { describe, expect, it } from "vitest";
import type { Message } from "@workspace/api-client-react";
import { tempMessageIdFromClientId } from "@/lib/chat-message-ids";
import { dedupeOptimisticPairs } from "@/lib/chat-message-dedupe";

function msg(
  partial: Partial<Message> & Pick<Message, "id" | "senderId" | "body">,
): Message {
  return {
    channelId: 1,
    createdAt: partial.createdAt ?? "2026-06-10T08:46:00.000Z",
    messageKind: "text",
    deleted: false,
    parentMessageId: null,
    editedAt: null,
    ...partial,
  } as Message;
}

describe("dedupeOptimisticPairs", () => {
  it("removes optimistic row when persisted twin exists", () => {
    const clientId = "abc-123";
    const temp = msg({
      id: tempMessageIdFromClientId(clientId),
      senderId: 2,
      body: "hello",
      clientId,
    } as Message & { clientId: string });
    const real = msg({ id: 99, senderId: 2, body: "hello" });

    const result = dedupeOptimisticPairs([temp, real]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(99);
  });

  it("keeps unmatched optimistic rows for back-to-back identical text", () => {
    const temp1 = msg({
      id: tempMessageIdFromClientId("first"),
      senderId: 2,
      body: "hi",
      createdAt: "2026-06-10T08:46:00.000Z",
      clientId: "first",
    } as Message & { clientId: string });
    const real1 = msg({
      id: 10,
      senderId: 2,
      body: "hi",
      createdAt: "2026-06-10T08:46:01.000Z",
    });
    const temp2 = msg({
      id: tempMessageIdFromClientId("second"),
      senderId: 2,
      body: "hi",
      createdAt: "2026-06-10T08:46:05.000Z",
      clientId: "second",
    } as Message & { clientId: string });

    const result = dedupeOptimisticPairs([temp1, real1, temp2]);
    expect(result.map((m) => m.id)).toEqual([10, temp2.id]);
  });
});
