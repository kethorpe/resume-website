import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // amazon-cognito-identity-js expects a Node-style `global`.
  define: { global: "globalThis" },
  server: {
    // In dev, forward /api to the local backend (cd backend && npm run dev).
    proxy: { "/api": "http://localhost:3001" },
  },
});
