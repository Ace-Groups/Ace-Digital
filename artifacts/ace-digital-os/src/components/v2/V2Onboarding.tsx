import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AceAiAvatar } from "@/components/ai/AceAiAvatar";
import { hapticSuccess } from "@/lib/haptics";

const STORAGE_KEY = "ace-v2-onboarding-seen";

const SLIDES: {
  icon?: LucideIcon;
  hero?: boolean;
  title: string;
  description: string;
}[] = [
  {
    icon: Sparkles,
    title: "Welcome to Ace Digital",
    description: "A complete redesign built for speed, clarity, and delight — on every device.",
  },
  {
    icon: Zap,
    title: "Instant & tactile",
    description: "Spring animations, haptic feedback, and gestures that make the app feel alive.",
  },
  {
    hero: true,
    title: "AI that works for you",
    description: "Ace Assistant now has more power — insights, actions, and streaming responses.",
  },
];

export function V2Onboarding() {
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    hapticSuccess();
    setOpen(false);
  }

  const current = SLIDES[slide];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-v2-xl"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
            <div className="mb-5 flex min-h-14 items-center justify-center">
              {current.hero ? (
                <AceAiAvatar size="lg" />
              ) : Icon ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon size={26} />
                </div>
              ) : null}
            </div>
            <h2 className="text-display-sm font-semibold">{current.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.description}</p>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1.5">
                {SLIDES.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === slide ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
                  />
                ))}
              </div>
              {slide < SLIDES.length - 1 ? (
                <Button onClick={() => setSlide((s) => s + 1)}>Next</Button>
              ) : (
                <Button onClick={dismiss}>Get started</Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
