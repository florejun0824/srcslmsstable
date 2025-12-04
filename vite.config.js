import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa"; // <--- Import this
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
    }),
    // --- ADD PWA PLUGIN CONFIGURATION ---
    VitePWA({
      strategies: 'injectManifest', // Uses your custom src/service-worker.js
      srcDir: 'src',
      filename: 'service-worker.js', // Output name matches your registration script
      registerType: 'autoUpdate',
      injectRegister: false, // You are registering it manually in serviceWorkerRegistration.js
      manifest: false, // We assume you have a manifest.json in /public already
      devOptions: {
        enabled: true // Allows testing offline mode in development
      }
    }),
  ],
  resolve: {
    alias: {
      buffer: "buffer",
      process: "process/browser",
      stream: "stream-browserify",
      crypto: "crypto-browserify",
      util: "util",
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      "readable-stream",
      "crypto-browserify",
      "stream-browserify",
      "buffer",
      "process/browser",
      "util",
    ],
  },
  define: {
    global: "globalThis",
  },
});