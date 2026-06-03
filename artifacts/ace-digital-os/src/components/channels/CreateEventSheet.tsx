import { useState } from "react";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";

interface CreateEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    title: string;
    startAt: string;
    endAt?: string | null;
    location?: string | null;
    rsvps: { going: number[]; maybe: number[]; no: number[] };
  }) => void;
}

export function CreateEventSheet({ open, onOpenChange, onCreate }: CreateEventSheetProps) {
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");

  function reset() {
    setTitle("");
    setStartAt("");
    setEndAt("");
    setLocation("");
  }

  function handleSubmit() {
    if (!title.trim() || !startAt) return;
    onCreate({
      title: title.trim(),
      startAt: new Date(startAt).toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : null,
      location: location.trim() || null,
      rsvps: { going: [], maybe: [], no: [] },
    });
    reset();
    onOpenChange(false);
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Create event">
      <div className="space-y-4 px-1 pb-4">
        <div className="space-y-2">
          <Label htmlFor="event-title">Title</Label>
          <Input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Team standup"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-start">Starts</Label>
          <DateTimePicker
            id="event-start"
            value={startAt}
            onChange={setStartAt}
            placeholder="Start date & time"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-end">Ends (optional)</Label>
          <DateTimePicker
            id="event-end"
            value={endAt}
            onChange={setEndAt}
            placeholder="End date & time"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-location">Location (optional)</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Office / Zoom link"
          />
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={!title.trim() || !startAt}>
          Send event
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Teammates can add this to their calendar from the chat thread.
        </p>
      </div>
    </ResponsiveSheet>
  );
}
