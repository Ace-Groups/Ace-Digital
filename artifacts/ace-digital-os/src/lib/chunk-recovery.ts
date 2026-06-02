const RELOAD_KEY = "ace-chunk-reload";

/** Clear the one-time reload guard after a successful boot. */
export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

function reloadOnceForStaleAssets(): void {
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return;
    sessionStorage.setItem(RELOAD_KEY, "1");
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

function isStaleChunkError(message: string): boolean {
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    (message.includes("MIME type") && message.includes("module script"))
  );
}

/** Recover when a deploy removed old hashed JS chunks but the browser still has stale index.html. */
export function registerChunkRecovery(): void {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnceForStaleAssets();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "";
    if (isStaleChunkError(message)) {
      event.preventDefault();
      reloadOnceForStaleAssets();
    }
  });
}
