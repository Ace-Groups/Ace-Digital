import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Shield } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import aceLogo from "@/assets/ace-logo.png";

type LoginFormValues = {
  email: string;
  password: string;
};

const fieldClass = cn(
  "h-12 rounded-xl border-border/80 bg-muted/40 pl-11 text-base shadow-none",
  "placeholder:text-muted-foreground/70",
  "focus-visible:border-primary/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/25",
);

interface MobileLoginScreenProps {
  form: UseFormReturn<LoginFormValues>;
  loading: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (data: LoginFormValues) => void | Promise<void>;
  onForgotPassword: () => void;
}

export function MobileLoginScreen({
  form,
  loading,
  showPassword,
  onTogglePassword,
  onSubmit,
  onForgotPassword,
}: MobileLoginScreenProps) {
  const passwordRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative flex min-h-dvh w-full flex-col v2-ambient-bg text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex flex-col items-center gap-2">
          <img src={aceLogo} alt="" className="size-11 object-contain" />
          <p className="v2-stat-label">Ace Digital</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-brand-sm">
          <div className="mb-6 flex size-11 items-center justify-center rounded-xl border border-border/80 bg-primary/10">
            <Shield className="size-5 text-primary" strokeWidth={1.75} aria-hidden />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue</p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mobile-form mt-6 space-y-4"
              autoComplete="on"
              aria-label="Sign in"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          data-testid="input-email"
                          type="email"
                          inputMode="email"
                          enterKeyHint="next"
                          autoCapitalize="none"
                          autoCorrect="off"
                          autoComplete="username"
                          placeholder="you@acedigital.cc"
                          className={fieldClass}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              passwordRef.current?.focus();
                            }
                          }}
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
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel className="text-muted-foreground">Password</FormLabel>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary touch-manipulation active:opacity-80"
                        onClick={onForgotPassword}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          data-testid="input-password"
                          type={showPassword ? "text" : "password"}
                          enterKeyHint="go"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className={cn(fieldClass, "pr-11")}
                          {...field}
                          ref={(el) => {
                            field.ref(el);
                            passwordRef.current = el;
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground touch-manipulation active:bg-muted"
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
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <Button
                data-testid="button-submit"
                type="submit"
                disabled={loading}
                className="mt-2 h-12 w-full gap-2 rounded-xl text-base font-semibold shadow-brand-sm touch-manipulation active:scale-[0.99]"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="size-4" aria-hidden />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </section>
      </div>
    </div>
  );
}
