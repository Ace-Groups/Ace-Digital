import { RefreshCw } from "lucide-react";
import { StatusPage } from "@/components/errors/StatusPage";
import { useSignOutRedirect } from "@/hooks/use-sign-out-redirect";

export default function ErrorPage() {
  const signOut = useSignOutRedirect();

  return (
    <StatusPage
      code="Error"
      title="We hit a snag"
      description="Something prevented this page from loading correctly. Try again, return home, or sign out and back in."
      tone="danger"
      onSignOut={signOut}
      primaryAction={{
        label: "Back to dashboard",
        onClick: () => window.location.assign("/"),
      }}
      secondaryAction={{
        label: "Try again",
        onClick: () => window.location.reload(),
        icon: <RefreshCw size={16} aria-hidden />,
      }}
    />
  );
}
