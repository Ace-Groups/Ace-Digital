import { useEffect, useState } from "react";
import { getAccountabilitySettings, saveAccountabilitySettings, type AccountabilitySettings } from "@/lib/accountability-api";

export function PresenceSettings({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<AccountabilitySettings | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getAccountabilitySettings().then(setSettings).catch(() => setError("Presence settings did not load."));
  }, []);
  if (!settings) return <p className="text-sm text-muted-foreground">{error || "Loading presence settings."}</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canEdit) return;
        saveAccountabilitySettings(settings).then(setSettings).catch((err: Error) => setError(err.message));
      }}
    >
      <p className="text-sm text-muted-foreground">
        Presence checks are off until you turn them on. People see the request and answer with a selfie. Nothing runs in the background.
      </p>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium">
        Presence checks
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={settings.presencePingsEnabled}
          disabled={!canEdit}
          onChange={(event) => setSettings({ ...settings, presencePingsEnabled: event.target.checked })}
        />
      </label>
      <label className="block text-sm font-medium" htmlFor="ping-cap">
        Checks per day (max 3)
        <input
          id="ping-cap"
          inputMode="numeric"
          disabled={!canEdit}
          className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3"
          value={settings.maxPingsPerDay}
          onChange={(event) => setSettings({ ...settings, maxPingsPerDay: Number(event.target.value) })}
        />
      </label>
      {error && <p className="text-sm text-muted-foreground">{error}</p>}
      {canEdit && (
        <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Save presence
        </button>
      )}
    </form>
  );
}
