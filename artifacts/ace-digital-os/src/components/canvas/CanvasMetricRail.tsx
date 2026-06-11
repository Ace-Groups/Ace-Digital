import { Link } from "wouter";
import type { CanvasMetric } from "./types";

const DEFAULT_ICON_BG = "bg-primary/10";
const DEFAULT_ICON_COLOR = "text-primary";

type CanvasMetricRailProps = {
  metrics: CanvasMetric[];
};

export function CanvasMetricRail({ metrics }: CanvasMetricRailProps) {
  if (metrics.length === 0) return null;

  return (
    <div className="dash-metric-rail">
      {metrics.map((m) => {
        const Icon = m.icon;
        const body = (
          <>
            <div className={`dash-metric-icon ${m.iconBg ?? DEFAULT_ICON_BG}`}>
              <Icon size={14} className={m.iconColor ?? DEFAULT_ICON_COLOR} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="dash-metric-label">{m.label}</p>
              <p className="dash-metric-value">{m.value}</p>
            </div>
          </>
        );

        if (m.href) {
          return (
            <Link key={m.key} href={m.href} className="dash-metric-card">
              {body}
            </Link>
          );
        }

        return (
          <div key={m.key} className="dash-metric-card">
            {body}
          </div>
        );
      })}
    </div>
  );
}
