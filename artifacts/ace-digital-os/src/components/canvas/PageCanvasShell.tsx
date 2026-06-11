import { StaggerItem, StaggerList } from "@/components/design";
import { CanvasCommandBar } from "./CanvasCommandBar";
import { CanvasMetricRail } from "./CanvasMetricRail";
import type { PageCanvasShellProps } from "./types";

export function PageCanvasShell({
  title,
  description,
  eyebrow,
  metrics = [],
  actions,
  children,
  showCommandBar = true,
}: PageCanvasShellProps) {
  return (
    <StaggerList className="dash-canvas">
      <StaggerItem>
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="dash-greeting-inline mt-0.5">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </StaggerItem>

      {showCommandBar && (
        <StaggerItem>
          <CanvasCommandBar pageTitle={title} actions={actions} />
        </StaggerItem>
      )}

      {metrics.length > 0 && (
        <StaggerItem>
          <CanvasMetricRail metrics={metrics} />
        </StaggerItem>
      )}

      <StaggerItem>
        <div className="space-y-4">{children}</div>
      </StaggerItem>
    </StaggerList>
  );
}
