import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Helper to read env at build time for API base url pattern
const API_BASE =
  // process.env.VITE_API_BASE_URL || "https://simulation.lightoflifeclub.com/api";
  // "http://10.10.113.129:8001/api";
  "http://172.30.1.39:8001/api";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      includeAssets: [
        "vite.svg",
        "icons/icon-192.png",
        "icons/icon-384.png",
        "icons/icon-512.png",
        "icons/maskable-192.png",
        "icons/maskable-512.png",
      ],
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Public notices (GET only). Use network-first for freshness with offline fallback.
            urlPattern: new RegExp(
              `^${API_BASE.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              )}/notices(/.*)?$`
            ),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-notices",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Static images from same origin
            urlPattern: /.*\.(?:png|svg|jpg|jpeg|gif|webp)$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "images" },
          },
        ],
      },
      manifest: {
        name: "Light of Life Club Simulation",
        short_name: "Simulation",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1976d2",
        orientation: "landscape",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true,
    },
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    allowedHosts: ["simulation.lightoflifeclub.com", "localhost"],
  },
});
