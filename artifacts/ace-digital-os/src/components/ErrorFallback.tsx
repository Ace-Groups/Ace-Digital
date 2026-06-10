import { RefreshCw } from "lucide-react";
import { StatusPage } from "@/components/errors/StatusPage";
import { useSignOutRedirect } from "@/hooks/use-sign-out-redirect";

interface ErrorFallbackProps {
  onRetry: () => void;
}

export function ErrorFallback({ onRetry }: ErrorFallbackProps) {
  const signOut = useSignOutRedirect();

  return (
    <StatusPage
      code="500"
      title="Something went wrong"
      description="An unexpected error interrupted this page. You can try again, head home, sign out, or contact support if it keeps happening."
      tone="danger"
      onSignOut={signOut}
      secondaryAction={{
        label: "Try again",
        onClick: onRetry,
        icon: <RefreshCw size={16} aria-hidden />,
      }}
    />
  );
}
