import { RefreshCw } from "lucide-react";
import { StatusPage } from "@/components/errors/StatusPage";
import { useSignOutRedirect } from "@/hooks/use-sign-out-redirect";

interface ErrorFallbackProps {
  onRetry: () => void;
  errorMessage?: string;
}

export function ErrorFallback({ onRetry, errorMessage }: ErrorFallbackProps) {
  const signOut = useSignOutRedirect();

  return (
    <StatusPage
      code="500"
      title="Something went wrong"
      description={
        errorMessage
          ? `An unexpected error interrupted this page (${errorMessage}). You can try again, head home, sign out, or contact support if it keeps happening.`
          : "An unexpected error interrupted this page. You can try again, head home, sign out, or contact support if it keeps happening."
      }
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
