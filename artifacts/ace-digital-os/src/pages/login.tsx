import { lazy, Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MobileLoginScreen } from "@/components/login/MobileLoginScreen";
import { consumeLoginNotice } from "@/lib/login-notice";
import type { LoginFormValues } from "@/pages/login-desktop";

const LoginDesktopLayout = lazy(() => import("@/pages/login-desktop"));

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

  function onForgotPassword() {
    toast({
      title: "Password reset",
      description: "Please contact your administrator to reset your password.",
    });
  }

  async function onSubmit(data: LoginFormValues) {
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
