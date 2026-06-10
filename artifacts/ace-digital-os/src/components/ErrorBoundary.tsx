import { Component, type ErrorInfo, type ReactNode } from "react";
import { StatusPage, StatusPageContactAdmin } from "@/components/errors/StatusPage";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <StatusPage
        code="500"
        title="Something went wrong"
        description="An unexpected error interrupted this page. You can try again, head home, or contact support if it keeps happening."
        tone="danger"
        secondaryAction={{
          label: "Try again",
          onClick: this.handleRetry,
        }}
        extra={<StatusPageContactAdmin />}
      />
    );
  }
}
