import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopShell } from "./DesktopShell";
import { MobileShell } from "./MobileShell";

interface AdaptiveLayoutProps {
  children: ReactNode;
  title?: string;
  fillViewport?: boolean;
}

export function AdaptiveLayout({ children, title, fillViewport }: AdaptiveLayoutProps) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <MobileShell title={title} fillViewport={fillViewport}>
        {children}
      </MobileShell>
    );
  }
  return (
    <DesktopShell title={title} fillViewport={fillViewport}>
      {children}
    </DesktopShell>
  );
}
