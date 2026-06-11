import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageCanvasShell } from "@/components/canvas";
import { Button } from "@/components/ui/button";
import { StatusPageContactAdmin } from "@/components/errors/StatusPage";
import { useSignOutRedirect } from "@/hooks/use-sign-out-redirect";
import { Home, LogOut, ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  const signOut = useSignOutRedirect();

  return (
    <AppLayout title="">
      <PageCanvasShell
        title="Access denied"
        showCommandBar={false}
      >
        <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center">
          <div className="dash-panel w-full max-w-xl p-8 text-center sm:p-10">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
              <ShieldAlert className="size-6 text-amber-600 dark:text-amber-400" aria-hidden />
            </div>
            <p className="text-6xl font-semibold tracking-tight text-amber-600 dark:text-amber-400 sm:text-7xl">
              403
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              You don&apos;t have access here
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Your role doesn&apos;t include permission for this section. Ask an administrator if you
              need access, or return to an area you can use.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="gap-2">
                <Link href="/">
                  <Home size={16} aria-hidden />
                  Back to dashboard
                </Link>
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={() => void signOut()}
              >
                <LogOut size={16} aria-hidden />
                Sign out
              </Button>
            </div>

            <div className="mt-6 flex justify-center border-t border-border/60 pt-6">
              <StatusPageContactAdmin />
            </div>
          </div>
        </div>
      </PageCanvasShell>
    </AppLayout>
  );
}
