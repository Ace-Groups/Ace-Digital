import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type CanvasMetric = {
  key: string;
  label: string;
  value: string | number;
  href?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
};

export type PageCanvasShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  metrics?: CanvasMetric[];
  actions?: ReactNode;
  children: ReactNode;
  showCommandBar?: boolean;
};
