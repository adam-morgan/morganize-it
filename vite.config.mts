import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import eslint from "vite-plugin-eslint";
import Pages from "vite-plugin-pages";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  root: "./src",
  envDir: "../",
  plugins: [
    react(),
    eslint(),
    Pages({
      pagesDir: [{ dir: "pages", baseRoute: "" }],
      extensions: ["tsx"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@fontsource": path.resolve(__dirname, "node_modules/@fontsource"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:9001/",
        changeOrigin: true,
      },
    },
    port: 9000,
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
