import { setBaseUrl } from "@workspace/api-client-react";

const PRODUCTION_API_BASE = "https://ace-digital-api.onrender.com";

/** When set (e.g. Render API host), REST calls go there instead of same-origin /api. */
export function configureApiClient(): void {
  const base =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    (import.meta.env.PROD ? PRODUCTION_API_BASE : "");
  if (base) {
    setBaseUrl(base.replace(/\/+$/, ""));
  }
}
