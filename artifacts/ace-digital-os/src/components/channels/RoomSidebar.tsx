import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, ChevronDown, ChevronRight, Hash, Loader2 } from "lucide-react";
import { ChannelIcon } from "@/components/channels/ChannelIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { formatUnreadBadge, formatChannelListTime } from "@/lib/chat-display";
import {
  useListDms,
  getListDmsQueryKey,
  useListEmployees,
  getListEmployeesQueryKey,
  useOpenDm,
  getListChannelsQueryKey,
  ApiError,
} from "@workspace/api-client-react";
import type { Channel } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

function channelDisplayName(ch: Channel): string {
  if (ch.type === "DM") return ch.dmPeerName ?? ch.name;
  return ch.name;
}

interface RoomSidebarProps {
  channels: Channel[] | undefined;
  isLoading: boolean;
  selectedChannelId: number | null;
  onSelect: (id: number) => void;
  onCreateClick: () => void;
  onOpenDmClick?: () => void;
  canCreate: boolean;
  isMobile?: boolean;
}

function RoomRow({
  ch,
  isSelected,
  onSelect,
  showHash = true,
}: {
  ch: Channel;
  isSelected: boolean;
  onSelect: (id: number) => void;
  showHash?: boolean;
}) {
  const unread = ch.unreadCount ?? 0;
  const label = channelDisplayName(ch);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      data-testid={`channel-item-${ch.id}`}
      onClick={() => onSelect(ch.id)}
      className={cn(
        "mb-0.5 flex w-full min-h-11 items-center gap-2 rounded-md px-2.5 py-2.5 text-left text-sm transition-colors",
        isSelected
          ? "bg-primary/10 font-semibold text-foreground ring-1 ring-inset ring-primary/20 dark:bg-sidebar-accent dark:font-medium dark:text-sidebar-accent-foreground dark:ring-0"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      {ch.type === "DM" ? (
        <UserAvatar
          fullName={label}
          avatarUrl={ch.dmPeerAvatar}
          className="size-5 shrink-0 rounded-md"
          iconSize={10}
        />
      ) : (
        <ChannelIcon channel={ch} size={16} className="shrink-0 opacity-70" />
      )}
      <span className="min-w-0 flex-1 truncate">
        {showHash && ch.type !== "DM" ? "#" : ""}
        {label}
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
              ? "bg-primary text-primary-foreground dark:bg-sidebar-primary dark:text-sidebar-primary-foreground"
              : "bg-red-500 text-white",
          )}
        >
          {formatUnreadBadge(unread)}
        </span>
      )}
    </motion.button>
  );
}

function Section({
  title,
  sectionKey,
  channels,
  selectedChannelId,
  onSelect,
  defaultCollapsed,
  footer,
  icon,
  showHash = true,
}: {
  title: string;
  sectionKey: string;
  channels: Channel[];
  selectedChannelId: number | null;
  onSelect: (id: number) => void;
  defaultCollapsed?: boolean;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  showHash?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(
    () => loadSectionCollapsed(sectionKey) ?? defaultCollapsed ?? false,
  );

  return (
    <div className="mb-2">
      <button
        type="button"
        className="mb-1 flex w-full items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/55 hover:text-sidebar-foreground"
        onClick={() => {
          const next = !collapsed;
          setCollapsed(next);
          saveSectionCollapsed(sectionKey, next);
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        {icon}
        {title}
        <span className="ml-auto tabular-nums">{channels.length}</span>
      </button>
      {!collapsed && (
        <>
          {channels.length === 0 ? (
            <p className="px-3 py-1 text-xs text-sidebar-foreground/40">None yet</p>
          ) : (
            channels.map((ch) => (
              <RoomRow
                key={ch.id}
                ch={ch}
                isSelected={selectedChannelId === ch.id}
                onSelect={onSelect}
                showHash={showHash}
              />
            ))
          )}
          {footer}
        </>
      )}
    </div>
  );
}

interface DirectMessagesSectionProps {
  dms: Channel[];
  selectedChannelId: number | null;
  onSelect: (id: number) => void;
  onOpenDmClick?: () => void;
}

function DirectMessagesSection({
  dms,
  selectedChannelId,
  onSelect,
  onOpenDmClick,
}: DirectMessagesSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const openDm = useOpenDm();

  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState(
    () => loadSectionCollapsed("dms") ?? false
  );
  const [loadingUserId, setLoadingUserId] = useState<number | null>(null);

  const { data: employees, isLoading: employeesLoading } = useListEmployees(undefined, {
    query: {
      queryKey: getListEmployeesQueryKey(),
      staleTime: 60_000,
    },
  });

  const activeDmPeerUserIds = useMemo(() => {
    return new Set(
      (dms ?? []).map((d) => d.dmPeerUserId).filter(Boolean) as number[]
    );
  }, [dms]);

  const searchedTeammates = useMemo(() => {
    const q = dmSearchQuery.trim().toLowerCase();
    if (!q || !employees) return [];
    return employees
      .filter((e) => e.id !== user?.id)
      .filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      );
  }, [employees, dmSearchQuery, user?.id]);

  const suggestedMembers = useMemo(() => {
    if (!employees) return [];
    return employees
      .filter((e) => e.id !== user?.id)
      .filter((e) => !activeDmPeerUserIds.has(e.id))
      .slice(0, 5);
  }, [employees, activeDmPeerUserIds, user?.id]);

  async function handleSelectEmployee(employeeId: number) {
    setLoadingUserId(employeeId);
    try {
      const channel = await openDm.mutateAsync({ data: { userId: employeeId } });
      await queryClient.invalidateQueries({ queryKey: getListDmsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
      onSelect(channel.id);
      setDmSearchQuery("");
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not open direct message";
      toast({ title: detail, variant: "destructive" });
    } finally {
      setLoadingUserId(null);
    }
  }

  return (
    <div className="mb-2">
      <button
        type="button"
        className="mb-1 flex w-full items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/55 hover:text-sidebar-foreground"
        onClick={() => {
          const next = !collapsed;
          setCollapsed(next);
          saveSectionCollapsed("dms", next);
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        Direct messages
        <span className="ml-auto tabular-nums">{dms.length}</span>
      </button>

      {!collapsed && (
        <div className="space-y-1">
          {/* DM Search input */}
          <div className="relative mx-1.5 mb-2">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sidebar-foreground/40"
            />
            <Input
              value={dmSearchQuery}
              onChange={(e) => setDmSearchQuery(e.target.value)}
              placeholder="Find or message teammate..."
              className="h-8 border-sidebar-border bg-background/50 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/60 dark:bg-sidebar-accent/20 dark:text-sidebar-foreground dark:placeholder:text-sidebar-foreground/30 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            {dmSearchQuery && (
              <button
                type="button"
                onClick={() => setDmSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-sidebar-foreground/45 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Plus size={10} className="rotate-45" />
              </button>
            )}
          </div>

          {/* Searched / filtered view */}
          {dmSearchQuery ? (
            <div className="space-y-0.5 px-1.5">
              <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
                Teammate Search Results
              </div>
              {employeesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-sidebar-foreground/40" />
                </div>
              ) : searchedTeammates.length === 0 ? (
                <p className="px-2 py-2 text-xs text-sidebar-foreground/40">No teammate found</p>
              ) : (
                searchedTeammates.map((emp) => {
                  const isPending = loadingUserId === emp.id;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      disabled={isPending || openDm.isPending}
                      onClick={() => void handleSelectEmployee(emp.id)}
                      className={cn(
                        "flex w-full min-h-10 items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
                        (isPending || openDm.isPending) && "opacity-60"
                      )}
                    >
                      <UserAvatar
                        fullName={emp.fullName}
                        avatarUrl={emp.avatarUrl}
                        className="size-5 shrink-0 rounded-md"
                        iconSize={10}
                      />
                      <span className="min-w-0 flex-1 truncate">{emp.fullName}</span>
                      {isPending && <Loader2 className="size-3 animate-spin text-sidebar-foreground/40 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <>
              {/* Active DM list */}
              {dms.length === 0 ? (
                <p className="px-3 py-1 text-xs text-sidebar-foreground/40">None yet</p>
              ) : (
                dms.map((ch) => (
                  <RoomRow
                    key={ch.id}
                    ch={ch}
                    isSelected={selectedChannelId === ch.id}
                    onSelect={onSelect}
                    showHash={false}
                  />
                ))
              )}

              {/* Suggestions list */}
              {suggestedMembers.length > 0 && (
                <div className="mt-3 space-y-0.5 pt-2 border-t border-sidebar-border/30 px-1.5">
                  <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
                    Suggested to chat
                  </div>
                  {suggestedMembers.map((emp) => {
                    const isPending = loadingUserId === emp.id;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        disabled={isPending || openDm.isPending}
                        onClick={() => void handleSelectEmployee(emp.id)}
                        className={cn(
                          "group flex w-full min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors",
                          (isPending || openDm.isPending) && "opacity-60"
                        )}
                      >
                        <UserAvatar
                          fullName={emp.fullName}
                          avatarUrl={emp.avatarUrl}
                          className="size-5 shrink-0 rounded-md opacity-85"
                          iconSize={10}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs">{emp.fullName}</span>
                        {isPending ? (
                          <Loader2 className="size-3 animate-spin text-sidebar-foreground/40 shrink-0" />
                        ) : (
                          <Plus size={12} className="text-sidebar-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity hover:text-sidebar-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Plus message button at footer */}
          {onOpenDmClick && (
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              onClick={onOpenDmClick}
            >
              <Plus size={14} />
              Message someone
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function RoomSidebar({
  channels,
  isLoading,
  selectedChannelId,
  onSelect,
  onCreateClick,
  onOpenDmClick,
  canCreate,
  isMobile,
}: RoomSidebarProps) {
  const [query, setQuery] = useState("");
  const { data: dms } = useListDms({
    query: { queryKey: getListDmsQueryKey(), staleTime: 30_000 },
  });

  const teamChannels = useMemo(() => {
    const list = (channels ?? []).filter((c) => c.type !== "DM");
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.lastMessagePreview?.toLowerCase().includes(q) ?? false),
    );
  }, [channels, query]);

  const starred = useMemo(
    () => teamChannels.filter((c) => c.starred),
    [teamChannels],
  );
  const regular = useMemo(
    () => teamChannels.filter((c) => !c.starred),
    [teamChannels],
  );

  const dmList = useMemo(() => {
    const list = dms ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => (c.dmPeerName ?? c.name).toLowerCase().includes(q));
  }, [dms, query]);

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground dark:bg-background/60 dark:backdrop-blur-md",
        isMobile
          ? "min-h-0 w-full flex-1 pt-[env(safe-area-inset-top)]"
          : "w-64 shrink-0 border-r border-sidebar-border dark:border-white/10",
      )}
    >
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-sidebar-border px-3 py-2">
        <h2 className="text-base font-semibold sm:text-sm">Chat</h2>
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
            placeholder="Search"
            className="h-9 border-sidebar-border bg-background pl-8 text-sm text-foreground shadow-none placeholder:text-muted-foreground dark:bg-sidebar-accent/30 dark:text-sidebar-foreground dark:placeholder:text-sidebar-foreground/40"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 [-webkit-overflow-scrolling:touch]">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full bg-white/10" />
            ))}
          </div>
        ) : (
          <>
            <Section
              title="Starred"
              sectionKey="starred"
              channels={starred}
              selectedChannelId={selectedChannelId}
              onSelect={onSelect}
              defaultCollapsed={starred.length === 0}
              icon={<span className="text-amber-400">★</span>}
            />
            <Section
              title="Channels"
              sectionKey="channels"
              channels={regular}
              selectedChannelId={selectedChannelId}
              onSelect={onSelect}
              icon={<Hash size={12} className="opacity-60" />}
              footer={
                canCreate ? (
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    onClick={onCreateClick}
                  >
                    <Plus size={14} />
                    Add channels
                  </button>
                ) : null
              }
            />
            <DirectMessagesSection
              dms={dmList}
              selectedChannelId={selectedChannelId}
              onSelect={onSelect}
              onOpenDmClick={onOpenDmClick}
            />
          </>
        )}
      </div>
    </div>
  );
}
