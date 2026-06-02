import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Clock3,
  Building2,
} from "lucide-react";
import { AceLogoParticles } from "@/components/AceLogoParticles";
import { LoginBackground } from "@/components/LoginBackground";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

function LoginInput({
  className,
  icon: Icon,
  ...props
}: React.ComponentProps<typeof Input> & { icon: typeof Mail }) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40"
        aria-hidden
      />
      <Input
        className={cn(
          "h-12 rounded-xl border-white/10 bg-white/[0.06] pl-11 text-base text-white shadow-none placeholder:text-white/30 backdrop-blur-md transition-all focus-visible:border-[hsl(203_100%_87%/0.5)] focus-visible:bg-white/[0.09] focus-visible:ring-[hsl(211_38%_52%/0.35)] sm:h-11 sm:text-sm",
          className
        )}
        {...props}
      />
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const reducedMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await login(data.email, data.password);
      setLocation("/");
    } catch {
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh overflow-hidden">
      <LoginBackground />

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        {/* Brand — immersive hero panel */}
        <div className="hidden flex-1 flex-col items-center justify-center px-6 lg:flex lg:py-0 lg:pl-12 lg:pr-6 xl:pl-16">
          <div className="flex w-full max-w-2xl flex-col items-center justify-center text-center">
            <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.06] px-6 py-2.5 text-base font-semibold tracking-wide text-[hsl(203_100%_90%)] shadow-[0_0_28px_hsl(203_100%_87%/0.18)]">
              Ace Digital
            </div>
            <div className="relative flex w-full items-center justify-center">
              <div
                className="pointer-events-none absolute aspect-[4/5] h-[min(500px,58vh)] w-[min(520px,85vw)] rounded-[40%] bg-[hsl(203_90%_70%/0.1)] blur-[90px]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute aspect-[4/5] h-[min(420px,50vh)] w-[min(440px,72vw)] rounded-[40%] bg-[hsl(211_45%_50%/0.18)] blur-[70px]"
                aria-hidden
              />
              <AceLogoParticles
                className="relative h-[min(520px,60vh)] w-full max-w-[680px] lg:max-w-[760px]"
                size={560}
                widthScale={1.38}
                particleSize={2.9}
                sampleStep={2}
                quality="high"
              />
            </div>
            <div className="mt-8 max-w-[36rem] space-y-4 text-left">
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Inspiring Youth
                <br />
                Empovering Nation
              </h1>
              <p className="text-sm leading-6 text-white/60">
                A secure workspace for Ace Digital teams.
              </p>
            </div>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="flex min-h-dvh flex-1 shrink-0 items-center justify-center p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] lg:min-h-0 lg:w-[min(100%,480px)] lg:p-10 lg:pl-4 xl:w-[520px]">
          <div
            className="w-full max-w-[420px] rounded-2xl border border-white/[0.1] bg-[hsl(218_40%_12%/0.55)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-transform duration-200 will-change-transform sm:p-10"
            style={
              reducedMotion
                ? undefined
                : {
                    transform:
                      "perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateZ(0)",
                    ["--rx" as never]: `${tilt.rx}deg`,
                    ["--ry" as never]: `${tilt.ry}deg`,
                  }
            }
            onMouseMove={(e) => {
              if (reducedMotion) return;
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const px = (e.clientX - rect.left) / rect.width;
              const py = (e.clientY - rect.top) / rect.height;
              const max = 3.5;
              const ry = (px - 0.5) * max * 2;
              const rx = (0.5 - py) * max * 2;
              setTilt({ rx, ry });
            }}
            onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
          >
            <div className="mb-8 flex justify-center lg:hidden">
              <AceLogoParticles
                className="h-[150px] w-[240px]"
                size={190}
                widthScale={1.35}
                particleSize={2.4}
                sampleStep={3}
                interactive={false}
                quality="balanced"
              />
            </div>

            <div className="mb-8">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-[hsl(211_38%_52%/0.35)] to-[hsl(211_38%_52%/0.1)] shadow-[0_0_32px_hsl(211_38%_52%/0.25)]">
                <Shield className="size-5 text-[hsl(203_100%_87%)]" strokeWidth={1.75} aria-hidden />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-white/50">
                Sign in to continue to Ace Digital OS
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-white/45">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" aria-hidden />
                  Session timeout: 7 days
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="size-3.5" aria-hidden />
                  Internal access only
                </span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60">Email</FormLabel>
                      <FormControl>
                        <LoginInput
                          data-testid="input-email"
                          icon={Mail}
                          type="email"
                          placeholder="you@acedigital.com"
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-white/60">Password</FormLabel>
                        <button
                          type="button"
                          className="text-xs font-medium text-[hsl(203_100%_87%/0.85)] hover:text-white"
                          onClick={() =>
                            toast({
                              title: "Password reset",
                              description:
                                "Please contact your administrator to reset your password.",
                            })
                          }
                        >
                          Forgot password?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock
                            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40"
                            aria-hidden
                          />
                          <Input
                            data-testid="input-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="h-12 rounded-xl border-white/10 bg-white/[0.06] pr-11 pl-11 text-base text-white shadow-none placeholder:text-white/30 backdrop-blur-md focus-visible:border-[hsl(203_100%_87%/0.5)] focus-visible:bg-white/[0.09] focus-visible:ring-[hsl(211_38%_52%/0.35)] sm:h-11 sm:text-sm"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" aria-hidden />
                            ) : (
                              <Eye className="size-4" aria-hidden />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />
                <button
                  data-testid="button-submit"
                  type="submit"
                  disabled={loading}
                  className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[hsl(211_42%_46%)] via-[hsl(211_45%_54%)] to-[hsl(203_70%_58%)] text-base font-semibold text-white shadow-[0_4px_28px_hsl(211_38%_52%/0.45)] transition-all hover:shadow-[0_8px_36px_hsl(211_38%_52%/0.55)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 sm:h-11 sm:text-sm"
                >
                  <span
                    className="pointer-events-none absolute -inset-y-2 left-[-40%] w-[70%] rotate-12 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 blur-[0.5px] transition-opacity duration-200 group-hover:opacity-100 motion-safe:group-hover:animate-[shimmer_1.1s_ease-in-out_infinite]"
                    aria-hidden
                  />
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" aria-hidden />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </>
                  )}
                </button>
              </form>
            </Form>

            <Separator className="mt-7 bg-white/10" />
            <p className="mt-5 flex items-center gap-2 text-xs text-white/40">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
              Secure access. Authorized personnel only.
            </p>
          </div>
        </div>
      </div>

      {/* local keyframes for shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-30%) rotate(12deg); }
          100% { transform: translateX(220%) rotate(12deg); }
        }
      `}</style>
    </div>
  );
}
