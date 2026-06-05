import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

export default function ForbiddenPage() {
  const { logout } = useAuth();

  async function handleSignOut() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <AppLayout title="Access denied">
      <div className="flex min-h-[50dvh] flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
        <p className="text-6xl font-semibold text-muted-foreground/40">403</p>
        <h2 className="mt-4 text-xl font-semibold">You don&apos;t have access to this page</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Your role does not include permission to view this section. Contact your administrator if
          you need access.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/">
            <Button>Back to dashboard</Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={handleSignOut}>
            <LogOut size={16} /> Sign out
          </Button>
        </div>
        <a
          href="mailto:admin@mybexo.com?subject=Ace%20Digital%20access%20request"
          className="mt-4 text-sm text-primary hover:underline"
        >
          Contact administrator
        </a>
      </div>
    </AppLayout>
  );
}
