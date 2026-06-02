import { cn } from "@/lib/utils";

const LOGIN_BG_IMAGE =
  "https://images.unsplash.com/photo-1451187580451-29ede9c7158f?auto=format&fit=crop&w=2560&q=85";

const LOGIN_BG_IMAGE_MOBILE =
  "https://images.unsplash.com/photo-1451187580451-29ede9c7158f?auto=format&fit=crop&w=1200&q=80";

type LoginBackgroundProps = {
  className?: string;
};

export function LoginBackground({ className }: LoginBackgroundProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <picture>
        <source media="(min-width: 1024px)" srcSet={LOGIN_BG_IMAGE} />
        <img
          src={LOGIN_BG_IMAGE_MOBILE}
          alt=""
          className="h-full w-full scale-[1.02] object-cover object-[center_40%]"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      <div className="absolute inset-0 bg-[hsl(218_55%_7%/0.92)]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 38% 48%, hsl(211 45% 42% / 0.28), transparent 70%), radial-gradient(ellipse 40% 35% at 78% 15%, hsl(203 80% 70% / 0.06), transparent 55%), linear-gradient(100deg, hsl(218 60% 5% / 0.5) 0%, transparent 38%, hsl(218 50% 8% / 0.85) 72%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, hsl(218 55% 4% / 0.65) 100%)",
        }}
      />

      <div className="absolute -left-24 top-[20%] size-[28rem] rounded-full bg-[hsl(211_45%_48%/0.12)] blur-[120px]" />
      <div className="absolute bottom-[10%] right-[15%] size-64 rounded-full bg-[hsl(203_90%_70%/0.06)] blur-[100px]" />
    </div>
  );
}
