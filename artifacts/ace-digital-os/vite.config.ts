import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const repoRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const port = Number(env.PORT ?? process.env.PORT ?? 5173);
  const basePath = env.BASE_PATH ?? process.env.BASE_PATH ?? "/";
  /** Default to Render API so local v2 dev works without a local API process. */
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY?.trim() ||
    process.env.VITE_DEV_API_PROXY?.trim() ||
    "https://ace-digital-api.onrender.com";

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${env.PORT ?? process.env.PORT}"`);
  }

  return {
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Avoid disruptive app refresh while users are actively editing.
      registerType: "autoUpdate",
      includeAssets: [
        "app-icon-source.png",
        "favicon-16.png",
        "favicon-32.png",
        "ace-logo.png",
        "bot-avatar.png",
        "images/ace-ai/ace-ai-avatar.png",
        "images/ace-ai/ace-ai-hero.png",
        "icons/icon-48.png",
        "icons/icon-180.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-512-maskable.png",
        "robots.txt",
      ],
      manifest: false,
      workbox: {
        cacheId: "ace-digital-os-v2",
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/assets\//, /\.js$/i, /\.css$/i],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.js$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "ace-assets-js",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/api\/.*/,
            handler: "NetworkOnly",
            options: {
              backgroundSync: {
                name: "ace-offline-mutations",
                options: {
                  maxRetentionTime: 2880, // 48 hours in minutes
                },
              },
            },
          },
        ],
      },
    }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@workspace/rbac": path.resolve(import.meta.dirname, "..", "..", "lib", "rbac", "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: true,
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
      "/socket.io": {
        target: apiProxyTarget,
        ws: true,
        changeOrigin: true,
        secure: true,
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
};
});
