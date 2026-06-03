import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssigneeMultiSelect } from "@/components/tasks/AssigneeMultiSelect";
import type { CalendarEvent, CalendarFeedItem } from "@workspace/api-client-react";
import { usePermissions } from "@/hooks/use-permissions";

const EVENT_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "deadline", label: "Deadline" },
  { value: "shift", label: "Shift" },
  { value: "training", label: "Training" },
  { value: "company", label: "Company" },
  { value: "other", label: "Other" },
];

type FormValues = {
  title: string;
  description: string;
  eventType: string;
  startAt: string;
  endAt: string;
  location: string;
  ownerId: string;
  attendeeIds: number[];
  visibility: string;
};

interface CalendarEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  editing?: CalendarEvent | null;
  feedItem?: CalendarFeedItem | null;
  employees: { id: number; fullName: string }[];
  currentUserId: number;
  onSubmit: (values: FormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  saving?: boolean;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarEventSheet({
  open,
  onOpenChange,
  initialDate,
  editing,
  feedItem,
  employees,
  currentUserId,
  onSubmit,
  onDelete,
  saving,
}: CalendarEventSheetProps) {
  const { can } = usePermissions();
  const canScheduleOthers = can("calendar:write_others");
  const readOnly = feedItem?.readOnly ?? false;

  const form = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      eventType: "meeting",
      startAt: toLocalInput(initialDate ?? new Date()),
      endAt: "",
      location: "",
      ownerId: String(currentUserId),
      attendeeIds: [currentUserId],
      visibility: "private",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        title: editing.title,
        description: editing.description ?? "",
        eventType: editing.eventType,
        startAt: toLocalInput(new Date(editing.startAt)),
        endAt: editing.endAt ? toLocalInput(new Date(editing.endAt)) : "",
        location: editing.location ?? "",
        ownerId: String(editing.ownerId),
        attendeeIds: editing.attendeeIds ?? [editing.ownerId],
        visibility: editing.visibility,
      });
    } else if (feedItem && readOnly) {
      form.reset({
        title: feedItem.title,
        description: feedItem.description ?? "",
        eventType: feedItem.eventType ?? "deadline",
        startAt: toLocalInput(new Date(feedItem.startAt)),
        endAt: feedItem.endAt ? toLocalInput(new Date(feedItem.endAt)) : "",
        location: feedItem.location ?? "",
        ownerId: String(currentUserId),
        attendeeIds: [currentUserId],
        visibility: "private",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        eventType: "meeting",
        startAt: toLocalInput(initialDate ?? new Date()),
        endAt: "",
        location: "",
        ownerId: String(currentUserId),
        attendeeIds: [currentUserId],
        visibility: "private",
      });
    }
  }, [open, editing, feedItem, readOnly, initialDate, currentUserId, form]);

  const title = readOnly ? "Event details" : editing ? "Edit event" : "New event";

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={title}>
      <form
        className="space-y-4 px-1 pb-4"
        onSubmit={form.handleSubmit(async (v) => {
          if (!readOnly) await onSubmit(v);
          onOpenChange(false);
        })}
      >
        <div className="space-y-2">
          <Label>Title</Label>
          <Input {...form.register("title", { required: true })} disabled={readOnly} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea {...form.register("description")} disabled={readOnly} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.watch("eventType")}
              onValueChange={(v) => form.setValue("eventType", v)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canScheduleOthers && !readOnly ? (
            <div className="space-y-2">
              <Label>Schedule for</Label>
              <Select
                value={form.watch("ownerId")}
                onValueChange={(v) => {
                  form.setValue("ownerId", v);
                  const id = Number(v);
                  form.setValue("attendeeIds", [...new Set([...form.getValues("attendeeIds"), id])]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Starts</Label>
            <Input type="datetime-local" {...form.register("startAt")} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>Ends</Label>
            <Input type="datetime-local" {...form.register("endAt")} disabled={readOnly} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input {...form.register("location")} disabled={readOnly} placeholder="Office / Zoom" />
        </div>
        {!readOnly ? (
          <AssigneeMultiSelect
            employees={employees}
            selectedIds={form.watch("attendeeIds")}
            onChange={(ids) => form.setValue("attendeeIds", ids)}
          />
        ) : null}
        {!readOnly && (
          <Button type="submit" className="w-full" disabled={saving}>
            {editing ? "Save changes" : "Create event"}
          </Button>
        )}
        {editing && onDelete && !readOnly ? (
          <Button type="button" variant="destructive" className="w-full" onClick={() => void onDelete()}>
            Delete event
          </Button>
        ) : null}
      </form>
    </ResponsiveSheet>
  );
}
