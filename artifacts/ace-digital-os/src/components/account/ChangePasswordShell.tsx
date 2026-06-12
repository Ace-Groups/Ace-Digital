import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import aceLogo from "@/assets/ace-logo.png";

interface ChangePasswordShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function ChangePasswordShell({ title, description, children }: ChangePasswordShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background brand-gradient-subtle">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 px-5 py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex flex-col items-center gap-2">
          <img src={aceLogo} alt="" className="size-11 object-contain" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ace Digital
          </p>
        </div>

        <section className="rounded-2xl border border-border/80 bg-card/95 p-6 shadow-brand-sm backdrop-blur-sm">
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-border/80 bg-primary/10">
            <KeyRound className="size-5 text-primary" strokeWidth={1.75} aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </div>
  );
}
