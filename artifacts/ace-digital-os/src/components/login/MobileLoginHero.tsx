import loginBg from "@/assets/login-bg.png";
import aceLogo from "@/assets/ace-logo.png";

export function MobileLoginHero() {
  return (
    <div className="relative min-h-[40dvh] shrink-0 overflow-hidden">
      <img
        src={loginBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
        fetchPriority="high"
        decoding="async"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, hsl(var(--ace-navy) / 0.72) 0%, hsl(var(--ace-blue) / 0.55) 45%, hsl(var(--ace-navy) / 0.88) 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40 Q20 20 40 40 T80 40' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M0 60 Q25 35 50 60 T100 55' fill='none' stroke='white' stroke-width='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: "120px 120px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/4 top-1/4 h-56 w-56 rounded-full bg-[hsl(var(--ace-sky)/0.25)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1/4 bottom-0 h-48 w-48 rounded-full bg-[hsl(var(--ace-blue)/0.35)] blur-3xl"
        aria-hidden
      />

      <div className="relative flex h-full min-h-[220px] flex-col items-center justify-center px-6 pb-14 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <div className="flex size-[88px] items-center justify-center rounded-[1.35rem] border border-white/25 bg-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <img src={aceLogo} alt="" className="size-14 object-contain drop-shadow-sm" />
        </div>
      </div>

      <svg
        className="absolute bottom-0 left-0 block h-14 w-full text-background"
        viewBox="0 0 1440 56"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M0,32 C180,56 360,12 540,28 C720,44 900,52 1080,36 C1260,20 1320,48 1440,24 L1440,56 L0,56 Z"
        />
      </svg>
    </div>
  );
}
