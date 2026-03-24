import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import eslint from "vite-plugin-eslint";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  root: "./src",
  envDir: "../",
  plugins: [
    react(),
    tailwindcss(),
    eslint(),
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
