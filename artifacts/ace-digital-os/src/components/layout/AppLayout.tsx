import type { ReactNode } from "react";
import { AdaptiveLayout } from "./AdaptiveLayout";
import { V2PageCanvas } from "@/components/v2/V2PageCanvas";

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
      {fillViewport ? children : <V2PageCanvas>{children}</V2PageCanvas>}
    </AdaptiveLayout>
  );
}
