import { CHANNEL_ICONS, encodeChannelIcon, type ChannelIconId } from "@/lib/channel-icons";
import { cn } from "@/lib/utils";

interface ChannelIconPickerProps {
  value: ChannelIconId;
  onChange: (id: ChannelIconId) => void;
}

export function ChannelIconPicker({ value, onChange }: ChannelIconPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {CHANNEL_ICONS.map((item) => {
        const Icon = item.icon;
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all",
              active ? "border-primary bg-primary/10" : "border-transparent bg-muted/50 hover:bg-muted",
            )}
          >
            <Icon size={18} />
            <span className="text-[9px] text-muted-foreground">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { encodeChannelIcon };
