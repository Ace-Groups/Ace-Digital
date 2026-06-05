import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SALUTATIONS } from "@/lib/clients";

interface SalutationSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function SalutationSelect({ value, onChange }: SalutationSelectProps) {
  return (
    <Select onValueChange={onChange} value={value || undefined}>
      <SelectTrigger data-testid="select-client-salutation">
        <SelectValue placeholder="Title" />
      </SelectTrigger>
      <SelectContent>
        {SALUTATIONS.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
