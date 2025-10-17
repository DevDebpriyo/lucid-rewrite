import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy for AI detection API
      "/api/ai": {
        target: "https://visualcraft-ai-models.zeabur.app",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, ""),
      },
      // Proxy for plagiarism API
      "/api/plag": {
        target: "https://visualcraft-ai-models-plag-score.zeabur.app",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/plag/, ""),
      },
      // Proxy for local model backend (rephrase)
      "/api/model": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/model/, "/api/model"),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
