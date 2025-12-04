import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false, 
      devOptions: {
        enabled: true
      },
      // --- FIX: Increase the cache limit to 5MB ---
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
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