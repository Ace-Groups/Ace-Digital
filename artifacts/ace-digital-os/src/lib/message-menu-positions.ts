export type MessageMenuOffset = { x: number; y: number };

const STORAGE_PREFIX = "ace-chat-menu-positions-v1:";

function storageKey(channelId: number): string {
  return `${STORAGE_PREFIX}${channelId}`;
}

export function defaultMenuOffset(messageId: number): MessageMenuOffset {
  const n = Math.abs(messageId);
  return {
    x: ((n % 7) - 3) * 22,
    y: -36 - (n % 5) * 28,
  };
}

export function loadMessageMenuPositions(channelId: number): Record<string, MessageMenuOffset> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(channelId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MessageMenuOffset>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveMessageMenuPosition(
  channelId: number,
  messageId: number,
  offset: MessageMenuOffset,
): void {
  if (typeof window === "undefined") return;
  const all = loadMessageMenuPositions(channelId);
  all[String(messageId)] = offset;
  try {
    localStorage.setItem(storageKey(channelId), JSON.stringify(all));
  } catch {
    /* quota / private mode */
  }
}

export function getMessageMenuPosition(
  channelId: number,
  messageId: number,
): MessageMenuOffset {
  const saved = loadMessageMenuPositions(channelId)[String(messageId)];
  return saved ?? defaultMenuOffset(messageId);
}
