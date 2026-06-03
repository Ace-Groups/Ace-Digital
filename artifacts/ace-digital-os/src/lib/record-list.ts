/** Rocket.Chat RecordList-inspired ordered list with prepend/append/patch. */

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

  setLoading(): void {
    this.state = { items: [], status: "loading", hasMoreBefore: true };
    this.emit();
  }

  setInitial(items: T[], hasMoreBefore = true): void {
    this.state = { items: sortByCreatedAt(dedupeById(items)), status: "ready", hasMoreBefore };
    this.emit();
  }

  replace(items: T[], hasMoreBefore?: boolean): void {
    this.state = {
      items: sortByCreatedAt(dedupeById(items)),
      status: "ready",
      hasMoreBefore: hasMoreBefore ?? this.state.hasMoreBefore,
    };
    this.emit();
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
    for (const m of incoming) byId.set(m.id, m);
    this.state = {
      ...snap,
      items: sortByCreatedAt([...byId.values()]),
      status: "ready",
    };
    this.emit();
  }

  prepend(older: T[]): void {
    if (!older.length) {
      this.state = { ...this.state, hasMoreBefore: false };
      this.emit();
      return;
    }
    const ids = new Set(this.state.items.map((m) => m.id));
    const merged = [...older.filter((m) => !ids.has(m.id)), ...this.state.items];
    this.state = {
      ...this.state,
      items: sortByCreatedAt(merged),
      status: "ready",
      hasMoreBefore: older.length > 0,
    };
    this.emit();
  }

  append(newer: T[]): void {
    if (!newer.length) return;
    const ids = new Set(this.state.items.map((m) => m.id));
    const merged = [...this.state.items, ...newer.filter((m) => !ids.has(m.id))];
    this.state = { ...this.state, items: sortByCreatedAt(merged), status: "ready" };
    this.emit();
  }

  remove(id: number): void {
    const items = this.state.items.filter((m) => m.id !== id);
    if (items.length === this.state.items.length) return;
    this.state = { ...this.state, items };
    this.emit();
  }

  patch(id: number, updater: (item: T) => T): void {
    const idx = this.state.items.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const items = [...this.state.items];
    items[idx] = updater(items[idx]!);
    this.state = { ...this.state, items };
    this.emit();
  }

  setHasMoreBefore(value: boolean): void {
    if (this.state.hasMoreBefore === value) return;
    this.state = { ...this.state, hasMoreBefore: value };
    this.emit();
  }
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
