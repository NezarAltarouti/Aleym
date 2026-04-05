import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/newsapi": {
        target: "https://newsapi.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/newsapi/, ""),
      },
      // Proxy for the Aleym API to avoid CORS during development
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      // SSE events endpoint
      "/events": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});