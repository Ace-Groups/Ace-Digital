import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getChannelMessages,
  getGetChannelMessagesQueryKey,
  type Message,
} from "@workspace/api-client-react";
import { RecordList } from "@/lib/record-list";

const MESSAGE_PARAMS = { limit: 50 } as const;

export function useRoomMessageList(channelId: number | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const listRef = useRef<RecordList<Message> | null>(null);

  if (!listRef.current) {
    listRef.current = new RecordList<Message>();
  }
  const list = listRef.current;

  const subscribe = useCallback((onStoreChange: () => void) => list.subscribe(onStoreChange), [list]);
  const getSnapshot = useCallback(() => list.getSnapshot(), [list]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!channelId) {
      list.setLoading();
      return;
    }
    list.setLoading();
    let cancelled = false;
    void getChannelMessages(channelId, MESSAGE_PARAMS).then((items) => {
      if (cancelled) return;
      list.setInitial(items, items.length >= MESSAGE_PARAMS.limit);
      queryClient.setQueryData(
        getGetChannelMessagesQueryKey(channelId, MESSAGE_PARAMS),
        items,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [channelId, list, queryClient]);

  const syncFromQuery = useCallback(
    (items: Message[]) => {
      if (!items.length) return;
      const snap = list.getSnapshot();
      if (snap.status === "loading") {
        list.setInitial(items, items.length >= MESSAGE_PARAMS.limit);
      } else {
        list.replace(items);
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
        list.setInitial(items, items.length >= MESSAGE_PARAMS.limit);
      } else {
        list.replace(items);
      }
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
    patchMessage,
    isLoading: state.status === "loading",
  };
}
