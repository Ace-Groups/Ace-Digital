import { Input } from "@/components/ui/input";
import { formatCurrencyInput, parseCurrencyInput, amountInWordsINR } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  "data-testid"?: string;
  className?: string;
}

export function CurrencyInput({
  value,
  onChange,
  id,
  "data-testid": testId,
  className,
}: CurrencyInputProps) {
  const display = value ? formatCurrencyInput(value) : "";
  const amount = parseCurrencyInput(display);

  return (
    <div className="space-y-1.5">
      <Input
        id={id}
        data-testid={testId}
        inputMode="numeric"
        placeholder="₹0"
        value={display}
        onChange={(e) => {
          const parsed = parseCurrencyInput(e.target.value);
          onChange(parsed != null ? String(parsed) : "");
        }}
        className={cn(className)}
      />
      {amount != null && amount > 0 && (
        <p className="text-xs text-muted-foreground leading-snug">
          {amountInWordsINR(amount)}
        </p>
      )}
    </div>
  );
}
