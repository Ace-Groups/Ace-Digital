import type cors from "cors";

const DEFAULT_ORIGINS = [
  "https://acedigital.cc",
  "https://www.acedigital.cc",
  "https://ace-digital-os.web.app",
  "https://ace-digital-os.firebaseapp.com",
  // Render preview/production API same-origin not needed; frontend on Firebase calls API cross-origin
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
