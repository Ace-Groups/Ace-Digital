import { Loader2, Sparkles, Tags } from "lucide-react";
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

type NoteAiActionsProps = {
  noteId: number;
};

export function NoteAiActions({ noteId }: NoteAiActionsProps) {
  const { toast } = useToast();
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
        </DialogContent>
      </Dialog>
    </>
  );
}
