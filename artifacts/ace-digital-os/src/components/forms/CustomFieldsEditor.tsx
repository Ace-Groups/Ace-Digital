import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClientCustomField } from "@/lib/clients";
import { Plus, Trash2 } from "lucide-react";

const MAX_FIELDS = 20;

interface CustomFieldsEditorProps {
  value: ClientCustomField[];
  onChange: (fields: ClientCustomField[]) => void;
}

export function CustomFieldsEditor({ value, onChange }: CustomFieldsEditorProps) {
  function updateRow(index: number, patch: Partial<ClientCustomField>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addRow() {
    if (value.length >= MAX_FIELDS) return;
    onChange([...value, { key: "", value: "" }]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Custom fields</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={addRow}
          disabled={value.length >= MAX_FIELDS}
        >
          <Plus size={14} /> Add field
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add custom fields like GST number, billing address, or preferences.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
            >
              <Input
                placeholder="Field name"
                value={row.key}
                onChange={(e) => updateRow(index, { key: e.target.value })}
              />
              <Input
                placeholder="Value"
                value={row.value}
                onChange={(e) => updateRow(index, { value: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 self-end sm:self-auto"
                onClick={() => removeRow(index)}
                aria-label="Remove field"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
