
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    proxy: {
      "/api": "https://creator-server-hdsk.onrender.com",
      "/uploads": "https://creator-server-hdsk.onrender.com",
      "/socket.io": {
        target: "https://creator-server-hdsk.onrender.com",
        ws: true,
      },
    },
  },

  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 250,
  },
});
