import { Bot, Loader2, Sparkles, Tags } from "lucide-react";
import { useAiNoteEnrich } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAceAssistant } from "@/contexts/AceAssistantContext";
import { hapticLight } from "@/lib/haptics";

type NoteAiActionsProps = {
  noteId: number;
};

const ASK_ACE_CHIPS = [
  "Summarize this note and list any action items.",
  "What are the key decisions in this note?",
  "Draft a follow-up message based on this note.",
];

export function NoteAiActions({ noteId }: NoteAiActionsProps) {
  const { toast } = useToast();
  const { openWithPrompt } = useAceAssistant();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const enrich = useAiNoteEnrich({
    mutation: {
      onSuccess: (data) => {
        setSummary(data.summary);
        setTags(data.tags ?? []);
        setSummaryOpen(true);
      },
      onError: () => {
        toast({ title: "AI enrich failed", variant: "destructive" });
      },
    },
  });

  function runEnrich() {
    enrich.mutate({ id: noteId });
  }

  function askAce(prompt: string) {
    hapticLight();
    openWithPrompt(prompt);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 px-2 sm:px-3"
        disabled={enrich.isPending}
        onClick={runEnrich}
        title="Summarize and suggest tags"
      >
        {enrich.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
        ) : (
          <Sparkles className="h-4 w-4 sm:mr-1.5" />
        )}
        <span className="hidden sm:inline">AI</span>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 px-2 sm:px-3"
        onClick={() => askAce(ASK_ACE_CHIPS[0])}
        title="Ask Ace about this note"
      >
        <Bot className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">Ask Ace</span>
      </Button>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Note insights
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground whitespace-pre-wrap">{summary}</p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              <Tags size={14} className="text-muted-foreground mr-1" />
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1.5 border-t border-border/50 pt-3">
            <span className="text-xs font-medium text-muted-foreground">Ask Ace</span>
            <div className="flex flex-wrap gap-1.5">
              {ASK_ACE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setSummaryOpen(false);
                    askAce(chip);
                  }}
                  className="v2-chip hover:bg-primary/10 hover:text-primary"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
