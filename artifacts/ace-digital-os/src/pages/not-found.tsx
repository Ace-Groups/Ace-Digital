import { StatusPage } from "@/components/errors/StatusPage";

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="This page doesn't exist"
      description="The link may be outdated, or the page was moved. Check the URL or return to your dashboard."
      tone="neutral"
      primaryAction={{ label: "Back to dashboard", href: "/" }}
    />
  );
}
