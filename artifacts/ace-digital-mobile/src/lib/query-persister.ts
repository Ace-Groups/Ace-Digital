import * as FileSystem from 'expo-file-system/legacy';
import { type QueryClient } from '@tanstack/react-query';

const CACHE_FILE_PATH = FileSystem.documentDirectory + 'query_cache_v1.json';
const PERSIST_KEYS = ['dashboard', 'channels', 'projects', 'tasks', 'channel-messages'];

export async function loadPersistedQueryCache(queryClient: QueryClient) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(CACHE_FILE_PATH);
    if (!fileInfo.exists) return;

    const content = await FileSystem.readAsStringAsync(CACHE_FILE_PATH);
    const parsed = JSON.parse(content);

    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([keyStr, value]: any) => {
        try {
          const key = JSON.parse(keyStr);
          queryClient.setQueryData(key, value.data, {
            updatedAt: value.updatedAt,
          });
        } catch (e) {
          console.warn('[query-persister] failed to restore key', keyStr, e);
        }
      });
      console.log('[query-persister] successfully restored cache keys');
    }
  } catch (err) {
    console.warn('[query-persister] failed to load persisted query cache', err);
  }
}

export function subscribeToPersistQueryCache(queryClient: QueryClient) {
  let saveTimeout: any = null;

  return queryClient.getQueryCache().subscribe((event) => {
    // Only save when a query is updated with data
    if (event.type !== 'updated' || !event.query.state.data) return;

    // Check if the query key matches one of our persistable keys
    const queryKey = event.query.queryKey;
    const shouldPersist = PERSIST_KEYS.some((pk) => queryKey.includes(pk));
    if (!shouldPersist) return;

    // Throttle writes to avoid excessive I/O operations
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const cacheState: Record<string, any> = {};
        const queries = queryClient.getQueryCache().getAll();

        queries.forEach((q) => {
          const key = q.queryKey;
          const matches = PERSIST_KEYS.some((pk) => key.includes(pk));
          if (matches && q.state.data) {
            cacheState[JSON.stringify(key)] = {
              data: q.state.data,
              updatedAt: q.state.dataUpdatedAt,
            };
          }
        });

        await FileSystem.writeAsStringAsync(CACHE_FILE_PATH, JSON.stringify(cacheState));
      } catch (err) {
        console.warn('[query-persister] failed to save query cache', err);
      }
    }, 1000);
  });
}
