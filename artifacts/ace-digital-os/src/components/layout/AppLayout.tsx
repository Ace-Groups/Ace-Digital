import type { ReactNode } from "react";
import { AdaptiveLayout } from "./AdaptiveLayout";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

/** Role-aware shell: desktop sidebar or mobile bottom tabs. */
export function AppLayout({ children, title }: AppLayoutProps) {
  return <AdaptiveLayout title={title}>{children}</AdaptiveLayout>;
}
