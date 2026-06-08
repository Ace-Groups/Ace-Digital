/**
 * Contextual Haptics Engine
 * Provides native-like vibration feedback on supported devices.
 */

// Basic check to see if the device supports navigator.vibrate
const hasHaptics = typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator;

/** Light tap, used for minor interactions like switching tabs or selecting small items */
export function hapticLight() {
  if (!hasHaptics) return;
  try {
    navigator.vibrate(10);
  } catch (e) {
    // Ignore if not permitted
  }
}

/** Medium tap, used for opening modals, toggles, or standard actions */
export function hapticMedium() {
  if (!hasHaptics) return;
  try {
    navigator.vibrate(20);
  } catch (e) {
    // Ignore
  }
}

/** Heavy tap or sequence, used for destructive actions or major success states */
export function hapticHeavy() {
  if (!hasHaptics) return;
  try {
    navigator.vibrate([30, 20, 30]);
  } catch (e) {
    // Ignore
  }
}

/** Success pattern, e.g. completing a task */
export function hapticSuccess() {
  if (!hasHaptics) return;
  try {
    navigator.vibrate([15, 30, 15, 30, 30]);
  } catch (e) {
    // Ignore
  }
}
