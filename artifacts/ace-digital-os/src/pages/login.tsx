import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type LoginFormProps = {
  variant: "mobile" | "desktop";
  loading: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (data: FormData) => void | Promise<void>;
  form: ReturnType<typeof useForm<FormData>>;
  onForgotPassword: () => void;
};

function LoginFormFields({
  variant,
  loading,
  showPassword,
  onTogglePassword,
  onSubmit,
  form,
  onForgotPassword,
}: LoginFormProps) {
  const isMobile = variant === "mobile";
  const inputClass = cn(
    "min-h-11 text-base sm:text-sm",
    isMobile ? "h-12 rounded-xl bg-background" : "h-12 rounded-xl pl-11",
  );
  const iconClass = isMobile
    ? "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
    : "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40";

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-4", !isMobile && "space-y-5")}
        autoComplete="off"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isMobile ? undefined : "text-white/60"}>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className={iconClass} aria-hidden />
                  <Input
                    data-testid="input-email"
                    type="email"
                    placeholder="you@acedigital.com"
                    autoComplete="username"
                    className={cn(inputClass, "pl-10")}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage className={isMobile ? undefined : "text-red-300"} />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className={isMobile ? undefined : "text-white/60"}>Password</FormLabel>
                <button
                  type="button"
                  className={cn(
                    "text-xs font-medium",
                    isMobile
                      ? "text-primary hover:underline"
                      : "text-[hsl(203_100%_87%/0.85)] hover:text-white",
                  )}
                  onClick={onForgotPassword}
                >
                  Forgot password?
                </button>
              </div>
              <FormControl>
                <div className="relative">
                  <Lock className={iconClass} aria-hidden />
                  <Input
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={cn(inputClass, "pl-10 pr-11")}
                    {...field}
                  />
                  <button
                    type="button"
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2",
                      isMobile
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-white/40 hover:text-white",
                    )}
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
              <FormMessage className={isMobile ? undefined : "text-red-300"} />
            </FormItem>
          )}
        />
        <Button
          data-testid="button-submit"
          type="submit"
          disabled={loading}
          className={cn(
            "w-full min-h-11 text-base font-semibold sm:text-sm",
            !isMobile &&
              "h-12 rounded-xl bg-gradient-to-r from-[hsl(211_42%_46%)] via-[hsl(211_45%_54%)] to-[hsl(203_70%_58%)] shadow-[0_4px_28px_hsl(211_38%_52%/0.45)] hover:shadow-[0_8px_36px_hsl(211_38%_52%/0.55)]",
          )}
          size={isMobile ? "lg" : "default"}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
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
  onForgotPassword,
}: Omit<LoginFormProps, "variant" | "onTogglePassword"> & {
  setShowPassword: (v: boolean | ((p: boolean) => boolean)) => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background brand-gradient-subtle">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))]">
        <header className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-sm">
            <img src={aceLogo} alt="" className="size-11 object-contain" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Ace Digital
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">Use your work email to continue</p>
          </div>
        </header>

        <Card className="border-border/80 bg-card/95 shadow-sm backdrop-blur-sm">
          <CardHeader className="sr-only">
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your Ace Digital credentials</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <LoginFormFields
              variant="mobile"
              form={form}
              loading={loading}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              onSubmit={onSubmit}
              onForgotPassword={onForgotPassword}
            />
          </CardContent>
        </Card>

        <p className="mt-auto pt-8 text-center text-xs text-muted-foreground">
          Authorized personnel only
        </p>
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
}: Omit<LoginFormProps, "variant" | "onTogglePassword"> & {
  setShowPassword: (v: boolean | ((p: boolean) => boolean)) => void;
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
            <LoginFormFields
              variant="desktop"
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

  const layoutProps = {
    form,
    loading,
    showPassword,
    setShowPassword,
    onSubmit,
    onForgotPassword,
  };

  const showMobile = !layoutReady || isMobile;

  if (showMobile) {
    return <LoginMobileLayout {...layoutProps} />;
  }

  return <LoginDesktopLayout {...layoutProps} />;
}
