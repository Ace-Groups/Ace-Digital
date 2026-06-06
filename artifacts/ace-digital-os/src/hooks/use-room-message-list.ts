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
import { RecordList, type RecordListState } from "@/lib/record-list";
import { sameOrderedMessageIds } from "@/lib/message-list-equality";

export const CHANNEL_MESSAGE_PARAMS = { limit: 50 } as const;

const channelLists = new Map<number, RecordList<Message>>();

/** Stable snapshot when no channel list is mounted (useSyncExternalStore contract). */
const EMPTY_MESSAGE_LIST_SNAPSHOT: RecordListState<Message> = {
  items: [],
  status: "loading",
  hasMoreBefore: true,
};

function shouldSkipIncomingMerge(existing: Message[], incoming: Message[]): boolean {
  if (!incoming.length) return true;
  if (existing.length === incoming.length) {
    return sameOrderedMessageIds(existing, incoming);
  }
  if (existing.length > incoming.length) {
    const tail = existing.slice(-incoming.length);
    return sameOrderedMessageIds(tail, incoming);
  }
  return false;
}

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

  const getSnapshot = useCallback(() => {
    if (list) return list.getSnapshot();
    return EMPTY_MESSAGE_LIST_SNAPSHOT;
  }, [list]);

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
        if (!shouldSkipIncomingMerge(snap.items, items)) {
          list.mergeRealtime(items);
        }
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

  const replaceMessageByClientId = useCallback(
    (clientId: string, msg: Message) => {
      list?.replaceByClientId(clientId, msg);
    },
    [list],
  );

  const upsertMessage = useCallback(
    (msg: Message) => {
      list?.upsertOne(msg);
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
    replaceMessageByClientId,
    upsertMessage,
    isLoading: state.status === "loading" && state.items.length === 0,
  };
}

/** Stable key so sync effect does not run when React Query returns a new array ref with same ids. */
export function useMessageListSyncKey(messages: Message[] | undefined): string {
  return useMemo(
    () => (messages?.length ? messages.map((m) => m.id).join(",") : ""),
    [messages],
  );
}
