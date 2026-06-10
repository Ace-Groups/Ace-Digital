import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  StatusPageContactAdmin,
  StatusPageSignOut,
} from "@/components/errors/StatusPage";
import { Home } from "lucide-react";

export default function ForbiddenPage() {
  const { logout } = useAuth();

  return (
    <AppLayout title="Access denied">
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-3xl border border-border/70 bg-card/70 p-8 text-center shadow-brand-sm backdrop-blur-sm sm:p-10">
          <p className="text-6xl font-semibold tracking-tight text-amber-600 dark:text-amber-400 sm:text-7xl">
            403
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            You don&apos;t have access here
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your role doesn&apos;t include permission for this section. Ask an administrator if you
            need access, or return to an area you can use.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/">
                <Home size={16} aria-hidden />
                Back to dashboard
              </Link>
            </Button>
            <StatusPageSignOut onSignOut={logout} />
          </div>

          <div className="mt-6">
            <StatusPageContactAdmin />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
