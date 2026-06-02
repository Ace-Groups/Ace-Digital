import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import aceLogo from "@/assets/ace-logo.png";
const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const PRODUCT_HIGHLIGHTS = [
  { label: "Projects", value: "Kanban" },
  { label: "Teams", value: "Org-wide" },
  { label: "Clients", value: "CRM" },
  { label: "Finance", value: "Payroll" },
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
    <div className="flex min-h-dvh bg-background">
      <div className="relative hidden w-[42%] min-w-[320px] flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex xl:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 100% 0%, hsl(var(--ace-sky) / 0.25), transparent 55%)",
          }}
          aria-hidden
        />
        <div className="relative">
          <div className="mb-14 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-accent/60">
              <img src={aceLogo} alt="" className="h-8 w-8 bg-transparent object-contain" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Ace Digital</span>
          </div>
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-balance xl:text-[2.75rem]">
            Your company&apos;s
            <br />
            operating system
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-sidebar-foreground/70">
            Manage projects, teams, clients, and finances in one unified platform built
            for Ace Digital.
          </p>
        </div>
        <div className="relative grid grid-cols-2 gap-3">
          {PRODUCT_HIGHLIGHTS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/40 p-4 backdrop-blur-sm"
            >
              <p className="text-2xl font-semibold tabular-nums text-sidebar-foreground">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-sidebar-foreground/55">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:items-center sm:p-10">
        <div className="w-full max-w-[400px] sm:mx-auto">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={aceLogo} alt="Ace Digital" className="h-10 w-10 bg-transparent object-contain" />
            <span className="text-xl font-semibold tracking-tight text-foreground">
              Ace Digital OS
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-email"
                        type="email"
                        placeholder="you@acedigital.com"
                        autoComplete="off"
                        name="ace-login-email"
                        className="h-11 text-base sm:h-10 sm:text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="h-11 text-base sm:h-10 sm:text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                data-testid="button-submit"
                type="submit"
                className="h-12 w-full text-base font-medium sm:h-10 sm:text-sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={16} className="mr-2 animate-spin" aria-hidden />
                ) : null}
                Sign in
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Authorized Ace Digital personnel only
          </p>
        </div>
      </div>
    </div>
  );
}
