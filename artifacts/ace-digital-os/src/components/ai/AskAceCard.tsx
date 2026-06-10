import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { SurfaceCard } from "@/components/design";
import { Button } from "@/components/ui/button";
import { useAceAssistant } from "@/contexts/AceAssistantContext";
import { AceAiAvatar } from "@/components/ai/AceAiAvatar";
import { hapticLight } from "@/lib/haptics";
import { springSoft } from "@/components/design/motion";

const DASHBOARD_PROMPTS = [
  "Summarize my dashboard KPIs",
  "What needs my attention today?",
  "Any pending approvals for me?",
];

export function AskAceCard() {
  const { openWithPrompt } = useAceAssistant();

  function runPrompt(prompt: string) {
    hapticLight();
    openWithPrompt(prompt);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}>
      <SurfaceCard padding="md" className="border-border/60">
        <div className="flex items-start gap-3">
          <AceAiAvatar size="md" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="v2-stat-label">Ace Intelligence</p>
            <h3 className="text-base font-semibold tracking-tight">Ask Ace about your workspace</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Live insights from projects, tasks, finance, and more — scoped to your role.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DASHBOARD_PROMPTS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  onClick={() => runPrompt(p)}
                >
                  <Sparkles size={12} className="mr-1 text-primary" />
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </SurfaceCard>
    </motion.div>
  );
}
