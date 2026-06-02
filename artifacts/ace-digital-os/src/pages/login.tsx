import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { AceLogoParticles } from "@/components/AceLogoParticles";
import { LoginBackground } from "@/components/LoginBackground";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import aceLogo from "@/assets/ace-logo.png";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const underlineInputClass =
  "h-12 rounded-none border-0 border-b-2 border-border bg-transparent px-0 pl-9 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0";

function LoginWaveHeader() {
  return (
    <div className="relative min-h-[38dvh] shrink-0 overflow-hidden brand-gradient">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54 0c-6 8-18 12-30 12S0 8 0 0' fill='none' stroke='white' stroke-width='0.6'/%3E%3C/svg%3E")`,
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />
      <div className="relative flex h-full min-h-[200px] items-center justify-center pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <img
          src={aceLogo}
          alt=""
          className="size-20 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        />
      </div>
      <svg
        className="absolute bottom-0 left-0 block h-[52px] w-full text-card"
        viewBox="0 0 1440 52"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M0,28 C240,52 420,8 720,24 C1020,40 1200,48 1440,20 L1440,52 L0,52 Z"
        />
      </svg>
    </div>
  );
}

function LoginMobileForm({
  form,
  loading,
  showPassword,
  onTogglePassword,
  onSubmit,
}: {
  form: ReturnType<typeof useForm<FormData>>;
  loading: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (data: FormData) => void | Promise<void>;
}) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8"
        autoComplete="on"
        aria-label="Sign in"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="sr-only">Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-0 top-1/2 size-[18px] -translate-y-1/2 text-primary"
                    aria-hidden
                  />
                  <Input
                    data-testid="input-email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoComplete="username"
                    placeholder="Email"
                    className={underlineInputClass}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="sr-only">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-0 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Password"
                    className={cn(underlineInputClass, "pr-10")}
                    {...field}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-muted-foreground touch-manipulation"
                    onClick={onTogglePassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-[18px]" aria-hidden />
                    ) : (
                      <Eye className="size-[18px]" aria-hidden />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <Button
          data-testid="button-submit"
          type="submit"
          disabled={loading}
          className="mt-2 h-12 w-full rounded-full text-base font-semibold shadow-brand-sm touch-manipulation"
          size="lg"
        >
          {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : "Login"}
        </Button>
      </form>
    </Form>
  );
}

function LoginDesktopForm({
  form,
  loading,
  showPassword,
  onTogglePassword,
  onSubmit,
  onForgotPassword,
}: {
  form: ReturnType<typeof useForm<FormData>>;
  loading: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (data: FormData) => void | Promise<void>;
  onForgotPassword: () => void;
}) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        autoComplete="off"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white/60">Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40"
                    aria-hidden
                  />
                  <Input
                    data-testid="input-email"
                    type="email"
                    placeholder="you@acedigital.com"
                    autoComplete="username"
                    className="h-12 rounded-xl border-white/10 bg-white/[0.06] pl-11 text-base text-white shadow-none placeholder:text-white/30 backdrop-blur-md focus-visible:border-[hsl(203_100%_87%/0.5)] focus-visible:bg-white/[0.09] focus-visible:ring-[hsl(211_38%_52%/0.35)] sm:h-11 sm:text-sm"
                    {...field}
                  />
                </div>
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
                  onClick={onForgotPassword}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    onClick={onTogglePassword}
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
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(211_42%_46%)] via-[hsl(211_45%_54%)] to-[hsl(203_70%_58%)] text-base font-semibold text-white shadow-[0_4px_28px_hsl(211_38%_52%/0.45)] transition-all hover:shadow-[0_8px_36px_hsl(211_38%_52%/0.55)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 sm:h-11 sm:text-sm"
        >
          {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : "Sign in"}
        </button>
      </form>
    </Form>
  );
}

function LoginMobileLayout({
  form,
  loading,
  showPassword,
  setShowPassword,
  onSubmit,
}: {
  form: ReturnType<typeof useForm<FormData>>;
  loading: boolean;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((p: boolean) => boolean)) => void;
  onSubmit: (data: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-card">
      <LoginWaveHeader />
      <div className="flex flex-1 flex-col justify-center px-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
        <LoginMobileForm
          form={form}
          loading={loading}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((v) => !v)}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

function LoginDesktopLayout({
  form,
  loading,
  showPassword,
  setShowPassword,
  onSubmit,
  onForgotPassword,
}: {
  form: ReturnType<typeof useForm<FormData>>;
  loading: boolean;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((p: boolean) => boolean)) => void;
  onSubmit: (data: FormData) => void | Promise<void>;
  onForgotPassword: () => void;
}) {
  return (
    <div className="relative flex min-h-dvh overflow-hidden">
      <LoginBackground />

      <div className="relative z-10 flex w-full">
        <div className="hidden flex-1 flex-col items-center justify-center px-6 lg:flex lg:pl-12 lg:pr-6 xl:pl-16">
          <div className="flex w-full max-w-2xl flex-col items-center justify-center text-center">
            <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.06] px-6 py-2.5 text-base font-semibold tracking-wide text-[hsl(203_100%_90%)]">
              Ace Digital
            </div>
            <div className="relative flex w-full items-center justify-center">
              <div
                className="pointer-events-none absolute aspect-[4/5] h-[min(500px,58vh)] w-[min(520px,85vw)] rounded-[40%] bg-[hsl(203_90%_70%/0.1)] blur-[90px]"
                aria-hidden
              />
              <AceLogoParticles
                className="relative h-[min(520px,60vh)] w-full max-w-[680px]"
                size={560}
                widthScale={1.38}
                particleSize={2.9}
                sampleStep={2}
                quality="high"
              />
            </div>
            <div className="mt-8 max-w-[36rem] space-y-4 text-left">
              <h2 className="text-4xl font-semibold tracking-tight text-white">
                Inspiring Youth
                <br />
                Empovering Nation
              </h2>
              <p className="text-sm leading-6 text-white/60">
                A secure workspace for Ace Digital teams.
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-dvh flex-1 items-center justify-center p-6 lg:min-h-0 lg:w-[min(100%,480px)] lg:p-10 lg:pl-4 xl:w-[520px]">
          <div className="w-full max-w-[420px] rounded-2xl border border-white/[0.1] bg-[hsl(218_40%_12%/0.55)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h2>
              <p className="mt-1.5 text-sm text-white/50">Sign in to Ace Digital OS</p>
            </div>
            <LoginDesktopForm
              form={form}
              loading={loading}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              onSubmit={onSubmit}
              onForgotPassword={onForgotPassword}
            />
            <p className="mt-6 text-xs text-white/40">Secure access. Authorized personnel only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [layoutReady, setLayoutReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setLayoutReady(true);
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onForgotPassword() {
    toast({
      title: "Password reset",
      description: "Please contact your administrator to reset your password.",
    });
  }

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

  const showMobile = !layoutReady || isMobile;

  if (showMobile) {
    return (
      <LoginMobileLayout
        form={form}
        loading={loading}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <LoginDesktopLayout
      form={form}
      loading={loading}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      onSubmit={onSubmit}
      onForgotPassword={onForgotPassword}
    />
  );
}
