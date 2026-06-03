import { setBaseUrl } from "@workspace/api-client-react";

/** When set (e.g. Render API host), REST calls go there instead of same-origin /api. */
export function configureApiClient(): void {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (base) {
    setBaseUrl(base.replace(/\/+$/, ""));
  }
}
