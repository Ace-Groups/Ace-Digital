import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const isMobile = useIsMobile();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("pwa-install-dismissed") === "1";
  });
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true),
    );

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!isMobile || dismissed || isStandalone) return null;

  const showIos = isIos && !deferred;
  const showAndroid = !!deferred;

  if (!showIos && !showAndroid) return null;

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  return (
    <div
      className={cn(
        "fixed left-4 right-4 z-[60] rounded-2xl border border-border/80 bg-card p-4 shadow-brand-md",
        "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:hidden",
      )}
      role="region"
      aria-label="Install app"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {showAndroid ? <Download size={20} /> : <Share size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install Ace Digital</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {showIos
              ? "Tap Share → Add to Home Screen. Get live widgets, unread badges, and long-press shortcuts to Tasks, Chat & Notes."
              : "Install for home screen widgets, unread badges on the icon, and quick shortcuts to Tasks, Chat, Calendar & Notes."}
          </p>
          {showAndroid && (
            <button
              type="button"
              onClick={() => void install()}
              className="mt-3 min-h-[44px] rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground active:scale-[0.98]"
            >
              Install app
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
