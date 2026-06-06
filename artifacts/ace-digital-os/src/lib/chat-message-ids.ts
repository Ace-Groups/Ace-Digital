/** Stable optimistic message id derived from send clientId (matches API socket server). */

export function tempMessageIdFromClientId(clientId: string): number {
  return -Math.abs(clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
}

export function messageClientId(msg: unknown): string | undefined {
  if (!msg || typeof msg !== "object") return undefined;
  const cid = (msg as { clientId?: unknown }).clientId;
  return typeof cid === "string" && cid.length > 0 ? cid : undefined;
}
