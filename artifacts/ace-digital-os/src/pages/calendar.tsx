import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetCalendarFeed,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  useListEmployees,
  getGetCalendarFeedQueryKey,
  getListEmployeesQueryKey,
  type CalendarEventInputEventType,
  type CalendarEventInputVisibility,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";
import { CalendarMonthView, KIND_COLORS } from "@/components/calendar/CalendarMonthView";
import { CalendarAgendaView } from "@/components/calendar/CalendarAgendaView";
import { CalendarWeekView, startOfWeek } from "@/components/calendar/CalendarWeekView";
import { CalendarEventSheet } from "@/components/calendar/CalendarEventSheet";
import type { CalendarEvent, CalendarFeedItem } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { patchList, prependListItem, removeListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";

type ViewMode = "month" | "week" | "agenda";

function monthRange(d: Date): { from: string; to: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  return { from: start.toISOString(), to: end.toISOString() };
}

function weekRange(d: Date): { from: string; to: string } {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [selectedItem, setSelectedItem] = useState<CalendarFeedItem | null>(null);
  const [viewUserId, setViewUserId] = useState<number | undefined>(undefined);

  const range = useMemo(
    () => (view === "week" ? weekRange(selectedDate) : monthRange(cursor)),
    [view, cursor, selectedDate],
  );
  const canScheduleOthers = can("calendar:write_others");

  const { data: feed, isLoading } = useGetCalendarFeed(
    {
      from: range.from,
      to: range.to,
      userId: viewUserId,
      includeTasks: true,
      includeLinkedChat: true,
    },
    { query: { queryKey: getGetCalendarFeedQueryKey({ from: range.from, to: range.to, userId: viewUserId }) } },
  );

  const { data: employees } = useListEmployees(undefined, {
    query: { enabled: canScheduleOthers, queryKey: getListEmployeesQueryKey() },
  });

  const employeeOptions = useMemo(
    () => (employees ?? []).map((e) => ({ id: e.id, fullName: e.fullName })),
    [employees],
  );

  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const monthLabel = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const headerLabel =
    view === "week"
      ? `${startOfWeek(selectedDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(startOfWeek(selectedDate).getTime() + 6 * 86400000).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`
      : monthLabel;

  function shiftPeriod(delta: number) {
    if (view === "week") {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + delta * 7);
      setSelectedDate(next);
      setCursor(next);
      return;
    }
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  const feedKey = getGetCalendarFeedQueryKey({
    from: range.from,
    to: range.to,
    userId: viewUserId,
  });

  async function handleCreate(values: {
    title: string;
    description: string;
    eventType: string;
    startAt: string;
    endAt: string;
    location: string;
    ownerId: string;
    attendeeIds: number[];
    visibility: string;
  }) {
    const tempId = `temp-${Date.now()}`;
    const startAt = new Date(values.startAt).toISOString();
    const endAt = values.endAt ? new Date(values.endAt).toISOString() : null;
    setSheetOpen(false);
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<CalendarFeedItem>(queryClient, feedKey);
          prependListItem(queryClient, feedKey, {
            id: tempId,
            kind: "event",
            title: values.title,
            description: values.description || null,
            eventType: values.eventType,
            startAt,
            endAt,
            location: values.location || null,
            readOnly: false,
            ownerId: Number(values.ownerId),
          });
          return prev;
        },
        rollback: (prev) => setList(queryClient, feedKey, prev),
        commit: () =>
          createEvent.mutateAsync({
            data: {
              title: values.title,
              description: values.description || undefined,
              eventType: values.eventType as CalendarEventInputEventType,
              startAt,
              endAt: endAt ?? undefined,
              location: values.location || undefined,
              ownerId: Number(values.ownerId),
              attendeeIds: values.attendeeIds,
              visibility: values.visibility as CalendarEventInputVisibility,
            },
          }),
        reconcile: (created) => {
          patchList<CalendarFeedItem>(queryClient, feedKey, (list) =>
            list.map((item) =>
              item.id === tempId
                ? {
                    id: `event-${created.id}`,
                    kind: "event",
                    title: created.title,
                    description: created.description ?? null,
                    eventType: created.eventType,
                    startAt: created.startAt,
                    endAt: created.endAt ?? null,
                    location: created.location ?? null,
                    readOnly: false,
                    ownerId: created.ownerId,
                    eventId: created.id,
                  }
                : item,
            ),
          );
        },
      });
      toast({ title: "Event created" });
    } catch {
      toast({ title: "Failed to create event", variant: "destructive" });
    }
  }

  async function handleUpdate(values: {
    title: string;
    description: string;
    eventType: string;
    startAt: string;
    endAt: string;
    location: string;
    attendeeIds: number[];
    visibility: string;
  }) {
    if (!editing) return;
    const eventId = editing.id;
    const startAt = new Date(values.startAt).toISOString();
    const endAt = values.endAt ? new Date(values.endAt).toISOString() : null;
    setSheetOpen(false);
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<CalendarFeedItem>(queryClient, feedKey);
          patchList<CalendarFeedItem>(queryClient, feedKey, (list) =>
            list.map((item) =>
              item.eventId === eventId
                ? {
                    ...item,
                    title: values.title,
                    description: values.description || null,
                    eventType: values.eventType,
                    startAt,
                    endAt,
                    location: values.location || null,
                  }
                : item,
            ),
          );
          return prev;
        },
        rollback: (prev) => setList(queryClient, feedKey, prev),
        commit: () =>
          updateEvent.mutateAsync({
            id: eventId,
            data: {
              title: values.title,
              description: values.description || undefined,
              eventType: values.eventType as CalendarEventInputEventType,
              startAt,
              endAt: endAt ?? undefined,
              location: values.location || undefined,
              attendeeIds: values.attendeeIds,
              visibility: values.visibility as CalendarEventInputVisibility,
            },
          }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: feedKey });
        },
      });
      toast({ title: "Event updated" });
    } catch {
      toast({ title: "Failed to update event", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!editing) return;
    const eventId = editing.id;
    setSheetOpen(false);
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<CalendarFeedItem>(queryClient, feedKey);
          patchList<CalendarFeedItem>(queryClient, feedKey, (list) =>
            list.filter((item) => item.eventId !== eventId),
          );
          return prev;
        },
        rollback: (prev) => setList(queryClient, feedKey, prev),
        commit: () => deleteEvent.mutateAsync({ id: eventId }),
      });
      toast({ title: "Event deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  function openNew() {
    setEditing(null);
    setSelectedItem(null);
    setSheetOpen(true);
  }

  async function openItem(item: CalendarFeedItem) {
    setSelectedItem(item);
    if (item.readOnly || !item.eventId) {
      setEditing(null);
      setSheetOpen(true);
      return;
    }
    try {
      const events = await queryClient.fetchQuery({
        queryKey: ["listCalendarEvents", range.from, range.to],
        queryFn: async () => {
          const res = await fetch(
            `/api/v1/calendar/events?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}${viewUserId ? `&userId=${viewUserId}` : ""}`,
            { credentials: "include" },
          );
          return (await res.json()) as CalendarEvent[];
        },
      });
      setEditing(events.find((e) => e.id === item.eventId) ?? null);
    } catch {
      setEditing(null);
    }
    setSheetOpen(true);
  }

  return (
    <AppLayout title="Calendar">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftPeriod(-1)}>
              <ChevronLeft size={18} />
            </Button>
            <h2 className="min-w-[10rem] text-center text-lg font-semibold">{headerLabel}</h2>
            <Button variant="outline" size="icon" onClick={() => shiftPeriod(1)}>
              <ChevronRight size={18} />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canScheduleOthers && employees?.length ? (
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={viewUserId ?? user?.id ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setViewUserId(id === user?.id ? undefined : id);
                }}
              >
                <option value={user?.id}>{user?.fullName} (me)</option>
                {employees
                  ?.filter((e) => e.id !== user?.id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName}
                    </option>
                  ))}
              </select>
            ) : null}
            <div className="flex rounded-lg border border-border p-0.5">
              {(["month", "week", "agenda"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm capitalize",
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            {can("calendar:write") && (
              <Button onClick={openNew}>
                <Plus size={18} className="mr-1" />
                New
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(KIND_COLORS).map(([kind, cls]) => (
            <span key={kind} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", cls)} />
              {kind.replace("_", " ")}
            </span>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : view === "month" ? (
          <CalendarMonthView
            month={cursor}
            items={feed ?? []}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setView("agenda");
            }}
          />
        ) : view === "week" ? (
          <CalendarWeekView
            weekStart={selectedDate}
            items={feed ?? []}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectItem={(it) => void openItem(it)}
          />
        ) : null}

        {(view === "agenda" || (view === "month" && !isLoading)) && (
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <p className="mb-3 text-sm font-medium">
              {selectedDate.toLocaleDateString("en-IN", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <CalendarAgendaView
              items={feed ?? []}
              selectedDate={selectedDate}
              onSelectItem={(it) => void openItem(it)}
            />
          </div>
        )}
      </div>

      {user && (
        <CalendarEventSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          initialDate={selectedDate}
          editing={editing}
          feedItem={selectedItem}
          employees={employeeOptions.length ? employeeOptions : [{ id: user.id, fullName: user.fullName }]}
          currentUserId={user.id}
          saving={createEvent.isPending || updateEvent.isPending}
          onSubmit={editing ? handleUpdate : handleCreate}
          onDelete={editing ? handleDelete : undefined}
        />
      )}
    </AppLayout>
  );
}
