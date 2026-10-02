import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import eslint from "vite-plugin-eslint";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  root: "./src",
  envDir: "../",
  plugins: [
    react(),
    tailwindcss(),
    eslint(),
    VitePWA({
      // Auto-update the service worker in the background; combined with the
      // precache below this is what lets the app shell open with no network.
      registerType: "autoUpdate",
      // Inline the registration into index.html (which is served no-cache) so
      // there's no extra registerSW.js file to manage cache headers for.
      injectRegister: "inline",
      // Reuse the existing public/manifest.json (already linked in index.html).
      manifest: false,
      workbox: {
        // Precache the hashed build assets so the shell renders offline.
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        // A bundle chunk can exceed the 2 MB default; raise the ceiling so the
        // whole shell is actually precached (otherwise offline silently breaks).
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Inline the Workbox runtime into sw.js so there's a single,
        // self-contained service worker file to manage cache headers for.
        inlineWorkboxRuntime: true,
        // SPA navigations resolve to the cached index.html when offline.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/ws/],
        runtimeCaching: [
          {
            // Never cache API or WebSocket traffic — IndexedDB is the source of
            // truth for data, so online users must always see fresh responses.
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api") || url.pathname.startsWith("/ws"),
            handler: "NetworkOnly",
          },
          {
            // Google Fonts are loaded cross-origin; cache them so text renders
            // offline, but refresh in the background when online.
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Keep the SW out of `vite dev` so it never interferes with HMR / proxy.
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:9001/",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:9001/",
        ws: true,
        changeOrigin: true,
      },
    },
    port: 5173,
  },
  build: {
    outDir: "../.local/vite/dist",
    assetsDir: "assets",
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      external: [
        "better-sqlite3",
        "mysql",
        "mysql2",
        "orabledb",
        "pg",
        "pq-query-stream",
        "sqlite3",
        "tedious",
      ],
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
