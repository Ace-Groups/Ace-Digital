import { RefreshCw } from "lucide-react";
import { StatusPage } from "@/components/errors/StatusPage";
import { useSignOutRedirect } from "@/hooks/use-sign-out-redirect";

interface ErrorFallbackProps {
  onRetry: () => void;
  errorMessage?: string;
}

export function ErrorFallback({ onRetry, errorMessage }: ErrorFallbackProps) {
  const signOut = useSignOutRedirect();

  const goDashboard = () => {
    // #region agent log
    fetch("http://127.0.0.1:7752/ingest/0a1917d0-6bbb-48b6-8f35-a60640186c6d", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "c75a30",
      },
      body: JSON.stringify({
        sessionId: "c75a30",
        runId: "error-nav",
        hypothesisId: "A",
        location: "ErrorFallback.tsx:goDashboard",
        message: "navigating home via full page load",
        data: { from: window.location.pathname },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    window.location.assign("/");
  };

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
      primaryAction={{ label: "Back to dashboard", onClick: goDashboard }}
      secondaryAction={{
        label: "Try again",
        onClick: onRetry,
        icon: <RefreshCw size={16} aria-hidden />,
      }}
    />
  );
}
