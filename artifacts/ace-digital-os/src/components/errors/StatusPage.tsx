import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, Home, LogOut, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import aceLogo from "@/assets/ace-logo.png";

export type StatusPageTone = "neutral" | "warning" | "danger";

interface StatusPageProps {
  code: string;
  title: string;
  description: string;
  tone?: StatusPageTone;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; onClick: () => void; icon?: ReactNode };
  onSignOut?: () => void | Promise<void>;
  extra?: ReactNode;
}

const toneStyles: Record<
  StatusPageTone,
  { ring: string; glow: string; code: string; badge: string }
> = {
  neutral: {
    ring: "from-primary/25 via-cyan-400/10 to-transparent",
    glow: "bg-primary/20",
    code: "text-primary",
    badge: "border-primary/25 bg-primary/10 text-primary",
  },
  warning: {
    ring: "from-amber-400/25 via-orange-400/10 to-transparent",
    glow: "bg-amber-400/15",
    code: "text-amber-600 dark:text-amber-400",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  },
  danger: {
    ring: "from-destructive/25 via-rose-400/10 to-transparent",
    glow: "bg-destructive/15",
    code: "text-destructive",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export function StatusPage({
  code,
  title,
  description,
  tone = "neutral",
  primaryAction = { label: "Back to dashboard", href: "/" },
  secondaryAction,
  onSignOut,
  extra,
}: StatusPageProps) {
  const styles = toneStyles[tone];

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-background brand-gradient-subtle px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border) / 0.45) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.45) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)",
        }}
      />
      <div
        className={`pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${styles.glow}`}
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <div
          className={`relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-8 shadow-brand-md backdrop-blur-md sm:p-10 ${styles.ring} bg-gradient-to-br`}
        >
          <div className="mb-8 flex items-center justify-between gap-4">
            <img src={aceLogo} alt="Ace Digital" className="h-8 w-auto opacity-90" />
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${styles.badge}`}
            >
              Ace Digital OS
            </span>
          </div>

          <p className={`text-7xl font-semibold tracking-tight sm:text-8xl ${styles.code}`}>
            {code}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="gap-2 shadow-brand-sm">
              <Link href={primaryAction.href}>
                <Home size={16} aria-hidden />
                {primaryAction.label}
              </Link>
            </Button>
            {secondaryAction ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={() => window.history.back()}
              >
                <ArrowLeft size={16} aria-hidden />
                Go back
              </Button>
            )}
            {onSignOut ? (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => void onSignOut()}
              >
                <LogOut size={16} aria-hidden />
                Sign out
              </Button>
            ) : null}
          </div>

          {extra || onSignOut ? (
            <div className="mt-6 border-t border-border/60 pt-6">
              {extra ?? (
                <div className="flex justify-center">
                  <StatusPageContactAdmin />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StatusPageSignOut({ onSignOut }: { onSignOut: () => void | Promise<void> }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="gap-2 text-muted-foreground hover:text-foreground"
      onClick={() => void onSignOut()}
    >
      <LogOut size={15} aria-hidden />
      Sign out
    </Button>
  );
}

export function StatusPageFooter({
  onSignOut,
  showContact = true,
}: {
  onSignOut: () => void | Promise<void>;
  showContact?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {showContact ? <StatusPageContactAdmin /> : <span />}
      <StatusPageSignOut onSignOut={onSignOut} />
    </div>
  );
}

export function StatusPageContactAdmin() {
  return (
    <a
      href="mailto:admin@mybexo.com?subject=Ace%20Digital%20support"
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
    >
      <Mail size={14} aria-hidden />
      Contact administrator
    </a>
  );
}

export function StatusPageRetry({ onRetry }: { onRetry: () => void }) {
  return {
    label: "Try again",
    onClick: onRetry,
    icon: <RefreshCw size={16} aria-hidden />,
  };
}
