import { useMemo, useState } from "react";
import { Hash, Megaphone, Plus, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatUnreadBadge, formatChannelListTime } from "@/lib/chat-display";
import type { Channel } from "@workspace/api-client-react";

const SECTION_KEY = "ace-chat-sidebar-sections";

function loadSectionCollapsed(key: string): boolean {
  try {
    const raw = localStorage.getItem(SECTION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(parsed[key]);
  } catch {
    return false;
  }
}

function saveSectionCollapsed(key: string, collapsed: boolean): void {
  try {
    const raw = localStorage.getItem(SECTION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[key] = collapsed;
    localStorage.setItem(SECTION_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

interface RoomSidebarProps {
  channels: Channel[] | undefined;
  isLoading: boolean;
  selectedChannelId: number | null;
  onSelect: (id: number) => void;
  onCreateClick: () => void;
  canCreate: boolean;
  isMobile?: boolean;
}

function RoomRow({
  ch,
  isSelected,
  onSelect,
}: {
  ch: Channel;
  isSelected: boolean;
  onSelect: (id: number) => void;
}) {
  const unread = ch.unreadCount ?? 0;
  return (
    <button
      type="button"
      data-testid={`channel-item-${ch.id}`}
      onClick={() => onSelect(ch.id)}
      className={cn(
        "mb-0.5 flex w-full min-h-12 flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors active:scale-[0.99]",
        isSelected
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <div className="flex items-center gap-2">
        {ch.type === "ANNOUNCEMENT" ? (
          <Megaphone size={16} className="shrink-0" />
        ) : (
          <Hash size={16} className="shrink-0" />
        )}
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            unread > 0 && !isSelected && "font-semibold text-sidebar-foreground",
          )}
        >
          {ch.name}
        </span>
        {ch.lastPostAt ? (
          <span className="shrink-0 text-[10px] tabular-nums opacity-50">
            {formatChannelListTime(ch.lastPostAt)}
          </span>
        ) : null}
        {unread > 0 && (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
              isSelected
                ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                : "bg-red-500 text-white",
            )}
          >
            {formatUnreadBadge(unread)}
          </span>
        )}
      </div>
      {ch.lastMessagePreview ? (
        <p className={cn("truncate pl-6 text-xs", isSelected ? "opacity-80" : "opacity-50")}>
          {ch.lastMessagePreview}
        </p>
      ) : null}
    </button>
  );
}

function Section({
  title,
  sectionKey,
  channels,
  selectedChannelId,
  onSelect,
  defaultCollapsed,
}: {
  title: string;
  sectionKey: string;
  channels: Channel[];
  selectedChannelId: number | null;
  onSelect: (id: number) => void;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(
    () => loadSectionCollapsed(sectionKey) ?? defaultCollapsed ?? false,
  );

  if (!channels.length) return null;

  return (
    <div className="mb-2">
      <button
        type="button"
        className="mb-1 flex w-full items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/45 hover:text-sidebar-foreground/70"
        onClick={() => {
          const next = !collapsed;
          setCollapsed(next);
          saveSectionCollapsed(sectionKey, next);
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        {title}
        <span className="ml-auto tabular-nums">{channels.length}</span>
      </button>
      {!collapsed &&
        channels.map((ch) => (
          <RoomRow
            key={ch.id}
            ch={ch}
            isSelected={selectedChannelId === ch.id}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export function RoomSidebar({
  channels,
  isLoading,
  selectedChannelId,
  onSelect,
  onCreateClick,
  canCreate,
  isMobile,
}: RoomSidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = channels ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.lastMessagePreview?.toLowerCase().includes(q) ?? false),
    );
  }, [channels, query]);

  const unread = useMemo(
    () => filtered.filter((c) => (c.unreadCount ?? 0) > 0),
    [filtered],
  );
  const read = useMemo(
    () => filtered.filter((c) => (c.unreadCount ?? 0) === 0),
    [filtered],
  );

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground",
        isMobile ? "min-h-0 w-full flex-1" : "w-64 shrink-0 border-r border-sidebar-border",
      )}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <h2 className="text-sm font-semibold">Chat</h2>
        {canCreate && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={onCreateClick}
            aria-label="Create channel"
            data-testid="btn-create-channel"
          >
            <Plus size={18} />
          </Button>
        )}
      </div>
      <div className="border-b border-sidebar-border px-2 py-2">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sidebar-foreground/40"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels"
            className="h-9 border-sidebar-border bg-sidebar-accent/30 pl-8 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full bg-white/10" />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm text-sidebar-foreground/60">
              {query ? "No channels match your search" : "No channels yet"}
            </p>
            {canCreate && !query && (
              <Button type="button" size="sm" variant="secondary" className="gap-2" onClick={onCreateClick}>
                <Plus size={14} /> Create channel
              </Button>
            )}
          </div>
        ) : (
          <>
            <Section
              title="Unread"
              sectionKey="unread"
              channels={unread}
              selectedChannelId={selectedChannelId}
              onSelect={onSelect}
            />
            <Section
              title="Channels"
              sectionKey="channels"
              channels={read}
              selectedChannelId={selectedChannelId}
              onSelect={onSelect}
              defaultCollapsed={false}
            />
          </>
        )}
      </div>
    </div>
  );
}
