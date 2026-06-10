import { useLocation } from "wouter";
import { StatusPage, StatusPageContactAdmin } from "@/components/errors/StatusPage";

export default function ErrorPage() {
  const [, setLocation] = useLocation();

  return (
    <StatusPage
      code="Error"
      title="We hit a snag"
      description="Something prevented this page from loading correctly. Try again, or return to your dashboard."
      tone="danger"
      secondaryAction={{
        label: "Try again",
        onClick: () => window.location.reload(),
      }}
      extra={
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <StatusPageContactAdmin />
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/")}
          >
            Go to dashboard
          </button>
        </div>
      }
    />
  );
}
