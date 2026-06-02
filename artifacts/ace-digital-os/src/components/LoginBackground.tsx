import { cn } from "@/lib/utils";

type LoginBackgroundProps = {
  className?: string;
};

export function LoginBackground({ className }: LoginBackgroundProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-0 bg-[hsl(220_60%_5%)]" />

      {/* Main cinematic light field */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 62% 50% at 26% 44%, hsl(203 95% 70% / 0.18), transparent 72%), radial-gradient(ellipse 46% 38% at 71% 18%, hsl(211 80% 62% / 0.11), transparent 64%), radial-gradient(ellipse 40% 34% at 58% 78%, hsl(218 72% 44% / 0.1), transparent 68%), linear-gradient(116deg, hsl(220 75% 4% / 0.94) 0%, hsl(217 66% 7% / 0.78) 40%, hsl(220 70% 5% / 0.96) 100%)",
        }}
      />

      {/* Soft vertical beam */}
      <div
        className="absolute inset-y-0 left-[12%] w-[42rem] opacity-40 blur-3xl"
        style={{
          background:
            "linear-gradient(95deg, transparent 0%, hsl(203 100% 78% / 0.3) 45%, transparent 100%)",
        }}
      />

      {/* Subtle technical grid */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(circle at 35% 45%, black 30%, transparent 78%)",
        }}
      />

      {/* Top gloss + edge vignette */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(0_0%_100%/0.06),transparent_22%)]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 36%, hsl(220 70% 4% / 0.78) 100%)",
        }}
      />

      {/* Grain for depth */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-soft-light"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.9) 0.7px, transparent 0.7px)",
          backgroundSize: "3px 3px",
        }}
      />
    </div>
  );
}
