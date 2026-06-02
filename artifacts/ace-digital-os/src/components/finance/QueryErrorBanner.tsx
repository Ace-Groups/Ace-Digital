import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryErrorBanner({ message = "Could not load data.", onRetry }: QueryErrorBannerProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle size={18} aria-hidden />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
