import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function snapshotList<T>(queryClient: QueryClient, queryKey: QueryKey): T[] | undefined {
  return queryClient.getQueryData<T[]>(queryKey);
}

export function setList<T>(queryClient: QueryClient, queryKey: QueryKey, data: T[] | undefined): void {
  queryClient.setQueryData(queryKey, data);
}

export function patchListItem<T extends { id: number }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  id: number,
  updater: (item: T) => T,
): void {
  queryClient.setQueryData<T[]>(queryKey, (old) =>
    old?.map((item) => (item.id === id ? updater(item) : item)),
  );
}

export function patchList<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (items: T[]) => T[],
): void {
  queryClient.setQueryData<T[]>(queryKey, (old) => (old ? updater(old) : old));
}

export function removeListItem<T extends { id: number }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  id: number,
): void {
  queryClient.setQueryData<T[]>(queryKey, (old) => old?.filter((item) => item.id !== id));
}

export function prependListItem<T>(queryClient: QueryClient, queryKey: QueryKey, item: T): void {
  queryClient.setQueryData<T[]>(queryKey, (old) => [item, ...(old ?? [])]);
}

export function appendListItem<T>(queryClient: QueryClient, queryKey: QueryKey, item: T): void {
  queryClient.setQueryData<T[]>(queryKey, (old) => [...(old ?? []), item]);
}

export function replaceListItem<T extends { id: number }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  tempId: number,
  item: T,
): void {
  queryClient.setQueryData<T[]>(queryKey, (old) =>
    old?.map((row) => (row.id === tempId ? item : row)),
  );
}
