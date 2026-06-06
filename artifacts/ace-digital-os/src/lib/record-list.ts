/** Rocket.Chat RecordList-inspired ordered list with prepend/append/patch. */

import { messageClientId, tempMessageIdFromClientId } from "@/lib/chat-message-ids";

export type RecordListStatus = "loading" | "ready" | "updating";

export type RecordListState<T extends { id: number }> = {
  items: T[];
  status: RecordListStatus;
  hasMoreBefore: boolean;
};

type Listener = () => void;

type HasCreatedAt = { id: number; createdAt: string };

export class RecordList<T extends { id: number }> {
  private state: RecordListState<T> = {
    items: [],
    status: "loading",
    hasMoreBefore: true,
  };
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): RecordListState<T> {
    return this.state;
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  private commit(next: RecordListState<T>): void {
    if (
      this.state.status === next.status &&
      this.state.hasMoreBefore === next.hasMoreBefore &&
      sameItemsSnapshot(this.state.items, next.items)
    ) {
      return;
    }
    this.state = next;
    this.emit();
  }

  setLoading(): void {
    if (this.state.status === "loading" && this.state.items.length === 0) return;
    this.commit({ items: [], status: "loading", hasMoreBefore: true });
  }

  setInitial(items: T[], hasMoreBefore = true): void {
    this.commit({
      items: sortByCreatedAt(dedupeById(items)),
      status: "ready",
      hasMoreBefore,
    });
  }

  replace(items: T[], hasMoreBefore?: boolean): void {
    this.commit({
      items: sortByCreatedAt(dedupeById(items)),
      status: "ready",
      hasMoreBefore: hasMoreBefore ?? this.state.hasMoreBefore,
    });
  }

  mergeRealtime(incoming: T[]): void {
    if (!incoming.length) return;
    const snap = this.state;
    const minIncomingTime = Math.min(
      ...incoming.map((m) => createdAtMs(m as T & HasCreatedAt)),
    );
    const olderKept = snap.items.filter(
      (m) => createdAtMs(m as T & HasCreatedAt) < minIncomingTime,
    );
    const byId = new Map<number, T>();
    for (const m of olderKept) byId.set(m.id, m);
    for (const m of incoming) {
      const existing = byId.get(m.id);
      byId.set(m.id, existing && shallowRecordEqual(existing, m) ? existing : m);
    }
    this.commit({
      ...snap,
      items: sortByCreatedAt([...byId.values()]),
      status: "ready",
    });
  }

  prepend(older: T[]): void {
    if (!older.length) {
      this.commit({ ...this.state, hasMoreBefore: false });
      return;
    }
    const ids = new Set(this.state.items.map((m) => m.id));
    const merged = [...older.filter((m) => !ids.has(m.id)), ...this.state.items];
    this.commit({
      ...this.state,
      items: sortByCreatedAt(merged),
      status: "ready",
      hasMoreBefore: older.length > 0,
    });
  }

  append(newer: T[]): void {
    if (!newer.length) return;
    const ids = new Set(this.state.items.map((m) => m.id));
    const merged = [...this.state.items, ...newer.filter((m) => !ids.has(m.id))];
    this.commit({ ...this.state, items: sortByCreatedAt(merged), status: "ready" });
  }

  remove(id: number): void {
    const items = this.state.items.filter((m) => m.id !== id);
    if (items.length === this.state.items.length) return;
    this.commit({ ...this.state, items });
  }

  patch(id: number, updater: (item: T) => T): void {
    const idx = this.state.items.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const items = [...this.state.items];
    items[idx] = updater(items[idx]!);
    this.commit({ ...this.state, items });
  }

  replaceByClientId(clientId: string, msg: T): void {
    const tempId = tempMessageIdFromClientId(clientId);
    const kept = this.state.items.filter((m) => {
      if (messageClientId(m) === clientId) return false;
      if (m.id === tempId) return false;
      if (m.id === msg.id) return false;
      return true;
    });
    this.commit({
      ...this.state,
      items: sortByCreatedAt(dedupeById([...kept, msg])),
      status: "ready",
    });
  }

  upsertOne(incoming: T): void {
    const clientId = messageClientId(incoming);
    if (clientId) {
      const tempId = tempMessageIdFromClientId(clientId);
      const kept = this.state.items.filter((m) => {
        if (messageClientId(m) === clientId) return false;
        if (m.id === tempId) return false;
        if (m.id === incoming.id) return false;
        return true;
      });
      this.commit({
        ...this.state,
        items: sortByCreatedAt(dedupeById([...kept, incoming])),
        status: "ready",
      });
      return;
    }
    this.mergeRealtime([incoming]);
  }

  setHasMoreBefore(value: boolean): void {
    if (this.state.hasMoreBefore === value) return;
    this.commit({ ...this.state, hasMoreBefore: value });
  }
}

function shallowRecordEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]) {
      return false;
    }
  }
  return true;
}

function sameItemsSnapshot<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function createdAtMs(m: HasCreatedAt): number {
  return new Date(m.createdAt).getTime();
}

function sortByCreatedAt<T extends { id: number }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      createdAtMs(a as T & HasCreatedAt) - createdAtMs(b as T & HasCreatedAt),
  );
}

function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}
