import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopShell } from "./DesktopShell";
import { MobileShell } from "./MobileShell";

interface AdaptiveLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdaptiveLayout({ children, title }: AdaptiveLayoutProps) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <MobileShell title={title}>{children}</MobileShell>;
  }
  return <DesktopShell title={title}>{children}</DesktopShell>;
}
