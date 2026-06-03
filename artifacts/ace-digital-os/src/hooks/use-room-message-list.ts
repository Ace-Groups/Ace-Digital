import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Message } from "@workspace/api-client-react";
import { RecordList } from "@/lib/record-list";
import { getChannelMessages } from "@workspace/api-client-react";

export const CHANNEL_MESSAGE_PARAMS = { limit: 50 } as const;

export function useRoomMessageList(channelId: number | null, enabled: boolean) {
  const listRef = useRef<RecordList<Message> | null>(null);

  if (!listRef.current) {
    listRef.current = new RecordList<Message>();
  }
  const list = listRef.current;

  const subscribe = useCallback((onStoreChange: () => void) => list.subscribe(onStoreChange), [list]);
  const getSnapshot = useCallback(() => list.getSnapshot(), [list]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!enabled || !channelId) {
      list.setLoading();
      return;
    }
    list.setLoading();
  }, [channelId, enabled, list]);

  const syncFromQuery = useCallback(
    (items: Message[]) => {
      const snap = list.getSnapshot();
      if (snap.status === "loading") {
        list.setInitial(items, items.length >= CHANNEL_MESSAGE_PARAMS.limit);
      } else if (items.length > 0) {
        list.mergeRealtime(items);
      }
    },
    [list],
  );

  const loadOlder = useCallback(async (): Promise<boolean> => {
    if (!channelId) return false;
    const snap = list.getSnapshot();
    const first = snap.items[0];
    if (!first || !snap.hasMoreBefore) return false;

    const older = await getChannelMessages(channelId, {
      limit: 50,
      before: first.id,
    });
    if (older.length === 0) {
      list.setHasMoreBefore(false);
      return false;
    }
    list.prepend(older);
    if (older.length < 50) list.setHasMoreBefore(false);
    return true;
  }, [channelId, list]);

  const applyRealtime = useCallback(
    (items: Message[]) => {
      const snap = list.getSnapshot();
      if (snap.status === "loading") {
        list.setInitial(items, items.length >= CHANNEL_MESSAGE_PARAMS.limit);
      } else {
        list.mergeRealtime(items);
      }
    },
    [list],
  );

  const appendMessage = useCallback(
    (msg: Message) => {
      list.append([msg]);
    },
    [list],
  );

  const patchMessage = useCallback(
    (id: number, updater: (m: Message) => Message) => {
      list.patch(id, updater);
    },
    [list],
  );

  const messages = useMemo(() => state.items, [state.items]);

  return {
    messages,
    status: state.status,
    hasMoreBefore: state.hasMoreBefore,
    loadOlder,
    syncFromQuery,
    applyRealtime,
    appendMessage,
    patchMessage,
    isLoading: state.status === "loading",
  };
}
