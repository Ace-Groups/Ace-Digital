import type cors from "cors";

const DEFAULT_ORIGINS = [
  "https://app.acedigital.cc",
  "https://ace-digital-int-12345.web.app",
  "https://ace-digital-int-12345.firebaseapp.com",
  // Same-origin Hosting does not need CORS. These cover the custom domain,
  // the default Hosting site ace-digital-int-12345, and local Vite.
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:21973",
  "http://127.0.0.1:21973",
];

export function getAllowedOrigins(): string[] {
  const extra = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
  return [...new Set([...DEFAULT_ORIGINS, ...extra])];
}

export function getCorsOptions(): cors.CorsOptions {
  const allowed = new Set(getAllowedOrigins());

  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  };
}
