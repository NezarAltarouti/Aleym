import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy for the Aleym API to avoid CORS during development
      "/api": {
        target: "http://127.0.0.1:42795",
        changeOrigin: true,
      },
      // SSE events endpoint
      "/events": {
        target: "http://127.0.0.1:42795",
        changeOrigin: true,
      },
      // Ollama local LLM API — proxied to avoid CORS in the browser
      "/ollama": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ""),
      },
    },
  },
});
