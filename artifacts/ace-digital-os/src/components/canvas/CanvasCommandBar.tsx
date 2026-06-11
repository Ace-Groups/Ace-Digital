import type { ReactNode } from "react";
import { Link } from "wouter";
import { Bell, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAceAssistant } from "@/contexts/AceAssistantContext";

type CanvasCommandBarProps = {
  pageTitle?: string;
  actions?: ReactNode;
  showAskAce?: boolean;
};

export function CanvasCommandBar({
  pageTitle,
  actions,
  showAskAce = true,
}: CanvasCommandBarProps) {
  const { user } = useAuth();
  const { openWithPrompt } = useAceAssistant();
  const orgName = user?.fullName ?? "Ace Digital";
  const roleLabel = user?.role?.replace(/_/g, " ") ?? "";

  return (
    <header className="dash-command-bar">
      <div className="dash-command-brand">
        <div className="dash-command-logo" aria-hidden>
          Ace
        </div>
        <div className="min-w-0">
          <p className="dash-command-org truncate">{orgName}</p>
          <p className="dash-command-role capitalize">{roleLabel}</p>
        </div>
      </div>

      <button
        type="button"
        className="dash-command-search"
        onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
      >
        <Search size={15} aria-hidden />
        <span className="truncate">
          {pageTitle ? `Search ${pageTitle.toLowerCase()}…` : "Search workspace or run a command…"}
        </span>
      </button>

      <div className="dash-command-actions">
        {actions}
        <Link href="/notifications" className="dash-command-btn dash-command-btn--ghost">
          <Bell size={16} aria-hidden />
          <span className="hidden sm:inline">Alerts</span>
        </Link>
        {showAskAce && (
          <button
            type="button"
            className="dash-command-btn dash-command-btn--primary"
            onClick={() => openWithPrompt("What needs my attention today?")}
          >
            <Sparkles size={16} aria-hidden />
            <span className="hidden sm:inline">Ask Ace</span>
          </button>
        )}
      </div>
    </header>
  );
}
