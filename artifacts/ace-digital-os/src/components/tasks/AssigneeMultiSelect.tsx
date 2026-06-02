import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

export type AssignableEmployee = {
  id: number;
  fullName: string;
};

interface AssigneeMultiSelectProps {
  employees: AssignableEmployee[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  emptyLabel?: string;
}

export function AssigneeMultiSelect({
  employees,
  selectedIds,
  onChange,
  emptyLabel = "No users available.",
}: AssigneeMultiSelectProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.fullName.toLowerCase().includes(q));
  }, [employees, query]);

  const allSelected =
    employees.length > 0 && selectedIds.length === employees.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Assignees</Label>
        <button
          type="button"
          className="shrink-0 text-xs text-primary hover:underline"
          onClick={() => {
            onChange(allSelected ? [] : employees.map((e) => e.id));
          }}
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      {employees.length > 8 && (
        <Input
          placeholder="Search people…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10"
        />
      )}
      <div className="touch-scroll max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border/70 p-2 sm:max-h-40">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            {employees.length === 0 ? emptyLabel : "No matches."}
          </p>
        ) : (
          filtered.map((e) => (
            <label
              key={e.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 active:bg-muted/60 hover:bg-muted/50"
            >
              <Checkbox
                className="size-5"
                checked={selectedIds.includes(e.id)}
                onCheckedChange={(checked) => {
                  onChange(
                    checked
                      ? [...selectedIds, e.id]
                      : selectedIds.filter((id) => id !== e.id),
                  );
                }}
              />
              <span className="text-sm font-medium">{e.fullName}</span>
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {selectedIds.length === 0
          ? "Leave empty for a common task (no assignees)."
          : selectedIds.length === 1
            ? "One person on this task."
            : `One shared task for ${selectedIds.length} people — each marks their part done.`}
      </p>
    </div>
  );
}
