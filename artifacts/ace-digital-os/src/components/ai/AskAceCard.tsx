import { Bot, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { SurfaceCard } from "@/components/design";
import { Button } from "@/components/ui/button";
import { useAceAssistant } from "@/contexts/AceAssistantContext";
import { hapticLight } from "@/lib/haptics";
import { springSoft } from "@/components/design/motion";

const DASHBOARD_PROMPTS = [
  "Summarize my dashboard KPIs",
  "What needs my attention today?",
  "Any pending approvals for me?",
];

export function AskAceCard() {
  const { setOpen, setConversationId: resetConversation } = useAceAssistant();

  function openWithPrompt(prompt: string) {
    hapticLight();
    resetConversation(null);
    setOpen(true);
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("ace-assistant-prompt", { detail: { prompt } }),
      );
    }, 100);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}>
      <SurfaceCard padding="md" glow className="border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20">
            <Bot size={22} className="text-primary" />
          </div>
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
                  onClick={() => openWithPrompt(p)}
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
