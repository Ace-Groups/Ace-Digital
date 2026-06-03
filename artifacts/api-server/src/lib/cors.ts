import type cors from "cors";

const DEFAULT_ORIGINS = [
  "https://ace-digital-os.web.app",
  "https://ace-digital-os.firebaseapp.com",
  // Render preview/production API same-origin not needed; frontend on Firebase calls API cross-origin
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:21973",
  "http://127.0.0.1:21973",
];

export function getCorsOptions(): cors.CorsOptions {
  const extra = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
  const allowed = new Set([...DEFAULT_ORIGINS, ...extra]);

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
