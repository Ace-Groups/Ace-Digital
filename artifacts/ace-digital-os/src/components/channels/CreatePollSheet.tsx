import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Switch } from "@/components/ui/switch";

interface CreatePollSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    question: string;
    options: { id: string; label: string }[];
    votes: Record<string, number[]>;
    allowMultiple: boolean;
    closesAt?: string | null;
  }) => void;
}

export function CreatePollSheet({ open, onOpenChange, onCreate }: CreatePollSheetProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [closesAt, setClosesAt] = useState("");

  function reset() {
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
    setClosesAt("");
  }

  function handleSubmit() {
    const labels = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || labels.length < 2) return;
    const opts = labels.map((label) => ({ id: crypto.randomUUID(), label }));
    onCreate({
      question: question.trim(),
      options: opts,
      votes: Object.fromEntries(opts.map((o) => [o.id, []])),
      allowMultiple,
      closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Create poll">
      <div className="space-y-4 px-1 pb-4">
        <div className="space-y-2">
          <Label htmlFor="poll-question">Question</Label>
          <Input
            id="poll-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something…"
          />
        </div>
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setOptions([...options, ""])}
            >
              <Plus size={16} className="mr-2" />
              Add option
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="poll-multi">Allow multiple answers</Label>
          <Switch id="poll-multi" checked={allowMultiple} onCheckedChange={setAllowMultiple} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="poll-closes">Closes (optional)</Label>
          <DateTimePicker
            id="poll-closes"
            value={closesAt}
            onChange={setClosesAt}
            placeholder="Closing date & time"
          />
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={!question.trim()}>
          Send poll
        </Button>
      </div>
    </ResponsiveSheet>
  );
}
