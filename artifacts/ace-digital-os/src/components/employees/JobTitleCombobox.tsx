import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useListJobTitles,
  useCreateJobTitle,
  getListJobTitlesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface JobTitleComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function JobTitleCombobox({ value, onChange, disabled }: JobTitleComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: titles = [] } = useListJobTitles();
  const createJobTitle = useCreateJobTitle();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const trimmed = search.trim();
  const hasExact = titles.some((t) => t.toLowerCase() === trimmed.toLowerCase());
  const showUseCustom = trimmed.length > 0 && trimmed !== value;
  const showSavePreset = trimmed.length > 0 && !hasExact;

  async function saveAsPreset() {
    if (!trimmed) return;
    try {
      await createJobTitle.mutateAsync({ data: { name: trimmed } });
      await queryClient.invalidateQueries({ queryKey: getListJobTitlesQueryKey() });
      onChange(trimmed);
      setOpen(false);
      toast({ title: "Job title saved" });
    } catch {
      toast({ title: "Could not save job title", variant: "destructive" });
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="min-h-11 w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Select or type job title"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            <CommandGroup>
              {titles
                .filter((t) => !trimmed || t.toLowerCase().includes(trimmed.toLowerCase()))
                .map((title) => (
                  <CommandItem
                    key={title}
                    value={title}
                    onSelect={() => {
                      onChange(title);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === title ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {title}
                  </CommandItem>
                ))}
            </CommandGroup>
            {showUseCustom && (
              <CommandGroup heading="Custom">
                <CommandItem
                  value={`use-${trimmed}`}
                  onSelect={() => {
                    onChange(trimmed);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  Use &quot;{trimmed}&quot;
                </CommandItem>
              </CommandGroup>
            )}
            {showSavePreset && (
              <CommandGroup>
                <CommandItem
                  value={`save-${trimmed}`}
                  onSelect={() => void saveAsPreset()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Save &quot;{trimmed}&quot; as preset
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
