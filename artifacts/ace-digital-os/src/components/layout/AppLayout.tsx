import type { ReactNode } from "react";
import { AdaptiveLayout } from "./AdaptiveLayout";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  /** Lock main area to viewport height — use for chat and other full-bleed tools. */
  fillViewport?: boolean;
}

/** Role-aware shell: desktop sidebar or mobile bottom tabs. */
export function AppLayout({ children, title, fillViewport }: AppLayoutProps) {
  return (
    <AdaptiveLayout title={title} fillViewport={fillViewport}>
      {children}
    </AdaptiveLayout>
  );
}
