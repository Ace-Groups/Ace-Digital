import { useEffect, useState } from "react";
import { Link } from "wouter";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  checkIn,
  checkOut,
  formatIst,
  getMyAttendance,
  readOptionalGeo,
  STATUS_LABEL,
  type DayView,
} from "@/lib/attendance-api";

const ROSTER_ROLES = new Set(["super_admin", "management", "hr", "finance"]);

export function AttendanceCheckCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [day, setDay] = useState<DayView | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyAttendance()
      .then((next) => {
        if (!cancelled) setDay(next);
      })
      .catch(() => {
        if (!cancelled) setDay(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function punch(kind: "in" | "out") {
    setBusy(true);
    try {
      const geo = await readOptionalGeo();
      const next =
        kind === "in"
          ? await checkIn({ planNote: note.trim() || undefined, ...(geo ?? {}) })
          : await checkOut(geo ?? {});
      setDay(next);
      setNote("");
      toast({
        title: kind === "in" ? "Checked in" : "Checked out",
        description: `${formatIst(kind === "in" ? next.checkInAt : next.checkOutAt)} IST${
          geo ? "" : " · location not shared"
        }`,
      });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Could not update attendance",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const status = day?.status ?? "not_in";
  const showRoster = user?.role ? ROSTER_ROLES.has(user.role) : false;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="mt-1 text-lg font-semibold">{STATUS_LABEL[status]}</p>
          <p className="text-sm text-muted-foreground">
            In {formatIst(day?.checkInAt ?? null)}
            {day?.checkOutAt ? ` · Out ${formatIst(day.checkOutAt)}` : ""}
          </p>
        </div>
        <Link href="/attendance" className="text-sm font-medium text-primary">
          {showRoster ? "Roster" : "Month"}
        </Link>
      </div>
      {day?.planNote && (
        <p className="mt-3 text-sm text-muted-foreground">Plan: {day.planNote}</p>
      )}
      {day?.canCheckIn && (
        <Input
          className="mt-3 min-h-11"
          placeholder="Today's plan (optional)"
          value={note}
          maxLength={280}
          onChange={(event) => setNote(event.target.value)}
          aria-label="Today's plan"
        />
      )}
      <div className="mt-3 flex items-center gap-2">
        {day?.canCheckIn && (
          <Button className="min-h-12 flex-1" disabled={busy} onClick={() => punch("in")}>
            {busy ? "Checking in…" : "Check in"}
          </Button>
        )}
        {day?.canCheckOut && (
          <Button className="min-h-12 flex-1" disabled={busy} onClick={() => punch("out")}>
            {busy ? "Checking out…" : "Check out"}
          </Button>
        )}
        {day && !day.canCheckIn && !day.canCheckOut && (
          <p className="text-sm text-muted-foreground">You're done for today.</p>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin size={12} aria-hidden />
        Time is India time from the server. Location is saved only if the browser allows it.
      </p>
    </section>
  );
}
