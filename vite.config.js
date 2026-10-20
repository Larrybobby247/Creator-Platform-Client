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
"/api": {
target: "https://creator-server-hdsk.onrender.com",
changeOrigin: true,
secure: true,
},

  "/uploads": {
    target: "https://creator-server-hdsk.onrender.com",
    changeOrigin: true,
    secure: true,
  },

  "/socket.io": {
    target: "https://creator-server-hdsk.onrender.com",
    changeOrigin: true,
    secure: true,
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
