import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@workspace/api-client-react";
import { MobileLoginScreen } from "@/components/login/MobileLoginScreen";
import { consumeLoginNotice } from "@/lib/login-notice";
import type { LoginFormValues } from "@/pages/login-desktop";

import { lazyWithReload } from "@/lib/lazy-with-reload";

const LoginDesktopLayout = lazyWithReload(() => import("@/pages/login-desktop"));

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

function LoginDesktopFallback() {
  return <div className="min-h-dvh bg-[#052659]" aria-hidden />;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const notice = consumeLoginNotice();
    if (notice?.type !== "password-updated") return;

    toast({
      title: "Password updated",
      description: "Sign in with your new password to continue.",
    });
    if (notice.email) {
      form.setValue("email", notice.email);
    }
    // Run once on mount — `form` must not be in deps (unstable reference → render loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill password from email link (?pw=...) and copy to clipboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pw = params.get("pw");
    if (!pw) return;

    form.setValue("password", pw);

    // Copy password to clipboard so user can paste it on the change-password screen
    navigator.clipboard?.writeText(pw).catch(() => {
      /* clipboard may be unavailable — silent fail */
    });

    // Clean URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("pw");
    window.history.replaceState({}, "", url.pathname);

    toast({
      title: "🔑 Password copied!",
      description:
        "Your temporary password has been pasted into the form and copied to your clipboard. Just enter your email to log in.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onForgotPassword() {
    toast({
      title: "Password reset",
      description: "Please contact your administrator to reset your password.",
    });
  }

  function loginErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 403) {
        return "Your account is not active. Contact your administrator.";
      }
      if (err.status === 401) {
        return "Invalid email or password";
      }
      if (err.status >= 500 || err.status === 503) {
        return "Could not reach the server. Try again in a moment.";
      }
    }
    if (err instanceof TypeError) {
      return "Could not reach the server. Try again in a moment.";
    }
    return "Invalid email or password";
  }

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);
    try {
      await login(data.email.trim(), data.password);
      setLocation("/");
    } catch (err) {
      toast({
        title: "Login failed",
        description: loginErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const sharedProps = {
    form,
    loading,
    showPassword,
    onTogglePassword: () => setShowPassword((v) => !v),
    onSubmit,
    onForgotPassword,
  };

  return (
    <>
      <div className="md:hidden">
        <MobileLoginScreen {...sharedProps} />
      </div>
      <div className="hidden md:block">
        <Suspense fallback={<LoginDesktopFallback />}>
          <LoginDesktopLayout {...sharedProps} setShowPassword={setShowPassword} />
        </Suspense>
      </div>
    </>
  );
}
