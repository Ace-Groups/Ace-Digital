import { cn } from "@/lib/utils";
import { MASCOTS } from "@/lib/mascots";

interface MascotPickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export function MascotPicker({ selectedId, onSelect, className }: MascotPickerProps) {
  return (
    <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-5", className)}>
      {MASCOTS.map((m) => {
        const active = selectedId === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all",
              active
                ? "border-primary bg-primary/10"
                : "border-transparent bg-muted/50 hover:bg-muted",
            )}
          >
            <img
              src={m.src}
              alt={m.label}
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
