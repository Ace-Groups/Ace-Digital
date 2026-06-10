import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorFallback } from "@/components/ErrorFallback";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : undefined;
    return { hasError: true, errorMessage };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    // #region agent log
    if (this.state.hasError) {
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
          location: "ErrorBoundary.tsx:render",
          message: "error boundary showing fallback",
          data: {
            hasError: true,
            errorMessage: this.state.errorMessage ?? null,
            pathname: typeof window !== "undefined" ? window.location.pathname : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion

    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <ErrorFallback onRetry={this.handleRetry} errorMessage={this.state.errorMessage} />
    );
  }
}
