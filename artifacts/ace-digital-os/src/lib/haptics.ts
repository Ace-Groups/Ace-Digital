/**
 * Tactile feedback — maps to expo-haptics ImpactFeedbackStyle on native;
 * uses navigator.vibrate on web/PWA where permitted.
 */

export enum ImpactFeedbackStyle {
  Light = "light",
  Medium = "medium",
  Heavy = "heavy",
}

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

/** Light tap — typing, selection, minor toggles. */
export function hapticLight(): void {
  impact(ImpactFeedbackStyle.Light);
}

/** Medium tap — modals, confirmations, success states. */
export function hapticMedium(): void {
  impact(ImpactFeedbackStyle.Medium);
}

/** Heavy tap — destructive actions. */
export function hapticHeavy(): void {
  impact(ImpactFeedbackStyle.Heavy);
}

/** Success pattern — task complete, save confirmed. */
export function hapticSuccess(): void {
  if (!hasHaptics) return;
  vibrate([15, 30, 15, 30, 30]);
}

/** Selection change — list pickers, tabs. */
export function hapticSelection(): void {
  impact(ImpactFeedbackStyle.Light);
}

/** Destructive action — delete, revoke. */
export function hapticDestructive(): void {
  impact(ImpactFeedbackStyle.Medium);
}
