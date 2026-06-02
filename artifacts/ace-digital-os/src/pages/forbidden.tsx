import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <AppLayout title="Access denied">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl font-semibold text-muted-foreground/40">403</p>
        <h2 className="mt-4 text-xl font-semibold">You don&apos;t have access to this page</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Your role does not include permission to view this section. Contact your administrator if
          you need access.
        </p>
        <Link href="/">
          <Button className="mt-6">Back to dashboard</Button>
        </Link>
      </div>
    </AppLayout>
  );
}
