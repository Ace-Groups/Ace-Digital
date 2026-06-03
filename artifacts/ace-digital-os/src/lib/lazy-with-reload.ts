import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Like React.lazy, but reloads once when a hashed chunk is missing after a new deploy.
 */
export function lazyWithReload<T extends ComponentType<object>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunk =
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed") ||
        message.includes("error loading dynamically imported module");

      if (isChunk) {
        try {
          if (!sessionStorage.getItem("ace-chunk-reload")) {
            sessionStorage.setItem("ace-chunk-reload", "1");
            window.location.reload();
            return { default: (() => null) as unknown as T };
          }
        } catch {
          window.location.reload();
          return { default: (() => null) as unknown as T };
        }
      }
      throw error;
    }
  });
}
