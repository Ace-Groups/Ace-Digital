import { formatMeters, REASON_LABEL, type FieldVisit } from "@/lib/accountability-api";
import { MapPinPicker } from "./MapPinPicker";

export type VisitDraft = {
  clientName: string;
  employeeId: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  radiusMeters: string;
  lat: number;
  lng: number;
  paste: string;
};

export function VisitsView({
  canAssign,
  draft,
  employees,
  visits,
  onDraft,
  onPaste,
  onSubmit,
}: {
  canAssign: boolean;
  draft: VisitDraft;
  employees: { id: number; fullName: string }[];
  visits: FieldVisit[];
  onDraft: (next: VisitDraft) => void;
  onPaste: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Field visits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A visit is present only when the person is inside the radius, in the time window, with a live selfie.
        </p>
      </header>
      {canAssign && (
        <form
          className="space-y-3 rounded-xl border border-border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <h2 className="text-base font-semibold">Assign a visit</h2>
          <label className="block text-sm font-medium" htmlFor="visit-client">
            Client
            <input
              id="visit-client"
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3"
              value={draft.clientName}
              onChange={(event) => onDraft({ ...draft, clientName: event.target.value })}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="visit-person">
            Employee
            <select
              id="visit-person"
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3"
              value={draft.employeeId}
              onChange={(event) => onDraft({ ...draft, employeeId: event.target.value })}
            >
              <option value="">Choose someone</option>
              {employees.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium" htmlFor="visit-date">
              Date
              <input id="visit-date" type="date" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3" value={draft.date} onChange={(event) => onDraft({ ...draft, date: event.target.value })} />
            </label>
            <label className="text-sm font-medium" htmlFor="visit-start">
              From
              <input id="visit-start" type="time" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3" value={draft.windowStart} onChange={(event) => onDraft({ ...draft, windowStart: event.target.value })} />
            </label>
            <label className="text-sm font-medium" htmlFor="visit-end">
              To
              <input id="visit-end" type="time" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3" value={draft.windowEnd} onChange={(event) => onDraft({ ...draft, windowEnd: event.target.value })} />
            </label>
          </div>
          <label className="block text-sm font-medium" htmlFor="visit-radius">
            Radius in metres
            <input id="visit-radius" inputMode="numeric" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3" value={draft.radiusMeters} onChange={(event) => onDraft({ ...draft, radiusMeters: event.target.value })} />
          </label>
          <MapPinPicker lat={draft.lat} lng={draft.lng} onChange={(pin) => onDraft({ ...draft, lat: pin.lat, lng: pin.lng })} />
          <div className="flex gap-2">
            <label className="block flex-1 text-sm font-medium" htmlFor="visit-paste">
              Paste coordinates
              <input id="visit-paste" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3" placeholder="12.9716, 77.5946" value={draft.paste} onChange={(event) => onDraft({ ...draft, paste: event.target.value })} />
            </label>
            <button type="button" className="mt-6 min-h-11 rounded-lg border border-border px-3 text-sm" onClick={onPaste}>
              Use
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
          </p>
          <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Assign visit
          </button>
        </form>
      )}
      <section aria-labelledby="visit-results">
        <h2 id="visit-results" className="mb-2 text-base font-semibold">
          Results
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {visits.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">No visits for this day.</li>}
          {visits.map((visit) => (
            <li key={visit.id} className="flex min-h-11 items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{visit.clientName}</p>
                <p className="text-sm text-muted-foreground">
                  {visit.employeeName} · {visit.windowStart}–{visit.windowEnd}
                  {visit.distanceMeters != null ? ` · ${formatMeters(visit.distanceMeters)}` : ""}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {visit.status === "assigned" ? "Assigned" : visit.flagReason ? REASON_LABEL[visit.flagReason] ?? visit.flagReason : visit.status.replaceAll("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
