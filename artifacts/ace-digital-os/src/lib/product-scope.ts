import { useEffect, useState } from "react";
import type { NavRoute } from "@workspace/rbac";

/**
 * Screens that stay in the codebase and on the API, but leave the daily
 * navigation until an owner turns them back on. See docs/design/scope.md.
 */
export const TUCKED_ROUTES = new Set<NavRoute>([
  "reports",
  "activity",
  "notes",
  "teams",
  "interns",
  "credentials",
  "service",
]);

const STORAGE_KEY = "ace-show-extended";
const CHANGE_EVENT = "ace-scope-change";

export function extendedOpsEnabled(): boolean {
  if (import.meta.env.VITE_SHOW_EXTENDED_OPS === "true") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setExtendedOpsEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useExtendedOps(): boolean {
  const [on, setOn] = useState(extendedOpsEnabled);
  useEffect(() => {
    const sync = () => setOn(extendedOpsEnabled());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return on;
}

const TUCKED_PREFIXES = ["/reports", "/activity", "/notes", "/teams", "/interns", "/credentials", "/service"];

export function isHrefInDailyScope(href: string, extended = extendedOpsEnabled()): boolean {
  if (extended) return true;
  const path = href.split("?")[0].replace(/\/$/, "") || "/";
  return !TUCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isRouteInDailyScope(route: NavRoute, extended = extendedOpsEnabled()): boolean {
  return extended || !TUCKED_ROUTES.has(route);
}
