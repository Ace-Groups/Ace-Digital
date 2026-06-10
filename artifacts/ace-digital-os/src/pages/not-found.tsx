import { StatusPage } from "@/components/errors/StatusPage";
import { useSignOutRedirect } from "@/hooks/use-sign-out-redirect";

export default function NotFound() {
  const signOut = useSignOutRedirect();

  return (
    <StatusPage
      code="404"
      title="This page doesn't exist"
      description="The link may be outdated, or the page was moved. Check the URL or return to your dashboard."
      tone="neutral"
      primaryAction={{ label: "Back to dashboard", href: "/" }}
      onSignOut={signOut}
    />
  );
}
