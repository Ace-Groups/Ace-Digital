/**
 * Ace OS v2 — semantic haptic feedback layer.
 * Maps to navigator.vibrate on web/PWA; mirrors expo-haptics on native.
 */

export enum ImpactFeedbackStyle {
  Light = "light",
  Medium = "medium",
  Heavy = "heavy",
}

export type HapticEvent =
  | "tap"
  | "selection"
  | "success"
  | "warning"
  | "error"
  | "impact"
  | "navigation"
  | "sheetOpen"
  | "sheetClose"
  | "destructive"
  | "toggle";

const hasHaptics =
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  "vibrate" in navigator;

function vibrate(pattern: number | number[]): void {
  if (!hasHaptics) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Permission denied or unsupported
  }
}

/** Primary API — mirrors expo-haptics ImpactFeedbackStyle. */
export function impact(style: ImpactFeedbackStyle): void {
  switch (style) {
    case ImpactFeedbackStyle.Light:
      vibrate(10);
      break;
    case ImpactFeedbackStyle.Medium:
      vibrate(20);
      break;
    case ImpactFeedbackStyle.Heavy:
      vibrate([30, 20, 30]);
      break;
  }
}

/** Semantic haptic API — use this throughout v2 UI. */
export function haptic(event: HapticEvent): void {
  switch (event) {
    case "tap":
    case "selection":
    case "toggle":
      impact(ImpactFeedbackStyle.Light);
      break;
    case "navigation":
      vibrate(8);
      break;
    case "success":
      vibrate([12, 24, 12, 24, 28]);
      break;
    case "warning":
      vibrate([20, 40, 20]);
      break;
    case "error":
    case "destructive":
      vibrate([30, 20, 40]);
      break;
    case "impact":
      impact(ImpactFeedbackStyle.Medium);
      break;
    case "sheetOpen":
      vibrate([16, 28, 16]);
      break;
    case "sheetClose":
      vibrate(12);
      break;
  }
}

/** Light tap — typing, selection, minor toggles. */
export function hapticLight(): void {
  haptic("tap");
}

/** Medium tap — modals, confirmations. */
export function hapticMedium(): void {
  haptic("impact");
}

/** Heavy tap — destructive actions. */
export function hapticHeavy(): void {
  impact(ImpactFeedbackStyle.Heavy);
}

/** Success pattern — task complete, save confirmed. */
export function hapticSuccess(): void {
  haptic("success");
}

/** Selection change — list pickers, tabs. */
export function hapticSelection(): void {
  haptic("selection");
}

/** Destructive action — delete, revoke. */
export function hapticDestructive(): void {
  haptic("destructive");
}

/** Navigation between routes or tabs. */
export function hapticNavigation(): void {
  haptic("navigation");
}

/** Sheet / drawer open. */
export function hapticSheetOpen(): void {
  haptic("sheetOpen");
}
