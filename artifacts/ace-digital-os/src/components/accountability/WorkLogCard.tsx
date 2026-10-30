import { useEffect, useState } from "react";
import { getTodayLog, saveTodayLog, type WorkLog } from "@/lib/accountability-api";

export function WorkLogCard({ log, onSave }: { log: WorkLog; onSave?: (summary: string, links: string) => void }) {
  const [summary, setSummary] = useState(log?.summary ?? "");
  const [links, setLinks] = useState(log?.links.join("\n") ?? "");
  useEffect(() => {
    setSummary(log?.summary ?? "");
    setLinks(log?.links.join("\n") ?? "");
  }, [log]);
  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave?.(summary, links);
      }}
    >
      <h2 className="text-base font-semibold">End of day</h2>
      <p className="text-sm text-muted-foreground">What you finished, plus proof links. This is the record, not a screen watch.</p>
      <label className="block text-sm font-medium" htmlFor="work-log">
        Work log
        <textarea id="work-log" className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2" value={summary} onChange={(event) => setSummary(event.target.value)} />
      </label>
      <label className="block text-sm font-medium" htmlFor="work-links">
        Proof links
        <textarea id="work-links" className="mt-1 min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2" value={links} onChange={(event) => setLinks(event.target.value)} />
      </label>
      {onSave && (
        <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Save log
        </button>
      )}
    </form>
  );
}

export function ConnectedWorkLog() {
  const [log, setLog] = useState<WorkLog>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getTodayLog()
      .then(setLog)
      .catch(() => setLog(null))
      .finally(() => setReady(true));
  }, []);
  if (!ready) return null;
  return (
    <WorkLogCard
      log={log}
      onSave={(summary, links) => {
        const parsed = links.split(/\s+/).map((link) => link.trim()).filter(Boolean);
        saveTodayLog(summary, parsed).then(setLog).catch(() => undefined);
      }}
    />
  );
}
