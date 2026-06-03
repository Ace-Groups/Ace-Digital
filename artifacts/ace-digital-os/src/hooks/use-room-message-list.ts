import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getChannelMessages,
  type Message,
  getGetChannelMessagesQueryKey,
} from "@workspace/api-client-react";
import { RecordList } from "@/lib/record-list";

export const CHANNEL_MESSAGE_PARAMS = { limit: 50 } as const;

const channelLists = new Map<number, RecordList<Message>>();

function getChannelList(channelId: number): RecordList<Message> {
  let list = channelLists.get(channelId);
  if (!list) {
    list = new RecordList<Message>();
    channelLists.set(channelId, list);
  }
  return list;
}

function hydrateFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: number,
  list: RecordList<Message>,
): boolean {
  const cached = queryClient.getQueryData<Message[]>(
    getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS),
  );
  if (cached === undefined) return false;
  const snap = list.getSnapshot();
  if (snap.status === "ready" && snap.items.length > 0) return true;
  list.setInitial(cached, cached.length >= CHANNEL_MESSAGE_PARAMS.limit);
  return true;
}

export function useRoomMessageList(channelId: number | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const list = channelId && enabled ? getChannelList(channelId) : null;

  const subscribe = useCallback(
    (onStoreChange: () => void) => list?.subscribe(onStoreChange) ?? (() => {}),
    [list],
  );
  const getSnapshot = useCallback(
    () =>
      list?.getSnapshot() ?? {
        items: [] as Message[],
        status: "loading" as const,
        hasMoreBefore: true,
      },
    [list],
  );

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useLayoutEffect(() => {
    if (!enabled || !channelId || !list) return;
    if (hydrateFromCache(queryClient, channelId, list)) return;
    if (list.getSnapshot().status !== "ready") {
      list.setLoading();
    }
  }, [channelId, enabled, list, queryClient]);

  const syncFromQuery = useCallback(
    (items: Message[]) => {
      if (!list) return;
      const snap = list.getSnapshot();
      if (snap.status === "loading") {
        list.setInitial(items, items.length >= CHANNEL_MESSAGE_PARAMS.limit);
        return;
      }
      if (items.length > 0) {
        list.mergeRealtime(items);
      } else if (snap.items.length === 0) {
        list.setInitial([], false);
      }
    },
    [list],
  );

  const loadOlder = useCallback(async (): Promise<boolean> => {
    if (!channelId || !list) return false;
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
      if (!list) return;
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
      list?.append([msg]);
    },
    [list],
  );

  const patchMessage = useCallback(
    (id: number, updater: (m: Message) => Message) => {
      list?.patch(id, updater);
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
    isLoading: state.status === "loading" && state.items.length === 0,
  };
}
