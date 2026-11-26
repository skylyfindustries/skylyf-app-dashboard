import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Factory ERP, served under /crm/ next to the Skylyf dashboard (same origin → shared sign-in).
export default defineConfig({
  base: "/crm/",
  server: {
    port: 8080,
    hmr: { overlay: false },
    proxy: { "/api": { target: process.env.BACKEND_URL || "http://localhost:4500", changeOrigin: true } },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
